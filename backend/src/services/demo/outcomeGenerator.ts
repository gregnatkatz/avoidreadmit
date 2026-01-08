import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BASE_SUCCESS_RATE = 0.65

interface ExtractedContext {
  caregiverRelationship?: string
  caregiverMedicalBackground?: boolean
  caregiverProximity?: number
  caregiverAvailability?: string
  caregiverAge?: number
  caregiverHealthIssues?: boolean
  livingSituation?: string
  homeEnvironment?: string
  transportationAccess?: string
  socialSupport?: string
  priorReadmissions?: number
  adlScore?: number
  patientPreference?: string
  homeHealthArranged?: boolean
}

interface GroundTruthEffect {
  name: string
  condition: (ctx: ExtractedContext) => boolean
  successBoost: number
}

// Ground truth patterns - these create the signal in the data
// The discovery algorithm should find these (or similar)
const GROUND_TRUTH_EFFECTS: GroundTruthEffect[] = [
  {
    name: 'Medical background caregiver',
    condition: (ctx) => ctx.caregiverMedicalBackground === true,
    successBoost: 0.15
  },
  {
    name: 'Close proximity + full-time availability',
    condition: (ctx) => (ctx.caregiverProximity ?? 100) <= 15 && ctx.caregiverAvailability === 'full-time',
    successBoost: 0.20
  },
  {
    name: 'No prior readmissions',
    condition: (ctx) => ctx.priorReadmissions === 0,
    successBoost: 0.12
  },
  {
    name: 'Elderly caregiver with health issues (RISK)',
    condition: (ctx) => (ctx.caregiverAge ?? 0) >= 65 && ctx.caregiverHealthIssues === true,
    successBoost: -0.20
  },
  {
    name: 'Family living + strong support',
    condition: (ctx) => ctx.livingSituation === 'with_family' && ctx.socialSupport === 'strong',
    successBoost: 0.15
  },
  {
    name: 'Home health + high ADL',
    condition: (ctx) => ctx.homeHealthArranged === true && (ctx.adlScore ?? 0) >= 16,
    successBoost: 0.10
  },
  {
    name: 'Spouse + full-time + close',
    condition: (ctx) => 
      ctx.caregiverRelationship === 'Spouse' && 
      ctx.caregiverAvailability === 'full-time' &&
      (ctx.caregiverProximity ?? 100) <= 10,
    successBoost: 0.22
  },
  {
    name: 'Transportation barriers (RISK)',
    condition: (ctx) => ctx.transportationAccess === 'barriers',
    successBoost: -0.15
  }
]

export async function generateOutcomes(month: number): Promise<{ generated: number; successes: number; readmissions: number }> {
  console.log(`[Outcome Generator] Generating outcomes for month ${month}...`)
  
  // Get all decision traces for this month that don't have outcomes yet
  const traces = await prisma.dCG_DecisionTrace.findMany({
    where: {
      data_month: month,
      outcome: null
    },
    include: {
      social_snapshot: true,
      clinical_snapshot: true
    }
  })

  console.log(`[Outcome Generator] Found ${traces.length} traces without outcomes for month ${month}`)

  let successes = 0
  let readmissions = 0

  for (const trace of traces) {
    // Extract context from social snapshot
    const ctx = extractContextFromSnapshot(trace.social_snapshot, trace.clinical_snapshot)
    
    // Calculate success probability based on ground truth effects
    let successProb = BASE_SUCCESS_RATE
    
    for (const effect of GROUND_TRUTH_EFFECTS) {
      if (effect.condition(ctx)) {
        successProb += effect.successBoost
      }
    }
    
    // Clamp to valid probability range
    successProb = Math.max(0.15, Math.min(0.95, successProb))
    
    // Add some noise for realism
    successProb += (Math.random() - 0.5) * 0.1
    successProb = Math.max(0.10, Math.min(0.95, successProb))
    
    // Determine outcome
    const isSuccess = Math.random() < successProb
    
    if (isSuccess) {
      successes++
    } else {
      readmissions++
    }
    
    // Create outcome record
    await prisma.dCG_Outcome.create({
      data: {
        trace_id: trace.id,
        readmission_30d: !isSuccess,
        readmission_date: !isSuccess ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
        readmission_reason: !isSuccess ? getRandomReadmissionReason() : null,
        outcome_success: isSuccess,
        root_cause_category: !isSuccess ? getRandomRootCause() : null,
        context_factors: JSON.stringify(ctx),
        assessed_at: new Date(),
        data_month: month
      }
    })
  }

  console.log(`[Outcome Generator] Generated ${traces.length} outcomes: ${successes} successes, ${readmissions} readmissions`)
  
  return { generated: traces.length, successes, readmissions }
}

function extractContextFromSnapshot(socialSnapshot: any, clinicalSnapshot: any): ExtractedContext {
  const ctx: ExtractedContext = {}
  
  if (socialSnapshot) {
    ctx.caregiverRelationship = socialSnapshot.caregiver_relationship
    ctx.caregiverMedicalBackground = socialSnapshot.caregiver_medical_background
    ctx.caregiverProximity = socialSnapshot.caregiver_proximity_minutes
    ctx.caregiverAvailability = socialSnapshot.caregiver_availability
    ctx.caregiverAge = socialSnapshot.caregiver_age
    ctx.caregiverHealthIssues = socialSnapshot.caregiver_health_status === 'Poor' || socialSnapshot.caregiver_health_status === 'Fair'
    ctx.livingSituation = socialSnapshot.living_situation
    ctx.transportationAccess = socialSnapshot.has_transportation ? 'available' : 'barriers'
    ctx.socialSupport = inferSocialSupport(socialSnapshot)
    ctx.patientPreference = socialSnapshot.patient_stated_preference
  }
  
  if (clinicalSnapshot) {
    ctx.priorReadmissions = clinicalSnapshot.readmit_count_12m
    ctx.adlScore = clinicalSnapshot.adl_score
  }
  
  return ctx
}

function inferSocialSupport(socialSnapshot: any): string {
  if (socialSnapshot.has_caregiver && socialSnapshot.living_situation?.includes('family')) {
    return 'strong'
  }
  if (socialSnapshot.has_caregiver) {
    return 'moderate'
  }
  if (socialSnapshot.living_situation === 'alone') {
    return 'limited'
  }
  return 'moderate'
}

function getRandomReadmissionReason(): string {
  const reasons = [
    'Medication non-compliance',
    'Infection',
    'Fall at home',
    'Caregiver unable to manage',
    'Symptom exacerbation',
    'Inadequate follow-up',
    'Social support breakdown'
  ]
  return reasons[Math.floor(Math.random() * reasons.length)]
}

function getRandomRootCause(): string {
  const causes = [
    'caregiver_capacity',
    'medication_management',
    'mobility_decline',
    'social_support',
    'transportation',
    'home_environment'
  ]
  return causes[Math.floor(Math.random() * causes.length)]
}

export { GROUND_TRUTH_EFFECTS, ExtractedContext }
