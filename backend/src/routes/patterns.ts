import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

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

export default router;
