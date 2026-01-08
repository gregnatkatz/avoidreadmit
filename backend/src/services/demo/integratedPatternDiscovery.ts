import { PrismaClient } from '@prisma/client'
import { callAI } from '../ai/client'

const prisma = new PrismaClient()

interface ContextFeature {
  field: string
  operator: 'eq' | 'lte' | 'gte' | 'lt' | 'gt'
  value: string | number | boolean
  displayValue: string
}

interface CandidatePattern {
  features: ContextFeature[]
  successCount: number
  failureCount: number
  totalCount: number
  successRate: number
  lift: number
  pValue: number
  confidenceInterval: { lower: number; upper: number }
}

interface DecisionWithContext {
  id: string
  outcome: boolean
  context: Record<string, any>
}

const MIN_SAMPLE_SIZE = 20
const MIN_LIFT = 0.08  // 8% improvement over baseline
const MAX_P_VALUE = 0.05

// Discretization rules for numeric fields
const DISCRETIZATION: Record<string, { rules: { operator: string; value: number; label: string }[] }> = {
  caregiver_proximity_minutes: {
    rules: [
      { operator: 'lte', value: 15, label: '≤15 min' },
      { operator: 'lte', value: 30, label: '≤30 min' },
      { operator: 'gte', value: 45, label: '≥45 min' }
    ]
  },
  caregiver_age: {
    rules: [
      { operator: 'lt', value: 50, label: '<50' },
      { operator: 'gte', value: 65, label: '≥65' }
    ]
  },
  adl_score: {
    rules: [
      { operator: 'gte', value: 18, label: '≥18 (high)' },
      { operator: 'lte', value: 12, label: '≤12 (low)' }
    ]
  },
  readmit_count_12m: {
    rules: [
      { operator: 'eq', value: 0, label: 'none' },
      { operator: 'gte', value: 2, label: '≥2' }
    ]
  },
  los_at_decision: {
    rules: [
      { operator: 'lt', value: 5, label: '<5 days' },
      { operator: 'gte', value: 10, label: '≥10 days' }
    ]
  }
}

export async function runIntegratedPatternDiscovery(upToMonth: number): Promise<any[]> {
  console.log(`[Integrated Discovery] Running pattern discovery for months 1-${upToMonth}...`)
  
  // 1. Get all decisions with outcomes up to this month
  const outcomes = await prisma.dCG_Outcome.findMany({
    where: {
      data_month: { lte: upToMonth }
    },
    include: {
      trace: {
        include: {
          social_snapshot: true,
          clinical_snapshot: true
        }
      }
    }
  })

  if (outcomes.length < 50) {
    console.log(`[Integrated Discovery] Not enough data: ${outcomes.length} outcomes (need 50+)`)
    return []
  }

  // 2. Transform to decision context format
  const decisions: DecisionWithContext[] = outcomes.map(o => ({
    id: o.trace_id,
    outcome: o.outcome_success,
    context: extractContextFields(o.trace.social_snapshot, o.trace.clinical_snapshot)
  }))

  // 3. Calculate baseline success rate
  const baselineSuccessRate = decisions.filter(d => d.outcome).length / decisions.length
  console.log(`[Integrated Discovery] Baseline success rate: ${(baselineSuccessRate * 100).toFixed(1)}% from ${decisions.length} decisions`)

  // 4. Extract all possible features
  const allFeatures = extractAllFeatures(decisions)
  console.log(`[Integrated Discovery] Extracted ${allFeatures.length} unique features`)

  // 5. Find single-feature patterns
  const singleFeaturePatterns = findSingleFeaturePatterns(decisions, allFeatures, baselineSuccessRate)
  console.log(`[Integrated Discovery] Found ${singleFeaturePatterns.length} single-feature candidates`)

  // 6. Find two-feature combinations
  const twoFeaturePatterns = findTwoFeaturePatterns(decisions, allFeatures, baselineSuccessRate)
  console.log(`[Integrated Discovery] Found ${twoFeaturePatterns.length} two-feature candidates`)

  // 7. Find three-feature combinations (from top single features only)
  const topFeatures = allFeatures
    .filter(f => {
      const pattern = singleFeaturePatterns.find(p => 
        p.features[0].field === f.field && p.features[0].value === f.value
      )
      return pattern && pattern.lift > 0.05
    })
    .slice(0, 10)
  
  const threeFeaturePatterns = findThreeFeaturePatterns(decisions, topFeatures, baselineSuccessRate)
  console.log(`[Integrated Discovery] Found ${threeFeaturePatterns.length} three-feature candidates`)

  // 8. Combine and filter all candidates
  const allCandidates = [...singleFeaturePatterns, ...twoFeaturePatterns, ...threeFeaturePatterns]
  
  const validPatterns = allCandidates.filter(p =>
    p.totalCount >= MIN_SAMPLE_SIZE &&
    Math.abs(p.lift) >= MIN_LIFT &&
    p.pValue <= MAX_P_VALUE
  )

  console.log(`[Integrated Discovery] ${validPatterns.length} patterns pass thresholds`)

  // 9. Remove redundant patterns
  const dedupedPatterns = deduplicatePatterns(validPatterns)
  console.log(`[Integrated Discovery] ${dedupedPatterns.length} patterns after dedup`)

  // 10. Get existing patterns to avoid duplicates
  const existingPatterns = await prisma.dCG_ContextPattern.findMany()
  const existingConditions = new Set(
    existingPatterns.map(p => normalizeConditions(p.context_criteria))
  )

  // 11. Create new patterns
  const newPatterns: any[] = []
  
  for (const candidate of dedupedPatterns) {
    const conditionsJson = JSON.stringify(candidate.features.map(f => ({
      field: f.field,
      operator: f.operator,
      value: f.value
    })))
    
    const normalizedConditions = normalizeConditions(conditionsJson)
    
    if (existingConditions.has(normalizedConditions)) {
      continue
    }

    const patternCount = existingPatterns.length + newPatterns.length
    const patternNumber = `PAT-${String(patternCount + 1).padStart(4, '0')}`
    
    const patternName = generatePatternName(candidate)
    const isRisk = candidate.lift < 0
    
    const pattern = await prisma.dCG_ContextPattern.create({
      data: {
        pattern_number: patternNumber,
        title: patternName,
        description: generatePatternDescription(candidate),
        context_criteria: conditionsJson,
        supporting_trace_ids: JSON.stringify([]),
        sample_size: candidate.totalCount,
        success_count: candidate.successCount,
        success_rate: candidate.successRate,
        baseline_rate: baselineSuccessRate,
        lift_vs_baseline: candidate.lift,
        p_value: candidate.pValue,
        statistically_significant: candidate.pValue <= 0.05,
        status: isRisk ? 'RISK' : 'ACTIVE',
        data_month: upToMonth,
        discoveryMethod: 'statistical_correlation',
        evidenceStrength: candidate.totalCount >= 100 ? 'strong' : 'moderate',
        minimumConfidence: 0.7,
        applicabilityRules: JSON.stringify({
          minSampleSize: MIN_SAMPLE_SIZE,
          minLift: MIN_LIFT,
          maxPValue: MAX_P_VALUE
        }),
        validationResults: JSON.stringify({
          confidenceInterval: candidate.confidenceInterval,
          pValue: candidate.pValue,
          sampleSize: candidate.totalCount
        })
      }
    })

    newPatterns.push(pattern)
    existingConditions.add(normalizedConditions)
    
    console.log(`[Integrated Discovery] Created ${patternNumber}: ${patternName} (lift: ${(candidate.lift * 100).toFixed(1)}%)`)
  }

  // 12. Run LLM-based pattern discovery (only after month 6 to have enough data)
  if (upToMonth >= 6) {
    try {
      console.log(`[Integrated Discovery] Running LLM-based pattern discovery...`)
      
      // Get names of existing patterns to avoid duplicates
      const existingPatternNames = existingPatterns.map(p => p.title)
      
      // Run LLM discovery
      const llmHypotheses = await runLLMPatternDiscovery(decisions, baselineSuccessRate, existingPatternNames)
      
      if (llmHypotheses.length > 0) {
        // Validate LLM hypotheses against actual data
        const validatedLLMPatterns = await validateLLMHypotheses(llmHypotheses, decisions, baselineSuccessRate)
        
        // Create patterns from validated LLM hypotheses
        for (const candidate of validatedLLMPatterns) {
          const conditionsJson = JSON.stringify(candidate.features.map(f => ({
            field: f.field,
            operator: f.operator,
            value: f.value
          })))
          
          const normalizedConditions = normalizeConditions(conditionsJson)
          
          if (existingConditions.has(normalizedConditions)) {
            continue
          }

          const patternCount = existingPatterns.length + newPatterns.length
          const patternNumber = `PAT-${String(patternCount + 1).padStart(4, '0')}`
          
          const patternName = generatePatternName(candidate)
          const isRisk = candidate.lift < 0
          
          const pattern = await prisma.dCG_ContextPattern.create({
            data: {
              pattern_number: patternNumber,
              title: patternName,
              description: generatePatternDescription(candidate),
              context_criteria: conditionsJson,
              supporting_trace_ids: JSON.stringify([]),
              sample_size: candidate.totalCount,
              success_count: candidate.successCount,
              success_rate: candidate.successRate,
              baseline_rate: baselineSuccessRate,
              lift_vs_baseline: candidate.lift,
              p_value: candidate.pValue,
              statistically_significant: candidate.pValue <= 0.05,
              status: isRisk ? 'RISK' : 'ACTIVE',
              data_month: upToMonth,
              discoveryMethod: 'llm_hypothesis',  // Mark as LLM-discovered
              evidenceStrength: candidate.totalCount >= 100 ? 'strong' : 'moderate',
              minimumConfidence: 0.7,
              applicabilityRules: JSON.stringify({
                minSampleSize: MIN_SAMPLE_SIZE,
                minLift: MIN_LIFT,
                maxPValue: MAX_P_VALUE
              }),
              validationResults: JSON.stringify({
                confidenceInterval: candidate.confidenceInterval,
                pValue: candidate.pValue,
                sampleSize: candidate.totalCount,
                discoveredBy: 'LLM'
              })
            }
          })

          newPatterns.push(pattern)
          existingConditions.add(normalizedConditions)
          
          console.log(`[LLM Discovery] Created ${patternNumber}: ${patternName} (lift: ${(candidate.lift * 100).toFixed(1)}%)`)
        }
      }
    } catch (error) {
      console.error('[LLM Discovery] Error during LLM pattern discovery:', error)
      // Continue with statistical patterns even if LLM fails
    }
  }

  return newPatterns
}

function extractContextFields(socialSnapshot: any, clinicalSnapshot: any): Record<string, any> {
  const ctx: Record<string, any> = {}
  
  if (socialSnapshot) {
    ctx.caregiver_relationship = socialSnapshot.caregiver_relationship
    ctx.caregiver_medical_background = socialSnapshot.caregiver_medical_background
    ctx.caregiver_proximity_minutes = socialSnapshot.caregiver_proximity_minutes
    ctx.caregiver_availability = socialSnapshot.caregiver_availability
    ctx.caregiver_age = socialSnapshot.caregiver_age
    ctx.caregiver_health_status = socialSnapshot.caregiver_health_status
    ctx.living_situation = socialSnapshot.living_situation
    ctx.has_caregiver = socialSnapshot.has_caregiver
    ctx.has_transportation = socialSnapshot.has_transportation
    ctx.patient_stated_preference = socialSnapshot.patient_stated_preference
  }
  
  if (clinicalSnapshot) {
    ctx.readmit_count_12m = clinicalSnapshot.readmit_count_12m
    ctx.adl_score = clinicalSnapshot.adl_score
    ctx.los_at_decision = clinicalSnapshot.los_at_decision
    ctx.age = clinicalSnapshot.age
  }
  
  return ctx
}

function extractAllFeatures(decisions: DecisionWithContext[]): ContextFeature[] {
  const featureSet = new Map<string, ContextFeature>()

  // Boolean fields
  addFeature(featureSet, 'caregiver_medical_background', 'eq', true, 'has medical background')
  addFeature(featureSet, 'caregiver_medical_background', 'eq', false, 'no medical background')
  addFeature(featureSet, 'has_caregiver', 'eq', true, 'has caregiver')
  addFeature(featureSet, 'has_caregiver', 'eq', false, 'no caregiver')
  addFeature(featureSet, 'has_transportation', 'eq', true, 'has transportation')
  addFeature(featureSet, 'has_transportation', 'eq', false, 'no transportation')

  // Categorical fields
  for (const value of ['Spouse', 'Child', 'Sibling', 'Parent', 'Friend']) {
    addFeature(featureSet, 'caregiver_relationship', 'eq', value, value)
  }
  for (const value of ['full-time', 'part-time', 'weekends', 'limited']) {
    addFeature(featureSet, 'caregiver_availability', 'eq', value, value)
  }
  for (const value of ['Lives alone', 'Lives with spouse', 'Lives with family', 'Assisted living']) {
    addFeature(featureSet, 'living_situation', 'eq', value, value)
  }
  for (const value of ['Good', 'Fair', 'Poor']) {
    addFeature(featureSet, 'caregiver_health_status', 'eq', value, value)
  }
  for (const value of ['Prefers home', 'Prefers facility', 'Uncertain']) {
    addFeature(featureSet, 'patient_stated_preference', 'eq', value, value)
  }

  // Numeric fields - discretized
  for (const [field, config] of Object.entries(DISCRETIZATION)) {
    for (const rule of config.rules) {
      addFeature(featureSet, field, rule.operator as any, rule.value, rule.label)
    }
  }

  return Array.from(featureSet.values())
}

function addFeature(
  featureSet: Map<string, ContextFeature>,
  field: string,
  operator: ContextFeature['operator'],
  value: string | number | boolean,
  displayValue: string
): void {
  const key = `${field}:${operator}:${value}`
  if (!featureSet.has(key)) {
    featureSet.set(key, { field, operator, value, displayValue })
  }
}

function matchesFeature(ctx: Record<string, any>, feature: ContextFeature): boolean {
  const value = ctx[feature.field]
  if (value === undefined || value === null) return false
  
  switch (feature.operator) {
    case 'eq': return value === feature.value
    case 'lte': return typeof value === 'number' && value <= (feature.value as number)
    case 'gte': return typeof value === 'number' && value >= (feature.value as number)
    case 'lt': return typeof value === 'number' && value < (feature.value as number)
    case 'gt': return typeof value === 'number' && value > (feature.value as number)
    default: return false
  }
}

function findSingleFeaturePatterns(
  decisions: DecisionWithContext[],
  features: ContextFeature[],
  baseline: number
): CandidatePattern[] {
  const patterns: CandidatePattern[] = []

  for (const feature of features) {
    const matching = decisions.filter(d => matchesFeature(d.context, feature))

    if (matching.length < MIN_SAMPLE_SIZE) continue

    const successCount = matching.filter(d => d.outcome).length
    const pattern = createCandidate([feature], successCount, matching.length, baseline)
    patterns.push(pattern)
  }

  return patterns
}

function findTwoFeaturePatterns(
  decisions: DecisionWithContext[],
  features: ContextFeature[],
  baseline: number
): CandidatePattern[] {
  const patterns: CandidatePattern[] = []

  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      // Skip if same field
      if (features[i].field === features[j].field) continue

      const combo = [features[i], features[j]]
      const matching = decisions.filter(d => 
        combo.every(f => matchesFeature(d.context, f))
      )

      if (matching.length < MIN_SAMPLE_SIZE) continue

      const successCount = matching.filter(d => d.outcome).length
      const pattern = createCandidate(combo, successCount, matching.length, baseline)
      
      // Only keep if lift is meaningful
      if (Math.abs(pattern.lift) >= 0.05) {
        patterns.push(pattern)
      }
    }
  }

  return patterns
}

function findThreeFeaturePatterns(
  decisions: DecisionWithContext[],
  features: ContextFeature[],
  baseline: number
): CandidatePattern[] {
  const patterns: CandidatePattern[] = []

  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      for (let k = j + 1; k < features.length; k++) {
        // Skip if any same field
        const fields = new Set([features[i].field, features[j].field, features[k].field])
        if (fields.size !== 3) continue

        const combo = [features[i], features[j], features[k]]
        const matching = decisions.filter(d => 
          combo.every(f => matchesFeature(d.context, f))
        )

        if (matching.length < MIN_SAMPLE_SIZE) continue

        const successCount = matching.filter(d => d.outcome).length
        const pattern = createCandidate(combo, successCount, matching.length, baseline)
        
        if (Math.abs(pattern.lift) >= 0.08) {
          patterns.push(pattern)
        }
      }
    }
  }

  return patterns
}

function createCandidate(
  features: ContextFeature[],
  successCount: number,
  totalCount: number,
  baseline: number
): CandidatePattern {
  const failureCount = totalCount - successCount
  const successRate = successCount / totalCount
  const lift = successRate - baseline
  
  // Chi-square test
  const expectedSuccess = totalCount * baseline
  const expectedFailure = totalCount * (1 - baseline)
  
  const chi2 = 
    Math.pow(successCount - expectedSuccess, 2) / expectedSuccess +
    Math.pow(failureCount - expectedFailure, 2) / expectedFailure
  
  // Approximate p-value (chi-square with 1 df)
  const pValue = Math.exp(-chi2 / 2)
  
  // Wilson confidence interval
  const ci = wilsonInterval(successCount, totalCount)

  return {
    features,
    successCount,
    failureCount,
    totalCount,
    successRate,
    lift,
    pValue,
    confidenceInterval: ci
  }
}

function wilsonInterval(successes: number, total: number): { lower: number; upper: number } {
  if (total === 0) return { lower: 0, upper: 1 }
  
  const z = 1.96 // 95% confidence
  const p = successes / total
  const n = total
  
  const denom = 1 + z * z / n
  const center = (p + z * z / (2 * n)) / denom
  const spread = (z / denom) * Math.sqrt((p * (1 - p) / n) + (z * z / (4 * n * n)))
  
  return {
    lower: Math.max(0, center - spread),
    upper: Math.min(1, center + spread)
  }
}

function deduplicatePatterns(patterns: CandidatePattern[]): CandidatePattern[] {
  // Sort by absolute lift descending
  patterns.sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift))
  
  const kept: CandidatePattern[] = []
  
  for (const pattern of patterns) {
    // Check if this is a subset of an already-kept pattern
    const isSubset = kept.some(k => {
      if (k.features.length <= pattern.features.length) return false
      
      const kFields = new Set(k.features.map(f => `${f.field}:${f.operator}:${f.value}`))
      return pattern.features.every(f => kFields.has(`${f.field}:${f.operator}:${f.value}`))
    })
    
    // Check if a more specific pattern already exists with similar lift
    const hasMoreSpecific = kept.some(k => {
      if (k.features.length >= pattern.features.length) return false
      
      const pFields = new Set(pattern.features.map(f => `${f.field}:${f.operator}:${f.value}`))
      const isSuperset = k.features.every(f => pFields.has(`${f.field}:${f.operator}:${f.value}`))
      
      // Keep the more specific one if lift is similar (within 5%)
      return isSuperset && Math.abs(k.lift - pattern.lift) < 0.05
    })
    
    if (!isSubset && !hasMoreSpecific) {
      kept.push(pattern)
    }
  }
  
  // Limit to top 5 per discovery run to avoid explosion
  return kept.slice(0, 5)
}

function normalizeConditions(conditionsJson: string): string {
  try {
    const conditions = JSON.parse(conditionsJson)
    if (Array.isArray(conditions)) {
      return JSON.stringify(conditions.sort((a: any, b: any) => 
        `${a.field}:${a.value}`.localeCompare(`${b.field}:${b.value}`)
      ))
    }
    return conditionsJson
  } catch {
    return conditionsJson
  }
}

function generatePatternName(pattern: CandidatePattern): string {
  const isRisk = pattern.lift < 0
  const prefix = isRisk ? 'RISK: ' : ''
  
  const descriptions = pattern.features.map(f => {
    const fieldNames: Record<string, string> = {
      caregiver_medical_background: 'Medical background caregiver',
      caregiver_proximity_minutes: 'Caregiver proximity',
      caregiver_availability: 'Caregiver availability',
      caregiver_relationship: 'Caregiver',
      caregiver_age: 'Caregiver age',
      caregiver_health_status: 'Caregiver health',
      living_situation: 'Living situation',
      has_caregiver: 'Has caregiver',
      has_transportation: 'Transportation',
      readmit_count_12m: 'Prior readmissions',
      adl_score: 'ADL score',
      patient_stated_preference: 'Patient preference',
      los_at_decision: 'Length of stay'
    }
    
    const fieldName = fieldNames[f.field] || f.field
    
    if (f.operator === 'eq') {
      if (f.value === true) return fieldName
      if (f.value === false) return `No ${fieldName.toLowerCase()}`
      return `${fieldName}: ${f.value}`
    }
    
    return `${fieldName} ${f.displayValue}`
  })
  
  return prefix + descriptions.join(' + ')
}

function generatePatternDescription(pattern: CandidatePattern): string {
  const isRisk = pattern.lift < 0
  const liftPercent = Math.abs(pattern.lift * 100).toFixed(0)
  
  if (isRisk) {
    return `Patients matching this pattern show ${liftPercent}% HIGHER readmission rates - consider additional support`
  }
  
  return `Patients matching this pattern show ${liftPercent}% better outcomes than baseline`
}

// LLM-based pattern discovery - uses AI to analyze outcome data and propose hypotheses
interface LLMPatternHypothesis {
  name: string
  description: string
  criteria: { field: string; operator: string; value: string | number | boolean }[]
  rationale: string
  expectedLift: number
}

export async function runLLMPatternDiscovery(
  decisions: DecisionWithContext[],
  baselineSuccessRate: number,
  existingPatterns: string[]
): Promise<LLMPatternHypothesis[]> {
  console.log(`[LLM Discovery] Analyzing ${decisions.length} decisions for pattern hypotheses...`)
  
  // Sample decisions for LLM analysis (limit to avoid token limits)
  const sampleSize = Math.min(100, decisions.length)
  const sampledDecisions = decisions
    .sort(() => Math.random() - 0.5)
    .slice(0, sampleSize)
  
  // Separate successes and failures for analysis
  const successes = sampledDecisions.filter(d => d.outcome)
  const failures = sampledDecisions.filter(d => !d.outcome)
  
  // Create summary statistics for LLM
  const contextSummary = summarizeContextData(sampledDecisions)
  
  const systemPrompt = `You are a healthcare data scientist analyzing patient discharge outcomes to discover patterns that predict successful transitions (no readmission within 30 days).

Your task is to identify NEW patterns in the data that could help predict which patients will have successful outcomes. Focus on combinations of context factors that appear more frequently in successful cases.

Available context fields:
- caregiver_relationship: Spouse, Child, Sibling, Parent, Other Family, Friend, Professional
- caregiver_medical_background: true/false (has medical training)
- caregiver_proximity_minutes: number (travel time to patient)
- caregiver_availability: Full-time, Part-time, Weekends only, As needed
- caregiver_age: number
- living_situation: Lives alone, Lives with spouse, Lives with family, Assisted living, etc.
- has_transportation: true/false
- readmit_count_12m: number (prior readmissions in 12 months)
- adl_score: number 0-24 (activities of daily living, higher = more independent)
- los_at_decision: number (length of stay in days)

Respond with a JSON array of pattern hypotheses. Each hypothesis should have:
- name: Short descriptive name
- description: Why this pattern might predict success
- criteria: Array of {field, operator, value} conditions (operators: eq, lte, gte, lt, gt)
- rationale: Clinical reasoning for why this pattern matters
- expectedLift: Estimated improvement over baseline (0.1 = 10% better)

Focus on patterns NOT already discovered: ${existingPatterns.join(', ') || 'none yet'}`

  const userPrompt = `Baseline success rate: ${(baselineSuccessRate * 100).toFixed(1)}%
Sample size: ${sampleSize} decisions (${successes.length} successes, ${failures.length} failures)

Context distribution in successful cases:
${JSON.stringify(contextSummary.successes, null, 2)}

Context distribution in failed cases:
${JSON.stringify(contextSummary.failures, null, 2)}

Identify 2-3 NEW pattern hypotheses that could predict successful outcomes. Return ONLY valid JSON array.`

  try {
    const response = await callAI(userPrompt, systemPrompt)
    
    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.log('[LLM Discovery] No valid JSON array in response')
      return []
    }
    
    const hypotheses: LLMPatternHypothesis[] = JSON.parse(jsonMatch[0])
    console.log(`[LLM Discovery] Generated ${hypotheses.length} pattern hypotheses`)
    
    return hypotheses
  } catch (error) {
    console.error('[LLM Discovery] Error calling AI:', error)
    return []
  }
}

function summarizeContextData(decisions: DecisionWithContext[]): { successes: Record<string, any>; failures: Record<string, any> } {
  const successes = decisions.filter(d => d.outcome)
  const failures = decisions.filter(d => !d.outcome)
  
  const summarize = (group: DecisionWithContext[]) => {
    if (group.length === 0) return {}
    
    const summary: Record<string, any> = {}
    
    // Categorical fields - count distributions
    const categoricalFields = ['caregiver_relationship', 'living_situation', 'caregiver_availability']
    for (const field of categoricalFields) {
      const counts: Record<string, number> = {}
      for (const d of group) {
        const val = d.context[field]
        if (val) counts[val] = (counts[val] || 0) + 1
      }
      summary[field] = counts
    }
    
    // Boolean fields - percentage true
    const booleanFields = ['caregiver_medical_background', 'has_transportation']
    for (const field of booleanFields) {
      const trueCount = group.filter(d => d.context[field] === true).length
      summary[field] = `${((trueCount / group.length) * 100).toFixed(0)}% true`
    }
    
    // Numeric fields - averages
    const numericFields = ['caregiver_proximity_minutes', 'caregiver_age', 'adl_score', 'readmit_count_12m', 'los_at_decision']
    for (const field of numericFields) {
      const values = group.map(d => d.context[field]).filter(v => typeof v === 'number')
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        summary[field] = `avg: ${avg.toFixed(1)}`
      }
    }
    
    return summary
  }
  
  return {
    successes: summarize(successes),
    failures: summarize(failures)
  }
}

// Validate LLM hypotheses against actual data
export async function validateLLMHypotheses(
  hypotheses: LLMPatternHypothesis[],
  decisions: DecisionWithContext[],
  baselineSuccessRate: number
): Promise<CandidatePattern[]> {
  const validatedPatterns: CandidatePattern[] = []
  
  for (const hypothesis of hypotheses) {
    // Convert hypothesis criteria to ContextFeatures
    const features: ContextFeature[] = hypothesis.criteria.map(c => ({
      field: c.field,
      operator: c.operator as 'eq' | 'lte' | 'gte' | 'lt' | 'gt',
      value: c.value,
      displayValue: `${c.operator} ${c.value}`
    }))
    
    // Find matching decisions
    const matching = decisions.filter(d => 
      features.every(f => matchesFeature(d.context, f))
    )
    
    if (matching.length < MIN_SAMPLE_SIZE) {
      console.log(`[LLM Validation] Hypothesis "${hypothesis.name}" has insufficient sample (${matching.length})`)
      continue
    }
    
    // Calculate actual statistics
    const candidate = createCandidate(features, matching, baselineSuccessRate)
    
    if (candidate && candidate.lift >= MIN_LIFT && candidate.pValue <= MAX_P_VALUE) {
      console.log(`[LLM Validation] Validated: "${hypothesis.name}" - lift: ${(candidate.lift * 100).toFixed(1)}%`)
      validatedPatterns.push(candidate)
    } else if (candidate) {
      console.log(`[LLM Validation] Rejected: "${hypothesis.name}" - lift: ${(candidate.lift * 100).toFixed(1)}%, p: ${candidate.pValue.toFixed(3)}`)
    }
  }
  
  return validatedPatterns
}

export { CandidatePattern, ContextFeature, DecisionWithContext }
