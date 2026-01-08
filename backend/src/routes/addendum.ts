import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import conflictResolver from '../services/conflictResolver';
import patternMatcher from '../services/patternMatcher';
import feedbackLoop from '../services/feedbackLoop';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// TEMPORAL CONTEXT ROUTES
// ============================================

/**
 * GET /api/addendum/policy-versions
 * Get all policy versions with optional filtering
 */
router.get('/policy-versions', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    
    const whereClause: { retiredDate?: null | { not: null } } = {};
    if (active === 'true') {
      whereClause.retiredDate = null;
    } else if (active === 'false') {
      whereClause.retiredDate = { not: null };
    }

    const versions = await prisma.policyVersion.findMany({
      where: whereClause,
      orderBy: { effectiveDate: 'desc' },
      include: {
        _count: {
          select: { decisions: true },
        },
      },
    });

    res.json(versions.map(v => ({
      ...v,
      criteria: JSON.parse(v.criteria),
      decisionCount: v._count.decisions,
    })));
  } catch (error) {
    console.error('Error fetching policy versions:', error);
    res.status(500).json({ error: 'Failed to fetch policy versions' });
  }
});

/**
 * GET /api/addendum/policy-versions/:id
 * Get a specific policy version with its decisions
 */
router.get('/policy-versions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const version = await prisma.policyVersion.findUnique({
      where: { id },
      include: {
        decisions: {
          take: 100,
          orderBy: { decision_datetime: 'desc' },
          include: {
            outcome: true,
          },
        },
      },
    });

    if (!version) {
      return res.status(404).json({ error: 'Policy version not found' });
    }

    res.json({
      ...version,
      criteria: JSON.parse(version.criteria),
    });
  } catch (error) {
    console.error('Error fetching policy version:', error);
    res.status(500).json({ error: 'Failed to fetch policy version' });
  }
});

/**
 * GET /api/addendum/pattern-snapshots/:patternId
 * Get historical snapshots for a pattern
 */
router.get('/pattern-snapshots/:patternId', async (req: Request, res: Response) => {
  try {
    const { patternId } = req.params;
    const { limit = '50' } = req.query;

    const snapshots = await prisma.patternSnapshot.findMany({
      where: { patternId },
      orderBy: { snapshotDate: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(snapshots.map(s => ({
      ...s,
      conditions: JSON.parse(s.conditions),
    })));
  } catch (error) {
    console.error('Error fetching pattern snapshots:', error);
    res.status(500).json({ error: 'Failed to fetch pattern snapshots' });
  }
});

/**
 * GET /api/addendum/decision/:id/temporal
 * Get temporal context for a specific decision (point-in-time view)
 */
router.get('/decision/:id/temporal', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const decision = await prisma.dCG_DecisionTrace.findUnique({
      where: { id },
      include: {
        policyVersion: true,
        patternSnapshots: {
          include: {
            snapshot: {
              include: {
                pattern: true,
              },
            },
          },
        },
        outcome: true,
      },
    });

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    res.json({
      decision: {
        id: decision.id,
        traceNumber: decision.trace_number,
        decisionDatetime: decision.decision_datetime,
        decisionValue: decision.decision_value,
        decisionMaker: decision.decision_maker_name,
      },
      policyVersion: decision.policyVersion ? {
        version: decision.policyVersion.version,
        effectiveDate: decision.policyVersion.effectiveDate,
        criteria: JSON.parse(decision.policyVersion.criteria),
      } : null,
      contextSnapshot: decision.contextSnapshot ? JSON.parse(decision.contextSnapshot) : null,
      criteriaSnapshot: decision.criteriaSnapshot ? JSON.parse(decision.criteriaSnapshot) : null,
      aiReasoning: decision.aiReasoning ? JSON.parse(decision.aiReasoning) : null,
      aiRecommendation: decision.aiRecommendation,
      aiConfidence: decision.aiConfidence,
      riskScore: decision.riskScore,
      patternsApplied: decision.patternSnapshots.map(ps => ({
        patternId: ps.snapshot.patternId,
        patternNumber: ps.snapshot.pattern.pattern_number,
        patternTitle: ps.snapshot.pattern.title,
        matchScore: ps.matchScore,
        snapshotMetrics: {
          successRate: ps.snapshot.successRate,
          lift: ps.snapshot.lift,
          sampleSize: ps.snapshot.sampleSize,
        },
      })),
      outcome: decision.outcome,
    });
  } catch (error) {
    console.error('Error fetching decision temporal context:', error);
    res.status(500).json({ error: 'Failed to fetch decision temporal context' });
  }
});

// ============================================
// PROVENANCE & CONFIDENCE ROUTES
// ============================================

/**
 * GET /api/addendum/ambient-context/:patientMrn
 * Get ambient context with confidence breakdown for a patient
 */
router.get('/ambient-context/:patientMrn', async (req: Request, res: Response) => {
  try {
    const { patientMrn } = req.params;
    const { encounterId } = req.query;

    const aggregated = await conflictResolver.getAggregatedContext(
      patientMrn,
      encounterId as string | undefined
    );

    res.json({
      patientMrn,
      sources: aggregated.sources.map(s => ({
        source: s.source,
        confidence: s.confidence,
        reliability: conflictResolver.SOURCE_RELIABILITY[s.source],
        data: s.data,
        capturedAt: s.capturedAt,
      })),
      aggregatedData: aggregated.aggregatedData,
      overallConfidence: aggregated.overallConfidence,
      conflictsResolved: aggregated.conflictsResolved,
    });
  } catch (error) {
    console.error('Error fetching ambient context:', error);
    res.status(500).json({ error: 'Failed to fetch ambient context' });
  }
});

/**
 * GET /api/addendum/conflicts/:patientMrn
 * Detect conflicts in ambient context for a patient
 */
router.get('/conflicts/:patientMrn', async (req: Request, res: Response) => {
  try {
    const { patientMrn } = req.params;
    const { timeWindowHours = '24' } = req.query;

    const conflicts = await conflictResolver.detectConflicts(
      patientMrn,
      parseInt(timeWindowHours as string)
    );

    res.json({
      patientMrn,
      conflictCount: conflicts.length,
      conflicts: conflicts.map(c => ({
        context1Id: c.context1.id,
        context1Source: c.context1.source,
        context1Confidence: c.context1.overallConfidence,
        context2Id: c.context2.id,
        context2Source: c.context2.source,
        context2Confidence: c.context2.overallConfidence,
        conflictingField: c.field,
        value1: c.value1,
        value2: c.value2,
      })),
    });
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    res.status(500).json({ error: 'Failed to detect conflicts' });
  }
});

/**
 * POST /api/addendum/conflicts/resolve
 * Resolve a conflict between two ambient context records
 */
router.post('/conflicts/resolve', async (req: Request, res: Response) => {
  try {
    const { context1Id, context2Id, resolvedBy, winnerId, note } = req.body;

    if (!context1Id || !context2Id || !resolvedBy) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const resolution = await conflictResolver.resolveConflict(
      context1Id,
      context2Id,
      resolvedBy,
      winnerId ? { winnerId, note: note || 'Manual resolution' } : undefined
    );

    res.json(resolution);
  } catch (error) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({ error: 'Failed to resolve conflict' });
  }
});

/**
 * GET /api/addendum/source-reliability
 * Get source reliability weights
 */
router.get('/source-reliability', async (_req: Request, res: Response) => {
  res.json(conflictResolver.SOURCE_RELIABILITY);
});

// ============================================
// PATTERN MATCHING ROUTES
// ============================================

/**
 * POST /api/addendum/match-patterns
 * Match a patient to applicable patterns
 */
router.post('/match-patterns', async (req: Request, res: Response) => {
  try {
    const { patientContext, options } = req.body;

    if (!patientContext || !patientContext.mrn) {
      return res.status(400).json({ error: 'Patient context with MRN required' });
    }

    const matches = await patternMatcher.matchPatientToPatterns(patientContext, options);

    res.json({
      patientMrn: patientContext.mrn,
      matchCount: matches.length,
      matches,
    });
  } catch (error) {
    console.error('Error matching patterns:', error);
    res.status(500).json({ error: 'Failed to match patterns' });
  }
});

/**
 * GET /api/addendum/decision/:id/patterns
 * Get patterns that were applied to a decision
 */
router.get('/decision/:id/patterns', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const patterns = await patternMatcher.getPatternsForDecision(id);

    res.json({
      decisionId: id,
      patternCount: patterns.length,
      patterns: patterns.map(p => ({
        patternId: p.pattern.id,
        patternNumber: p.pattern.pattern_number,
        title: p.pattern.title,
        description: p.pattern.description,
        matchScore: p.matchScore,
        snapshotMetrics: p.snapshot,
        currentMetrics: {
          successRate: p.pattern.success_rate,
          lift: p.pattern.lift_vs_baseline,
          sampleSize: p.pattern.sample_size,
        },
        selfDescribing: {
          applicabilityRules: p.pattern.applicabilityRules ? JSON.parse(p.pattern.applicabilityRules) : null,
          retrievalStrategy: p.pattern.retrievalStrategy ? JSON.parse(p.pattern.retrievalStrategy) : null,
          contraindications: p.pattern.contraindications ? JSON.parse(p.pattern.contraindications) : null,
          minimumConfidence: p.pattern.minimumConfidence,
          discoveryMethod: p.pattern.discoveryMethod,
          evidenceStrength: p.pattern.evidenceStrength,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching decision patterns:', error);
    res.status(500).json({ error: 'Failed to fetch decision patterns' });
  }
});

// ============================================
// ALERTS & FEEDBACK LOOP ROUTES
// ============================================

/**
 * GET /api/addendum/alerts
 * Get all unacknowledged alerts
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { patternId, severity } = req.query;

    const alerts = await feedbackLoop.getUnacknowledgedAlerts(
      patternId as string | undefined,
      severity as 'info' | 'warning' | 'critical' | undefined
    );

    res.json({
      alertCount: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * POST /api/addendum/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { acknowledgedBy, resolution, resolutionNote } = req.body;

    if (!acknowledgedBy) {
      return res.status(400).json({ error: 'acknowledgedBy is required' });
    }

    await feedbackLoop.acknowledgeAlert(id, acknowledgedBy, resolution, resolutionNote);

    res.json({ success: true, alertId: id });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

/**
 * GET /api/addendum/pattern-performance/:patternId
 * Get performance history for a pattern
 */
router.get('/pattern-performance/:patternId', async (req: Request, res: Response) => {
  try {
    const { patternId } = req.params;
    const { limit = '12' } = req.query;

    const performance = await prisma.patternPerformance.findMany({
      where: { patternId },
      orderBy: { periodEnd: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({
      patternId,
      periods: performance.map(p => ({
        ...p,
        confidenceInterval: JSON.parse(p.confidenceInterval),
      })),
    });
  } catch (error) {
    console.error('Error fetching pattern performance:', error);
    res.status(500).json({ error: 'Failed to fetch pattern performance' });
  }
});

/**
 * POST /api/addendum/run-feedback-analysis
 * Run feedback loop analysis for all patterns
 */
router.post('/run-feedback-analysis', async (req: Request, res: Response) => {
  try {
    const { periodStart, periodEnd } = req.body;

    const start = periodStart ? new Date(periodStart) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = periodEnd ? new Date(periodEnd) : new Date();

    const results = await feedbackLoop.runFeedbackLoopAnalysis(start, end);

    res.json(results);
  } catch (error) {
    console.error('Error running feedback analysis:', error);
    res.status(500).json({ error: 'Failed to run feedback analysis' });
  }
});

/**
 * GET /api/addendum/emerging-patterns
 * Detect potential emerging patterns
 */
router.get('/emerging-patterns', async (req: Request, res: Response) => {
  try {
    const { minSampleSize = '20', minSuccessRate = '0.75' } = req.query;

    const emerging = await feedbackLoop.detectEmergingPatterns(
      parseInt(minSampleSize as string),
      parseFloat(minSuccessRate as string)
    );

    res.json({
      count: emerging.length,
      patterns: emerging,
    });
  } catch (error) {
    console.error('Error detecting emerging patterns:', error);
    res.status(500).json({ error: 'Failed to detect emerging patterns' });
  }
});

// ============================================
// ENHANCED PATTERNS ROUTES
// ============================================

/**
 * GET /api/addendum/patterns
 * Get all patterns with self-describing metadata
 */
router.get('/patterns', async (req: Request, res: Response) => {
  try {
    const { status, evidenceStrength } = req.query;

    const whereClause: { status?: string; evidenceStrength?: string } = {};
    if (status) whereClause.status = status as string;
    if (evidenceStrength) whereClause.evidenceStrength = evidenceStrength as string;

    const patterns = await prisma.dCG_ContextPattern.findMany({
      where: whereClause,
      orderBy: { success_rate: 'desc' },
      include: {
        _count: {
          select: {
            snapshots: true,
            performanceRecords: true,
            alerts: true,
          },
        },
      },
    });

    res.json(patterns.map(p => ({
      id: p.id,
      patternNumber: p.pattern_number,
      title: p.title,
      description: p.description,
      status: p.status,
      metrics: {
        successRate: p.success_rate,
        sampleSize: p.sample_size,
        lift: p.lift_vs_baseline,
        pValue: p.p_value,
        statisticallySignificant: p.statistically_significant,
      },
      selfDescribing: {
        applicabilityRules: p.applicabilityRules ? JSON.parse(p.applicabilityRules) : null,
        retrievalStrategy: p.retrievalStrategy ? JSON.parse(p.retrievalStrategy) : null,
        contraindications: p.contraindications ? JSON.parse(p.contraindications) : null,
        minimumConfidence: p.minimumConfidence,
      },
      learning: {
        discoveryMethod: p.discoveryMethod,
        evidenceStrength: p.evidenceStrength,
        lastValidated: p.lastValidated,
        validationResults: p.validationResults ? JSON.parse(p.validationResults) : null,
      },
      counts: {
        snapshots: p._count.snapshots,
        performanceRecords: p._count.performanceRecords,
        activeAlerts: p._count.alerts,
      },
      dataMonth: p.data_month,
      createdAt: p.created_at,
    })));
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({ error: 'Failed to fetch patterns' });
  }
});

/**
 * GET /api/addendum/patterns/:id
 * Get a specific pattern with full details
 */
router.get('/patterns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pattern = await prisma.dCG_ContextPattern.findUnique({
      where: { id },
      include: {
        snapshots: {
          take: 10,
          orderBy: { snapshotDate: 'desc' },
        },
        performanceRecords: {
          take: 12,
          orderBy: { periodEnd: 'desc' },
        },
        alerts: {
          where: { acknowledgedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    res.json({
      id: pattern.id,
      patternNumber: pattern.pattern_number,
      title: pattern.title,
      description: pattern.description,
      contextCriteria: JSON.parse(pattern.context_criteria),
      status: pattern.status,
      metrics: {
        successRate: pattern.success_rate,
        sampleSize: pattern.sample_size,
        successCount: pattern.success_count,
        baselineRate: pattern.baseline_rate,
        lift: pattern.lift_vs_baseline,
        pValue: pattern.p_value,
        statisticallySignificant: pattern.statistically_significant,
      },
      selfDescribing: {
        applicabilityRules: pattern.applicabilityRules ? JSON.parse(pattern.applicabilityRules) : null,
        retrievalStrategy: pattern.retrievalStrategy ? JSON.parse(pattern.retrievalStrategy) : null,
        contraindications: pattern.contraindications ? JSON.parse(pattern.contraindications) : null,
        minimumConfidence: pattern.minimumConfidence,
      },
      learning: {
        discoveryMethod: pattern.discoveryMethod,
        evidenceStrength: pattern.evidenceStrength,
        lastValidated: pattern.lastValidated,
        validationResults: pattern.validationResults ? JSON.parse(pattern.validationResults) : null,
      },
      history: {
        snapshots: pattern.snapshots.map(s => ({
          id: s.id,
          date: s.snapshotDate,
          successRate: s.successRate,
          lift: s.lift,
          sampleSize: s.sampleSize,
        })),
        performance: pattern.performanceRecords.map(p => ({
          id: p.id,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          successRate: p.successRate,
          trend: p.trend,
          totalApplications: p.totalApplications,
        })),
      },
      activeAlerts: pattern.alerts.map(a => ({
        id: a.id,
        type: a.alertType,
        severity: a.severity,
        message: a.message,
        createdAt: a.createdAt,
      })),
      dataMonth: pattern.data_month,
      createdAt: pattern.created_at,
    });
  } catch (error) {
    console.error('Error fetching pattern:', error);
    res.status(500).json({ error: 'Failed to fetch pattern' });
  }
});

/**
 * PATCH /api/addendum/patterns/:id
 * Update pattern self-describing metadata
 */
router.patch('/patterns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      applicabilityRules,
      retrievalStrategy,
      contraindications,
      minimumConfidence,
      discoveryMethod,
      evidenceStrength,
    } = req.body;

    const updateData: Record<string, unknown> = {};
    
    if (applicabilityRules !== undefined) {
      updateData.applicabilityRules = JSON.stringify(applicabilityRules);
    }
    if (retrievalStrategy !== undefined) {
      updateData.retrievalStrategy = JSON.stringify(retrievalStrategy);
    }
    if (contraindications !== undefined) {
      updateData.contraindications = JSON.stringify(contraindications);
    }
    if (minimumConfidence !== undefined) {
      updateData.minimumConfidence = minimumConfidence;
    }
    if (discoveryMethod !== undefined) {
      updateData.discoveryMethod = discoveryMethod;
    }
    if (evidenceStrength !== undefined) {
      updateData.evidenceStrength = evidenceStrength;
    }

    const pattern = await prisma.dCG_ContextPattern.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, patternId: pattern.id });
  } catch (error) {
    console.error('Error updating pattern:', error);
    res.status(500).json({ error: 'Failed to update pattern' });
  }
});

export default router;
