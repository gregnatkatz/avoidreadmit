import { PrismaClient } from '@prisma/client';
import { generateTraceNumber, randomInt, randomChoice, randomBoolean, getMonthDate } from './utils';
import { DEMO_PATIENTS, MONTHLY_DECISIONS, DISPOSITIONS, RICH_CONTEXT_PER_QUARTER } from './constants';

export async function seedBulkDecisions(prisma: PrismaClient) {
  const patients = await prisma.epic_Patient.findMany();
  
  // Monthly progression of rich context adoption - realistic/sporadic growth
  // Real-world adoption doesn't grow linearly - some months have breakthroughs, others plateau or dip
  // 9 months: April - December 2025
  // Using odd numbers and realistic variations to match metrics
  const richContextByMonth = [
    23,   // Month 1 (April): Pre-launch baseline - minimal adoption
    41,   // Month 2 (May): Initial rollout - team learning
    49,   // Month 3 (June): Slow growth, some resistance
    83,   // Month 4 (July): Gaining traction
    163,  // Month 5 (August): First patterns discovered - big jump!
    138,  // Month 6 (September): Slight dip - Labor Day staffing, some skepticism
    319,  // Month 7 (October): Major breakthrough - new pattern + training initiative
    467,  // Month 8 (November): Sustained growth despite Thanksgiving dip
    612   // Month 9 (December): High adoption despite holiday lower volume
  ];

  // Readmission rates improving over time (9 months) - realistic decimal values
  const readmissionRateByMonth = [0.1798, 0.1747, 0.1722, 0.1606, 0.1541, 0.1491, 0.1382, 0.1352, 0.1290];

  let traceIndex = 1;
  const clinicalSnapshots = [];
  const socialSnapshots = [];
  const decisionTraces = [];
  const outcomes = [];
  const contextMatches = [];
  const patterns = [];

  for (let month = 1; month <= 9; month++) {
    const decisionsThisMonth = MONTHLY_DECISIONS;
    const richContextCount = richContextByMonth[month - 1];
    const readmissionRate = readmissionRateByMonth[month - 1];

    console.log(`Seeding month ${month}: ${decisionsThisMonth} decisions, ${richContextCount} with rich context`);

    for (let d = 0; d < decisionsThisMonth; d++) {
      const patient = randomChoice(patients);
      const hasRichContext = d < richContextCount;
      const day = randomInt(1, 28);
      const decisionDate = getMonthDate(month, day);

      const clinicalId = `clin-${traceIndex}`;
      const socialId = `soc-${traceIndex}`;
      const traceId = `trace-${traceIndex}`;
      const traceNumber = generateTraceNumber(month, d + 1);

      // Clinical snapshot
      clinicalSnapshots.push({
        id: clinicalId,
        age: randomInt(45, 90),
        gender: randomBoolean(0.48) ? 'Male' : 'Female',
        principal_diagnosis_code: 'I50.9',
        principal_diagnosis_desc: 'Heart failure, unspecified',
        principal_diagnosis_category: 'Cardiac',
        secondary_diagnoses: JSON.stringify(['I10', 'E11.9']),
        vitals_at_decision: JSON.stringify({ bp: '130/80', hr: 78, o2: 96 }),
        labs_at_decision: JSON.stringify([{ name: 'BNP', value: randomInt(100, 500) }]),
        medication_count: randomInt(5, 12),
        high_risk_med_count: randomInt(0, 3),
        adl_score: randomInt(12, 24),
        mobility_status: randomChoice(['Independent', 'Requires assistance', 'Wheelchair']),
        los_at_decision: randomInt(3, 10),
        readmit_count_12m: randomInt(0, 2),
        snapshot_datetime: decisionDate
      });

      // Social snapshot - rich context has more caregiver details
      const hasCaregiver = hasRichContext ? true : randomBoolean(0.6);
      const hasMedBackground = hasRichContext ? randomBoolean(0.4) : randomBoolean(0.1);
      const proximityMinutes = hasRichContext ? randomInt(5, 15) : randomInt(20, 60);
      const availability = hasRichContext ? 'full-time' : randomChoice(['full-time', 'part-time', 'weekends']);

      socialSnapshots.push({
        id: socialId,
        living_situation: randomChoice(['Lives alone', 'Lives with spouse', 'Lives with family']),
        residence_type: randomChoice(['House', 'Apartment', 'Condo']),
        has_stairs: randomBoolean(0.4),
        insurance_type: randomChoice(['Medicare', 'Medicaid', 'Commercial']),
        has_caregiver: hasCaregiver,
        caregiver_relationship: hasCaregiver ? randomChoice(['Spouse', 'Child', 'Sibling']) : null,
        sdoh_flags: JSON.stringify({ food: false, housing: false, transport: randomBoolean(0.15) }),
        caregiver_name: hasCaregiver ? 'Family Member' : null,
        caregiver_age: hasCaregiver ? randomInt(40, 70) : null,
        caregiver_health_status: hasCaregiver ? 'Good' : null,
        caregiver_employment: hasCaregiver ? randomChoice(['Retired', 'Full-time', 'Part-time']) : null,
        caregiver_medical_background: hasMedBackground,
        caregiver_background_detail: hasMedBackground ? 'Healthcare experience' : null,
        caregiver_proximity_minutes: hasCaregiver ? proximityMinutes : null,
        caregiver_availability: hasCaregiver ? availability : null,
        caregiver_stated_commitment: hasCaregiver ? 'Committed to care' : null,
        caregiver_condition_familiarity: hasCaregiver ? (hasRichContext ? 'High' : 'Low') : null,
        patient_stated_preference: 'Prefers home',
        patient_concerns: JSON.stringify(['Managing medications']),
        patient_fears: JSON.stringify(['Readmission']),
        barriers_from_conversations: JSON.stringify(hasRichContext ? [] : ['Limited support']),
        positive_factors: JSON.stringify(hasRichContext ? ['Strong caregiver support'] : []),
        ambient_transcript_ids: JSON.stringify([]),
        snapshot_datetime: decisionDate
      });

      // Decision trace
      const disposition = randomChoice(DISPOSITIONS);
      decisionTraces.push({
        id: traceId,
        trace_number: traceNumber,
        patient_mrn: patient.mrn,
        encounter_id: `enc-${randomInt(1, 1000)}`,
        decision_type: 'discharge_disposition',
        decision_value: disposition,
        decision_datetime: decisionDate,
        decision_maker_id: `prov-${randomInt(1, 20)}`,
        decision_maker_name: `Dr. ${randomChoice(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'])}`,
        clinical_snapshot_id: clinicalId,
        social_snapshot_id: socialId,
        policy_id: 'POL-001',
        policy_recommendation: disposition,
        followed_policy: randomBoolean(0.85),
        rationale: hasRichContext ? 'Strong caregiver support identified through context capture' : 'Standard discharge criteria met',
        cited_precedent_ids: JSON.stringify([]),
        data_month: month
      });

      // Outcomes (80% have outcomes by end of month)
      if (randomBoolean(0.8)) {
        // Success rate based on rich context
        const baseSuccessRate = hasRichContext ? 0.83 : 0.55;
        const isSuccess = randomBoolean(baseSuccessRate);
        const isReadmission = !isSuccess && randomBoolean(readmissionRate / (1 - baseSuccessRate));

        outcomes.push({
          trace_id: traceId,
          readmission_30d: isReadmission,
          readmission_date: isReadmission ? new Date(decisionDate.getTime() + randomInt(5, 25) * 24 * 60 * 60 * 1000) : null,
          readmission_reason: isReadmission ? randomChoice(['CHF exacerbation', 'Medication non-compliance', 'Infection']) : null,
          ed_visit_30d: randomBoolean(0.1),
          death_30d: false,
          outcome_success: isSuccess,
          root_cause_category: isReadmission ? 'Care transition gap' : null,
          context_factors: JSON.stringify(hasRichContext ? ['caregiver_support', 'medical_background'] : []),
          assessed_at: new Date(decisionDate.getTime() + 35 * 24 * 60 * 60 * 1000),
          data_month: month
        });
      }

      traceIndex++;

      // Batch insert every 500 records
      if (traceIndex % 500 === 0) {
        await prisma.dCG_ClinicalSnapshot.createMany({ data: clinicalSnapshots });
        await prisma.dCG_SocialSnapshot.createMany({ data: socialSnapshots });
        await prisma.dCG_DecisionTrace.createMany({ data: decisionTraces });
        await prisma.dCG_Outcome.createMany({ data: outcomes });
        
        console.log(`Inserted ${traceIndex} records...`);
        clinicalSnapshots.length = 0;
        socialSnapshots.length = 0;
        decisionTraces.length = 0;
        outcomes.length = 0;
      }
    }
  }

  // Insert remaining records
  if (clinicalSnapshots.length > 0) {
    await prisma.dCG_ClinicalSnapshot.createMany({ data: clinicalSnapshots });
    await prisma.dCG_SocialSnapshot.createMany({ data: socialSnapshots });
    await prisma.dCG_DecisionTrace.createMany({ data: decisionTraces });
    await prisma.dCG_Outcome.createMany({ data: outcomes });
  }

  // Seed context patterns
  await seedPatterns(prisma);

  console.log(`Created ${traceIndex - 1} decision traces with outcomes`);
}

async function seedPatterns(prisma: PrismaClient) {
  // Realistic pattern discovery progression for 9 months (April - December 2025):
  // Month 1-4: No patterns yet (not enough data, system learning)
  // Month 5: First 2 patterns discovered (initial insights - August)
  // Month 6: 3 more patterns (AI learning accelerates - September)
  // Month 7: 4 more patterns (breakthrough month - October)
  // Month 8: 3 more patterns (sustained discovery - November)
  // Month 9: 3 more patterns (optimization phase - December)
  // Total: 15 patterns by end of month 9
  
  const patterns = [
    // Month 5 (August) - First discoveries (2 patterns)
    {
      pattern_number: 'PAT-0001',
      title: 'Medical Background Caregiver Success',
      description: 'Patients with caregivers who have medical training show 27.3% higher success rates for home discharge',
      context_criteria: JSON.stringify(['caregiver_medical_background = true']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 447,
      success_count: 374,
      success_rate: 0.837,
      baseline_rate: 0.649,
      lift_vs_baseline: 0.188,
      p_value: 0.0012,
      statistically_significant: true,
      status: 'validated',
      data_month: 5
    },
    {
      pattern_number: 'PAT-0002',
      title: 'Close Proximity Caregiver',
      description: 'Caregivers living within 10 minutes correlate with 21.7% better outcomes',
      context_criteria: JSON.stringify(['caregiver_proximity_minutes <= 10']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 383,
      success_count: 314,
      success_rate: 0.819,
      baseline_rate: 0.649,
      lift_vs_baseline: 0.170,
      p_value: 0.0031,
      statistically_significant: true,
      status: 'validated',
      data_month: 5
    },
    // Month 6 (September) - Learning accelerates (3 patterns)
    {
      pattern_number: 'PAT-0003',
      title: 'Full-Time Availability Pattern',
      description: 'Full-time caregiver availability shows 25% improvement in discharge success',
      context_criteria: JSON.stringify(['caregiver_availability = full-time']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 520,
      success_count: 442,
      success_rate: 0.85,
      baseline_rate: 0.65,
      lift_vs_baseline: 0.20,
      p_value: 0.0005,
      statistically_significant: true,
      status: 'validated',
      data_month: 6
    },
    {
      pattern_number: 'PAT-0004',
      title: 'Condition Familiarity Impact',
      description: 'Caregivers familiar with patient condition show 18% better outcomes',
      context_criteria: JSON.stringify(['caregiver_condition_familiarity = High']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 290,
      success_count: 240,
      success_rate: 0.83,
      baseline_rate: 0.65,
      lift_vs_baseline: 0.18,
      p_value: 0.002,
      statistically_significant: true,
      status: 'validated',
      data_month: 6
    },
    {
      pattern_number: 'PAT-0005',
      title: 'Retired Caregiver Advantage',
      description: 'Retired caregivers correlate with 15% higher success due to availability',
      context_criteria: JSON.stringify(['caregiver_employment = Retired']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 340,
      success_count: 272,
      success_rate: 0.80,
      baseline_rate: 0.65,
      lift_vs_baseline: 0.15,
      p_value: 0.008,
      statistically_significant: true,
      status: 'validated',
      data_month: 6
    },
    // Month 7 (October) - Breakthrough month (4 patterns)
    {
      pattern_number: 'PAT-0006',
      title: 'Combined Context Factors',
      description: 'Medical background + close proximity + full-time availability = 92% success rate',
      context_criteria: JSON.stringify(['caregiver_medical_background = true', 'caregiver_proximity_minutes <= 10', 'caregiver_availability = full-time']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 180,
      success_count: 166,
      success_rate: 0.92,
      baseline_rate: 0.65,
      lift_vs_baseline: 0.27,
      p_value: 0.0001,
      statistically_significant: true,
      status: 'validated',
      data_month: 7
    },
    {
      pattern_number: 'PAT-0007',
      title: 'Patient Preference Alignment',
      description: 'When discharge aligns with patient stated preference, success improves 20%',
      context_criteria: JSON.stringify(['patient_stated_preference = Prefers home', 'decision_value = Home']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 410,
      success_count: 348,
      success_rate: 0.85,
      baseline_rate: 0.65,
      lift_vs_baseline: 0.20,
      p_value: 0.001,
      statistically_significant: true,
      status: 'validated',
      data_month: 7
    },
    {
      pattern_number: 'PAT-0008',
      title: 'Low Readmission History Success',
      description: 'Patients with 0 readmissions in past 12 months show 23% better outcomes',
      context_criteria: JSON.stringify(['readmit_count_12m = 0']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 620,
      success_count: 546,
      success_rate: 0.88,
      baseline_rate: 0.65,
      lift_vs_baseline: 0.23,
      p_value: 0.0003,
      statistically_significant: true,
      status: 'validated',
      data_month: 7
    },
    {
      pattern_number: 'PAT-0009',
      title: 'Spouse Caregiver Commitment',
      description: 'Spouse caregivers show 16% higher success than other relationships',
      context_criteria: JSON.stringify(['caregiver_relationship = Spouse']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 380,
      success_count: 308,
      success_rate: 0.81,
      baseline_rate: 0.65,
      lift_vs_baseline: 0.16,
      p_value: 0.004,
      statistically_significant: true,
      status: 'validated',
      data_month: 7
    },
    // Month 8 (November) - Sustained discovery (3 patterns)
    {
      pattern_number: 'PAT-0010',
      title: 'Short Length of Stay Success',
      description: 'Patients with LOS under 5 days show 14% better home discharge outcomes',
      context_criteria: JSON.stringify(['los_at_decision < 5']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 480,
      success_count: 379,
      success_rate: 0.79,
      baseline_rate: 0.65,
      lift_vs_baseline: 0.14,
      p_value: 0.01,
      statistically_significant: true,
      status: 'validated',
      data_month: 8
    },
    {
      pattern_number: 'PAT-0011',
      title: 'Multi-Factor High Confidence',
      description: 'Proximity + availability + familiarity combination yields 89% success',
      context_criteria: JSON.stringify(['caregiver_proximity_minutes <= 15', 'caregiver_availability = full-time', 'caregiver_condition_familiarity = High']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 220,
      success_count: 196,
      success_rate: 0.89,
      baseline_rate: 0.65,
      lift_vs_baseline: 0.24,
      p_value: 0.0002,
      statistically_significant: true,
      status: 'validated',
      data_month: 8
    },
    {
      pattern_number: 'PAT-0012',
      title: 'No Transportation Barriers',
      description: 'Patients without transportation SDOH flags show 12% better outcomes',
      context_criteria: JSON.stringify(['sdoh_transport = false']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 550,
      success_count: 424,
      success_rate: 0.77,
      baseline_rate: 0.65,
      lift_vs_baseline: 0.12,
      p_value: 0.015,
      statistically_significant: true,
      status: 'validated',
      data_month: 8
    },
    // Month 9 (December) - Optimization phase (3 patterns)
    {
      pattern_number: 'PAT-0013',
      title: 'High ADL Score Success',
      description: 'Patients with ADL score >= 20 show 19% better home discharge outcomes',
      context_criteria: JSON.stringify(['adl_score >= 20']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 420,
      success_count: 353,
      success_rate: 0.84,
      baseline_rate: 0.65,
      lift_vs_baseline: 0.19,
      p_value: 0.002,
      statistically_significant: true,
      status: 'validated',
      data_month: 9
    },
    {
      pattern_number: 'PAT-0014',
      title: 'Elderly Caregiver Risk Flag',
      description: 'RISK: Caregivers aged 65+ with health issues correlate with 23% HIGHER readmission rates - consider additional support',
      context_criteria: JSON.stringify(['caregiver_age >= 65', 'caregiver_health_status != Good']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 340,
      success_count: 143,
      success_rate: 0.42,
      baseline_rate: 0.65,
      lift_vs_baseline: -0.23,
      p_value: 0.0008,
      statistically_significant: true,
      status: 'validated',
      data_month: 9
    },
    {
      pattern_number: 'PAT-0015',
      title: 'Comprehensive Support Network',
      description: 'Patients with spouse + child caregivers show 26% better outcomes',
      context_criteria: JSON.stringify(['caregiver_relationship = Spouse', 'living_situation = Lives with family']),
      supporting_trace_ids: JSON.stringify([]),
      sample_size: 290,
      success_count: 264,
      success_rate: 0.91,
      baseline_rate: 0.65,
      lift_vs_baseline: 0.26,
      p_value: 0.0001,
      statistically_significant: true,
      status: 'validated',
      data_month: 9
    }
  ];

  await prisma.dCG_ContextPattern.createMany({ data: patterns });
  console.log('Created 15 context patterns across months 5-9');
}
