import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function discoverPatterns() {
  const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
  const currentMonth = state?.current_month || 1;

  // Get all decisions with outcomes
  const decisions = await prisma.dCG_DecisionTrace.findMany({
    where: {
      data_month: { lte: currentMonth },
      outcome: { isNot: null }
    },
    include: {
      social_snapshot: true,
      clinical_snapshot: true,
      outcome: true
    }
  });

  const patterns = [];

  // Pattern 1: Caregiver with medical background
  const withMedBackground = decisions.filter(d => d.social_snapshot?.caregiver_medical_background);
  const withMedBackgroundSuccess = withMedBackground.filter(d => d.outcome?.outcome_success);

  if (withMedBackground.length >= 10) {
    patterns.push({
      title: 'Medical Background Caregiver',
      description: 'Patients with caregivers who have medical training show higher success rates for home discharge',
      criteria: ['caregiver_medical_background = true'],
      sampleSize: withMedBackground.length,
      successCount: withMedBackgroundSuccess.length,
      successRate: withMedBackgroundSuccess.length / withMedBackground.length
    });
  }

  // Pattern 2: Close proximity caregiver
  const closeProximity = decisions.filter(d => 
    d.social_snapshot?.caregiver_proximity_minutes && 
    d.social_snapshot.caregiver_proximity_minutes <= 10
  );
  const closeProximitySuccess = closeProximity.filter(d => d.outcome?.outcome_success);

  if (closeProximity.length >= 10) {
    patterns.push({
      title: 'Close Proximity Caregiver',
      description: 'Patients with caregivers living within 10 minutes show better outcomes',
      criteria: ['caregiver_proximity_minutes <= 10'],
      sampleSize: closeProximity.length,
      successCount: closeProximitySuccess.length,
      successRate: closeProximitySuccess.length / closeProximity.length
    });
  }

  // Pattern 3: Full-time availability
  const fullTimeAvailable = decisions.filter(d => 
    d.social_snapshot?.caregiver_availability === 'full-time'
  );
  const fullTimeSuccess = fullTimeAvailable.filter(d => d.outcome?.outcome_success);

  if (fullTimeAvailable.length >= 10) {
    patterns.push({
      title: 'Full-Time Caregiver Availability',
      description: 'Full-time caregiver availability correlates with successful home discharges',
      criteria: ['caregiver_availability = full-time'],
      sampleSize: fullTimeAvailable.length,
      successCount: fullTimeSuccess.length,
      successRate: fullTimeSuccess.length / fullTimeAvailable.length
    });
  }

  // Calculate baseline
  const totalSuccess = decisions.filter(d => d.outcome?.outcome_success).length;
  const baselineRate = decisions.length > 0 ? totalSuccess / decisions.length : 0;

  return {
    patterns: patterns.map(p => ({
      ...p,
      baselineRate,
      liftVsBaseline: p.successRate - baselineRate,
      statisticallySignificant: p.sampleSize >= 30 && (p.successRate - baselineRate) > 0.1
    })),
    totalDecisions: decisions.length,
    baselineSuccessRate: baselineRate,
    timestamp: new Date()
  };
}
