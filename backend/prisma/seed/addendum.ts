import { PrismaClient, ContextSource, AlertType } from '@prisma/client';

/**
 * Seed addendum data: policy versions, pattern metadata, ambient context, performance records, alerts
 */
export async function seedAddendumData(prisma: PrismaClient) {
  console.log('Seeding addendum data...');

  // 1. Seed Policy Versions
  console.log('  Creating policy versions...');
  const policyVersions = await seedPolicyVersions(prisma);

  // 2. Update patterns with self-describing metadata
  console.log('  Updating patterns with self-describing metadata...');
  await updatePatternMetadata(prisma);

  // 3. Seed enhanced ambient context
  console.log('  Creating enhanced ambient context...');
  await seedAmbientContext(prisma);

  // 4. Seed pattern performance records
  console.log('  Creating pattern performance records...');
  await seedPatternPerformance(prisma);

  // 5. Seed sample alerts
  console.log('  Creating sample alerts...');
  await seedPatternAlerts(prisma);

  console.log('  Addendum data seeded successfully!');
  return { policyVersions };
}

async function seedPolicyVersions(prisma: PrismaClient) {
  const versions = [
    {
      version: 'v1.0',
      effectiveDate: new Date('2025-04-01'),
      retiredDate: new Date('2025-06-30'),
      description: 'Initial discharge criteria - basic clinical thresholds',
      criteria: JSON.stringify({
        vitalStability: { required: true, hours: 24 },
        painControl: { maxLevel: 5 },
        mobilityAssessment: { required: true },
        medicationReconciliation: { required: true },
        followUpScheduled: { required: true },
      }),
    },
    {
      version: 'v2.0',
      effectiveDate: new Date('2025-07-01'),
      retiredDate: new Date('2025-09-30'),
      description: 'Added social determinants and caregiver requirements',
      criteria: JSON.stringify({
        vitalStability: { required: true, hours: 24 },
        painControl: { maxLevel: 4 },
        mobilityAssessment: { required: true },
        medicationReconciliation: { required: true },
        followUpScheduled: { required: true },
        caregiverConfirmed: { required: true },
        transportationArranged: { required: true },
        homeEnvironmentSafe: { required: true },
      }),
    },
    {
      version: 'v3.0',
      effectiveDate: new Date('2025-10-01'),
      retiredDate: new Date('2025-11-30'),
      description: 'Enhanced with ambient context integration',
      criteria: JSON.stringify({
        vitalStability: { required: true, hours: 24 },
        painControl: { maxLevel: 4 },
        mobilityAssessment: { required: true },
        medicationReconciliation: { required: true },
        followUpScheduled: { required: true },
        caregiverConfirmed: { required: true },
        transportationArranged: { required: true },
        homeEnvironmentSafe: { required: true },
        ambientContextConfidence: { minScore: 0.7 },
        patternMatchRequired: { minScore: 0.6 },
      }),
    },
    {
      version: 'v3.2',
      effectiveDate: new Date('2025-12-01'),
      retiredDate: null,
      description: 'Current version - AI-assisted with confidence scoring',
      criteria: JSON.stringify({
        vitalStability: { required: true, hours: 24 },
        painControl: { maxLevel: 4 },
        mobilityAssessment: { required: true },
        medicationReconciliation: { required: true },
        followUpScheduled: { required: true },
        caregiverConfirmed: { required: true },
        transportationArranged: { required: true },
        homeEnvironmentSafe: { required: true },
        ambientContextConfidence: { minScore: 0.75 },
        patternMatchRequired: { minScore: 0.65 },
        aiRecommendationRequired: { enabled: true },
        multiSourceValidation: { minSources: 2 },
      }),
    },
  ];

  const created = [];
  for (const v of versions) {
    const pv = await prisma.policyVersion.create({ data: v });
    created.push(pv);
  }

  return created;
}

async function updatePatternMetadata(prisma: PrismaClient) {
  const patterns = await prisma.dCG_ContextPattern.findMany();

  const metadataTemplates = [
    {
      applicabilityRules: {
        ageRange: { min: 65, max: null },
        diagnoses: ['CHF', 'COPD', 'pneumonia'],
        losRange: { min: 3, max: 14 },
        requiredSources: ['NURSE_BEDSIDE', 'CARE_COORDINATION'],
      },
      retrievalStrategy: {
        matchFields: ['diagnoses', 'mobilityStatus', 'caregiverAvailable', 'livingSituation'],
        weights: { diagnoses: 0.3, mobilityStatus: 0.2, caregiverAvailable: 0.25, livingSituation: 0.25 },
        threshold: 0.6,
      },
      contraindications: {
        excludeDiagnoses: ['active_infection', 'unstable_vitals'],
        excludeAgeRange: { min: null, max: 18 },
      },
      minimumConfidence: 0.7,
      discoveryMethod: 'statistical_correlation',
      evidenceStrength: 'strong',
    },
    {
      applicabilityRules: {
        ageRange: { min: 50, max: 85 },
        diagnoses: ['hip_fracture', 'knee_replacement', 'fall'],
        losRange: { min: 2, max: 10 },
        requiredSources: ['PT_OT_SESSION', 'NURSE_BEDSIDE'],
      },
      retrievalStrategy: {
        matchFields: ['mobilityStatus', 'fallRisk', 'homeEnvironment'],
        weights: { mobilityStatus: 0.4, fallRisk: 0.35, homeEnvironment: 0.25 },
        threshold: 0.65,
      },
      contraindications: {
        excludeDiagnoses: ['dementia_severe', 'non_ambulatory'],
      },
      minimumConfidence: 0.75,
      discoveryMethod: 'statistical_correlation',
      evidenceStrength: 'strong',
    },
    {
      applicabilityRules: {
        ageRange: { min: 18, max: null },
        diagnoses: ['diabetes', 'hypertension'],
        losRange: { min: 1, max: 7 },
        requiredSources: ['FAMILY_DISCUSSION', 'SOCIAL_WORK'],
      },
      retrievalStrategy: {
        matchFields: ['socialSupport', 'medicationCompliance', 'followUpAccess'],
        weights: { socialSupport: 0.35, medicationCompliance: 0.35, followUpAccess: 0.3 },
        threshold: 0.55,
      },
      contraindications: null,
      minimumConfidence: 0.65,
      discoveryMethod: 'llm_inference',
      evidenceStrength: 'moderate',
    },
    {
      applicabilityRules: {
        ageRange: { min: 70, max: null },
        diagnoses: ['stroke', 'TIA'],
        losRange: { min: 4, max: 21 },
        requiredSources: ['NURSE_BEDSIDE', 'PT_OT_SESSION', 'CARE_COORDINATION'],
      },
      retrievalStrategy: {
        matchFields: ['cognitiveStatus', 'mobilityStatus', 'speechTherapy', 'caregiverTraining'],
        weights: { cognitiveStatus: 0.3, mobilityStatus: 0.25, speechTherapy: 0.2, caregiverTraining: 0.25 },
        threshold: 0.7,
      },
      contraindications: {
        excludeDiagnoses: ['active_bleed', 'unstable_neuro'],
      },
      minimumConfidence: 0.8,
      discoveryMethod: 'statistical_correlation',
      evidenceStrength: 'strong',
    },
    {
      applicabilityRules: {
        ageRange: { min: 40, max: 75 },
        diagnoses: ['cardiac_surgery', 'CABG', 'valve_replacement'],
        losRange: { min: 5, max: 14 },
        requiredSources: ['NURSE_BEDSIDE', 'CARE_COORDINATION'],
      },
      retrievalStrategy: {
        matchFields: ['cardiacRehab', 'woundHealing', 'activityTolerance'],
        weights: { cardiacRehab: 0.35, woundHealing: 0.35, activityTolerance: 0.3 },
        threshold: 0.65,
      },
      contraindications: {
        excludeDiagnoses: ['arrhythmia_uncontrolled', 'infection'],
      },
      minimumConfidence: 0.75,
      discoveryMethod: 'statistical_correlation',
      evidenceStrength: 'moderate',
    },
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const template = metadataTemplates[i % metadataTemplates.length];

    await prisma.dCG_ContextPattern.update({
      where: { id: pattern.id },
      data: {
        applicabilityRules: JSON.stringify(template.applicabilityRules),
        retrievalStrategy: JSON.stringify(template.retrievalStrategy),
        contraindications: template.contraindications ? JSON.stringify(template.contraindications) : null,
        minimumConfidence: template.minimumConfidence,
        discoveryMethod: template.discoveryMethod,
        evidenceStrength: template.evidenceStrength,
        lastValidated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        validationResults: JSON.stringify({
          validatedAt: new Date().toISOString(),
          sampleSize: Math.floor(50 + Math.random() * 200),
          accuracy: 0.85 + Math.random() * 0.1,
          precision: 0.82 + Math.random() * 0.12,
          recall: 0.78 + Math.random() * 0.15,
        }),
      },
    });
  }
}

async function seedAmbientContext(prisma: PrismaClient) {
  const patients = await prisma.epic_Patient.findMany({ take: 100 });
  const sources: ContextSource[] = ['NURSE_BEDSIDE', 'FAMILY_DISCUSSION', 'CARE_COORDINATION', 'SOCIAL_WORK', 'PT_OT_SESSION'];

  const sourceReliability: Record<ContextSource, number> = {
    NURSE_BEDSIDE: 0.95,
    PT_OT_SESSION: 0.90,
    CARE_COORDINATION: 0.85,
    SOCIAL_WORK: 0.80,
    FAMILY_DISCUSSION: 0.75,
  };

  const contextTemplates = [
    {
      extractedData: {
        mobility_status: 'ambulatory_with_assistance',
        pain_level: 3,
        discharge_readiness: 'ready',
        caregiver_available: true,
        home_safe: true,
      },
    },
    {
      extractedData: {
        mobility_status: 'independent',
        cognitive_status: 'alert_oriented',
        fall_risk: 'low',
        medication_understanding: 'good',
      },
    },
    {
      extractedData: {
        living_situation: 'with_family',
        transportation_available: true,
        follow_up_scheduled: true,
        home_health_arranged: false,
      },
    },
    {
      extractedData: {
        social_support_score: 8,
        financial_concerns: false,
        insurance_verified: true,
        dme_ordered: true,
      },
    },
    {
      extractedData: {
        pt_progress: 'meeting_goals',
        ot_assessment: 'independent_adls',
        therapy_sessions_completed: 5,
        discharge_recommendation: 'home',
      },
    },
  ];

  const records = [];
  for (const patient of patients.slice(0, 50)) {
    // Create 2-4 context records per patient from different sources
    const numRecords = 2 + Math.floor(Math.random() * 3);
    const usedSources = new Set<ContextSource>();

    for (let i = 0; i < numRecords; i++) {
      let source: ContextSource;
      do {
        source = sources[Math.floor(Math.random() * sources.length)];
      } while (usedSources.has(source) && usedSources.size < sources.length);
      usedSources.add(source);

      const template = contextTemplates[sources.indexOf(source) % contextTemplates.length];
      const transcriptionConfidence = 0.85 + Math.random() * 0.1;
      const extractionConfidence = 0.80 + Math.random() * 0.15;
      const reliability = sourceReliability[source];
      const overallConfidence = transcriptionConfidence * extractionConfidence * reliability;

      records.push({
        patientMrn: patient.mrn,
        encounterId: null,
        source,
        rawTranscript: `[Simulated ${source} transcript for patient ${patient.mrn}]`,
        extractedData: JSON.stringify(template.extractedData),
        capturedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        capturedBy: `device_${source.toLowerCase()}_001`,
        sessionDuration: Math.floor(60 + Math.random() * 600),
        location: source === 'NURSE_BEDSIDE' ? 'patient_room' : source === 'PT_OT_SESSION' ? 'therapy_gym' : 'conference_room',
        transcriptionConfidence,
        extractionConfidence,
        sourceReliability: reliability,
        overallConfidence,
        conflictFlag: false,
        data_month: 9,
      });
    }
  }

  // Batch insert
  await prisma.ambientContext.createMany({ data: records });
  console.log(`    Created ${records.length} ambient context records`);
}

async function seedPatternPerformance(prisma: PrismaClient) {
  const patterns = await prisma.dCG_ContextPattern.findMany();

  const records = [];
  for (const pattern of patterns) {
    // Create 9 months of performance data
    for (let month = 1; month <= 9; month++) {
      const periodStart = new Date(2025, 3 + month, 1); // April 2025 + month
      const periodEnd = new Date(2025, 4 + month, 0); // Last day of month

      // Simulate improving performance over time
      const baseSuccessRate = pattern.success_rate;
      const monthlyVariation = (Math.random() - 0.5) * 0.05;
      const trendImprovement = month * 0.005;
      const successRate = Math.min(0.98, Math.max(0.6, baseSuccessRate + monthlyVariation + trendImprovement));

      const totalApplications = Math.floor(pattern.sample_size / 9 * (0.8 + Math.random() * 0.4));
      const successCount = Math.floor(totalApplications * successRate);
      const readmitCount = totalApplications - successCount;

      let trend: string;
      if (month <= 3) trend = 'stable';
      else if (month <= 6) trend = Math.random() > 0.3 ? 'improving' : 'stable';
      else trend = Math.random() > 0.2 ? 'improving' : 'stable';

      records.push({
        patternId: pattern.id,
        periodStart,
        periodEnd,
        totalApplications,
        successCount,
        readmitCount,
        pendingCount: Math.floor(Math.random() * 5),
        successRate,
        liftVsBaseline: (successRate - 0.85) / 0.85,
        confidenceInterval: JSON.stringify({
          lower: successRate - 0.03 - Math.random() * 0.02,
          upper: successRate + 0.03 + Math.random() * 0.02,
        }),
        trend,
        alertFlag: trend === 'degrading',
      });
    }
  }

  await prisma.patternPerformance.createMany({ data: records });
  console.log(`    Created ${records.length} pattern performance records`);
}

async function seedPatternAlerts(prisma: PrismaClient) {
  const patterns = await prisma.dCG_ContextPattern.findMany({ take: 5 });

  const alertTypes: AlertType[] = [
    'PERFORMANCE_DEGRADATION',
    'INSUFFICIENT_SAMPLE',
    'EMERGING_PATTERN',
    'CONTRADICTORY_OUTCOMES',
    'CONFIDENCE_DRIFT',
  ];

  const alerts = [
    {
      patternId: patterns[0]?.id,
      alertType: 'PERFORMANCE_DEGRADATION' as AlertType,
      severity: 'warning',
      message: `Pattern "${patterns[0]?.title}" success rate dropped by 8.5% in the last 30 days`,
      details: JSON.stringify({
        previousRate: 0.92,
        currentRate: 0.835,
        degradation: 0.085,
        period: '30 days',
      }),
    },
    {
      patternId: patterns[1]?.id,
      alertType: 'INSUFFICIENT_SAMPLE' as AlertType,
      severity: 'info',
      message: `Pattern "${patterns[1]?.title}" has only 18 applications this month (minimum: 30)`,
      details: JSON.stringify({
        currentSample: 18,
        minimumRequired: 30,
        recommendation: 'Consider expanding applicability criteria',
      }),
    },
    {
      patternId: patterns[2]?.id,
      alertType: 'EMERGING_PATTERN' as AlertType,
      severity: 'info',
      message: 'Potential new pattern detected: CHF + caregiver training + home health = 94% success',
      details: JSON.stringify({
        criteria: {
          diagnosis: 'CHF',
          caregiverTraining: true,
          homeHealth: true,
        },
        sampleSize: 47,
        successRate: 0.94,
        potentialLift: 0.11,
      }),
    },
    {
      patternId: patterns[3]?.id,
      alertType: 'CONFIDENCE_DRIFT' as AlertType,
      severity: 'warning',
      message: `Pattern "${patterns[3]?.title}" confidence interval widened to 18%`,
      details: JSON.stringify({
        confidenceInterval: { lower: 0.78, upper: 0.96 },
        width: 0.18,
        previousWidth: 0.08,
        cause: 'Increased variance in recent outcomes',
      }),
    },
  ];

  for (const alert of alerts) {
    if (alert.patternId) {
      await prisma.patternAlert.create({ data: alert });
    }
  }

  console.log(`    Created ${alerts.filter(a => a.patternId).length} sample alerts`);
}

export default seedAddendumData;
