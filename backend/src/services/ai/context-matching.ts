import { PrismaClient } from '@prisma/client';
import { callAI } from './client';

const prisma = new PrismaClient();

export async function findContextMatches(patientMrn: string) {
  const currentDecision = await prisma.dCG_DecisionTrace.findFirst({
    where: { patient_mrn: patientMrn },
    include: { social_snapshot: true, clinical_snapshot: true },
    orderBy: { decision_datetime: 'desc' }
  });

  if (!currentDecision) {
    return { matches: [], patientMrn };
  }

  // Get prior decisions with outcomes
  const priorDecisions = await prisma.dCG_DecisionTrace.findMany({
    where: {
      id: { not: currentDecision.id },
      outcome: { isNot: null }
    },
    include: {
      social_snapshot: true,
      clinical_snapshot: true,
      outcome: true
    },
    take: 100
  });

  const currentContext = {
    clinical: currentDecision.clinical_snapshot,
    social: currentDecision.social_snapshot
  };

  const matches = [];

  for (const prior of priorDecisions) {
    const priorContext = {
      clinical: prior.clinical_snapshot,
      social: prior.social_snapshot
    };

    const matchScore = calculateContextSimilarity(currentContext, priorContext);

    if (matchScore > 0.6) {
      matches.push({
        matchedTraceId: prior.id,
        matchedTraceMrn: prior.patient_mrn,
        matchScore,
        factorsMatched: getMatchedFactors(currentContext, priorContext),
        outcome: prior.outcome
      });
    }
  }

  // Sort by match score
  matches.sort((a, b) => b.matchScore - a.matchScore);

  return {
    patientMrn,
    currentTraceId: currentDecision.id,
    matches: matches.slice(0, 10),
    timestamp: new Date()
  };
}

function calculateContextSimilarity(current: unknown, prior: unknown): number {
  // Simplified similarity calculation
  let score = 0.5;

  const c = current as { social?: { has_caregiver?: boolean; caregiver_medical_background?: boolean; caregiver_proximity_minutes?: number } };
  const p = prior as { social?: { has_caregiver?: boolean; caregiver_medical_background?: boolean; caregiver_proximity_minutes?: number } };

  if (c.social?.has_caregiver === p.social?.has_caregiver) score += 0.1;
  if (c.social?.caregiver_medical_background === p.social?.caregiver_medical_background) score += 0.15;
  if (c.social?.caregiver_proximity_minutes && p.social?.caregiver_proximity_minutes) {
    if (Math.abs(c.social.caregiver_proximity_minutes - p.social.caregiver_proximity_minutes) <= 10) {
      score += 0.1;
    }
  }

  return Math.min(score, 1);
}

function getMatchedFactors(current: unknown, prior: unknown): string[] {
  const factors = [];

  const c = current as { social?: { has_caregiver?: boolean; caregiver_medical_background?: boolean } };
  const p = prior as { social?: { has_caregiver?: boolean; caregiver_medical_background?: boolean } };

  if (c.social?.has_caregiver && p.social?.has_caregiver) {
    factors.push('caregiver_present');
  }
  if (c.social?.caregiver_medical_background && p.social?.caregiver_medical_background) {
    factors.push('caregiver_medical_background');
  }

  return factors;
}
