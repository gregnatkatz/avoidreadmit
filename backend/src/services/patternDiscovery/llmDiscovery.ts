import { PrismaClient } from '@prisma/client'
import { callAI } from '../ai/client'

const prisma = new PrismaClient()

interface UnexplainedCase {
  patientAge: number
  diagnosis: string
  lengthOfStay: number
  outcome: 'SUCCESS' | 'READMITTED'
  contextSummary: string
  matchedPatterns: string[]
  maxPatternMatchScore: number
}

interface LLMDiscoveredPattern {
  name: string
  conditions: { field: string; operator: string; value: string }[]
  contraindications?: { field: string; operator: string; value: string }[]
  hypothesis: string
  estimatedSuccessRate: number
  supportingCases: number[]
}

export async function discoverPatternsWithLLM(
  unexplainedCases: UnexplainedCase[]
): Promise<LLMDiscoveredPattern[]> {
  console.log(`[LLM Discovery] Analyzing ${unexplainedCases.length} unexplained cases...`)

  // Group cases by outcome
  const successes = unexplainedCases.filter(c => c.outcome === 'SUCCESS')
  const readmits = unexplainedCases.filter(c => c.outcome === 'READMITTED')

  if (successes.length < 5) {
    console.log('[LLM Discovery] Not enough unexplained successes to analyze')
    return []
  }

  const prompt = `You are a healthcare data scientist analyzing discharge outcomes to discover patterns that predict successful (no readmission) vs unsuccessful (readmission within 30 days) discharges.

## Unexplained Successful Discharges
These patients were discharged successfully but didn't match any known success patterns well:

${successes.slice(0, 20).map((c, i) => `
### Case ${i + 1}
- Age: ${c.patientAge}, Diagnosis: ${c.diagnosis}, LOS: ${c.lengthOfStay} days
- Best pattern match: ${c.maxPatternMatchScore}%
- Context: ${c.contextSummary}
`).join('\n')}

## Readmitted Cases (for contrast)
${readmits.slice(0, 10).map((c, i) => `
### Case ${i + 1}
- Age: ${c.patientAge}, Diagnosis: ${c.diagnosis}, LOS: ${c.lengthOfStay} days
- Context: ${c.contextSummary}
`).join('\n')}

## Your Task
Identify 1-3 NEW patterns that might explain why the successful cases avoided readmission. Look for:
1. Combinations of context factors that appear in successes but not readmits
2. Protective factors that aren't captured by existing patterns
3. Specific conditions under which certain factors matter more

For each pattern, provide:
1. Pattern name (short descriptive title)
2. Required conditions (list of context factors that must be present)
3. Contraindications (factors that would make this pattern not apply)
4. Hypothesis for why this pattern works
5. Estimated success rate based on the cases you see

Respond in JSON format:
{
  "patterns": [
    {
      "name": "Pattern name",
      "conditions": [
        { "field": "fieldName", "operator": "eq", "value": "value" }
      ],
      "contraindications": [
        { "field": "fieldName", "operator": "eq", "value": "value" }
      ],
      "hypothesis": "Explanation of why this works",
      "estimatedSuccessRate": 0.85,
      "supportingCases": [1, 3, 7, 12]
    }
  ]
}`

  try {
    const response = await callAI(prompt, 'You are a healthcare analytics expert specializing in readmission prediction.')
    
    if (!response) {
      console.log('[LLM Discovery] No response from AI')
      return []
    }

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log('[LLM Discovery] Could not extract JSON from response')
      return []
    }

    const result = JSON.parse(jsonMatch[0])
    
    console.log(`[LLM Discovery] AI suggested ${result.patterns?.length || 0} patterns`)
    
    return (result.patterns || []).map((p: any) => ({
      name: p.name,
      conditions: p.conditions || [],
      contraindications: p.contraindications || [],
      hypothesis: p.hypothesis,
      estimatedSuccessRate: p.estimatedSuccessRate || 0.75,
      supportingCases: p.supportingCases || []
    }))
  } catch (e) {
    console.error('[LLM Discovery] Failed to parse LLM response:', e)
    return []
  }
}

export async function findUnexplainedSuccesses(): Promise<UnexplainedCase[]> {
  console.log('[LLM Discovery] Finding unexplained successes...')
  
  // Get recent successful outcomes
  const recentSuccesses = await prisma.dCG_Outcome.findMany({
    where: {
      outcome_success: true,
      created_at: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
    },
    include: {
      trace: {
        include: {
          clinical_snapshot: true,
          social_snapshot: true,
          patternSnapshots: {
            include: {
              snapshot: true
            }
          }
        }
      }
    },
    take: 100
  })

  // Filter to cases with low pattern match scores
  const unexplained = recentSuccesses
    .filter(o => {
      const maxMatch = Math.max(
        ...o.trace.patternSnapshots.map(ps => ps.matchScore),
        0
      )
      return maxMatch < 0.6 // Less than 60% match to any pattern
    })
    .map(o => ({
      patientAge: o.trace.clinical_snapshot?.age || 0,
      diagnosis: o.trace.clinical_snapshot?.principal_diagnosis_desc || 'Unknown',
      lengthOfStay: o.trace.clinical_snapshot?.los_at_decision || 0,
      outcome: 'SUCCESS' as const,
      contextSummary: summarizeContext(o.trace.social_snapshot),
      matchedPatterns: o.trace.patternSnapshots.map(ps => ps.snapshot.patternId),
      maxPatternMatchScore: Math.max(
        ...o.trace.patternSnapshots.map(ps => ps.matchScore * 100),
        0
      )
    }))

  console.log(`[LLM Discovery] Found ${unexplained.length} unexplained successes`)
  return unexplained
}

function summarizeContext(socialSnapshot: any): string {
  if (!socialSnapshot) return 'No social context available'
  
  const summary: string[] = []
  
  if (socialSnapshot.has_caregiver) {
    summary.push(`Has caregiver (${socialSnapshot.caregiver_relationship || 'relationship unknown'})`)
  }
  if (socialSnapshot.caregiver_medical_background) {
    summary.push('Caregiver has medical background')
  }
  if (socialSnapshot.caregiver_availability) {
    summary.push(`Caregiver availability: ${socialSnapshot.caregiver_availability}`)
  }
  if (socialSnapshot.caregiver_proximity_minutes) {
    summary.push(`Caregiver ${socialSnapshot.caregiver_proximity_minutes} min away`)
  }
  if (socialSnapshot.living_situation) {
    summary.push(`Living: ${socialSnapshot.living_situation}`)
  }
  if (socialSnapshot.positive_factors) {
    summary.push(`Positive: ${socialSnapshot.positive_factors}`)
  }
  if (socialSnapshot.barriers_from_conversations) {
    summary.push(`Barriers: ${socialSnapshot.barriers_from_conversations}`)
  }
  
  return summary.join('; ') || 'Limited context available'
}
