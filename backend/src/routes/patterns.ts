import { Router } from 'express';
import { PrismaClient, PatternStatus } from '@prisma/client';
import { runPatternDiscoveryJob, validatePattern, promotePattern } from '../services/patternDiscovery';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const patterns = await prisma.dCG_ContextPattern.findMany({
      where: { data_month: { lte: currentMonth } },
      orderBy: [{ status: 'asc' }, { success_rate: 'desc' }]
    });

    res.json(patterns.map(p => ({
      id: p.id,
      patternNumber: p.pattern_number,
      title: p.title,
      description: p.description,
      contextCriteria: JSON.parse(p.context_criteria || '[]'),
      sampleSize: p.sample_size,
      successCount: p.success_count,
      successRate: p.success_rate,
      baselineRate: p.baseline_rate,
      liftVsBaseline: p.lift_vs_baseline,
      statisticallySignificant: p.statistically_significant,
      status: p.status,
      dataMonth: p.data_month
    })));
  } catch (error) {
    console.error('Error getting patterns:', error);
    res.status(500).json({ error: 'Failed to get patterns' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const pattern = await prisma.dCG_ContextPattern.findUnique({ where: { id } });

    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    const supportingTraceIds = JSON.parse(pattern.supporting_trace_ids || '[]');
    const supportingTraces = await prisma.dCG_DecisionTrace.findMany({
      where: { id: { in: supportingTraceIds } },
      include: { outcome: true },
      take: 10
    });

    res.json({
      ...pattern,
      contextCriteria: JSON.parse(pattern.context_criteria || '[]'),
      supportingTraces
    });
  } catch (error) {
    console.error('Error getting pattern:', error);
    res.status(500).json({ error: 'Failed to get pattern' });
  }
});

// GET /api/patterns/candidates - Returns patterns awaiting human review
router.get('/candidates', async (_req, res) => {
  try {
    const candidates = await prisma.dCG_ContextPattern.findMany({
      where: { status: 'candidate' },
      orderBy: { created_at: 'desc' }
    });

    res.json(candidates.map(p => ({
      id: p.id,
      patternNumber: p.pattern_number,
      title: p.title,
      description: p.description,
      contextCriteria: JSON.parse(p.context_criteria || '[]'),
      sampleSize: p.sample_size,
      successRate: p.success_rate,
      lift: p.lift_vs_baseline,
      pValue: p.p_value,
      discoveryMethod: p.discoveryMethod,
      hypothesis: p.hypothesis,
      createdAt: p.created_at
    })));
  } catch (error) {
    console.error('Error getting candidate patterns:', error);
    res.status(500).json({ error: 'Failed to get candidate patterns' });
  }
});

// POST /api/patterns/:id/approve - Human approves a candidate pattern
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, applicabilityRules, notes, approvedBy } = req.body;

    const pattern = await prisma.dCG_ContextPattern.findUnique({ where: { id } });
    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    if (pattern.status !== 'candidate') {
      return res.status(400).json({ error: 'Pattern is not in candidate status' });
    }

    await prisma.dCG_ContextPattern.update({
      where: { id },
      data: {
        title: name || pattern.title,
        applicabilityRules: applicabilityRules ? JSON.stringify(applicabilityRules) : pattern.applicabilityRules,
        status: 'emerging',
        approvedBy: approvedBy || 'system',
        approvedAt: new Date(),
        approvalNotes: notes
      }
    });

    // Create alert for approval
    await prisma.patternAlert.create({
      data: {
        patternId: id,
        alertType: 'EMERGING_PATTERN',
        severity: 'info',
        message: `Pattern "${name || pattern.title}" approved and moved to emerging status`,
        details: JSON.stringify({ approvedBy, notes })
      }
    });

    res.json({ success: true, message: 'Pattern approved and moved to emerging status' });
  } catch (error) {
    console.error('Error approving pattern:', error);
    res.status(500).json({ error: 'Failed to approve pattern' });
  }
});

// POST /api/patterns/:id/reject - Human rejects a candidate pattern
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, rejectedBy } = req.body;

    const pattern = await prisma.dCG_ContextPattern.findUnique({ where: { id } });
    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    if (pattern.status !== 'candidate') {
      return res.status(400).json({ error: 'Pattern is not in candidate status' });
    }

    await prisma.dCG_ContextPattern.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedBy: rejectedBy || 'system',
        rejectedAt: new Date(),
        rejectionReason: reason
      }
    });

    res.json({ success: true, message: 'Pattern rejected' });
  } catch (error) {
    console.error('Error rejecting pattern:', error);
    res.status(500).json({ error: 'Failed to reject pattern' });
  }
});

// POST /api/patterns/:id/validate - Manually trigger validation for a pattern
router.post('/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;

    const pattern = await prisma.dCG_ContextPattern.findUnique({ where: { id } });
    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    const result = await validatePattern(id);

    if (result.passed && pattern.status === 'emerging') {
      await promotePattern(id, 'VALIDATED', result);
    }

    res.json({
      patternId: id,
      validationResult: result,
      promoted: result.passed && pattern.status === 'emerging'
    });
  } catch (error) {
    console.error('Error validating pattern:', error);
    res.status(500).json({ error: 'Failed to validate pattern' });
  }
});

// POST /api/patterns/discover - Manually trigger pattern discovery job
router.post('/discover', async (_req, res) => {
  try {
    console.log('[API] Triggering pattern discovery job...');
    const result = await runPatternDiscoveryJob();
    res.json({
      success: true,
      message: 'Pattern discovery job completed',
      result
    });
  } catch (error) {
    console.error('Error running pattern discovery:', error);
    res.status(500).json({ error: 'Failed to run pattern discovery' });
  }
});

// GET /api/patterns/lifecycle - Get pattern lifecycle statistics
router.get('/lifecycle', async (_req, res) => {
  try {
    const statusCounts = await prisma.dCG_ContextPattern.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const methodCounts = await prisma.dCG_ContextPattern.groupBy({
      by: ['discoveryMethod'],
      _count: { id: true }
    });

    res.json({
      byStatus: statusCounts.reduce((acc, s) => {
        acc[s.status] = s._count.id;
        return acc;
      }, {} as Record<string, number>),
      byMethod: methodCounts.reduce((acc, m) => {
        acc[m.discoveryMethod || 'unknown'] = m._count.id;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error('Error getting lifecycle stats:', error);
    res.status(500).json({ error: 'Failed to get lifecycle stats' });
  }
});

export default router;
