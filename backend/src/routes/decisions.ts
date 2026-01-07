import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const decisions = await prisma.dCG_DecisionTrace.findMany({
      where: { data_month: currentMonth },
      include: { outcome: true },
      orderBy: { decision_datetime: 'desc' },
      take: 100
    });

    res.json(decisions.map(d => ({
      id: d.id,
      traceNumber: d.trace_number,
      patientMrn: d.patient_mrn,
      decisionType: d.decision_type,
      decisionValue: d.decision_value,
      decisionDatetime: d.decision_datetime,
      decisionMakerName: d.decision_maker_name,
      followedPolicy: d.followed_policy,
      hasOutcome: !!d.outcome,
      outcomeSuccess: d.outcome?.outcome_success
    })));
  } catch (error) {
    console.error('Error getting decisions:', error);
    res.status(500).json({ error: 'Failed to get decisions' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const decision = await prisma.dCG_DecisionTrace.findUnique({
      where: { id },
      include: {
        clinical_snapshot: true,
        social_snapshot: true,
        outcome: true,
        matches: { include: { matched_trace: { include: { outcome: true } } } }
      }
    });

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    res.json(decision);
  } catch (error) {
    console.error('Error getting decision:', error);
    res.status(500).json({ error: 'Failed to get decision' });
  }
});

router.get('/compare/:mrn1/:mrn2', async (req, res) => {
  try {
    const { mrn1, mrn2 } = req.params;

    const [decision1, decision2] = await Promise.all([
      prisma.dCG_DecisionTrace.findFirst({
        where: { patient_mrn: mrn1 },
        include: { clinical_snapshot: true, social_snapshot: true, outcome: true },
        orderBy: { decision_datetime: 'desc' }
      }),
      prisma.dCG_DecisionTrace.findFirst({
        where: { patient_mrn: mrn2 },
        include: { clinical_snapshot: true, social_snapshot: true, outcome: true },
        orderBy: { decision_datetime: 'desc' }
      })
    ]);

    res.json({ decision1, decision2 });
  } catch (error) {
    console.error('Error comparing decisions:', error);
    res.status(500).json({ error: 'Failed to compare decisions' });
  }
});

export default router;
