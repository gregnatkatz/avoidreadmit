import { PrismaClient, PatternStatus } from '@prisma/client'
import { discoverStatisticalPatterns, generatePatternName } from './statisticalDiscovery'
import { discoverPatternsWithLLM, findUnexplainedSuccesses } from './llmDiscovery'
import { validateAllEmergingPatterns, checkForAutoPromotion, checkForDegradation } from './patternValidation'

const prisma = new PrismaClient()

interface DiscoveryJobResult {
  statisticalCandidates: number
  llmCandidates: number
  validated: number
  promoted: number
  deprecated: number
  errors: string[]
}

export async function runPatternDiscoveryJob(): Promise<DiscoveryJobResult> {
  console.log('[PatternDiscovery] Starting pattern discovery job...')
  
  const result: DiscoveryJobResult = {
    statisticalCandidates: 0,
    llmCandidates: 0,
    validated: 0,
    promoted: 0,
    deprecated: 0,
    errors: []
  }

  try {
    // 1. Statistical Discovery
    console.log('[PatternDiscovery] Running statistical discovery...')
    const statisticalCandidates = await discoverStatisticalPatterns()
    console.log(`[PatternDiscovery] Found ${statisticalCandidates.length} statistical candidates`)

    // Save statistical candidates
    for (const candidate of statisticalCandidates) {
      try {
        await saveCandidate(candidate, 'statistical_correlation')
        result.statisticalCandidates++
      } catch (e: any) {
        console.error(`[PatternDiscovery] Error saving statistical candidate:`, e.message)
        result.errors.push(`Statistical candidate save error: ${e.message}`)
      }
    }

    // 2. LLM Discovery - Find unexplained successes
    console.log('[PatternDiscovery] Finding unexplained successes for LLM analysis...')
    const unexplainedSuccesses = await findUnexplainedSuccesses()
    
    if (unexplainedSuccesses.length >= 10) {
      console.log(`[PatternDiscovery] Running LLM discovery on ${unexplainedSuccesses.length} unexplained cases...`)
      const llmCandidates = await discoverPatternsWithLLM(unexplainedSuccesses)
      console.log(`[PatternDiscovery] LLM suggested ${llmCandidates.length} patterns`)

      // Save LLM candidates
      for (const candidate of llmCandidates) {
        try {
          await saveLLMCandidate(candidate)
          result.llmCandidates++
        } catch (e: any) {
          console.error(`[PatternDiscovery] Error saving LLM candidate:`, e.message)
          result.errors.push(`LLM candidate save error: ${e.message}`)
        }
      }
    } else {
      console.log(`[PatternDiscovery] Not enough unexplained cases for LLM analysis (${unexplainedSuccesses.length} < 10)`)
    }

    // 3. Validate existing emerging patterns
    console.log('[PatternDiscovery] Validating emerging patterns...')
    const validationResult = await validateAllEmergingPatterns()
    result.validated = validationResult.validated.length

    // 4. Check for auto-promotion (validated -> active)
    console.log('[PatternDiscovery] Checking for auto-promotion...')
    const promoted = await checkForAutoPromotion()
    result.promoted = promoted.length

    // 5. Check for degradation (active -> deprecated)
    console.log('[PatternDiscovery] Checking for pattern degradation...')
    const deprecated = await checkForDegradation()
    result.deprecated = deprecated.length

  } catch (e: any) {
    console.error('[PatternDiscovery] Job error:', e.message)
    result.errors.push(`Job error: ${e.message}`)
  }

  console.log('[PatternDiscovery] Job complete:', result)
  return result
}

async function saveCandidate(candidate: any, method: string): Promise<void> {
  // Check for duplicates by comparing conditions
  const conditionsJson = JSON.stringify(candidate.features)
  
  const existing = await prisma.dCG_ContextPattern.findFirst({
    where: {
      context_criteria: conditionsJson
    }
  })

  if (existing) {
    console.log(`[PatternDiscovery] Duplicate pattern skipped`)
    return
  }

  // Generate pattern number
  const count = await prisma.dCG_ContextPattern.count()
  const patternNumber = `PAT-${String(count + 1).padStart(4, '0')}`

  const patternName = generatePatternName(candidate.features)

  await prisma.dCG_ContextPattern.create({
    data: {
      pattern_number: patternNumber,
      title: patternName,
      description: `Auto-discovered pattern via ${method}: ${patternName}`,
      context_criteria: conditionsJson,
      supporting_trace_ids: '[]',
      sample_size: candidate.totalCount,
      success_count: candidate.successCount,
      success_rate: candidate.successRate,
      baseline_rate: 0.65,
      lift_vs_baseline: candidate.lift,
      p_value: candidate.pValue,
      statistically_significant: candidate.pValue <= 0.05,
      status: 'candidate',
      data_month: await getCurrentMonth(),
      discoveryMethod: method,
      evidenceStrength: 'emerging',
      applicabilityRules: JSON.stringify({
        minMatchScore: 0.7
      }),
      retrievalStrategy: JSON.stringify({
        primaryMatchFields: candidate.features.map((f: any) => f.field),
        minimumMatchScore: 0.7
      })
    }
  })

  // Create alert for human review
  await prisma.patternAlert.create({
    data: {
      patternId: (await prisma.dCG_ContextPattern.findFirst({
        where: { pattern_number: patternNumber }
      }))!.id,
      alertType: 'EMERGING_PATTERN',
      severity: 'info',
      message: `New pattern candidate discovered via ${method}: "${patternName}"`,
      details: JSON.stringify({
        successRate: candidate.successRate,
        lift: candidate.lift,
        sampleSize: candidate.totalCount
      })
    }
  })

  console.log(`[PatternDiscovery] Saved candidate pattern: ${patternNumber}`)
}

async function saveLLMCandidate(candidate: any): Promise<void> {
  // Check for duplicates
  const conditionsJson = JSON.stringify(candidate.conditions)
  
  const existing = await prisma.dCG_ContextPattern.findFirst({
    where: {
      context_criteria: conditionsJson
    }
  })

  if (existing) {
    console.log(`[PatternDiscovery] Duplicate LLM pattern skipped`)
    return
  }

  // Generate pattern number
  const count = await prisma.dCG_ContextPattern.count()
  const patternNumber = `PAT-${String(count + 1).padStart(4, '0')}`

  await prisma.dCG_ContextPattern.create({
    data: {
      pattern_number: patternNumber,
      title: candidate.name,
      description: candidate.hypothesis,
      context_criteria: conditionsJson,
      supporting_trace_ids: JSON.stringify(candidate.supportingCases || []),
      sample_size: candidate.supportingCases?.length || 0,
      success_count: Math.round((candidate.supportingCases?.length || 0) * candidate.estimatedSuccessRate),
      success_rate: candidate.estimatedSuccessRate,
      baseline_rate: 0.65,
      lift_vs_baseline: candidate.estimatedSuccessRate - 0.65,
      status: 'candidate',
      data_month: await getCurrentMonth(),
      discoveryMethod: 'llm_inference',
      evidenceStrength: 'emerging',
      hypothesis: candidate.hypothesis,
      supportingCaseIds: JSON.stringify(candidate.supportingCases || []),
      contraindications: candidate.contraindications ? JSON.stringify(candidate.contraindications) : null,
      applicabilityRules: JSON.stringify({
        minMatchScore: 0.7
      }),
      retrievalStrategy: JSON.stringify({
        primaryMatchFields: candidate.conditions.map((c: any) => c.field),
        minimumMatchScore: 0.7
      })
    }
  })

  // Create alert for human review
  await prisma.patternAlert.create({
    data: {
      patternId: (await prisma.dCG_ContextPattern.findFirst({
        where: { pattern_number: patternNumber }
      }))!.id,
      alertType: 'EMERGING_PATTERN',
      severity: 'info',
      message: `New pattern candidate discovered via LLM: "${candidate.name}"`,
      details: JSON.stringify({
        hypothesis: candidate.hypothesis,
        estimatedSuccessRate: candidate.estimatedSuccessRate,
        supportingCases: candidate.supportingCases?.length || 0
      })
    }
  })

  console.log(`[PatternDiscovery] Saved LLM candidate pattern: ${patternNumber}`)
}

async function getCurrentMonth(): Promise<number> {
  const demoState = await prisma.demo_State.findFirst()
  return demoState?.current_month || 1
}

// Export for manual triggering via API
export { runPatternDiscoveryJob as runDiscovery }
