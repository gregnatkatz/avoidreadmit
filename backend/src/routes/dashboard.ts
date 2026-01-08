import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/summary', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const metrics = await prisma.dCG_MonthlyMetrics.findMany({
      where: { month_number: { lte: currentMonth } },
      orderBy: { month_number: 'desc' }
    });

    const latestMetrics = metrics[0];
    const totalDecisions = metrics.reduce((sum, m) => sum + m.total_decisions, 0);
    const totalWithContextMatch = metrics.reduce((sum, m) => sum + m.decisions_with_context_match, 0);

    const patterns = await prisma.dCG_ContextPattern.count({
      where: { data_month: { lte: currentMonth }, status: { in: ['ACTIVE', 'validated'] } }
    });

    res.json({
      currentMonth,
      totalDecisions,
      decisionsWithContextMatch: totalWithContextMatch,
      readmissionRate: latestMetrics?.readmission_rate || 0,
      activePatterns: patterns,
      cumulativeSavings: latestMetrics?.cumulative_savings || 0,
      readmissionsAvoided: metrics.reduce((sum, m) => sum + m.readmissions_avoided, 0)
    });
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    res.status(500).json({ error: 'Failed to get dashboard summary' });
  }
});

router.get('/readmission-trend', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const metrics = await prisma.dCG_MonthlyMetrics.findMany({
      where: { month_number: { lte: currentMonth } },
      orderBy: { month_number: 'asc' }
    });

    res.json(metrics.map(m => ({
      month: m.month_label,
      monthNumber: m.month_number,
      readmissionRate: m.readmission_rate,
      totalDecisions: m.total_decisions,
      withOutcomes: m.total_with_outcomes
    })));
  } catch (error) {
    console.error('Error getting readmission trend:', error);
    res.status(500).json({ error: 'Failed to get readmission trend' });
  }
});

router.get('/context-impact', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const metrics = await prisma.dCG_MonthlyMetrics.findFirst({
      where: { month_number: currentMonth }
    });

    res.json({
      withRichContextSuccessRate: metrics?.with_rich_context_success_rate || 0,
      withoutRichContextSuccessRate: metrics?.without_rich_context_success_rate || 0,
      contextLift: metrics?.context_lift || 0
    });
  } catch (error) {
    console.error('Error getting context impact:', error);
    res.status(500).json({ error: 'Failed to get context impact' });
  }
});

router.get('/cost-savings', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const metrics = await prisma.dCG_MonthlyMetrics.findMany({
      where: { month_number: { lte: currentMonth } },
      orderBy: { month_number: 'asc' }
    });

    res.json(metrics.map(m => ({
      month: m.month_label,
      monthNumber: m.month_number,
      savingsThisMonth: m.savings_this_month,
      cumulativeSavings: m.cumulative_savings,
      readmissionsAvoided: m.readmissions_avoided
    })));
  } catch (error) {
    console.error('Error getting cost savings:', error);
    res.status(500).json({ error: 'Failed to get cost savings' });
  }
});

// Decision outcomes distribution - dynamic data from database
router.get('/decision-outcomes', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    // Get all decision traces up to current month and count by decision_value (discharge disposition)
    const traces = await prisma.dCG_DecisionTrace.findMany({
      where: { data_month: { lte: currentMonth } },
      select: { decision_value: true }
    });

    // Count by decision value (disposition)
    const counts: Record<string, number> = {};
    for (const trace of traces) {
      const disposition = trace.decision_value || 'Unknown';
      counts[disposition] = (counts[disposition] || 0) + 1;
    }

    const total = traces.length;
    
    // Define colors for each disposition
    const colors: Record<string, string> = {
      'Home with Services': '#00F5A0',
      'SNF': '#00D1FF',
      'Rehab': '#FFB800',
      'Home (No Services)': '#A855F7',
      'Hospice': '#FF6B6B',
      'Unknown': '#6B7280'
    };

    // Convert to array with percentages
    const result = Object.entries(counts).map(([name, count]) => ({
      name,
      value: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      color: colors[name] || '#6B7280'
    })).sort((a, b) => b.value - a.value);

    res.json(result);
  } catch (error) {
    console.error('Error getting decision outcomes:', error);
    res.status(500).json({ error: 'Failed to get decision outcomes' });
  }
});

// Pattern discovery over time - dynamic data from database
router.get('/pattern-discovery', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const metrics = await prisma.dCG_MonthlyMetrics.findMany({
      where: { month_number: { lte: currentMonth } },
      orderBy: { month_number: 'asc' }
    });

    // Get cumulative pattern count for each month
    const monthLabels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const result = await Promise.all(metrics.map(async (m) => {
      // Count patterns discovered up to this month
      const patternCount = await prisma.dCG_ContextPattern.count({
        where: { 
          data_month: { lte: m.month_number },
          status: { in: ['ACTIVE', 'validated'] }
        }
      });
      
      return {
        month: monthLabels[m.month_number - 1] || m.month_label,
        monthNumber: m.month_number,
        patterns: patternCount,
        matches: m.decisions_with_context_match
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('Error getting pattern discovery:', error);
    res.status(500).json({ error: 'Failed to get pattern discovery' });
  }
});

export default router;
