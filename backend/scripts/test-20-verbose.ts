import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';

interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response | null> {
  let delay = config.initialDelayMs;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        if (attempt < config.maxAttempts) {
          console.log(`      [RETRY] Rate limited (429), attempt ${attempt}/${config.maxAttempts}. Waiting ${delay}ms...`);
          await sleep(delay);
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
          continue;
        }
      }
      
      return response;
    } catch (error) {
      console.error(`      [ERROR] Request failed (attempt ${attempt}/${config.maxAttempts}):`, error);
      if (attempt < config.maxAttempts) {
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }
  }
  return null;
}

// 20 realistic patient scenarios for AI analysis
const PATIENT_SCENARIOS = [
  {
    name: "Elderly CHF patient with supportive daughter",
    transcript: "78-year-old female with CHF exacerbation. Daughter Maria lives 5 minutes away and can visit daily. Patient is motivated, good mobility with walker. Single-story home, no stairs. Needs medication management and daily weight monitoring. Patient has been compliant with medications in the past. Daughter is a retired teacher with flexible schedule.",
    expectedDecision: "Home with Services",
    riskFactors: ["Age 78", "CHF", "Lives alone"],
    protectiveFactors: ["Supportive daughter nearby", "Motivated patient", "Accessible home"]
  },
  {
    name: "Post-hip replacement with limited family support",
    transcript: "82-year-old male, post right hip replacement. Son lives 2 hours away, works full-time. Patient lives in 2-story home, bedroom upstairs. Needs PT/OT, wound care. High fall risk, uses wheelchair currently. Patient has mild cognitive impairment and history of depression.",
    expectedDecision: "SNF",
    riskFactors: ["Age 82", "Limited caregiver", "2-story home", "High fall risk", "Cognitive impairment"],
    protectiveFactors: ["Son available weekends"]
  },
  {
    name: "Stroke patient with dedicated spouse caregiver",
    transcript: "71-year-old male, left-sided CVA with right hemiparesis. Wife is retired nurse, very capable. Home already has grab bars, hospital bed ordered. Patient making good progress in PT. Speech slightly affected but improving. Wife has experience with stroke patients from her nursing career.",
    expectedDecision: "Home with Services",
    riskFactors: ["Stroke with hemiparesis", "Fall risk", "Speech affected"],
    protectiveFactors: ["Wife is retired RN", "Home modifications done", "Good PT progress"]
  },
  {
    name: "COPD exacerbation with oxygen needs",
    transcript: "68-year-old female with severe COPD exacerbation. Requires 2L O2 continuously. Husband is primary caregiver, retired. Home O2 arranged. Patient anxious about going home but motivated. Lives in single-story apartment. Has had 2 previous admissions this year for COPD.",
    expectedDecision: "Home with Services",
    riskFactors: ["Severe COPD", "Oxygen dependent", "Anxiety", "Previous admissions"],
    protectiveFactors: ["Retired husband caregiver", "Home O2 arranged", "Accessible apartment"]
  },
  {
    name: "Diabetic foot ulcer with complex wound care",
    transcript: "59-year-old male with diabetic foot ulcer requiring daily wound care. Wife works part-time but can adjust schedule. Patient is compliant, good understanding of diabetes management. Needs home health for wound care and PT. Has been managing diabetes for 15 years.",
    expectedDecision: "Home with Services",
    riskFactors: ["Diabetic foot ulcer", "Non-weight bearing", "Complex wound care"],
    protectiveFactors: ["Compliant patient", "Flexible wife", "Good diabetes understanding"]
  },
  {
    name: "Pneumonia in elderly with dementia",
    transcript: "85-year-old female with community-acquired pneumonia, moderate dementia. Daughter is overwhelmed, works full-time. Patient wanders at night, needs 24/7 supervision. Cannot manage medications independently. Has had multiple falls at home in past 3 months.",
    expectedDecision: "SNF",
    riskFactors: ["Age 85", "Moderate dementia", "Wandering", "Falls", "Overwhelmed caregiver"],
    protectiveFactors: ["Daughter involved"]
  },
  {
    name: "Post-CABG with strong family network",
    transcript: "66-year-old male, post 3-vessel CABG. Wife and two adult children nearby, rotating care schedule arranged. Patient is motivated, former athlete. Cardiac rehab scheduled. Sternal precautions understood. Family has created a detailed care schedule.",
    expectedDecision: "Home with Services",
    riskFactors: ["Post-CABG", "Sternal precautions"],
    protectiveFactors: ["Strong family network", "Motivated patient", "Cardiac rehab scheduled"]
  },
  {
    name: "Fall with hip fracture, lives alone",
    transcript: "79-year-old female, ORIF left hip after fall. Lives alone, no local family. Neighbor checks in occasionally. Patient determined to return home but needs intensive PT. History of 2 falls in past year. Has macular degeneration affecting vision.",
    expectedDecision: "Rehab",
    riskFactors: ["Lives alone", "No local family", "Fall history", "Vision impairment"],
    protectiveFactors: ["Determined patient", "Neighbor support"]
  },
  {
    name: "Cellulitis requiring IV antibiotics",
    transcript: "55-year-old male with severe cellulitis left leg, needs 2 weeks IV antibiotics. Wife is a CNA, very capable. PICC line placed. Patient reliable, good venous access. Home infusion arranged. Wife has administered IV medications before.",
    expectedDecision: "Home with Services",
    riskFactors: ["IV antibiotics needed", "PICC line"],
    protectiveFactors: ["Wife is CNA", "Reliable patient", "Home infusion arranged"]
  },
  {
    name: "GI bleed with anemia",
    transcript: "72-year-old male with upper GI bleed, now stable. Hemoglobin improved to 9.2. Lives with wife who manages his medications. Follow-up with GI in 1 week. Patient understands warning signs. Has been on anticoagulation for atrial fibrillation.",
    expectedDecision: "Home with Services",
    riskFactors: ["GI bleed history", "Anemia", "On anticoagulation"],
    protectiveFactors: ["Stable now", "Wife manages meds", "Follow-up scheduled"]
  },
  {
    name: "Sepsis recovery in immunocompromised patient",
    transcript: "64-year-old female recovering from sepsis, on immunosuppression for lupus. Very weak, needs assistance with all ADLs. Husband has back problems, cannot lift. Needs skilled nursing for monitoring. Has CKD stage 4.",
    expectedDecision: "SNF",
    riskFactors: ["Immunocompromised", "Severe weakness", "Husband cannot lift", "CKD stage 4"],
    protectiveFactors: ["Husband present"]
  },
  {
    name: "Acute kidney injury with dialysis needs",
    transcript: "58-year-old male with AKI requiring temporary dialysis. Wife is supportive, drives him to appointments. Dialysis center 10 minutes away. Patient educated on fluid/diet restrictions. Motivated to recover kidney function. First episode of AKI.",
    expectedDecision: "Home with Services",
    riskFactors: ["AKI requiring dialysis"],
    protectiveFactors: ["Supportive wife", "Close dialysis center", "Educated patient", "Motivated"]
  },
  {
    name: "Parkinson's patient with aspiration risk",
    transcript: "76-year-old male with Parkinson's, admitted for aspiration pneumonia. Swallow eval shows need for thickened liquids. Wife trained on aspiration precautions. Home health for PT/OT and speech therapy. Wife has been managing his Parkinson's for 8 years.",
    expectedDecision: "Home with Services",
    riskFactors: ["Parkinson's", "Aspiration risk", "Dysphagia"],
    protectiveFactors: ["Trained wife", "Home health arranged", "Experienced caregiver"]
  },
  {
    name: "Pancreatitis with nutritional needs",
    transcript: "48-year-old female with acute pancreatitis, now tolerating low-fat diet. Lives with adult son who cooks. Understands dietary restrictions. Follow-up with GI arranged. Pain controlled with oral meds. First episode of pancreatitis.",
    expectedDecision: "Home with Services",
    riskFactors: ["Pancreatitis", "Dietary restrictions"],
    protectiveFactors: ["Son cooks", "Understands diet", "Pain controlled"]
  },
  {
    name: "Heart failure with complex medication regimen",
    transcript: "74-year-old male with systolic heart failure, EF 25%. Multiple medication changes this admission. Daughter is pharmacist, will manage medications. Daily weights, fluid restriction understood. Telemonitoring arranged. Has had 3 admissions in past year.",
    expectedDecision: "Home with Services",
    riskFactors: ["Severe HF (EF 25%)", "Complex meds", "Multiple admissions"],
    protectiveFactors: ["Daughter is pharmacist", "Telemonitoring", "Patient educated"]
  },
  {
    name: "Post-amputation diabetic patient",
    transcript: "62-year-old male, BKA left leg due to diabetic complications. Needs prosthetic fitting and gait training. Wife supportive but home has 3 steps to enter. Patient motivated but needs intensive rehab first. Has been diabetic for 25 years.",
    expectedDecision: "Rehab",
    riskFactors: ["BKA", "Home accessibility issues", "Needs prosthetic training"],
    protectiveFactors: ["Supportive wife", "Motivated patient"]
  },
  {
    name: "Overdose recovery with mental health needs",
    transcript: "34-year-old female, accidental opioid overdose, now stable. Agreeable to outpatient mental health follow-up. Parents supportive, patient will stay with them temporarily. Narcan prescribed, family trained. Has chronic pain condition.",
    expectedDecision: "Home with Services",
    riskFactors: ["Overdose history", "Chronic pain", "Mental health needs"],
    protectiveFactors: ["Supportive parents", "Agreeable to follow-up", "Narcan prescribed"]
  },
  {
    name: "Cancer patient with palliative needs",
    transcript: "78-year-old male with metastatic lung cancer, goals of care discussed. Patient and family choose comfort measures. Wife and daughter will be caregivers. Hospice referral made. Hospital bed and O2 arranged. Family understands prognosis.",
    expectedDecision: "Home with Hospice",
    riskFactors: ["Metastatic cancer", "End of life"],
    protectiveFactors: ["Clear goals of care", "Family caregivers", "Hospice arranged"]
  },
  {
    name: "Young trauma patient with good prognosis",
    transcript: "28-year-old male, MVA with multiple rib fractures and pneumothorax, now resolved. Lives with girlfriend who works from home. Young, healthy baseline. Needs follow-up chest X-ray. Pain managed with oral meds. No other injuries.",
    expectedDecision: "Home with Services",
    riskFactors: ["Rib fractures", "Recent pneumothorax"],
    protectiveFactors: ["Young", "Healthy baseline", "Girlfriend works from home"]
  },
  {
    name: "Elderly with UTI and delirium resolved",
    transcript: "88-year-old female admitted with UTI and delirium, now at baseline. Lives in assisted living facility. Facility can manage oral antibiotics. Patient back to her usual self, recognizes staff. Has mild baseline dementia but is functional.",
    expectedDecision: "Return to ALF",
    riskFactors: ["Age 88", "Delirium history", "Mild dementia"],
    protectiveFactors: ["ALF provides 24/7 care", "Back to baseline", "Facility can manage"]
  }
];

// AI Providers to test
const PROVIDERS = ['GPT-5.2', 'o3-2', 'DeepSeek-V3.2'];

interface AIAnalysisResult {
  success: boolean;
  recommendation?: string;
  confidence?: number;
  reasoning?: string;
  contextFactors?: string[];
  riskAssessment?: string;
  error?: string;
}

interface ContextExtractionResult {
  success: boolean;
  extractedContext?: {
    caregiverInfo?: string;
    homeEnvironment?: string;
    patientFactors?: string;
    socialSupport?: string;
  };
  error?: string;
}

interface ContextMatchResult {
  success: boolean;
  matchCount?: number;
  topMatches?: Array<{
    similarity: number;
    outcome: string;
  }>;
  error?: string;
}

interface ProviderTestResult {
  success: boolean;
  response?: string;
  tokensUsed?: number;
  latencyMs?: number;
  error?: string;
}

async function runAIAnalysis(transcript: string, scenarioName: string): Promise<AIAnalysisResult> {
  console.log(`\n      [PRIMARY AGENT] Analyzing discharge scenario...`);
  
  try {
    const response = await fetchWithRetry(`${BASE_URL}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decisionId: `scenario-${Date.now()}`,
        transcript,
        patientContext: { scenarioName }
      })
    });

    if (!response || !response.ok) {
      return { success: false, error: `HTTP ${response?.status || 'no response'}` };
    }

    const data = await response.json() as any;
    
    console.log(`      [PRIMARY AGENT] Analysis complete`);
    if (data.analysis) {
      console.log(`        - Recommendation: ${data.analysis.recommendation || 'N/A'}`);
      console.log(`        - Confidence: ${data.analysis.confidence || 'N/A'}%`);
      if (data.analysis.reasoning) {
        console.log(`        - Reasoning: ${data.analysis.reasoning.substring(0, 150)}...`);
      }
    }
    
    if (data.verification) {
      console.log(`      [VERIFIER AGENT] Verification: ${data.verification.verified ? 'CONFIRMED' : 'CONCERNS RAISED'}`);
      if (data.verification.concerns) {
        console.log(`        - Concerns: ${data.verification.concerns}`);
      }
    }
    
    if (data.questioning) {
      console.log(`      [QUESTIONER AGENT] Critical questions raised:`);
      if (data.questioning.questions) {
        data.questioning.questions.slice(0, 3).forEach((q: string, i: number) => {
          console.log(`        ${i + 1}. ${q}`);
        });
      }
    }

    return {
      success: true,
      recommendation: data.analysis?.recommendation,
      confidence: data.analysis?.confidence,
      reasoning: data.analysis?.reasoning,
      contextFactors: data.analysis?.contextFactors,
      riskAssessment: data.analysis?.riskAssessment
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function extractContext(transcript: string): Promise<ContextExtractionResult> {
  console.log(`\n      [CONTEXT EXTRACTION] Extracting caregiver and social context...`);
  
  try {
    const response = await fetchWithRetry(`${BASE_URL}/ai/extract-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });

    if (!response || !response.ok) {
      return { success: false, error: `HTTP ${response?.status || 'no response'}` };
    }

    const data = await response.json() as any;
    
    console.log(`      [CONTEXT EXTRACTION] Extracted context:`);
    if (data.context) {
      if (data.context.caregiverInfo) console.log(`        - Caregiver: ${data.context.caregiverInfo}`);
      if (data.context.homeEnvironment) console.log(`        - Home: ${data.context.homeEnvironment}`);
      if (data.context.patientFactors) console.log(`        - Patient: ${data.context.patientFactors}`);
      if (data.context.socialSupport) console.log(`        - Social: ${data.context.socialSupport}`);
    }

    return {
      success: true,
      extractedContext: data.context
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function matchContext(riskFactors: string[], protectiveFactors: string[]): Promise<ContextMatchResult> {
  console.log(`\n      [PATTERN MATCHING] Searching for similar historical cases...`);
  
  try {
    const response = await fetchWithRetry(`${BASE_URL}/ai/match-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: {
          riskFactors,
          protectiveFactors
        }
      })
    });

    if (!response || !response.ok) {
      return { success: false, error: `HTTP ${response?.status || 'no response'}` };
    }

    const data = await response.json() as any;
    
    console.log(`      [PATTERN MATCHING] Found ${data.matchCount || 0} similar cases`);
    if (data.matches && data.matches.length > 0) {
      console.log(`        Top matches:`);
      data.matches.slice(0, 3).forEach((m: any, i: number) => {
        console.log(`          ${i + 1}. ${(m.similarity * 100).toFixed(0)}% similar - Outcome: ${m.outcome || 'Unknown'}`);
      });
    }

    return {
      success: true,
      matchCount: data.matchCount,
      topMatches: data.matches
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function testProvider(providerName: string, prompt: string): Promise<ProviderTestResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetchWithRetry(`${BASE_URL}/ai/test-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: providerName,
        prompt
      })
    });

    const latencyMs = Date.now() - startTime;

    if (!response || !response.ok) {
      return { success: false, error: `HTTP ${response?.status || 'no response'}`, latencyMs };
    }

    const data = await response.json() as any;
    
    return {
      success: data.success,
      response: data.result?.substring(0, 100),
      tokensUsed: data.tokensUsed,
      latencyMs
    };
  } catch (error) {
    return { success: false, error: String(error), latencyMs: Date.now() - startTime };
  }
}

interface ScenarioResult {
  scenarioNumber: number;
  scenarioName: string;
  expectedDecision: string;
  aiAnalysis: AIAnalysisResult;
  contextExtraction: ContextExtractionResult;
  contextMatching: ContextMatchResult;
  providerResults: { [key: string]: ProviderTestResult };
  durationMs: number;
}

async function runScenario(scenarioNumber: number, scenario: typeof PATIENT_SCENARIOS[0]): Promise<ScenarioResult> {
  const startTime = Date.now();
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`SCENARIO ${scenarioNumber}/20: ${scenario.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`\n  Expected Decision: ${scenario.expectedDecision}`);
  console.log(`  Risk Factors: ${scenario.riskFactors.join(', ')}`);
  console.log(`  Protective Factors: ${scenario.protectiveFactors.join(', ')}`);
  console.log(`\n  Transcript: "${scenario.transcript.substring(0, 200)}..."`);
  
  // Step 1: Run AI Analysis (multi-agent pipeline)
  console.log(`\n  --- MULTI-AGENT AI ANALYSIS ---`);
  const aiAnalysis = await runAIAnalysis(scenario.transcript, scenario.name);
  
  // Step 2: Extract context
  console.log(`\n  --- CONTEXT EXTRACTION ---`);
  const contextExtraction = await extractContext(scenario.transcript);
  
  // Step 3: Match context patterns
  console.log(`\n  --- PATTERN MATCHING ---`);
  const contextMatching = await matchContext(scenario.riskFactors, scenario.protectiveFactors);
  
  // Step 4: Test each AI provider
  console.log(`\n  --- AI PROVIDER TESTS ---`);
  const providerResults: { [key: string]: ProviderTestResult } = {};
  
  for (const provider of PROVIDERS) {
    console.log(`\n      [${provider}] Testing provider...`);
    const result = await testProvider(provider, `Briefly assess this discharge case: ${scenario.transcript.substring(0, 300)}`);
    providerResults[provider] = result;
    
    if (result.success) {
      console.log(`        Status: SUCCESS (${result.latencyMs}ms)`);
      if (result.response) {
        console.log(`        Response: "${result.response}..."`);
      }
    } else {
      console.log(`        Status: FAILED - ${result.error}`);
    }
  }
  
  const durationMs = Date.now() - startTime;
  
  // Summary for this scenario
  console.log(`\n  --- SCENARIO SUMMARY ---`);
  const allPassed = aiAnalysis.success && contextExtraction.success && contextMatching.success;
  console.log(`  AI Analysis: ${aiAnalysis.success ? 'PASS' : 'FAIL'}`);
  console.log(`  Context Extraction: ${contextExtraction.success ? 'PASS' : 'FAIL'}`);
  console.log(`  Pattern Matching: ${contextMatching.success ? 'PASS' : 'FAIL'}`);
  console.log(`  Providers: ${Object.entries(providerResults).map(([p, r]) => `${p}:${r.success ? 'OK' : 'FAIL'}`).join(', ')}`);
  console.log(`  Duration: ${durationMs}ms`);
  console.log(`  Overall: ${allPassed ? 'PASS' : 'PARTIAL'}`);
  
  return {
    scenarioNumber,
    scenarioName: scenario.name,
    expectedDecision: scenario.expectedDecision,
    aiAnalysis,
    contextExtraction,
    contextMatching,
    providerResults,
    durationMs
  };
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('DCG CONTEXT GRAPH - 20 VERBOSE END-TO-END SCENARIOS');
  console.log('='.repeat(80));
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`AI Providers: ${PROVIDERS.join(', ')}`);
  console.log(`Retry config: ${JSON.stringify(DEFAULT_RETRY_CONFIG)}`);
  console.log(`\nThis test will run 20 realistic patient discharge scenarios through:`);
  console.log(`  1. Multi-Agent AI Analysis (Primary → Verifier → Questioner)`);
  console.log(`  2. Context Extraction (caregiver, home, social factors)`);
  console.log(`  3. Pattern Matching (find similar historical cases)`);
  console.log(`  4. Individual AI Provider Tests (GPT-5.2, o3-2, DeepSeek-V3.2)`);
  console.log('\n' + '='.repeat(80));
  
  const results: ScenarioResult[] = [];
  
  for (let i = 0; i < PATIENT_SCENARIOS.length; i++) {
    const result = await runScenario(i + 1, PATIENT_SCENARIOS[i]);
    results.push(result);
    
    // Small delay between scenarios
    await sleep(1000);
  }
  
  // Final Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('FINAL SUMMARY - ALL 20 SCENARIOS');
  console.log('='.repeat(80));
  
  const aiAnalysisPassed = results.filter(r => r.aiAnalysis.success).length;
  const contextExtractionPassed = results.filter(r => r.contextExtraction.success).length;
  const contextMatchingPassed = results.filter(r => r.contextMatching.success).length;
  
  console.log(`\n  AI Analysis Success Rate: ${aiAnalysisPassed}/20 (${(aiAnalysisPassed/20*100).toFixed(0)}%)`);
  console.log(`  Context Extraction Success Rate: ${contextExtractionPassed}/20 (${(contextExtractionPassed/20*100).toFixed(0)}%)`);
  console.log(`  Pattern Matching Success Rate: ${contextMatchingPassed}/20 (${(contextMatchingPassed/20*100).toFixed(0)}%)`);
  
  console.log(`\n  AI Provider Results:`);
  for (const provider of PROVIDERS) {
    const passed = results.filter(r => r.providerResults[provider]?.success).length;
    const avgLatency = results
      .filter(r => r.providerResults[provider]?.latencyMs)
      .reduce((sum, r) => sum + (r.providerResults[provider]?.latencyMs || 0), 0) / passed || 0;
    console.log(`    ${provider}: ${passed}/20 (${(passed/20*100).toFixed(0)}%) - Avg latency: ${avgLatency.toFixed(0)}ms`);
  }
  
  const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
  
  console.log(`\n  Timing:`);
  console.log(`    Average scenario duration: ${avgDuration.toFixed(0)}ms`);
  console.log(`    Total test duration: ${(totalDuration / 1000).toFixed(1)}s`);
  
  console.log(`\n  Scenario Results:`);
  results.forEach(r => {
    const status = r.aiAnalysis.success && r.contextExtraction.success && r.contextMatching.success ? 'PASS' : 'PARTIAL';
    const recommendation = r.aiAnalysis.recommendation || 'N/A';
    console.log(`    ${r.scenarioNumber}. ${r.scenarioName}`);
    console.log(`       Expected: ${r.expectedDecision} | AI Recommended: ${recommendation} | Status: ${status}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('COMPLETE - Check Azure App Insights for detailed telemetry');
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);
