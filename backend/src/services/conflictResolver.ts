import { PrismaClient, ContextSource, AmbientContext } from '@prisma/client';

const prisma = new PrismaClient();

// Source reliability weights (from addendum)
const SOURCE_RELIABILITY: Record<ContextSource, number> = {
  NURSE_BEDSIDE: 0.95,      // Highest - direct patient care
  PT_OT_SESSION: 0.90,      // High - structured assessment
  CARE_COORDINATION: 0.85,  // Good - formal meetings
  FAMILY_DISCUSSION: 0.75,  // Moderate - subjective but valuable
  SOCIAL_WORK: 0.80,        // Good - professional assessment
};

export interface ConflictResolution {
  conflictId: string;
  winningContextId: string;
  losingContextId: string;
  reason: string;
  confidenceDelta: number;
}

export interface ContextWithConfidence {
  id: string;
  source: ContextSource;
  extractedData: Record<string, unknown>;
  overallConfidence: number;
  capturedAt: Date;
  patientMrn: string;
}

/**
 * Calculate overall confidence score for ambient context
 * Formula: transcriptionConfidence * extractionConfidence * sourceReliability
 */
export function calculateOverallConfidence(
  transcriptionConfidence: number | null,
  extractionConfidence: number | null,
  source: ContextSource
): number {
  const transcription = transcriptionConfidence ?? 0.85; // Default if not provided
  const extraction = extractionConfidence ?? 0.80;
  const sourceReliability = SOURCE_RELIABILITY[source];
  
  return transcription * extraction * sourceReliability;
}

/**
 * Detect conflicts between ambient context records for the same patient
 * Conflicts occur when different sources report contradictory information
 */
export async function detectConflicts(
  patientMrn: string,
  timeWindowHours: number = 24
): Promise<Array<{ context1: AmbientContext; context2: AmbientContext; field: string; value1: string; value2: string }>> {
  const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
  
  const contexts = await prisma.ambientContext.findMany({
    where: {
      patientMrn,
      capturedAt: { gte: cutoffTime },
      conflictFlag: false,
    },
    orderBy: { capturedAt: 'desc' },
  });

  const conflicts: Array<{ context1: AmbientContext; context2: AmbientContext; field: string; value1: string; value2: string }> = [];

  // Compare each pair of contexts for conflicting data
  for (let i = 0; i < contexts.length; i++) {
    for (let j = i + 1; j < contexts.length; j++) {
      const ctx1 = contexts[i];
      const ctx2 = contexts[j];
      
      try {
        const data1 = JSON.parse(ctx1.extractedData);
        const data2 = JSON.parse(ctx2.extractedData);
        
        // Check for conflicting fields
        const conflictingFields = findConflictingFields(data1, data2);
        
        for (const field of conflictingFields) {
          conflicts.push({
            context1: ctx1,
            context2: ctx2,
            field,
            value1: String(data1[field]),
            value2: String(data2[field]),
          });
        }
      } catch {
        // Skip if JSON parsing fails
        continue;
      }
    }
  }

  return conflicts;
}

/**
 * Find fields that have conflicting values between two data objects
 */
function findConflictingFields(
  data1: Record<string, unknown>,
  data2: Record<string, unknown>
): string[] {
  const conflictingFields: string[] = [];
  
  // Key fields that indicate conflicts if different
  const criticalFields = [
    'mobility_status',
    'cognitive_status',
    'discharge_readiness',
    'caregiver_available',
    'home_safe',
    'pain_level',
    'fall_risk',
    'living_situation',
    'transportation_available',
  ];

  for (const field of criticalFields) {
    if (data1[field] !== undefined && data2[field] !== undefined) {
      // Normalize values for comparison
      const val1 = normalizeValue(data1[field]);
      const val2 = normalizeValue(data2[field]);
      
      if (val1 !== val2 && !areValuesCompatible(val1, val2)) {
        conflictingFields.push(field);
      }
    }
  }

  return conflictingFields;
}

/**
 * Normalize values for comparison
 */
function normalizeValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.toLowerCase().trim();
  }
  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no';
  }
  return String(value).toLowerCase().trim();
}

/**
 * Check if two values are compatible (not truly conflicting)
 */
function areValuesCompatible(val1: string, val2: string): boolean {
  // Define compatible value pairs
  const compatiblePairs = [
    ['good', 'stable'],
    ['yes', 'true', '1'],
    ['no', 'false', '0'],
    ['independent', 'ambulatory'],
    ['limited', 'moderate'],
  ];

  for (const group of compatiblePairs) {
    if (group.includes(val1) && group.includes(val2)) {
      return true;
    }
  }

  return false;
}

/**
 * Resolve a conflict between two ambient context records
 * Uses confidence scoring and recency to determine winner
 */
export async function resolveConflict(
  context1Id: string,
  context2Id: string,
  resolvedBy: string,
  manualResolution?: { winnerId: string; note: string }
): Promise<ConflictResolution> {
  const [ctx1, ctx2] = await Promise.all([
    prisma.ambientContext.findUnique({ where: { id: context1Id } }),
    prisma.ambientContext.findUnique({ where: { id: context2Id } }),
  ]);

  if (!ctx1 || !ctx2) {
    throw new Error('One or both context records not found');
  }

  let winnerId: string;
  let loserId: string;
  let reason: string;

  if (manualResolution) {
    // Manual resolution by user
    winnerId = manualResolution.winnerId;
    loserId = winnerId === context1Id ? context2Id : context1Id;
    reason = `Manual resolution: ${manualResolution.note}`;
  } else {
    // Automatic resolution based on confidence and recency
    const score1 = ctx1.overallConfidence + (ctx1.capturedAt > ctx2.capturedAt ? 0.1 : 0);
    const score2 = ctx2.overallConfidence + (ctx2.capturedAt > ctx1.capturedAt ? 0.1 : 0);

    if (score1 >= score2) {
      winnerId = context1Id;
      loserId = context2Id;
      reason = `Higher confidence (${ctx1.overallConfidence.toFixed(2)} vs ${ctx2.overallConfidence.toFixed(2)})`;
    } else {
      winnerId = context2Id;
      loserId = context1Id;
      reason = `Higher confidence (${ctx2.overallConfidence.toFixed(2)} vs ${ctx1.overallConfidence.toFixed(2)})`;
    }

    // Add recency factor to reason
    const winner = winnerId === context1Id ? ctx1 : ctx2;
    const loser = winnerId === context1Id ? ctx2 : ctx1;
    if (winner.capturedAt > loser.capturedAt) {
      reason += ' and more recent';
    }
  }

  // Update the losing context to mark it as superseded
  await prisma.ambientContext.update({
    where: { id: loserId },
    data: {
      supersededBy: winnerId,
      conflictFlag: true,
      resolutionNote: reason,
      resolvedAt: new Date(),
      resolvedBy,
    },
  });

  // Update the winning context to note what it supersedes
  await prisma.ambientContext.update({
    where: { id: winnerId },
    data: {
      supersedes: loserId,
    },
  });

  const winner = winnerId === context1Id ? ctx1 : ctx2;
  const loser = winnerId === context1Id ? ctx2 : ctx1;

  return {
    conflictId: `${context1Id}-${context2Id}`,
    winningContextId: winnerId,
    losingContextId: loserId,
    reason,
    confidenceDelta: Math.abs(winner.overallConfidence - loser.overallConfidence),
  };
}

/**
 * Get aggregated context for a patient, resolving conflicts automatically
 */
export async function getAggregatedContext(
  patientMrn: string,
  encounterId?: string
): Promise<{
  sources: Array<{
    source: ContextSource;
    confidence: number;
    data: Record<string, unknown>;
    capturedAt: Date;
  }>;
  aggregatedData: Record<string, unknown>;
  overallConfidence: number;
  conflictsResolved: number;
}> {
  const whereClause: { patientMrn: string; encounterId?: string; conflictFlag: boolean } = {
    patientMrn,
    conflictFlag: false, // Only non-superseded contexts
  };
  
  if (encounterId) {
    whereClause.encounterId = encounterId;
  }

  const contexts = await prisma.ambientContext.findMany({
    where: whereClause,
    orderBy: { capturedAt: 'desc' },
  });

  const sources = contexts.map(ctx => ({
    source: ctx.source,
    confidence: ctx.overallConfidence,
    data: JSON.parse(ctx.extractedData),
    capturedAt: ctx.capturedAt,
  }));

  // Aggregate data with confidence-weighted merging
  const aggregatedData: Record<string, unknown> = {};
  const fieldConfidences: Record<string, { value: unknown; confidence: number }> = {};

  for (const source of sources) {
    for (const [key, value] of Object.entries(source.data)) {
      if (!fieldConfidences[key] || source.confidence > fieldConfidences[key].confidence) {
        fieldConfidences[key] = { value, confidence: source.confidence };
        aggregatedData[key] = value;
      }
    }
  }

  // Calculate overall confidence as weighted average
  const totalConfidence = sources.reduce((sum, s) => sum + s.confidence, 0);
  const overallConfidence = sources.length > 0 ? totalConfidence / sources.length : 0;

  // Count resolved conflicts
  const resolvedCount = await prisma.ambientContext.count({
    where: {
      patientMrn,
      conflictFlag: true,
    },
  });

  return {
    sources,
    aggregatedData,
    overallConfidence,
    conflictsResolved: resolvedCount,
  };
}

export default {
  calculateOverallConfidence,
  detectConflicts,
  resolveConflict,
  getAggregatedContext,
  SOURCE_RELIABILITY,
};
