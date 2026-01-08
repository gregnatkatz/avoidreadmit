import { PrismaClient, DCG_ContextPattern, DCG_DecisionTrace } from '@prisma/client';

const prisma = new PrismaClient();

export interface PatternMatch {
  patternId: string;
  patternNumber: string;
  title: string;
  matchScore: number;
  confidence: number;
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  recommendation: 'apply' | 'review' | 'skip';
}

export interface PatientContext {
  mrn: string;
  age?: number;
  diagnoses?: string[];
  lengthOfStay?: number;
  mobilityStatus?: string;
  cognitiveStatus?: string;
  caregiverAvailable?: boolean;
  livingSituation?: string;
  socialSupportScore?: number;
  ambientConfidence?: number;
}

export interface ApplicabilityRules {
  ageRange?: { min?: number; max?: number };
  diagnoses?: string[];
  losRange?: { min?: number; max?: number };
  requiredSources?: string[];
  excludeDiagnoses?: string[];
}

export interface RetrievalStrategy {
  matchFields: string[];
  weights: Record<string, number>;
  threshold: number;
}

/**
 * Match a patient to applicable patterns based on their context
 */
export async function matchPatientToPatterns(
  patientContext: PatientContext,
  options: { minConfidence?: number; includeEmerging?: boolean } = {}
): Promise<PatternMatch[]> {
  const { minConfidence = 0.7, includeEmerging = false } = options;

  // Get all active patterns
  const patterns = await prisma.dCG_ContextPattern.findMany({
    where: {
      status: 'active',
      ...(includeEmerging ? {} : { evidenceStrength: { not: 'emerging' } }),
    },
    orderBy: { success_rate: 'desc' },
  });

  const matches: PatternMatch[] = [];

  for (const pattern of patterns) {
    const matchResult = evaluatePatternMatch(pattern, patientContext);
    
    // Check if pattern meets minimum confidence threshold
    const patternMinConfidence = pattern.minimumConfidence ?? 0.7;
    const contextConfidence = patientContext.ambientConfidence ?? 1.0;
    
    if (contextConfidence < patternMinConfidence) {
      continue; // Skip patterns that require higher confidence than we have
    }

    // Check contraindications
    if (pattern.contraindications) {
      const contraindications = JSON.parse(pattern.contraindications);
      if (hasContraindication(patientContext, contraindications)) {
        continue;
      }
    }

    if (matchResult.score >= minConfidence) {
      matches.push({
        patternId: pattern.id,
        patternNumber: pattern.pattern_number,
        title: pattern.title,
        matchScore: matchResult.score,
        confidence: contextConfidence * matchResult.score,
        matchedCriteria: matchResult.matchedCriteria,
        unmatchedCriteria: matchResult.unmatchedCriteria,
        recommendation: getRecommendation(matchResult.score, pattern.evidenceStrength),
      });
    }
  }

  // Sort by match score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Evaluate how well a patient matches a specific pattern
 */
function evaluatePatternMatch(
  pattern: DCG_ContextPattern,
  context: PatientContext
): { score: number; matchedCriteria: string[]; unmatchedCriteria: string[] } {
  const matchedCriteria: string[] = [];
  const unmatchedCriteria: string[] = [];
  
  // Parse pattern criteria
  let criteria: Record<string, unknown> = {};
  try {
    criteria = JSON.parse(pattern.context_criteria);
  } catch {
    // If parsing fails, use basic matching
    criteria = {};
  }

  // Parse applicability rules if available
  let applicabilityRules: ApplicabilityRules = {};
  if (pattern.applicabilityRules) {
    try {
      applicabilityRules = JSON.parse(pattern.applicabilityRules);
    } catch {
      applicabilityRules = {};
    }
  }

  // Parse retrieval strategy if available
  let retrievalStrategy: RetrievalStrategy = {
    matchFields: ['diagnoses', 'mobilityStatus', 'caregiverAvailable', 'livingSituation'],
    weights: { diagnoses: 0.3, mobilityStatus: 0.2, caregiverAvailable: 0.25, livingSituation: 0.25 },
    threshold: 0.6,
  };
  if (pattern.retrievalStrategy) {
    try {
      retrievalStrategy = JSON.parse(pattern.retrievalStrategy);
    } catch {
      // Use defaults
    }
  }

  let totalWeight = 0;
  let matchedWeight = 0;

  // Check age range
  if (applicabilityRules.ageRange && context.age !== undefined) {
    const { min, max } = applicabilityRules.ageRange;
    const weight = retrievalStrategy.weights['age'] ?? 0.1;
    totalWeight += weight;
    
    if ((min === undefined || context.age >= min) && (max === undefined || context.age <= max)) {
      matchedCriteria.push(`Age ${context.age} in range [${min ?? 0}-${max ?? 'any'}]`);
      matchedWeight += weight;
    } else {
      unmatchedCriteria.push(`Age ${context.age} outside range [${min ?? 0}-${max ?? 'any'}]`);
    }
  }

  // Check diagnoses
  if (criteria['diagnoses'] || applicabilityRules.diagnoses) {
    const requiredDiagnoses = (applicabilityRules.diagnoses || criteria['diagnoses'] as string[]) ?? [];
    const weight = retrievalStrategy.weights['diagnoses'] ?? 0.3;
    totalWeight += weight;
    
    if (context.diagnoses && requiredDiagnoses.length > 0) {
      const matchedDx = requiredDiagnoses.filter(dx => 
        context.diagnoses!.some(patientDx => 
          patientDx.toLowerCase().includes(dx.toLowerCase())
        )
      );
      
      if (matchedDx.length > 0) {
        matchedCriteria.push(`Diagnoses match: ${matchedDx.join(', ')}`);
        matchedWeight += weight * (matchedDx.length / requiredDiagnoses.length);
      } else {
        unmatchedCriteria.push(`No matching diagnoses from: ${requiredDiagnoses.join(', ')}`);
      }
    }
  }

  // Check length of stay
  if (applicabilityRules.losRange && context.lengthOfStay !== undefined) {
    const { min, max } = applicabilityRules.losRange;
    const weight = retrievalStrategy.weights['los'] ?? 0.1;
    totalWeight += weight;
    
    if ((min === undefined || context.lengthOfStay >= min) && (max === undefined || context.lengthOfStay <= max)) {
      matchedCriteria.push(`LOS ${context.lengthOfStay} days in range`);
      matchedWeight += weight;
    } else {
      unmatchedCriteria.push(`LOS ${context.lengthOfStay} days outside range`);
    }
  }

  // Check mobility status
  if (criteria['mobility_status'] && context.mobilityStatus) {
    const weight = retrievalStrategy.weights['mobilityStatus'] ?? 0.2;
    totalWeight += weight;
    
    const requiredMobility = String(criteria['mobility_status']).toLowerCase();
    const patientMobility = context.mobilityStatus.toLowerCase();
    
    if (patientMobility.includes(requiredMobility) || requiredMobility.includes(patientMobility)) {
      matchedCriteria.push(`Mobility: ${context.mobilityStatus}`);
      matchedWeight += weight;
    } else {
      unmatchedCriteria.push(`Mobility mismatch: ${context.mobilityStatus} vs ${requiredMobility}`);
    }
  }

  // Check caregiver availability
  if (criteria['caregiver_available'] !== undefined && context.caregiverAvailable !== undefined) {
    const weight = retrievalStrategy.weights['caregiverAvailable'] ?? 0.25;
    totalWeight += weight;
    
    if (criteria['caregiver_available'] === context.caregiverAvailable) {
      matchedCriteria.push(`Caregiver available: ${context.caregiverAvailable}`);
      matchedWeight += weight;
    } else {
      unmatchedCriteria.push(`Caregiver mismatch`);
    }
  }

  // Check living situation
  if (criteria['living_situation'] && context.livingSituation) {
    const weight = retrievalStrategy.weights['livingSituation'] ?? 0.25;
    totalWeight += weight;
    
    const requiredSituation = String(criteria['living_situation']).toLowerCase();
    const patientSituation = context.livingSituation.toLowerCase();
    
    if (patientSituation.includes(requiredSituation) || requiredSituation.includes(patientSituation)) {
      matchedCriteria.push(`Living situation: ${context.livingSituation}`);
      matchedWeight += weight;
    } else {
      unmatchedCriteria.push(`Living situation mismatch`);
    }
  }

  // Check social support score
  if (criteria['social_support_min'] && context.socialSupportScore !== undefined) {
    const weight = retrievalStrategy.weights['socialSupport'] ?? 0.15;
    totalWeight += weight;
    
    const minScore = Number(criteria['social_support_min']);
    if (context.socialSupportScore >= minScore) {
      matchedCriteria.push(`Social support score: ${context.socialSupportScore}`);
      matchedWeight += weight;
    } else {
      unmatchedCriteria.push(`Social support below threshold`);
    }
  }

  // Calculate final score
  const score = totalWeight > 0 ? matchedWeight / totalWeight : 0;

  return { score, matchedCriteria, unmatchedCriteria };
}

/**
 * Check if patient has any contraindications for a pattern
 */
function hasContraindication(
  context: PatientContext,
  contraindications: Record<string, unknown>
): boolean {
  // Check excluded diagnoses
  if (contraindications['excludeDiagnoses'] && context.diagnoses) {
    const excluded = contraindications['excludeDiagnoses'] as string[];
    for (const dx of excluded) {
      if (context.diagnoses.some(patientDx => patientDx.toLowerCase().includes(dx.toLowerCase()))) {
        return true;
      }
    }
  }

  // Check age exclusions
  if (contraindications['excludeAgeRange'] && context.age !== undefined) {
    const { min, max } = contraindications['excludeAgeRange'] as { min?: number; max?: number };
    if ((min === undefined || context.age >= min) && (max === undefined || context.age <= max)) {
      return true;
    }
  }

  // Check cognitive status exclusions
  if (contraindications['excludeCognitiveStatus'] && context.cognitiveStatus) {
    const excluded = contraindications['excludeCognitiveStatus'] as string[];
    if (excluded.some(status => context.cognitiveStatus!.toLowerCase().includes(status.toLowerCase()))) {
      return true;
    }
  }

  return false;
}

/**
 * Get recommendation based on match score and evidence strength
 */
function getRecommendation(
  matchScore: number,
  evidenceStrength: string
): 'apply' | 'review' | 'skip' {
  if (evidenceStrength === 'strong' && matchScore >= 0.8) {
    return 'apply';
  }
  if (evidenceStrength === 'moderate' && matchScore >= 0.85) {
    return 'apply';
  }
  if (matchScore >= 0.7) {
    return 'review';
  }
  return 'skip';
}

/**
 * Create a snapshot of pattern state at decision time
 */
export async function createPatternSnapshot(
  patternId: string
): Promise<string> {
  const pattern = await prisma.dCG_ContextPattern.findUnique({
    where: { id: patternId },
  });

  if (!pattern) {
    throw new Error(`Pattern ${patternId} not found`);
  }

  const snapshot = await prisma.patternSnapshot.create({
    data: {
      patternId: pattern.id,
      successRate: pattern.success_rate,
      lift: pattern.lift_vs_baseline ?? 0,
      sampleSize: pattern.sample_size,
      conditions: pattern.context_criteria,
    },
  });

  return snapshot.id;
}

/**
 * Link a decision to pattern snapshots
 */
export async function linkDecisionToPatterns(
  decisionId: string,
  patternMatches: PatternMatch[]
): Promise<void> {
  for (const match of patternMatches) {
    // Create snapshot of pattern at decision time
    const snapshotId = await createPatternSnapshot(match.patternId);
    
    // Create junction record
    await prisma.decisionPatternSnapshot.create({
      data: {
        decisionId,
        snapshotId,
        matchScore: match.matchScore,
      },
    });
  }
}

/**
 * Get patterns that were applied to a specific decision
 */
export async function getPatternsForDecision(
  decisionId: string
): Promise<Array<{
  pattern: DCG_ContextPattern;
  snapshot: { successRate: number; lift: number; sampleSize: number };
  matchScore: number;
}>> {
  const decisionSnapshots = await prisma.decisionPatternSnapshot.findMany({
    where: { decisionId },
    include: {
      snapshot: {
        include: {
          pattern: true,
        },
      },
    },
  });

  return decisionSnapshots.map(ds => ({
    pattern: ds.snapshot.pattern,
    snapshot: {
      successRate: ds.snapshot.successRate,
      lift: ds.snapshot.lift,
      sampleSize: ds.snapshot.sampleSize,
    },
    matchScore: ds.matchScore,
  }));
}

export default {
  matchPatientToPatterns,
  createPatternSnapshot,
  linkDecisionToPatterns,
  getPatternsForDecision,
};
