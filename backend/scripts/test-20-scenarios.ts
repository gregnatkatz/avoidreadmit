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
          console.log(`    Rate limited (429), attempt ${attempt}/${config.maxAttempts}. Waiting ${delay}ms...`);
          await sleep(delay);
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
          continue;
        }
      }
      
      return response;
    } catch (error) {
      console.error(`    Request failed (attempt ${attempt}/${config.maxAttempts}):`, error);
      if (attempt < config.maxAttempts) {
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }
  }
  return null;
}

// 20 realistic patient scenarios
const PATIENT_SCENARIOS = [
  {
    name: "Elderly CHF patient with supportive daughter",
    patientMrn: `MRN-SCN-001-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "78-year-old female with CHF exacerbation. Daughter Maria lives 5 minutes away and can visit daily. Patient is motivated, good mobility with walker. Single-story home, no stairs. Needs medication management and daily weight monitoring.",
    clinicalData: {
      primaryDiagnosis: "CHF Exacerbation",
      comorbidities: ["Diabetes Type 2", "Hypertension", "Atrial Fibrillation"],
      medicationsCount: 12,
      mobilityStatus: "Ambulatory with walker",
      cognitiveStatus: "Intact",
      painLevel: 2,
      fallRisk: "Moderate"
    },
    socialData: {
      livingSituation: "Lives alone",
      primaryCaregiver: "Daughter (Maria)",
      caregiverAvailability: "Daily visits",
      homeEnvironment: "Single-story home, accessible",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 8
    }
  },
  {
    name: "Post-hip replacement with limited family support",
    patientMrn: `MRN-SCN-002-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "SNF",
    transcript: "82-year-old male, post right hip replacement. Son lives 2 hours away, works full-time. Patient lives in 2-story home, bedroom upstairs. Needs PT/OT, wound care. High fall risk, uses wheelchair currently.",
    clinicalData: {
      primaryDiagnosis: "Right Hip Arthroplasty",
      comorbidities: ["Osteoporosis", "COPD", "Depression"],
      medicationsCount: 9,
      mobilityStatus: "Wheelchair bound temporarily",
      cognitiveStatus: "Mild cognitive impairment",
      painLevel: 5,
      fallRisk: "High"
    },
    socialData: {
      livingSituation: "Lives alone",
      primaryCaregiver: "Son (distant)",
      caregiverAvailability: "Weekends only",
      homeEnvironment: "2-story home, bedroom upstairs",
      transportationAccess: false,
      financialConcerns: true,
      socialSupportScore: 3
    }
  },
  {
    name: "Stroke patient with dedicated spouse caregiver",
    patientMrn: `MRN-SCN-003-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "71-year-old male, left-sided CVA with right hemiparesis. Wife is retired nurse, very capable. Home already has grab bars, hospital bed ordered. Patient making good progress in PT. Speech slightly affected but improving.",
    clinicalData: {
      primaryDiagnosis: "Left CVA with right hemiparesis",
      comorbidities: ["Hypertension", "Hyperlipidemia", "Type 2 Diabetes"],
      medicationsCount: 10,
      mobilityStatus: "Requires assistance for transfers",
      cognitiveStatus: "Intact, mild aphasia",
      painLevel: 1,
      fallRisk: "High"
    },
    socialData: {
      livingSituation: "Lives with spouse",
      primaryCaregiver: "Wife (retired RN)",
      caregiverAvailability: "Full-time",
      homeEnvironment: "Modified home with grab bars, hospital bed",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 9
    }
  },
  {
    name: "COPD exacerbation with oxygen needs",
    patientMrn: `MRN-SCN-004-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "68-year-old female with severe COPD exacerbation. Requires 2L O2 continuously. Husband is primary caregiver, retired. Home O2 arranged. Patient anxious about going home but motivated. Lives in single-story apartment.",
    clinicalData: {
      primaryDiagnosis: "COPD Exacerbation",
      comorbidities: ["Anxiety", "Osteoporosis", "GERD"],
      medicationsCount: 8,
      mobilityStatus: "Ambulatory with O2",
      cognitiveStatus: "Intact",
      painLevel: 2,
      fallRisk: "Low"
    },
    socialData: {
      livingSituation: "Lives with spouse",
      primaryCaregiver: "Husband",
      caregiverAvailability: "Full-time",
      homeEnvironment: "Single-story apartment",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 8
    }
  },
  {
    name: "Diabetic foot ulcer with complex wound care",
    patientMrn: `MRN-SCN-005-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "59-year-old male with diabetic foot ulcer requiring daily wound care. Wife works part-time but can adjust schedule. Patient is compliant, good understanding of diabetes management. Needs home health for wound care and PT.",
    clinicalData: {
      primaryDiagnosis: "Diabetic Foot Ulcer",
      comorbidities: ["Type 2 Diabetes", "Peripheral Neuropathy", "Hypertension"],
      medicationsCount: 11,
      mobilityStatus: "Non-weight bearing left foot",
      cognitiveStatus: "Intact",
      painLevel: 4,
      fallRisk: "Moderate"
    },
    socialData: {
      livingSituation: "Lives with spouse",
      primaryCaregiver: "Wife",
      caregiverAvailability: "Part-time, flexible",
      homeEnvironment: "Ranch home, accessible",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 7
    }
  },
  {
    name: "Pneumonia in elderly with dementia",
    patientMrn: `MRN-SCN-006-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "SNF",
    transcript: "85-year-old female with community-acquired pneumonia, moderate dementia. Daughter is overwhelmed, works full-time. Patient wanders at night, needs 24/7 supervision. Cannot manage medications independently.",
    clinicalData: {
      primaryDiagnosis: "Community-Acquired Pneumonia",
      comorbidities: ["Alzheimer's Disease", "Hypertension", "Hypothyroidism"],
      medicationsCount: 7,
      mobilityStatus: "Ambulatory, wanders",
      cognitiveStatus: "Moderate dementia",
      painLevel: 1,
      fallRisk: "High"
    },
    socialData: {
      livingSituation: "Lives with daughter",
      primaryCaregiver: "Daughter (overwhelmed)",
      caregiverAvailability: "Limited - works full-time",
      homeEnvironment: "2-story home",
      transportationAccess: true,
      financialConcerns: true,
      socialSupportScore: 4
    }
  },
  {
    name: "Post-CABG with strong family network",
    patientMrn: `MRN-SCN-007-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "66-year-old male, post 3-vessel CABG. Wife and two adult children nearby, rotating care schedule arranged. Patient is motivated, former athlete. Cardiac rehab scheduled. Sternal precautions understood.",
    clinicalData: {
      primaryDiagnosis: "Post CABG x3",
      comorbidities: ["CAD", "Hyperlipidemia", "Hypertension"],
      medicationsCount: 10,
      mobilityStatus: "Ambulatory with sternal precautions",
      cognitiveStatus: "Intact",
      painLevel: 4,
      fallRisk: "Low"
    },
    socialData: {
      livingSituation: "Lives with spouse",
      primaryCaregiver: "Wife + 2 adult children",
      caregiverAvailability: "Full-time rotating",
      homeEnvironment: "Single-story home",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 10
    }
  },
  {
    name: "Fall with hip fracture, lives alone",
    patientMrn: `MRN-SCN-008-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Rehab",
    transcript: "79-year-old female, ORIF left hip after fall. Lives alone, no local family. Neighbor checks in occasionally. Patient determined to return home but needs intensive PT. History of 2 falls in past year.",
    clinicalData: {
      primaryDiagnosis: "Left Hip Fracture s/p ORIF",
      comorbidities: ["Osteoporosis", "Macular Degeneration", "Hypertension"],
      medicationsCount: 6,
      mobilityStatus: "Partial weight bearing",
      cognitiveStatus: "Intact",
      painLevel: 5,
      fallRisk: "Very High"
    },
    socialData: {
      livingSituation: "Lives alone",
      primaryCaregiver: "None - neighbor helps occasionally",
      caregiverAvailability: "Minimal",
      homeEnvironment: "Apartment with stairs to entrance",
      transportationAccess: false,
      financialConcerns: true,
      socialSupportScore: 2
    }
  },
  {
    name: "Cellulitis requiring IV antibiotics",
    patientMrn: `MRN-SCN-009-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "55-year-old male with severe cellulitis left leg, needs 2 weeks IV antibiotics. Wife is a CNA, very capable. PICC line placed. Patient reliable, good venous access. Home infusion arranged.",
    clinicalData: {
      primaryDiagnosis: "Severe Cellulitis Left Lower Extremity",
      comorbidities: ["Obesity", "Lymphedema", "Type 2 Diabetes"],
      medicationsCount: 5,
      mobilityStatus: "Ambulatory",
      cognitiveStatus: "Intact",
      painLevel: 3,
      fallRisk: "Low"
    },
    socialData: {
      livingSituation: "Lives with spouse",
      primaryCaregiver: "Wife (CNA)",
      caregiverAvailability: "Full-time",
      homeEnvironment: "Ranch home",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 9
    }
  },
  {
    name: "GI bleed with anemia",
    patientMrn: `MRN-SCN-010-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "72-year-old male with upper GI bleed, now stable. Hemoglobin improved to 9.2. Lives with wife who manages his medications. Follow-up with GI in 1 week. Patient understands warning signs.",
    clinicalData: {
      primaryDiagnosis: "Upper GI Bleed",
      comorbidities: ["Peptic Ulcer Disease", "Atrial Fibrillation", "CKD Stage 3"],
      medicationsCount: 9,
      mobilityStatus: "Ambulatory",
      cognitiveStatus: "Intact",
      painLevel: 1,
      fallRisk: "Moderate"
    },
    socialData: {
      livingSituation: "Lives with spouse",
      primaryCaregiver: "Wife",
      caregiverAvailability: "Full-time",
      homeEnvironment: "Condo, elevator access",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 8
    }
  },
  {
    name: "Sepsis recovery in immunocompromised patient",
    patientMrn: `MRN-SCN-011-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "SNF",
    transcript: "64-year-old female recovering from sepsis, on immunosuppression for lupus. Very weak, needs assistance with all ADLs. Husband has back problems, cannot lift. Needs skilled nursing for monitoring.",
    clinicalData: {
      primaryDiagnosis: "Sepsis - recovering",
      comorbidities: ["SLE", "CKD Stage 4", "Anemia"],
      medicationsCount: 14,
      mobilityStatus: "Requires max assist",
      cognitiveStatus: "Intact but fatigued",
      painLevel: 3,
      fallRisk: "High"
    },
    socialData: {
      livingSituation: "Lives with spouse",
      primaryCaregiver: "Husband (limited ability)",
      caregiverAvailability: "Present but limited",
      homeEnvironment: "2-story home",
      transportationAccess: true,
      financialConcerns: true,
      socialSupportScore: 5
    }
  },
  {
    name: "Acute kidney injury with dialysis needs",
    patientMrn: `MRN-SCN-012-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "58-year-old male with AKI requiring temporary dialysis. Wife is supportive, drives him to appointments. Dialysis center 10 minutes away. Patient educated on fluid/diet restrictions. Motivated to recover kidney function.",
    clinicalData: {
      primaryDiagnosis: "Acute Kidney Injury",
      comorbidities: ["Hypertension", "Type 2 Diabetes", "Gout"],
      medicationsCount: 8,
      mobilityStatus: "Ambulatory",
      cognitiveStatus: "Intact",
      painLevel: 2,
      fallRisk: "Low"
    },
    socialData: {
      livingSituation: "Lives with spouse",
      primaryCaregiver: "Wife",
      caregiverAvailability: "Full-time",
      homeEnvironment: "Single-story home",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 8
    }
  },
  {
    name: "Parkinson's patient with aspiration risk",
    patientMrn: `MRN-SCN-013-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "76-year-old male with Parkinson's, admitted for aspiration pneumonia. Swallow eval shows need for thickened liquids. Wife trained on aspiration precautions. Home health for PT/OT and speech therapy.",
    clinicalData: {
      primaryDiagnosis: "Aspiration Pneumonia",
      comorbidities: ["Parkinson's Disease", "Dysphagia", "Depression"],
      medicationsCount: 11,
      mobilityStatus: "Ambulatory with shuffling gait",
      cognitiveStatus: "Mild cognitive changes",
      painLevel: 1,
      fallRisk: "High"
    },
    socialData: {
      livingSituation: "Lives with spouse",
      primaryCaregiver: "Wife",
      caregiverAvailability: "Full-time",
      homeEnvironment: "Ranch home, modified",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 7
    }
  },
  {
    name: "Pancreatitis with nutritional needs",
    patientMrn: `MRN-SCN-014-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "48-year-old female with acute pancreatitis, now tolerating low-fat diet. Lives with adult son who cooks. Understands dietary restrictions. Follow-up with GI arranged. Pain controlled with oral meds.",
    clinicalData: {
      primaryDiagnosis: "Acute Pancreatitis",
      comorbidities: ["Gallstones", "Obesity", "Anxiety"],
      medicationsCount: 5,
      mobilityStatus: "Ambulatory",
      cognitiveStatus: "Intact",
      painLevel: 3,
      fallRisk: "Low"
    },
    socialData: {
      livingSituation: "Lives with adult son",
      primaryCaregiver: "Son",
      caregiverAvailability: "Full-time",
      homeEnvironment: "Apartment, accessible",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 7
    }
  },
  {
    name: "Heart failure with complex medication regimen",
    patientMrn: `MRN-SCN-015-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "74-year-old male with systolic heart failure, EF 25%. Multiple medication changes this admission. Daughter is pharmacist, will manage medications. Daily weights, fluid restriction understood. Telemonitoring arranged.",
    clinicalData: {
      primaryDiagnosis: "Systolic Heart Failure",
      comorbidities: ["CAD", "Atrial Fibrillation", "CKD Stage 3", "Type 2 Diabetes"],
      medicationsCount: 15,
      mobilityStatus: "Ambulatory with dyspnea on exertion",
      cognitiveStatus: "Intact",
      painLevel: 1,
      fallRisk: "Moderate"
    },
    socialData: {
      livingSituation: "Lives alone",
      primaryCaregiver: "Daughter (pharmacist, nearby)",
      caregiverAvailability: "Daily visits",
      homeEnvironment: "Condo, elevator",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 8
    }
  },
  {
    name: "Post-amputation diabetic patient",
    patientMrn: `MRN-SCN-016-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Rehab",
    transcript: "62-year-old male, BKA left leg due to diabetic complications. Needs prosthetic fitting and gait training. Wife supportive but home has 3 steps to enter. Patient motivated but needs intensive rehab first.",
    clinicalData: {
      primaryDiagnosis: "Left Below Knee Amputation",
      comorbidities: ["Type 2 Diabetes", "PVD", "Hypertension", "Depression"],
      medicationsCount: 10,
      mobilityStatus: "Wheelchair, learning transfers",
      cognitiveStatus: "Intact",
      painLevel: 4,
      fallRisk: "High"
    },
    socialData: {
      livingSituation: "Lives with spouse",
      primaryCaregiver: "Wife",
      caregiverAvailability: "Full-time",
      homeEnvironment: "Home with 3 steps to enter",
      transportationAccess: true,
      financialConcerns: true,
      socialSupportScore: 6
    }
  },
  {
    name: "Overdose recovery with mental health needs",
    patientMrn: `MRN-SCN-017-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "34-year-old female, accidental opioid overdose, now stable. Agreeable to outpatient mental health follow-up. Parents supportive, patient will stay with them temporarily. Narcan prescribed, family trained.",
    clinicalData: {
      primaryDiagnosis: "Opioid Overdose - accidental",
      comorbidities: ["Chronic Pain", "Depression", "Anxiety"],
      medicationsCount: 4,
      mobilityStatus: "Ambulatory",
      cognitiveStatus: "Intact",
      painLevel: 3,
      fallRisk: "Low"
    },
    socialData: {
      livingSituation: "Temporarily with parents",
      primaryCaregiver: "Parents",
      caregiverAvailability: "Full-time",
      homeEnvironment: "Parents' home, safe",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 8
    }
  },
  {
    name: "Cancer patient with palliative needs",
    patientMrn: `MRN-SCN-018-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Hospice",
    transcript: "78-year-old male with metastatic lung cancer, goals of care discussed. Patient and family choose comfort measures. Wife and daughter will be caregivers. Hospice referral made. Hospital bed and O2 arranged.",
    clinicalData: {
      primaryDiagnosis: "Metastatic Lung Cancer",
      comorbidities: ["COPD", "Cachexia", "Bone Metastases"],
      medicationsCount: 8,
      mobilityStatus: "Bed to chair with assist",
      cognitiveStatus: "Intact",
      painLevel: 6,
      fallRisk: "High"
    },
    socialData: {
      livingSituation: "Lives with spouse",
      primaryCaregiver: "Wife and daughter",
      caregiverAvailability: "Full-time",
      homeEnvironment: "Home modified for hospice",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 9
    }
  },
  {
    name: "Young trauma patient with good prognosis",
    patientMrn: `MRN-SCN-019-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "28-year-old male, MVA with multiple rib fractures and pneumothorax, now resolved. Lives with girlfriend who works from home. Young, healthy baseline. Needs follow-up chest X-ray. Pain managed with oral meds.",
    clinicalData: {
      primaryDiagnosis: "Multiple Rib Fractures, Resolved Pneumothorax",
      comorbidities: [],
      medicationsCount: 3,
      mobilityStatus: "Ambulatory",
      cognitiveStatus: "Intact",
      painLevel: 5,
      fallRisk: "Low"
    },
    socialData: {
      livingSituation: "Lives with girlfriend",
      primaryCaregiver: "Girlfriend",
      caregiverAvailability: "Full-time (works from home)",
      homeEnvironment: "Apartment, accessible",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 8
    }
  },
  {
    name: "Elderly with UTI and delirium resolved",
    patientMrn: `MRN-SCN-020-${Date.now()}`,
    decisionType: "Discharge",
    decisionValue: "Home with Services",
    transcript: "88-year-old female admitted with UTI and delirium, now at baseline. Lives in assisted living facility. Facility can manage oral antibiotics. Patient back to her usual self, recognizes staff.",
    clinicalData: {
      primaryDiagnosis: "UTI with Delirium - resolved",
      comorbidities: ["Dementia - mild", "Hypertension", "Osteoarthritis"],
      medicationsCount: 7,
      mobilityStatus: "Ambulatory with walker",
      cognitiveStatus: "Baseline mild dementia",
      painLevel: 1,
      fallRisk: "Moderate"
    },
    socialData: {
      livingSituation: "Assisted Living Facility",
      primaryCaregiver: "ALF Staff",
      caregiverAvailability: "24/7",
      homeEnvironment: "ALF - accessible",
      transportationAccess: true,
      financialConcerns: false,
      socialSupportScore: 7
    }
  }
];

// AI Providers to test
const PROVIDERS = ['GPT-5.2', 'o3-2', 'DeepSeek-V3.2'];

interface ScenarioResult {
  scenarioNumber: number;
  scenarioName: string;
  decisionCreated: boolean;
  decisionId?: string;
  aiAnalysis: boolean;
  contextExtraction: boolean;
  contextMatching: boolean;
  providerResults: { [key: string]: boolean };
  durationMs: number;
  error?: string;
}

async function createDecision(scenario: typeof PATIENT_SCENARIOS[0]): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetchWithRetry(`${BASE_URL}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientMrn: scenario.patientMrn,
        decisionType: scenario.decisionType,
        decisionValue: scenario.decisionValue,
        decisionMakerName: 'AI Multi-Agent System',
        transcript: scenario.transcript,
        clinicalData: scenario.clinicalData,
        socialData: scenario.socialData
      })
    });

    if (!response || !response.ok) {
      return { success: false, error: `HTTP ${response?.status || 'no response'}` };
    }

    const data = await response.json() as { id: string };
    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function runAIAnalysis(decisionId: string, transcript: string): Promise<boolean> {
  try {
    const response = await fetchWithRetry(`${BASE_URL}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decisionId,
        transcript,
        patientContext: { source: 'scenario-test' }
      })
    });
    return response !== null && response.ok;
  } catch {
    return false;
  }
}

async function extractContext(transcript: string): Promise<boolean> {
  try {
    const response = await fetchWithRetry(`${BASE_URL}/ai/extract-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });
    return response !== null && response.ok;
  } catch {
    return false;
  }
}

async function matchContext(socialData: typeof PATIENT_SCENARIOS[0]['socialData']): Promise<boolean> {
  try {
    const response = await fetchWithRetry(`${BASE_URL}/ai/match-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: socialData })
    });
    return response !== null && response.ok;
  } catch {
    return false;
  }
}

async function testProvider(providerName: string): Promise<boolean> {
  try {
    const response = await fetchWithRetry(`${BASE_URL}/ai/test-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: providerName,
        prompt: 'Analyze this discharge scenario briefly.'
      })
    });
    
    if (!response || !response.ok) return false;
    const data = await response.json() as { success: boolean };
    return data.success;
  } catch {
    return false;
  }
}

async function runScenario(scenarioNumber: number, scenario: typeof PATIENT_SCENARIOS[0]): Promise<ScenarioResult> {
  const startTime = Date.now();
  console.log(`\n  [Scenario ${scenarioNumber}] ${scenario.name}`);
  
  // Step 1: Create new decision trace
  console.log(`    Creating decision trace...`);
  const decisionResult = await createDecision(scenario);
  
  if (!decisionResult.success) {
    console.log(`    FAILED to create decision: ${decisionResult.error}`);
    return {
      scenarioNumber,
      scenarioName: scenario.name,
      decisionCreated: false,
      aiAnalysis: false,
      contextExtraction: false,
      contextMatching: false,
      providerResults: {},
      durationMs: Date.now() - startTime,
      error: decisionResult.error
    };
  }
  
  console.log(`    Decision created: ${decisionResult.id}`);
  
  // Step 2: Run AI Analysis (multi-agent pipeline)
  console.log(`    Running AI analysis (Primary → Verifier → Questioner)...`);
  const aiAnalysis = await runAIAnalysis(decisionResult.id!, scenario.transcript);
  console.log(`    AI Analysis: ${aiAnalysis ? 'OK' : 'FAILED'}`);
  
  // Step 3: Extract context
  console.log(`    Extracting context...`);
  const contextExtraction = await extractContext(scenario.transcript);
  console.log(`    Context Extraction: ${contextExtraction ? 'OK' : 'FAILED'}`);
  
  // Step 4: Match context
  console.log(`    Matching context patterns...`);
  const contextMatching = await matchContext(scenario.socialData);
  console.log(`    Context Matching: ${contextMatching ? 'OK' : 'FAILED'}`);
  
  // Step 5: Test each AI provider
  console.log(`    Testing AI providers...`);
  const providerResults: { [key: string]: boolean } = {};
  for (const provider of PROVIDERS) {
    const result = await testProvider(provider);
    providerResults[provider] = result;
    console.log(`      ${provider}: ${result ? 'OK' : 'FAILED'}`);
  }
  
  const durationMs = Date.now() - startTime;
  
  return {
    scenarioNumber,
    scenarioName: scenario.name,
    decisionCreated: true,
    decisionId: decisionResult.id,
    aiAnalysis,
    contextExtraction,
    contextMatching,
    providerResults,
    durationMs
  };
}

async function main() {
  console.log('='.repeat(80));
  console.log('DCG Context Graph - 20 End-to-End Scenarios');
  console.log('='.repeat(80));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`AI Providers: ${PROVIDERS.join(', ')}`);
  console.log(`Retry config: ${JSON.stringify(DEFAULT_RETRY_CONFIG)}`);
  console.log('='.repeat(80));
  
  const results: ScenarioResult[] = [];
  
  for (let i = 0; i < PATIENT_SCENARIOS.length; i++) {
    const result = await runScenario(i + 1, PATIENT_SCENARIOS[i]);
    results.push(result);
    
    const allPassed = result.decisionCreated && result.aiAnalysis && 
                      result.contextExtraction && result.contextMatching;
    
    if (allPassed) {
      console.log(`  [${i + 1}/20] PASS (${result.durationMs}ms)`);
    } else {
      console.log(`  [${i + 1}/20] PARTIAL (${result.durationMs}ms)`);
    }
    
    // Small delay between scenarios
    await sleep(500);
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const decisionsCreated = results.filter(r => r.decisionCreated).length;
  const aiAnalysisPassed = results.filter(r => r.aiAnalysis).length;
  const contextExtractionPassed = results.filter(r => r.contextExtraction).length;
  const contextMatchingPassed = results.filter(r => r.contextMatching).length;
  
  console.log(`\nDecisions Created: ${decisionsCreated}/20 (${(decisionsCreated/20*100).toFixed(0)}%)`);
  console.log(`AI Analysis Passed: ${aiAnalysisPassed}/20 (${(aiAnalysisPassed/20*100).toFixed(0)}%)`);
  console.log(`Context Extraction Passed: ${contextExtractionPassed}/20 (${(contextExtractionPassed/20*100).toFixed(0)}%)`);
  console.log(`Context Matching Passed: ${contextMatchingPassed}/20 (${(contextMatchingPassed/20*100).toFixed(0)}%)`);
  
  console.log(`\nAI Provider Results:`);
  for (const provider of PROVIDERS) {
    const passed = results.filter(r => r.providerResults[provider]).length;
    console.log(`  ${provider}: ${passed}/20 (${(passed/20*100).toFixed(0)}%)`);
  }
  
  const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;
  console.log(`\nAverage scenario duration: ${avgDuration.toFixed(0)}ms`);
  console.log(`Total duration: ${results.reduce((sum, r) => sum + r.durationMs, 0)}ms`);
  
  console.log('\n' + '='.repeat(80));
  console.log('New Decision Traces Created:');
  console.log('='.repeat(80));
  results.filter(r => r.decisionCreated).forEach(r => {
    console.log(`  ${r.scenarioNumber}. ${r.scenarioName}`);
    console.log(`     ID: ${r.decisionId}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('COMPLETE - Check App Insights for telemetry');
  console.log('='.repeat(80));
}

main().catch(console.error);
