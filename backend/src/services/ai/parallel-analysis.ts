import { callSpecificProvider, getProviderNames } from './client';

interface PatientData {
  name: string;
  mrn: string;
  age: number;
  gender: string;
  principal_diagnosis: string;
  los_days: number;
  unit: string;
  insurance_type: string;
  discharge_disposition?: string;
}

interface RiskFactorResult {
  riskFactors: Array<{
    title: string;
    patternId: string | null;
    reason: string;
    evidence: string;
    recommendation: string;
  }>;
  protectiveFactors: Array<{
    title: string;
    patternId: string | null;
    reason: string;
    evidence: string;
  }>;
}

interface RequirementsResult {
  requirements: Array<{
    name: string;
    status: 'met' | 'not_met' | 'pending';
    standard: string;
    patternId: string | null;
  }>;
}

interface RecommendationResult {
  overallScore: number;
  recommendation: 'approve' | 'hold' | 'needs_review';
  suggestedDisposition: string;
  confidence: number;
  reasoning: string;
}

const CONTEXT_PATTERNS = `Context Graph Patterns:
- PAT-0001: Medical Background Caregiver - 84% success, +19% lift (n=447)
- PAT-0003: Full-Time Availability - 85% success, +20% lift (n=520)
- PAT-0007: Patient Preference Alignment - 85% success, +20% lift (n=410)
- PAT-0008: Low Readmission History - 88% success, +23% lift (n=620)
- PAT-0009: Spouse Caregiver Commitment - 81% success, +16% lift (n=380)
- PAT-0012: No Transportation Barriers - 77% success, +12% lift (n=550)
- PAT-0014: Elderly Caregiver Risk Flag - 42% success, -23% lift (RISK) (n=340)`;

function buildPatientContext(patient: PatientData): string {
  return `Patient: ${patient.name}
MRN: ${patient.mrn}
Age: ${patient.age}y ${patient.gender}
Diagnosis: ${patient.principal_diagnosis}
LOS: ${patient.los_days} days
Unit: ${patient.unit}
Insurance: ${patient.insurance_type}
Planned Disposition: ${patient.discharge_disposition || 'Not specified'}`;
}

async function analyzeRiskFactors(patient: PatientData, provider: string): Promise<RiskFactorResult> {
  const systemPrompt = `You are a Risk Factor Analyst. Identify risk and protective factors for hospital discharge.
${CONTEXT_PATTERNS}

Respond with JSON only:
{"riskFactors":[{"title":"string","patternId":"PAT-XXXX or null","reason":"string","evidence":"string","recommendation":"string"}],"protectiveFactors":[{"title":"string","patternId":"PAT-XXXX or null","reason":"string","evidence":"string"}]}`;

  const userPrompt = `Analyze risk/protective factors for:
${buildPatientContext(patient)}

Identify 2-4 risk factors and 1-2 protective factors based on the context patterns.`;

  try {
    const response = await callSpecificProvider(provider, userPrompt, systemPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Risk factor analysis failed:', e);
  }
  
  return {
    riskFactors: [{ title: 'Analysis incomplete', patternId: null, reason: 'Unable to complete risk analysis', evidence: 'N/A', recommendation: 'Manual review required' }],
    protectiveFactors: []
  };
}

async function analyzeRequirements(patient: PatientData, provider: string): Promise<RequirementsResult> {
  const systemPrompt = `You are a Discharge Requirements Evaluator. Evaluate CMS, Joint Commission, and AHRQ standards.

Respond with JSON only:
{"requirements":[{"name":"string","status":"met|not_met|pending","standard":"CMS/JC/AHRQ reference","patternId":"PAT-XXXX or null"}]}

Include these 6 key requirements:
1. Clinical stability (vitals, medications)
2. Medication reconciliation with teach-back
3. Functional readiness (PT/OT clearance)
4. Caregiver assessment
5. Post-discharge services arranged
6. Follow-up appointments scheduled`;

  const userPrompt = `Evaluate discharge requirements for:
${buildPatientContext(patient)}

Assess each requirement as met, not_met, or pending based on available information.`;

  try {
    const response = await callSpecificProvider(provider, userPrompt, systemPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Requirements analysis failed:', e);
  }
  
  return {
    requirements: [
      { name: 'Clinical stability', status: 'pending', standard: 'CMS CoP', patternId: null },
      { name: 'Medication reconciliation', status: 'pending', standard: 'Joint Commission NPSG', patternId: null },
      { name: 'Functional readiness', status: 'pending', standard: 'CMS CoP', patternId: null },
      { name: 'Caregiver assessment', status: 'pending', standard: 'AHRQ IDEAL', patternId: null },
      { name: 'Post-discharge services', status: 'pending', standard: 'CMS CoP', patternId: null },
      { name: 'Follow-up scheduled', status: 'pending', standard: 'AHRQ IDEAL', patternId: null }
    ]
  };
}

async function generateRecommendation(
  patient: PatientData, 
  riskFactors: RiskFactorResult, 
  requirements: RequirementsResult,
  provider: string
): Promise<RecommendationResult> {
  const systemPrompt = `You are a Discharge Recommendation Aggregator. Synthesize risk factors and requirements into a final recommendation.

Respond with JSON only:
{"overallScore":0-100,"recommendation":"approve|hold|needs_review","suggestedDisposition":"string","confidence":0-100,"reasoning":"brief explanation"}`;

  const userPrompt = `Generate discharge recommendation for:
${buildPatientContext(patient)}

Risk Factors Found: ${riskFactors.riskFactors.length}
${riskFactors.riskFactors.map(r => `- ${r.title}`).join('\n')}

Protective Factors: ${riskFactors.protectiveFactors.length}
${riskFactors.protectiveFactors.map(p => `- ${p.title}`).join('\n')}

Requirements Status:
${requirements.requirements.map(r => `- ${r.name}: ${r.status}`).join('\n')}

Provide overall score, recommendation, and brief reasoning.`;

  try {
    const response = await callSpecificProvider(provider, userPrompt, systemPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Recommendation generation failed:', e);
  }
  
  const metCount = requirements.requirements.filter(r => r.status === 'met').length;
  const score = Math.round((metCount / requirements.requirements.length) * 100);
  
  return {
    overallScore: score,
    recommendation: score >= 70 ? 'approve' : score >= 50 ? 'needs_review' : 'hold',
    suggestedDisposition: patient.discharge_disposition || 'Home with Home Health',
    confidence: 60,
    reasoning: 'Automated fallback - manual review recommended'
  };
}

export async function runParallelDischargeAnalysis(patient: PatientData) {
  const providers = getProviderNames();
  const startTime = Date.now();
  
  // Assign different providers to different tasks for true parallelism
  const riskProvider = providers[0] || 'GPT-5.2';
  const reqProvider = providers[1] || providers[0] || 'GPT-5.2';
  
  console.log(`[Parallel Analysis] Starting parallel analysis with ${riskProvider} and ${reqProvider}`);
  
  // Run risk and requirements analysis in parallel
  const [riskResult, reqResult] = await Promise.all([
    analyzeRiskFactors(patient, riskProvider),
    analyzeRequirements(patient, reqProvider)
  ]);
  
  const parallelTime = Date.now() - startTime;
  console.log(`[Parallel Analysis] Parallel phase completed in ${parallelTime}ms`);
  
  // Aggregation phase - use fastest provider
  const aggProvider = providers[2] || providers[0] || 'GPT-5.2';
  const recommendation = await generateRecommendation(patient, riskResult, reqResult, aggProvider);
  
  const totalTime = Date.now() - startTime;
  console.log(`[Parallel Analysis] Total analysis completed in ${totalTime}ms`);
  
  return {
    success: true,
    analysis: {
      overallScore: recommendation.overallScore,
      recommendation: recommendation.recommendation,
      riskFactors: riskResult.riskFactors,
      protectiveFactors: riskResult.protectiveFactors,
      requirements: reqResult.requirements,
      suggestedDisposition: recommendation.suggestedDisposition,
      confidence: recommendation.confidence,
      reasoning: recommendation.reasoning
    },
    patient: patient.mrn,
    timestamp: new Date().toISOString(),
    timing: {
      parallelPhaseMs: parallelTime,
      totalMs: totalTime
    }
  };
}
