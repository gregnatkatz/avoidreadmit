import { PrismaClient, AlertType, DCG_ContextPattern } from '@prisma/client';

const prisma = new PrismaClient();

export interface PerformanceMetrics {
  patternId: string;
  periodStart: Date;
  periodEnd: Date;
  totalApplications: number;
  successCount: number;
  readmitCount: number;
  pendingCount: number;
  successRate: number;
  liftVsBaseline: number;
  confidenceInterval: { lower: number; upper: number };
  trend: 'improving' | 'stable' | 'degrading';
}

export interface AlertConfig {
  performanceDegradationThreshold: number; // e.g., 0.1 = 10% drop
  insufficientSampleThreshold: number;     // e.g., 30 minimum samples
  emergingPatternThreshold: number;        // e.g., 0.75 success rate
  confidenceDriftThreshold: number;        // e.g., 0.15 drift
}

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  performanceDegradationThreshold: 0.1,
  insufficientSampleThreshold: 30,
  emergingPatternThreshold: 0.75,
  confidenceDriftThreshold: 0.15,
};

/**
 * Calculate performance metrics for a pattern over a time period
 */
export async function calculatePatternPerformance(
  patternId: string,
  periodStart: Date,
  periodEnd: Date,
  baselineRate: number = 0.85
): Promise<PerformanceMetrics> {
  // Get all decisions that used this pattern in the period
  const decisionSnapshots = await prisma.decisionPatternSnapshot.findMany({
    where: {
      snapshot: {
        patternId,
        snapshotDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    },
    include: {
      decision: {
        include: {
          outcome: true,
        },
      },
    },
  });

  // If no decision snapshots, fall back to pattern's own metrics
  if (decisionSnapshots.length === 0) {
    const pattern = await prisma.dCG_ContextPattern.findUnique({
      where: { id: patternId },
    });

    if (!pattern) {
      throw new Error(`Pattern ${patternId} not found`);
    }

    return {
      patternId,
      periodStart,
      periodEnd,
      totalApplications: pattern.sample_size,
      successCount: pattern.success_count,
      readmitCount: pattern.sample_size - pattern.success_count,
      pendingCount: 0,
      successRate: pattern.success_rate,
      liftVsBaseline: pattern.lift_vs_baseline ?? 0,
      confidenceInterval: calculateConfidenceInterval(pattern.success_rate, pattern.sample_size),
      trend: 'stable',
    };
  }

  let successCount = 0;
  let readmitCount = 0;
  let pendingCount = 0;

  for (const ds of decisionSnapshots) {
    if (!ds.decision.outcome) {
      pendingCount++;
    } else if (ds.decision.outcome.readmitted) {
      readmitCount++;
    } else {
      successCount++;
    }
  }

  const totalApplications = decisionSnapshots.length;
  const completedCount = successCount + readmitCount;
  const successRate = completedCount > 0 ? successCount / completedCount : 0;
  const liftVsBaseline = baselineRate > 0 ? (successRate - baselineRate) / baselineRate : 0;

  // Get previous period for trend calculation
  const periodLength = periodEnd.getTime() - periodStart.getTime();
  const prevPeriodStart = new Date(periodStart.getTime() - periodLength);
  const prevPeriodEnd = periodStart;

  const prevPerformance = await prisma.patternPerformance.findFirst({
    where: {
      patternId,
      periodStart: { gte: prevPeriodStart },
      periodEnd: { lte: prevPeriodEnd },
    },
    orderBy: { periodEnd: 'desc' },
  });

  let trend: 'improving' | 'stable' | 'degrading' = 'stable';
  if (prevPerformance) {
    const rateDiff = successRate - prevPerformance.successRate;
    if (rateDiff > 0.05) {
      trend = 'improving';
    } else if (rateDiff < -0.05) {
      trend = 'degrading';
    }
  }

  return {
    patternId,
    periodStart,
    periodEnd,
    totalApplications,
    successCount,
    readmitCount,
    pendingCount,
    successRate,
    liftVsBaseline,
    confidenceInterval: calculateConfidenceInterval(successRate, completedCount),
    trend,
  };
}

/**
 * Calculate Wilson score confidence interval
 */
function calculateConfidenceInterval(
  successRate: number,
  sampleSize: number,
  confidence: number = 0.95
): { lower: number; upper: number } {
  if (sampleSize === 0) {
    return { lower: 0, upper: 1 };
  }

  // Z-score for 95% confidence
  const z = confidence === 0.95 ? 1.96 : 1.645;
  const p = successRate;
  const n = sampleSize;

  const denominator = 1 + z * z / n;
  const center = p + z * z / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n);

  const lower = Math.max(0, (center - spread) / denominator);
  const upper = Math.min(1, (center + spread) / denominator);

  return { lower, upper };
}

/**
 * Store performance metrics in database
 */
export async function storePerformanceMetrics(
  metrics: PerformanceMetrics
): Promise<string> {
  const record = await prisma.patternPerformance.upsert({
    where: {
      patternId_periodStart: {
        patternId: metrics.patternId,
        periodStart: metrics.periodStart,
      },
    },
    update: {
      periodEnd: metrics.periodEnd,
      totalApplications: metrics.totalApplications,
      successCount: metrics.successCount,
      readmitCount: metrics.readmitCount,
      pendingCount: metrics.pendingCount,
      successRate: metrics.successRate,
      liftVsBaseline: metrics.liftVsBaseline,
      confidenceInterval: JSON.stringify(metrics.confidenceInterval),
      trend: metrics.trend,
      alertFlag: metrics.trend === 'degrading',
    },
    create: {
      patternId: metrics.patternId,
      periodStart: metrics.periodStart,
      periodEnd: metrics.periodEnd,
      totalApplications: metrics.totalApplications,
      successCount: metrics.successCount,
      readmitCount: metrics.readmitCount,
      pendingCount: metrics.pendingCount,
      successRate: metrics.successRate,
      liftVsBaseline: metrics.liftVsBaseline,
      confidenceInterval: JSON.stringify(metrics.confidenceInterval),
      trend: metrics.trend,
      alertFlag: metrics.trend === 'degrading',
    },
  });

  return record.id;
}

/**
 * Check for alert conditions and create alerts
 */
export async function checkAndCreateAlerts(
  patternId: string,
  metrics: PerformanceMetrics,
  config: AlertConfig = DEFAULT_ALERT_CONFIG
): Promise<string[]> {
  const alertIds: string[] = [];
  const pattern = await prisma.dCG_ContextPattern.findUnique({
    where: { id: patternId },
  });

  if (!pattern) {
    return alertIds;
  }

  // Check for performance degradation
  if (metrics.trend === 'degrading') {
    const prevMetrics = await prisma.patternPerformance.findFirst({
      where: {
        patternId,
        periodEnd: { lt: metrics.periodStart },
      },
      orderBy: { periodEnd: 'desc' },
    });

    if (prevMetrics) {
      const degradation = prevMetrics.successRate - metrics.successRate;
      if (degradation >= config.performanceDegradationThreshold) {
        const alert = await createAlert(
          patternId,
          'PERFORMANCE_DEGRADATION',
          degradation >= 0.2 ? 'critical' : 'warning',
          `Pattern "${pattern.title}" success rate dropped by ${(degradation * 100).toFixed(1)}%`,
          {
            previousRate: prevMetrics.successRate,
            currentRate: metrics.successRate,
            degradation,
          }
        );
        alertIds.push(alert.id);
      }
    }
  }

  // Check for insufficient sample size
  if (metrics.totalApplications < config.insufficientSampleThreshold) {
    const alert = await createAlert(
      patternId,
      'INSUFFICIENT_SAMPLE',
      'info',
      `Pattern "${pattern.title}" has only ${metrics.totalApplications} applications (minimum: ${config.insufficientSampleThreshold})`,
      {
        currentSample: metrics.totalApplications,
        minimumRequired: config.insufficientSampleThreshold,
      }
    );
    alertIds.push(alert.id);
  }

  // Check for confidence drift (widening confidence interval)
  const ciWidth = metrics.confidenceInterval.upper - metrics.confidenceInterval.lower;
  if (ciWidth > config.confidenceDriftThreshold * 2) {
    const alert = await createAlert(
      patternId,
      'CONFIDENCE_DRIFT',
      'warning',
      `Pattern "${pattern.title}" confidence interval is wide (${(ciWidth * 100).toFixed(1)}%)`,
      {
        confidenceInterval: metrics.confidenceInterval,
        width: ciWidth,
      }
    );
    alertIds.push(alert.id);
  }

  return alertIds;
}

/**
 * Create an alert record
 */
async function createAlert(
  patternId: string,
  alertType: AlertType,
  severity: 'info' | 'warning' | 'critical',
  message: string,
  details: Record<string, unknown>
): Promise<{ id: string }> {
  // Check if similar alert already exists and is unacknowledged
  const existingAlert = await prisma.patternAlert.findFirst({
    where: {
      patternId,
      alertType,
      acknowledgedAt: null,
    },
  });

  if (existingAlert) {
    // Update existing alert
    return prisma.patternAlert.update({
      where: { id: existingAlert.id },
      data: {
        severity,
        message,
        details: JSON.stringify(details),
        createdAt: new Date(),
      },
    });
  }

  // Create new alert
  return prisma.patternAlert.create({
    data: {
      patternId,
      alertType,
      severity,
      message,
      details: JSON.stringify(details),
    },
  });
}

/**
 * Detect emerging patterns from decision outcomes
 */
export async function detectEmergingPatterns(
  minSampleSize: number = 20,
  minSuccessRate: number = 0.75
): Promise<Array<{
  contextCriteria: Record<string, unknown>;
  sampleSize: number;
  successRate: number;
  potentialLift: number;
}>> {
  // Get recent decisions with outcomes
  const recentDecisions = await prisma.dCG_DecisionTrace.findMany({
    where: {
      outcome: {
        isNot: null,
      },
      created_at: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
      },
    },
    include: {
      outcome: true,
      clinical_snapshot: true,
      social_snapshot: true,
    },
    take: 1000,
  });

  // Group by context characteristics
  const contextGroups = new Map<string, {
    decisions: typeof recentDecisions;
    successCount: number;
    totalCount: number;
  }>();

  for (const decision of recentDecisions) {
    // Create context key from key characteristics
    const contextKey = createContextKey(decision);
    
    if (!contextGroups.has(contextKey)) {
      contextGroups.set(contextKey, {
        decisions: [],
        successCount: 0,
        totalCount: 0,
      });
    }

    const group = contextGroups.get(contextKey)!;
    group.decisions.push(decision);
    group.totalCount++;
    
    if (decision.outcome && !decision.outcome.readmitted) {
      group.successCount++;
    }
  }

  // Find groups that meet emerging pattern criteria
  const emergingPatterns: Array<{
    contextCriteria: Record<string, unknown>;
    sampleSize: number;
    successRate: number;
    potentialLift: number;
  }> = [];

  const baselineRate = 0.85; // Default baseline

  for (const [contextKey, group] of contextGroups) {
    if (group.totalCount >= minSampleSize) {
      const successRate = group.successCount / group.totalCount;
      
      if (successRate >= minSuccessRate) {
        const potentialLift = (successRate - baselineRate) / baselineRate;
        
        emergingPatterns.push({
          contextCriteria: parseContextKey(contextKey),
          sampleSize: group.totalCount,
          successRate,
          potentialLift,
        });
      }
    }
  }

  // Sort by potential lift
  return emergingPatterns.sort((a, b) => b.potentialLift - a.potentialLift);
}

/**
 * Create a context key for grouping decisions
 */
function createContextKey(decision: {
  clinical_snapshot?: { mobility_status?: string; cognitive_status?: string } | null;
  social_snapshot?: { living_situation?: string; caregiver_availability?: string } | null;
}): string {
  const parts: string[] = [];
  
  if (decision.clinical_snapshot?.mobility_status) {
    parts.push(`mobility:${decision.clinical_snapshot.mobility_status}`);
  }
  if (decision.clinical_snapshot?.cognitive_status) {
    parts.push(`cognitive:${decision.clinical_snapshot.cognitive_status}`);
  }
  if (decision.social_snapshot?.living_situation) {
    parts.push(`living:${decision.social_snapshot.living_situation}`);
  }
  if (decision.social_snapshot?.caregiver_availability) {
    parts.push(`caregiver:${decision.social_snapshot.caregiver_availability}`);
  }

  return parts.sort().join('|');
}

/**
 * Parse a context key back into criteria object
 */
function parseContextKey(key: string): Record<string, unknown> {
  const criteria: Record<string, unknown> = {};
  const parts = key.split('|');
  
  for (const part of parts) {
    const [field, value] = part.split(':');
    if (field && value) {
      criteria[field] = value;
    }
  }

  return criteria;
}

/**
 * Get all unacknowledged alerts
 */
export async function getUnacknowledgedAlerts(
  patternId?: string,
  severity?: 'info' | 'warning' | 'critical'
): Promise<Array<{
  id: string;
  patternId: string;
  patternTitle: string;
  alertType: AlertType;
  severity: string;
  message: string;
  details: Record<string, unknown>;
  createdAt: Date;
}>> {
  const whereClause: {
    acknowledgedAt: null;
    patternId?: string;
    severity?: string;
  } = {
    acknowledgedAt: null,
  };

  if (patternId) {
    whereClause.patternId = patternId;
  }
  if (severity) {
    whereClause.severity = severity;
  }

  const alerts = await prisma.patternAlert.findMany({
    where: whereClause,
    include: {
      pattern: true,
    },
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return alerts.map(alert => ({
    id: alert.id,
    patternId: alert.patternId,
    patternTitle: alert.pattern.title,
    alertType: alert.alertType,
    severity: alert.severity,
    message: alert.message,
    details: alert.details ? JSON.parse(alert.details) : {},
    createdAt: alert.createdAt,
  }));
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  alertId: string,
  acknowledgedBy: string,
  resolution?: string,
  resolutionNote?: string
): Promise<void> {
  await prisma.patternAlert.update({
    where: { id: alertId },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedBy,
      resolution,
      resolutionNote,
    },
  });
}

/**
 * Run full feedback loop analysis for all patterns
 */
export async function runFeedbackLoopAnalysis(
  periodStart: Date,
  periodEnd: Date
): Promise<{
  patternsAnalyzed: number;
  alertsCreated: number;
  emergingPatternsFound: number;
}> {
  const patterns = await prisma.dCG_ContextPattern.findMany({
    where: { status: 'active' },
  });

  let alertsCreated = 0;

  for (const pattern of patterns) {
    const metrics = await calculatePatternPerformance(
      pattern.id,
      periodStart,
      periodEnd,
      pattern.baseline_rate ?? 0.85
    );

    await storePerformanceMetrics(metrics);
    
    const alerts = await checkAndCreateAlerts(pattern.id, metrics);
    alertsCreated += alerts.length;
  }

  const emergingPatterns = await detectEmergingPatterns();

  // Create alerts for emerging patterns
  for (const emerging of emergingPatterns.slice(0, 5)) { // Top 5
    await createAlert(
      patterns[0]?.id ?? '', // Use first pattern as placeholder
      'EMERGING_PATTERN',
      'info',
      `Potential new pattern detected with ${(emerging.successRate * 100).toFixed(1)}% success rate`,
      {
        criteria: emerging.contextCriteria,
        sampleSize: emerging.sampleSize,
        successRate: emerging.successRate,
        potentialLift: emerging.potentialLift,
      }
    );
    alertsCreated++;
  }

  return {
    patternsAnalyzed: patterns.length,
    alertsCreated,
    emergingPatternsFound: emergingPatterns.length,
  };
}

export default {
  calculatePatternPerformance,
  storePerformanceMetrics,
  checkAndCreateAlerts,
  detectEmergingPatterns,
  getUnacknowledgedAlerts,
  acknowledgeAlert,
  runFeedbackLoopAnalysis,
};
