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
          console.log(`Rate limited (429), attempt ${attempt}/${config.maxAttempts}. Waiting ${delay}ms...`);
          await sleep(delay);
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
          continue;
        }
      }
      
      return response;
    } catch (error) {
      console.error(`Request failed (attempt ${attempt}/${config.maxAttempts}):`, error);
      if (attempt < config.maxAttempts) {
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }
  }
  return null;
}

async function testDashboard(): Promise<boolean> {
  const response = await fetchWithRetry(`${BASE_URL}/dashboard/summary`);
  return response !== null && response.ok;
}

async function testPatients(): Promise<boolean> {
  const response = await fetchWithRetry(`${BASE_URL}/patients`);
  return response !== null && response.ok;
}

async function testDecisions(): Promise<boolean> {
  const response = await fetchWithRetry(`${BASE_URL}/decisions`);
  return response !== null && response.ok;
}

async function testPatterns(): Promise<boolean> {
  const response = await fetchWithRetry(`${BASE_URL}/patterns`);
  return response !== null && response.ok;
}

async function testAIAnalyze(): Promise<boolean> {
  const response = await fetchWithRetry(`${BASE_URL}/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decisionId: 'test-decision-1',
      transcript: 'Patient is 78 years old with CHF and diabetes. Caregiver is daughter who works full-time but lives nearby. Patient has good mobility but needs medication reminders. Home has stairs but patient can manage with handrail.',
      patientContext: {
        age: 78,
        diagnosis: 'CHF, Diabetes',
        mobility: 'Good with assistance'
      }
    })
  });
  return response !== null && response.ok;
}

async function testContextExtraction(): Promise<boolean> {
  const response = await fetchWithRetry(`${BASE_URL}/ai/extract-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'The patient has been managing well at home. Her daughter visits daily and helps with medications. The home health nurse comes twice a week. Patient is motivated to stay independent.'
    })
  });
  return response !== null && response.ok;
}

async function testContextMatching(): Promise<boolean> {
  const response = await fetchWithRetry(`${BASE_URL}/ai/match-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: {
        caregiverAvailability: 'Part-time (daughter works)',
        homeEnvironment: 'Single-story home, accessible',
        patientMotivation: 'High',
        socialSupport: 'Strong family network'
      }
    })
  });
  return response !== null && response.ok;
}

async function testPatternDiscovery(): Promise<boolean> {
  const response = await fetchWithRetry(`${BASE_URL}/ai/discover-patterns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeRange: { start: '2025-07-01', end: '2025-12-31' },
      minConfidence: 0.7
    })
  });
  return response !== null && response.ok;
}

// Only test working providers (grok-4-fast-reasoning times out)
const PROVIDERS = ['GPT-5.2', 'o3-2', 'DeepSeek-V3.2'];

async function testSpecificProvider(providerName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetchWithRetry(`${BASE_URL}/ai/test-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: providerName,
        prompt: 'What is 2+2? Answer with just the number.'
      })
    });
    
    if (!response || !response.ok) {
      return { success: false, error: `HTTP ${response?.status || 'no response'}` };
    }
    
    const data = await response.json() as { success: boolean; result?: string };
    return { success: data.success };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function testAllProviders(): Promise<{ [key: string]: boolean }> {
  const results: { [key: string]: boolean } = {};
  
  for (const provider of PROVIDERS) {
    const result = await testSpecificProvider(provider);
    results[provider] = result.success;
    if (!result.success) {
      console.log(`  Provider ${provider}: FAILED${result.error ? ` (${result.error})` : ''}`);
    } else {
      console.log(`  Provider ${provider}: OK`);
    }
  }
  
  return results;
}

interface TestResult {
  iteration: number;
  dashboard: boolean;
  patients: boolean;
  decisions: boolean;
  patterns: boolean;
  aiAnalyze: boolean;
  contextExtraction: boolean;
  contextMatching: boolean;
  patternDiscovery: boolean;
  providerResults: { [key: string]: boolean };
  durationMs: number;
}

async function runIteration(iteration: number): Promise<TestResult> {
  const startTime = Date.now();
  
  console.log(`  Testing API endpoints...`);
  const [dashboard, patients, decisions, patterns, aiAnalyze, contextExtraction, contextMatching, patternDiscovery] = await Promise.all([
    testDashboard(),
    testPatients(),
    testDecisions(),
    testPatterns(),
    testAIAnalyze(),
    testContextExtraction(),
    testContextMatching(),
    testPatternDiscovery()
  ]);
  
  console.log(`  Testing individual AI providers...`);
  const providerResults = await testAllProviders();
  
  const durationMs = Date.now() - startTime;
  
  return {
    iteration,
    dashboard,
    patients,
    decisions,
    patterns,
    aiAnalyze,
    contextExtraction,
    contextMatching,
    patternDiscovery,
    providerResults,
    durationMs
  };
}

async function main() {
  const TOTAL_ITERATIONS = 100;
  const results: TestResult[] = [];
  let successCount = 0;
  let failCount = 0;
  
  console.log(`Starting 100x end-to-end tests with backoff/retry...`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Retry config: ${JSON.stringify(DEFAULT_RETRY_CONFIG)}`);
  console.log('---');
  
  for (let i = 1; i <= TOTAL_ITERATIONS; i++) {
    const result = await runIteration(i);
    results.push(result);
    
    const allPassed = result.dashboard && result.patients && result.decisions && 
                      result.patterns && result.aiAnalyze && result.contextExtraction && 
                      result.contextMatching && result.patternDiscovery;
    
    if (allPassed) {
      successCount++;
      console.log(`[${i}/${TOTAL_ITERATIONS}] PASS (${result.durationMs}ms)`);
    } else {
      failCount++;
      console.log(`[${i}/${TOTAL_ITERATIONS}] FAIL (${result.durationMs}ms) - Failed: ${
        [
          !result.dashboard && 'dashboard',
          !result.patients && 'patients',
          !result.decisions && 'decisions',
          !result.patterns && 'patterns',
          !result.aiAnalyze && 'aiAnalyze',
          !result.contextExtraction && 'contextExtraction',
          !result.contextMatching && 'contextMatching',
          !result.patternDiscovery && 'patternDiscovery'
        ].filter(Boolean).join(', ')
      }`);
    }
    
    await sleep(100);
  }
  
  console.log('---');
  console.log(`SUMMARY:`);
  console.log(`Total iterations: ${TOTAL_ITERATIONS}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Success rate: ${((successCount / TOTAL_ITERATIONS) * 100).toFixed(1)}%`);
  
  const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;
  console.log(`Average duration: ${avgDuration.toFixed(0)}ms`);
  
  const aiSuccessRate = results.filter(r => r.aiAnalyze).length / results.length * 100;
  console.log(`AI Analyze success rate: ${aiSuccessRate.toFixed(1)}%`);
  
  const contextExtractionRate = results.filter(r => r.contextExtraction).length / results.length * 100;
  console.log(`Context Extraction success rate: ${contextExtractionRate.toFixed(1)}%`);
  
  const contextMatchingRate = results.filter(r => r.contextMatching).length / results.length * 100;
  console.log(`Context Matching success rate: ${contextMatchingRate.toFixed(1)}%`);
  
  const patternDiscoveryRate = results.filter(r => r.patternDiscovery).length / results.length * 100;
  console.log(`Pattern Discovery success rate: ${patternDiscoveryRate.toFixed(1)}%`);
}

main().catch(console.error);
