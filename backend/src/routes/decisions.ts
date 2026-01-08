import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Exception type enum values (must match Prisma schema)
const EXCEPTION_TYPES = [
  'FAMILY_CAREGIVER_OVERRIDE',
  'PATIENT_REFUSAL',
  'RESOURCE_UNAVAILABLE',
  'CLINICAL_IMPROVEMENT',
  'PHYSICIAN_OVERRIDE'
] as const;

router.get('/', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const decisions = await prisma.dCG_DecisionTrace.findMany({
      where: { data_month: currentMonth },
      include: { 
        outcome: true,
        precedent_cited: {
          include: { outcome: true }
        }
      },
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
      exceptionType: d.exception_type,
      exceptionRationale: d.exception_rationale,
      precedentCitedId: d.precedent_cited_id,
      hasOutcome: !!d.outcome,
      outcomeSuccess: d.outcome?.outcome_success
    })));
  } catch (error) {
    console.error('Error getting decisions:', error);
    res.status(500).json({ error: 'Failed to get decisions' });
  }
});

// Create a new decision trace with exception workflow
router.post('/', async (req, res) => {
  try {
    const { 
      patientMrn, 
      decisionType, 
      decisionValue, 
      decisionMakerName,
      transcript,
      clinicalData,
      socialData,
      // Exception workflow fields
      policyRecommendation,
      followedPolicy,
      exceptionType,
      exceptionRationale,
      precedentCitedId
    } = req.body;

    // Validate exception workflow: rationale required when not following policy
    const isException = followedPolicy === false;
    if (isException && !exceptionRationale) {
      return res.status(400).json({ 
        error: 'Exception rationale is required when overriding policy recommendation',
        code: 'EXCEPTION_RATIONALE_REQUIRED'
      });
    }

    // Validate exception type if provided
    if (exceptionType && !EXCEPTION_TYPES.includes(exceptionType)) {
      return res.status(400).json({ 
        error: `Invalid exception type. Must be one of: ${EXCEPTION_TYPES.join(', ')}`,
        code: 'INVALID_EXCEPTION_TYPE'
      });
    }

    // Validate precedent exists if cited
    if (precedentCitedId) {
      const precedent = await prisma.dCG_DecisionTrace.findUnique({
        where: { id: precedentCitedId }
      });
      if (!precedent) {
        return res.status(400).json({ 
          error: 'Cited precedent decision not found',
          code: 'PRECEDENT_NOT_FOUND'
        });
      }
    }

    // Get current month from demo state
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    // Generate trace number and encounter ID
    const existingCount = await prisma.dCG_DecisionTrace.count();
    const traceNumber = `DCG-2025-${String(existingCount + 1).padStart(5, '0')}`;
    const encounterId = `ENC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create the decision trace with exception workflow
    const decision = await prisma.dCG_DecisionTrace.create({
      data: {
        trace_number: traceNumber,
        encounter_id: encounterId,
        patient_mrn: patientMrn || `MRN-${Date.now()}`,
        decision_type: decisionType || 'Discharge',
        decision_value: decisionValue || 'Home with Services',
        decision_datetime: new Date(),
        decision_maker_name: decisionMakerName || 'AI System',
        decision_maker_id: 'system',
        // Exception workflow
        policy_recommendation: policyRecommendation,
        followed_policy: followedPolicy !== false, // Default to true
        exception_type: isException ? exceptionType : null,
        exception_rationale: isException ? exceptionRationale : null,
        precedent_cited_id: isException ? precedentCitedId : null,
        cited_precedent_ids: precedentCitedId ? precedentCitedId : '',
        data_month: currentMonth,
      },
      include: {
        precedent_cited: {
          include: { outcome: true }
        }
      }
    });

    // If this is an exception, create context match record for precedent citation
    if (isException && precedentCitedId) {
      await prisma.dCG_ContextMatch.create({
        data: {
          searching_trace_id: decision.id,
          matched_trace_id: precedentCitedId,
          context_match_score: 1.0, // Explicit citation
          context_factors_matched: 'explicit_precedent_citation',
          was_cited: true,
          user_notes: exceptionRationale,
          data_month: currentMonth
        }
      });
    }

    res.status(201).json({
      id: decision.id,
      traceNumber: decision.trace_number,
      patientMrn: decision.patient_mrn,
      decisionType: decision.decision_type,
      decisionValue: decision.decision_value,
      decisionDatetime: decision.decision_datetime,
      decisionMakerName: decision.decision_maker_name,
      followedPolicy: decision.followed_policy,
      exceptionType: decision.exception_type,
      exceptionRationale: decision.exception_rationale,
      precedentCited: decision.precedent_cited,
      dataMonth: decision.data_month
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

// Precedent Search Endpoint
// The killer query: "Show me all times we sent a CHF patient home instead of SNF 
// because of a family caregiver, and what happened."
// Filters: exception_type + diagnosis_category + decision_value + outcome_success
router.get('/precedents/search', async (req, res) => {
  try {
    const { 
      exceptionType,      // e.g., 'FAMILY_CAREGIVER_OVERRIDE'
      diagnosis,          // e.g., 'CHF', 'COPD', 'Pneumonia'
      decisionValue,      // e.g., 'Home with Services', 'SNF'
      policyOverride,     // e.g., 'SNF' (what policy recommended but was overridden)
      outcomeSuccess,     // 'true', 'false', or undefined for all
      limit = '20'
    } = req.query;

    // Build where clause dynamically
    const where: Record<string, unknown> = {
      followed_policy: false, // Only exceptions
    };

    if (exceptionType) {
      where.exception_type = exceptionType;
    }

    if (policyOverride) {
      where.policy_recommendation = policyOverride;
    }

    if (decisionValue) {
      where.decision_value = decisionValue;
    }

    // Find decisions with matching criteria
    const decisions = await prisma.dCG_DecisionTrace.findMany({
      where,
      include: {
        clinical_snapshot: true,
        social_snapshot: true,
        outcome: true,
        precedent_cited: {
          include: { outcome: true }
        },
        cited_as_precedent: {
          select: { id: true, trace_number: true }
        },
        matches: {
          include: {
            matched_trace: {
              include: { outcome: true }
            }
          }
        }
      },
      orderBy: { decision_datetime: 'desc' },
      take: parseInt(limit as string, 10)
    });

    // Filter by diagnosis if specified (from clinical snapshot)
    let filteredDecisions = decisions;
    if (diagnosis) {
      const diagnosisLower = (diagnosis as string).toLowerCase();
      filteredDecisions = decisions.filter(d => 
        d.clinical_snapshot?.primary_diagnosis?.toLowerCase().includes(diagnosisLower)
      );
    }

    // Filter by outcome if specified
    if (outcomeSuccess !== undefined) {
      const successFilter = outcomeSuccess === 'true';
      filteredDecisions = filteredDecisions.filter(d => 
        d.outcome?.outcome_success === successFilter
      );
    }

    // Calculate match scores based on context similarity
    const results = filteredDecisions.map(d => {
      // Count how many times this decision was cited as precedent
      const citationCount = d.cited_as_precedent?.length || 0;
      
      // Get context match scores if available
      const avgMatchScore = d.matches?.length > 0
        ? d.matches.reduce((sum, m) => sum + m.context_match_score, 0) / d.matches.length
        : 0;

      return {
        id: d.id,
        traceNumber: d.trace_number,
        patientMrn: d.patient_mrn,
        decisionDatetime: d.decision_datetime,
        decisionValue: d.decision_value,
        policyRecommendation: d.policy_recommendation,
        exceptionType: d.exception_type,
        exceptionRationale: d.exception_rationale,
        decisionMakerName: d.decision_maker_name,
        // Clinical context
        diagnosis: d.clinical_snapshot?.primary_diagnosis,
        comorbidities: d.clinical_snapshot?.comorbidities,
        mobilityStatus: d.clinical_snapshot?.mobility_status,
        // Social context
        livingSituation: d.social_snapshot?.living_situation,
        primaryCaregiver: d.social_snapshot?.primary_caregiver,
        caregiverAvailability: d.social_snapshot?.caregiver_availability,
        // Outcome
        hasOutcome: !!d.outcome,
        outcomeSuccess: d.outcome?.outcome_success,
        readmission30d: d.outcome?.readmission_30d,
        readmissionReason: d.outcome?.readmission_reason,
        // Precedent metrics
        citationCount,
        avgMatchScore,
        // Precedent this decision cited
        precedentCited: d.precedent_cited ? {
          id: d.precedent_cited.id,
          traceNumber: d.precedent_cited.trace_number,
          outcomeSuccess: d.precedent_cited.outcome?.outcome_success
        } : null
      };
    });

    // Sort by citation count (most cited first), then by outcome success
    results.sort((a, b) => {
      if (b.citationCount !== a.citationCount) return b.citationCount - a.citationCount;
      if (a.outcomeSuccess && !b.outcomeSuccess) return -1;
      if (!a.outcomeSuccess && b.outcomeSuccess) return 1;
      return 0;
    });

    res.json({
      query: {
        exceptionType,
        diagnosis,
        decisionValue,
        policyOverride,
        outcomeSuccess
      },
      totalResults: results.length,
      results,
      // Summary statistics
      summary: {
        totalExceptions: results.length,
        successfulOutcomes: results.filter(r => r.outcomeSuccess === true).length,
        failedOutcomes: results.filter(r => r.outcomeSuccess === false).length,
        pendingOutcomes: results.filter(r => r.hasOutcome === false).length,
        successRate: results.filter(r => r.hasOutcome).length > 0
          ? (results.filter(r => r.outcomeSuccess === true).length / 
             results.filter(r => r.hasOutcome).length * 100).toFixed(1) + '%'
          : 'N/A'
      }
    });
  } catch (error) {
    console.error('Error searching precedents:', error);
    res.status(500).json({ error: 'Failed to search precedents' });
  }
});

// Get exception types enum values
router.get('/exception-types', (_req, res) => {
  res.json({
    exceptionTypes: EXCEPTION_TYPES.map(type => ({
      value: type,
      label: type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
      description: getExceptionTypeDescription(type)
    }))
  });
});

function getExceptionTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'FAMILY_CAREGIVER_OVERRIDE': 'RN daughter, full-time availability, etc.',
    'PATIENT_REFUSAL': 'Patient declined recommended disposition',
    'RESOURCE_UNAVAILABLE': 'SNF bed not available, insurance denial',
    'CLINICAL_IMPROVEMENT': 'Patient improved beyond policy threshold',
    'PHYSICIAN_OVERRIDE': 'Attending disagrees with policy recommendation'
  };
  return descriptions[type] || '';
}

export default router;
