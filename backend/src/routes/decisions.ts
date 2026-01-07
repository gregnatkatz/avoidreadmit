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

// Create a new decision trace
router.post('/', async (req, res) => {
  try {
    const { 
      patientMrn, 
      decisionType, 
      decisionValue, 
      decisionMakerName,
      transcript,
      clinicalData,
      socialData
    } = req.body;

    // Get current month from demo state
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    // Generate trace number and encounter ID
    const existingCount = await prisma.dCG_DecisionTrace.count();
    const traceNumber = `DCG-2025-${String(existingCount + 1).padStart(5, '0')}`;
    const encounterId = `ENC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create the decision trace
    const decision = await prisma.dCG_DecisionTrace.create({
      data: {
        trace_number: traceNumber,
        encounter_id: encounterId,
        patient_mrn: patientMrn || `MRN-${Date.now()}`,
        decision_type: decisionType || 'Discharge',
        decision_value: decisionValue || 'Home with Services',
        decision_datetime: new Date(),
        decision_maker_name: decisionMakerName || 'AI System',
        followed_policy: true,
        data_month: currentMonth,
        transcript: transcript || '',
        clinical_snapshot: clinicalData ? {
          create: {
            primary_diagnosis: clinicalData.primaryDiagnosis || 'CHF',
            comorbidities: clinicalData.comorbidities || ['Diabetes', 'Hypertension'],
            medications_count: clinicalData.medicationsCount || 8,
            recent_procedures: clinicalData.recentProcedures || [],
            mobility_status: clinicalData.mobilityStatus || 'Ambulatory with assistance',
            cognitive_status: clinicalData.cognitiveStatus || 'Intact',
            pain_level: clinicalData.painLevel || 3,
            fall_risk: clinicalData.fallRisk || 'Moderate',
            snapshot_datetime: new Date()
          }
        } : undefined,
        social_snapshot: socialData ? {
          create: {
            living_situation: socialData.livingSituation || 'Lives alone',
            primary_caregiver: socialData.primaryCaregiver || 'Daughter',
            caregiver_availability: socialData.caregiverAvailability || 'Part-time',
            home_environment: socialData.homeEnvironment || 'Single-story home',
            transportation_access: socialData.transportationAccess || true,
            financial_concerns: socialData.financialConcerns || false,
            social_support_score: socialData.socialSupportScore || 7,
            snapshot_datetime: new Date()
          }
        } : undefined
      },
      include: {
        clinical_snapshot: true,
        social_snapshot: true
      }
    });

    res.status(201).json({
      id: decision.id,
      traceNumber: decision.trace_number,
      patientMrn: decision.patient_mrn,
      decisionType: decision.decision_type,
      decisionValue: decision.decision_value,
      decisionDatetime: decision.decision_datetime,
      decisionMakerName: decision.decision_maker_name,
      dataMonth: decision.data_month,
      clinicalSnapshot: decision.clinical_snapshot,
      socialSnapshot: decision.social_snapshot
    });
  } catch (error) {
    console.error('Error creating decision:', error);
    res.status(500).json({ error: 'Failed to create decision' });
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
