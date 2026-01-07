import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/matches', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const matches = await prisma.dCG_ContextMatch.findMany({
      where: { data_month: { lte: currentMonth } },
      include: {
        searching_trace: { select: { trace_number: true, patient_mrn: true, decision_value: true } },
        matched_trace: { select: { trace_number: true, patient_mrn: true, decision_value: true, outcome: true } }
      },
      orderBy: { context_match_score: 'desc' },
      take: 50
    });

    res.json(matches.map(m => ({
      id: m.id,
      searchingTrace: m.searching_trace,
      matchedTrace: m.matched_trace,
      matchScore: m.context_match_score,
      factorsMatched: JSON.parse(m.context_factors_matched || '[]'),
      wasCited: m.was_cited,
      outcomesAligned: m.outcomes_aligned
    })));
  } catch (error) {
    console.error('Error getting context matches:', error);
    res.status(500).json({ error: 'Failed to get context matches' });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const [totalTraces, totalOutcomes, totalMatches, totalPatterns] = await Promise.all([
      prisma.dCG_DecisionTrace.count({ where: { data_month: { lte: currentMonth } } }),
      prisma.dCG_Outcome.count({ where: { data_month: { lte: currentMonth } } }),
      prisma.dCG_ContextMatch.count({ where: { data_month: { lte: currentMonth } } }),
      prisma.dCG_ContextPattern.count({ where: { data_month: { lte: currentMonth }, status: 'validated' } })
    ]);

    const monthlyStats = await prisma.dCG_MonthlyMetrics.findMany({
      where: { month_number: { lte: currentMonth } },
      orderBy: { month_number: 'asc' }
    });

    res.json({
      currentMonth,
      totalTraces,
      totalOutcomes,
      totalMatches,
      totalPatterns,
      monthlyStats: monthlyStats.map(m => ({
        month: m.month_number,
        label: m.month_label,
        decisions: m.total_decisions,
        matches: m.decisions_with_context_match,
        patterns: m.active_patterns
      }))
    });
  } catch (error) {
    console.error('Error getting context stats:', error);
    res.status(500).json({ error: 'Failed to get context stats' });
  }
});

export default router;
