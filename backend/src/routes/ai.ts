import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { runMultiAgentAnalysis } from '../services/ai';

const router = Router();
const prisma = new PrismaClient();

router.post('/analyze', async (req, res) => {
  try {
    const { patientMrn, transcriptId } = req.body;

    const result = await runMultiAgentAnalysis(patientMrn, transcriptId);
    res.json(result);
  } catch (error) {
    console.error('Error running AI analysis:', error);
    res.status(500).json({ error: 'Failed to run AI analysis' });
  }
});

router.get('/status', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const [traces, outcomes, matches, patterns] = await Promise.all([
      prisma.dCG_DecisionTrace.count({ where: { data_month: currentMonth } }),
      prisma.dCG_Outcome.count({ where: { data_month: currentMonth } }),
      prisma.dCG_ContextMatch.count({ where: { data_month: currentMonth } }),
      prisma.dCG_ContextPattern.count({ where: { data_month: { lte: currentMonth }, status: 'validated' } })
    ]);

    const prevMonthMatches = currentMonth > 1 
      ? await prisma.dCG_ContextMatch.count({ where: { data_month: { lte: currentMonth - 1 } } })
      : 0;

    const totalMatches = await prisma.dCG_ContextMatch.count({ where: { data_month: { lte: currentMonth } } });

    res.json({
      currentMonth,
      decisionTraces: traces,
      outcomesRecorded: outcomes,
      outcomePercentage: traces > 0 ? Math.round((outcomes / traces) * 100) : 0,
      contextMatches: totalMatches,
      matchesFromLastMonth: totalMatches - prevMonthMatches,
      patternsDiscovered: patterns,
      providers: [
        { name: 'GPT-5.2', priority: 1, status: 'available' },
        { name: 'o3-2', priority: 2, status: 'available' },
        { name: 'DeepSeek-V3.2', priority: 3, status: 'available' },
        { name: 'Model Router', priority: 4, status: 'available' }
      ]
    });
  } catch (error) {
    console.error('Error getting AI status:', error);
    res.status(500).json({ error: 'Failed to get AI status' });
  }
});

export default router;
