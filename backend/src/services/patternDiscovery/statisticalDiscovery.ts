import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ContextFeature {
  field: string
  value: string | number | boolean
}

interface CandidatePattern {
  features: ContextFeature[]
  successCount: number
  totalCount: number
  successRate: number
  lift: number
  pValue: number
}

// Baseline success rate (system average)
const BASELINE_SUCCESS_RATE = 0.65

// Minimum requirements for pattern validation
const MIN_SAMPLE_SIZE = 20
const MIN_POSITIVE_LIFT = 0.10  // 10% improvement over baseline for positive patterns
const MIN_NEGATIVE_LIFT = -0.10  // 10% WORSE than baseline for risk patterns
const MAX_P_VALUE = 0.05  // 95% confidence

export async function discoverStatisticalPatterns(): Promise<CandidatePattern[]> {
  console.log('[Statistical Discovery] Starting pattern discovery...')
  
  // Get all completed decisions with outcomes
  const outcomes = await prisma.dCG_Outcome.findMany({
    where: {
      outcome_success: { not: null }
    },
    include: {
      trace: {
        include: {
          clinical_snapshot: true,
          social_snapshot: true
        }
      }
    }
  })

  console.log(`[Statistical Discovery] Found ${outcomes.length} outcomes to analyze`)

  // Extract feature vectors from each decision
  const decisionFeatures = outcomes.map(o => ({
    outcome: o.outcome_success,
    features: extractFeatures(o.trace.social_snapshot, o.trace.clinical_snapshot)
  }))

  // Find all unique feature combinations
  const featureCombinations = generateFeatureCombinations(decisionFeatures)
  console.log(`[Statistical Discovery] Generated ${featureCombinations.length} feature combinations`)

  // Score each combination
  const candidates: CandidatePattern[] = []

  for (const combo of featureCombinations) {
    const matching = decisionFeatures.filter(df => 
      hasAllFeatures(df.features, combo)
    )

    if (matching.length < MIN_SAMPLE_SIZE) continue

    const successCount = matching.filter(m => m.outcome).length
    const totalCount = matching.length
    const successRate = successCount / totalCount
    const lift = successRate - BASELINE_SUCCESS_RATE

    // Chi-square test for significance
    const pValue = calculateChiSquare(successCount, totalCount, BASELINE_SUCCESS_RATE)

    // Find both POSITIVE patterns (high success) and NEGATIVE patterns (risk factors)
    const isPositivePattern = lift >= MIN_POSITIVE_LIFT && pValue <= MAX_P_VALUE
    const isNegativePattern = lift <= MIN_NEGATIVE_LIFT && pValue <= MAX_P_VALUE
    
    if (isPositivePattern || isNegativePattern) {
      candidates.push({
        features: combo,
        successCount,
        totalCount,
        successRate,
        lift,
        pValue
      })
    }
  }

  console.log(`[Statistical Discovery] Found ${candidates.length} candidate patterns`)

  // Remove redundant patterns (subsets of better patterns)
  return pruneRedundantPatterns(candidates)
}

function extractFeatures(
  socialSnapshot: any,
  clinicalSnapshot: any
): ContextFeature[] {
  const features: ContextFeature[] = []

  if (!socialSnapshot) return features

  // Extract categorical features from social snapshot
  if (socialSnapshot.caregiver_relationship) {
    features.push({ field: 'caregiverRelationship', value: socialSnapshot.caregiver_relationship })
  }
  if (socialSnapshot.caregiver_medical_background !== undefined) {
    features.push({ field: 'caregiverMedicalBackground', value: socialSnapshot.caregiver_medical_background })
  }
  if (socialSnapshot.caregiver_availability) {
    features.push({ field: 'caregiverAvailability', value: socialSnapshot.caregiver_availability })
  }
  if (socialSnapshot.has_caregiver !== undefined) {
    features.push({ field: 'hasCaregiver', value: socialSnapshot.has_caregiver })
  }
  if (socialSnapshot.living_situation) {
    features.push({ field: 'livingSituation', value: socialSnapshot.living_situation })
  }

  // Discretize numeric features
  if (socialSnapshot.caregiver_proximity_minutes !== undefined && socialSnapshot.caregiver_proximity_minutes !== null) {
    features.push({
      field: 'caregiverProximity',
      value: discretizeProximity(socialSnapshot.caregiver_proximity_minutes)
    })
  }
  if (socialSnapshot.caregiver_age !== undefined && socialSnapshot.caregiver_age !== null) {
    features.push({
      field: 'caregiverAgeGroup',
      value: discretizeAge(socialSnapshot.caregiver_age)
    })
  }

  // Clinical features
  if (clinicalSnapshot) {
    if (clinicalSnapshot.readmit_count_12m !== undefined) {
      features.push({
        field: 'priorReadmissions',
        value: clinicalSnapshot.readmit_count_12m === 0 ? 'none' : clinicalSnapshot.readmit_count_12m <= 2 ? 'low' : 'high'
      })
    }
    if (clinicalSnapshot.age !== undefined) {
      features.push({
        field: 'patientAgeGroup',
        value: discretizePatientAge(clinicalSnapshot.age)
      })
    }
    if (clinicalSnapshot.los_at_decision !== undefined) {
      features.push({
        field: 'lengthOfStay',
        value: discretizeLOS(clinicalSnapshot.los_at_decision)
      })
    }
  }

  return features
}

function discretizeProximity(minutes: number): string {
  if (minutes <= 10) return 'very_close'
  if (minutes <= 30) return 'close'
  if (minutes <= 60) return 'moderate'
  return 'far'
}

function discretizeAge(age: number): string {
  if (age < 40) return 'young'
  if (age < 55) return 'middle'
  if (age < 65) return 'mature'
  return 'senior'
}

function discretizePatientAge(age: number): string {
  if (age < 50) return 'under_50'
  if (age < 65) return '50_to_65'
  if (age < 75) return '65_to_75'
  return 'over_75'
}

function discretizeLOS(days: number): string {
  if (days <= 3) return 'short'
  if (days <= 7) return 'medium'
  if (days <= 14) return 'long'
  return 'extended'
}

function generateFeatureCombinations(
  decisionFeatures: { outcome: boolean; features: ContextFeature[] }[]
): ContextFeature[][] {
  // Get all unique features
  const allFeatures = new Map<string, Set<string>>()

  for (const df of decisionFeatures) {
    for (const f of df.features) {
      const key = f.field
      if (!allFeatures.has(key)) {
        allFeatures.set(key, new Set())
      }
      allFeatures.get(key)!.add(JSON.stringify(f))
    }
  }

  // Generate combinations of 2-3 features (limit to avoid explosion)
  const combinations: ContextFeature[][] = []
  const featureList = Array.from(allFeatures.values())
    .flatMap(set => Array.from(set).map(s => JSON.parse(s) as ContextFeature))

  // Limit feature list to avoid combinatorial explosion
  const limitedFeatureList = featureList.slice(0, 30)

  // 2-feature combinations
  for (let i = 0; i < limitedFeatureList.length; i++) {
    for (let j = i + 1; j < limitedFeatureList.length; j++) {
      if (limitedFeatureList[i].field !== limitedFeatureList[j].field) {
        combinations.push([limitedFeatureList[i], limitedFeatureList[j]])
      }
    }
  }

  // 3-feature combinations (limited)
  for (let i = 0; i < Math.min(limitedFeatureList.length, 15); i++) {
    for (let j = i + 1; j < Math.min(limitedFeatureList.length, 15); j++) {
      for (let k = j + 1; k < Math.min(limitedFeatureList.length, 15); k++) {
        const fields = new Set([limitedFeatureList[i].field, limitedFeatureList[j].field, limitedFeatureList[k].field])
        if (fields.size === 3) {
          combinations.push([limitedFeatureList[i], limitedFeatureList[j], limitedFeatureList[k]])
        }
      }
    }
  }

  return combinations
}

function hasAllFeatures(actual: ContextFeature[], required: ContextFeature[]): boolean {
  return required.every(req =>
    actual.some(act => act.field === req.field && act.value === req.value)
  )
}

function calculateChiSquare(successes: number, total: number, expected: number): number {
  if (total === 0) return 1

  const expectedSuccesses = total * expected
  const expectedFailures = total * (1 - expected)
  const actualFailures = total - successes

  if (expectedSuccesses === 0 || expectedFailures === 0) return 1

  const chi2 = 
    Math.pow(successes - expectedSuccesses, 2) / expectedSuccesses +
    Math.pow(actualFailures - expectedFailures, 2) / expectedFailures

  // Convert to p-value (simplified - use proper stats library in production)
  return Math.exp(-chi2 / 2)
}

function pruneRedundantPatterns(patterns: CandidatePattern[]): CandidatePattern[] {
  // Sort by absolute lift descending (both positive and negative patterns are important)
  patterns.sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift))

  const kept: CandidatePattern[] = []

  for (const pattern of patterns) {
    // Check if this pattern is a subset of an already-kept pattern with similar or better lift
    const isRedundant = kept.some(k => {
      const kFeatureKeys = new Set(k.features.map(f => `${f.field}:${f.value}`))
      const pFeatureKeys = pattern.features.map(f => `${f.field}:${f.value}`)
      return pFeatureKeys.every(pk => kFeatureKeys.has(pk))
    })

    if (!isRedundant) {
      kept.push(pattern)
    }
  }

  return kept
}

export function generatePatternName(features: ContextFeature[]): string {
  const descriptions: string[] = []
  
  for (const f of features) {
    switch (f.field) {
      case 'caregiverRelationship':
        descriptions.push(`${f.value} Caregiver`)
        break
      case 'caregiverMedicalBackground':
        descriptions.push(f.value ? 'Medical Background' : 'No Medical Background')
        break
      case 'caregiverAvailability':
        descriptions.push(`${f.value} Availability`)
        break
      case 'caregiverProximity':
        descriptions.push(`${f.value} Proximity`)
        break
      case 'hasCaregiver':
        descriptions.push(f.value ? 'Has Caregiver' : 'No Caregiver')
        break
      case 'livingSituation':
        descriptions.push(`${f.value} Living`)
        break
      case 'priorReadmissions':
        descriptions.push(`${f.value} Prior Readmits`)
        break
      case 'patientAgeGroup':
        descriptions.push(`Age ${f.value}`)
        break
      case 'lengthOfStay':
        descriptions.push(`${f.value} LOS`)
        break
      default:
        descriptions.push(`${f.field}=${f.value}`)
    }
  }
  
  return descriptions.join(' + ')
}
