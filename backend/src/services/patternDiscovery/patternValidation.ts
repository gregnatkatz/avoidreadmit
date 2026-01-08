import { PrismaClient, PatternStatus } from '@prisma/client'

const prisma = new PrismaClient()

// Baseline success rate (system average)
const BASELINE_SUCCESS_RATE = 0.65

// Minimum requirements for pattern validation
const MIN_SAMPLE_SIZE = 20
const MIN_LIFT = 0.10  // 10% improvement over baseline
const MAX_P_VALUE = 0.05  // 95% confidence

interface ValidationResult {
  passed: boolean
  sampleSize: number
  successRate: number
  lift: number
  confidenceInterval: { lower: number; upper: number }
  pValue: number
  reason?: string
}

export async function validatePattern(patternId: string): Promise<ValidationResult> {
  console.log(`[Pattern Validation] Validating pattern ${patternId}...`)
  
  const pattern = await prisma.dCG_ContextPattern.findUnique({
    where: { id: patternId }
  })

  if (!pattern) {
    return { 
      passed: false, 
      sampleSize: 0,
      successRate: 0,
      lift: 0,
      confidenceInterval: { lower: 0, upper: 0 },
      pValue: 1,
      reason: 'Pattern not found' 
    }
  }

  // Get all decisions where this pattern was applicable
  const patternSnapshots = await prisma.decisionPatternSnapshot.findMany({
    where: {
      snapshot: { patternId },
      matchScore: { gte: 0.7 }
    },
    include: {
      decision: {
        include: {
          outcome: true
        }
      }
    }
  })

  // Filter to decisions with outcomes
  const decisionsWithOutcomes = patternSnapshots.filter(
    ps => ps.decision.outcome && ps.decision.outcome.outcome_success !== null
  )

  const sampleSize = decisionsWithOutcomes.length
  const successCount = decisionsWithOutcomes.filter(
    ps => ps.decision.outcome?.outcome_success === true
  ).length
  const successRate = sampleSize > 0 ? successCount / sampleSize : 0
  const lift = successRate - BASELINE_SUCCESS_RATE

  // Wilson confidence interval
  const ci = wilsonConfidenceInterval(successCount, sampleSize, 0.95)

  // Chi-square p-value
  const pValue = calculateChiSquare(successCount, sampleSize, BASELINE_SUCCESS_RATE)

  const passed = 
    sampleSize >= MIN_SAMPLE_SIZE &&
    lift >= MIN_LIFT &&
    pValue <= MAX_P_VALUE &&
    ci.lower > BASELINE_SUCCESS_RATE

  const result: ValidationResult = {
    passed,
    sampleSize,
    successRate,
    lift,
    confidenceInterval: ci,
    pValue,
    reason: !passed ? getFailureReason(sampleSize, lift, pValue, ci) : undefined
  }

  console.log(`[Pattern Validation] Pattern ${patternId}: ${passed ? 'PASSED' : 'FAILED'} - ${result.reason || 'All criteria met'}`)
  
  return result
}

function getFailureReason(
  sampleSize: number,
  lift: number,
  pValue: number,
  ci: { lower: number; upper: number }
): string {
  if (sampleSize < MIN_SAMPLE_SIZE) {
    return `Insufficient sample size (${sampleSize} < ${MIN_SAMPLE_SIZE})`
  }
  if (lift < MIN_LIFT) {
    return `Lift below threshold (${(lift * 100).toFixed(1)}% < ${MIN_LIFT * 100}%)`
  }
  if (pValue > MAX_P_VALUE) {
    return `Not statistically significant (p=${pValue.toFixed(3)} > ${MAX_P_VALUE})`
  }
  if (ci.lower <= BASELINE_SUCCESS_RATE) {
    return `Confidence interval includes baseline (lower=${(ci.lower * 100).toFixed(1)}%)`
  }
  return 'Unknown'
}

function wilsonConfidenceInterval(
  successes: number,
  total: number,
  confidence: number
): { lower: number; upper: number } {
  if (total === 0) return { lower: 0, upper: 1 }

  const z = 1.96 // 95% confidence
  const p = successes / total
  const n = total

  const denominator = 1 + z * z / n
  const center = (p + z * z / (2 * n)) / denominator
  const spread = (z / denominator) * Math.sqrt((p * (1 - p) / n) + (z * z / (4 * n * n)))

  return {
    lower: Math.max(0, center - spread),
    upper: Math.min(1, center + spread)
  }
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

  // Convert to p-value (simplified)
  return Math.exp(-chi2 / 2)
}

export async function promotePattern(
  patternId: string, 
  newStatus: PatternStatus,
  validationResult?: ValidationResult
): Promise<void> {
  console.log(`[Pattern Validation] Promoting pattern ${patternId} to ${newStatus}`)
  
  const updateData: any = {
    status: newStatus,
    lastValidated: new Date()
  }

  if (validationResult) {
    updateData.validationResults = JSON.stringify(validationResult)
  }

  // Update evidence strength based on status
  if (newStatus === 'VALIDATED') {
    updateData.evidenceStrength = 'moderate'
  } else if (newStatus === 'ACTIVE') {
    updateData.evidenceStrength = 'strong'
  } else if (newStatus === 'DEPRECATED') {
    updateData.evidenceStrength = 'weak'
  }

  await prisma.dCG_ContextPattern.update({
    where: { id: patternId },
    data: updateData
  })

  // Create alert for status change
  const alertType = newStatus === 'VALIDATED' ? 'PATTERN_VALIDATED' :
                    newStatus === 'ACTIVE' ? 'PATTERN_PROMOTED' :
                    newStatus === 'DEPRECATED' ? 'PATTERN_DEPRECATED' : 'EMERGING_PATTERN'

  await prisma.patternAlert.create({
    data: {
      patternId,
      alertType: alertType as any,
      severity: newStatus === 'DEPRECATED' ? 'warning' : 'info',
      message: `Pattern status changed to ${newStatus}`,
      details: validationResult ? JSON.stringify(validationResult) : null
    }
  })
}

export async function validateAllEmergingPatterns(): Promise<{
  validated: string[]
  notReady: string[]
}> {
  console.log('[Pattern Validation] Validating all emerging patterns...')
  
  const emergingPatterns = await prisma.dCG_ContextPattern.findMany({
    where: { status: 'emerging' }
  })

  const validated: string[] = []
  const notReady: string[] = []

  for (const pattern of emergingPatterns) {
    const result = await validatePattern(pattern.id)
    
    if (result.passed) {
      await promotePattern(pattern.id, 'VALIDATED', result)
      validated.push(pattern.id)
    } else {
      notReady.push(pattern.id)
    }
  }

  console.log(`[Pattern Validation] Validated ${validated.length} patterns, ${notReady.length} not ready`)
  
  return { validated, notReady }
}

export async function checkForAutoPromotion(): Promise<string[]> {
  console.log('[Pattern Validation] Checking for auto-promotion...')
  
  // Get validated patterns that have been stable for 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  const validatedPatterns = await prisma.dCG_ContextPattern.findMany({
    where: { 
      status: 'validated',
      lastValidated: { lte: thirtyDaysAgo }
    }
  })

  const promoted: string[] = []

  for (const pattern of validatedPatterns) {
    const result = await validatePattern(pattern.id)
    
    // Auto-promote if still passing with larger sample
    if (result.passed && result.sampleSize >= 50) {
      await promotePattern(pattern.id, 'ACTIVE', result)
      promoted.push(pattern.id)
    }
  }

  console.log(`[Pattern Validation] Auto-promoted ${promoted.length} patterns to ACTIVE`)
  
  return promoted
}

export async function checkForDegradation(): Promise<string[]> {
  console.log('[Pattern Validation] Checking for pattern degradation...')
  
  const activePatterns = await prisma.dCG_ContextPattern.findMany({
    where: { status: 'active' }
  })

  const deprecated: string[] = []

  for (const pattern of activePatterns) {
    // Check recent performance
    const recentPerformance = await prisma.patternPerformance.findMany({
      where: { 
        patternId: pattern.id,
        periodEnd: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { periodEnd: 'desc' },
      take: 3
    })

    // If 3 consecutive periods show degradation, deprecate
    if (recentPerformance.length >= 3) {
      const allDegrading = recentPerformance.every(p => p.trend === 'degrading')
      
      if (allDegrading) {
        await promotePattern(pattern.id, 'DEPRECATED')
        deprecated.push(pattern.id)
      }
    }
  }

  console.log(`[Pattern Validation] Deprecated ${deprecated.length} patterns due to degradation`)
  
  return deprecated
}
