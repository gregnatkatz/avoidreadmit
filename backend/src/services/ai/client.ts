import OpenAI, { AzureOpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { trackGenAIRequest, trackGenAIResponse } from '../../telemetry';

interface AIProvider {
  name: string;
  client: OpenAI | AzureOpenAI;
  model: string;
  priority: number;
  supportsTemperature?: boolean;
}

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

const providers: AIProvider[] = [
  {
    name: 'GPT-5.2',
    client: new AzureOpenAI({
      apiKey: process.env.GPT5_KEY || process.env.AZURE_PRIORAUTH_KEY || '',
      endpoint: 'https://priorauth25-resource.cognitiveservices.azure.com',
      apiVersion: '2024-12-01-preview',
      deployment: 'gpt-5.2'
    }),
    model: 'gpt-5.2',
    priority: 1,
    supportsTemperature: true
  },
  {
    name: 'o3-2',
    client: new AzureOpenAI({
      apiKey: process.env.O3_KEY || process.env.AZURE_SWEDEN_KEY || '',
      endpoint: 'https://grego-m5vgi1oz-swedencentral.cognitiveservices.azure.com',
      apiVersion: '2024-12-01-preview',
      deployment: 'o3-2'
    }),
    model: 'o3-2',
    priority: 2,
    supportsTemperature: false
  },
  {
    name: 'DeepSeek-V3.2',
    client: new OpenAI({
      apiKey: process.env.DEEPSEEK_V32_KEY || process.env.AZURE_PRIORAUTH_KEY || '',
      baseURL: 'https://priorauth25-resource.services.ai.azure.com/openai/v1/'
    }),
    model: 'DeepSeek-V3.2',
    priority: 3,
    supportsTemperature: true
  },
  {
    name: 'grok-4-fast-reasoning',
    client: new OpenAI({
      apiKey: process.env.GROK4_KEY || process.env.AZURE_PRIORAUTH_KEY || '',
      baseURL: 'https://priorauth25-resource.services.ai.azure.com/models/',
      defaultQuery: { 'api-version': '2024-05-01-preview' }
    }),
    model: 'grok-4-fast-reasoning',
    priority: 4,
    supportsTemperature: false
  }
];

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callWithRetry(
  provider: AIProvider,
  messages: { role: 'system' | 'user'; content: string }[],
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  timeoutMs: number = 45000
): Promise<{ content: string; inputTokens: number; outputTokens: number } | null> {
  let delay = config.initialDelayMs;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const requestParams: Parameters<typeof provider.client.chat.completions.create>[0] = {
        model: provider.model,
        messages,
        max_completion_tokens: 1500
      };
      
      if (provider.supportsTemperature !== false) {
        requestParams.temperature = 0.7;
      }
      
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await provider.client.chat.completions.create(requestParams, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const content = response.choices[0]?.message?.content;
      console.log(`[${provider.name}] Response usage:`, JSON.stringify(response.usage));
      console.log(`[${provider.name}] Input tokens: ${response.usage?.prompt_tokens}, Output tokens: ${response.usage?.completion_tokens}`);
      
      if (content) {
        return {
          content,
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0
        };
      }
    } catch (error: unknown) {
      const isRateLimited = error instanceof Error && 
        (error.message.includes('429') || error.message.includes('rate limit'));
      
      if (isRateLimited && attempt < config.maxAttempts) {
        console.log(`Rate limited on ${provider.name}, attempt ${attempt}/${config.maxAttempts}. Waiting ${delay}ms...`);
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
        continue;
      }
      
      console.error(`Provider ${provider.name} failed (attempt ${attempt}):`, error);
      if (attempt === config.maxAttempts) {
        return null;
      }
      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }
  return null;
}

export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const sortedProviders = [...providers].sort((a, b) => a.priority - b.priority);

  for (const provider of sortedProviders) {
    const messages: { role: 'system' | 'user'; content: string }[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const operationId = trackGenAIRequest({
      provider: provider.name,
      model: provider.model,
      systemPrompt,
      userPrompt: prompt
    });

    const startTime = Date.now();
    const result = await callWithRetry(provider, messages);
    const durationMs = Date.now() - startTime;

    if (result) {
      const responseId = uuidv4();
      trackGenAIResponse(operationId, {
        provider: provider.name,
        model: provider.model,
        systemPrompt,
        userPrompt: prompt
      }, {
        responseId,
        content: result.content,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        success: true,
        durationMs
      });
      return result.content;
    }

    trackGenAIResponse(operationId, {
      provider: provider.name,
      model: provider.model,
      systemPrompt,
      userPrompt: prompt
    }, {
      responseId: '',
      content: '',
      inputTokens: 0,
      outputTokens: 0,
      success: false,
      durationMs
    });
  }

  return JSON.stringify({
    error: 'All AI providers unavailable',
    fallback: true
  });
}

export function getProviderStatus(): { name: string; priority: number; status: string }[] {
  return providers.map(p => ({
    name: p.name,
    priority: p.priority,
    status: 'available'
  }));
}

export function getProviderNames(): string[] {
  return providers.map(p => p.name);
}

// Domain-specialized parallel AI analysis for pattern discovery
export interface DomainAnalysisResult {
  provider: string;
  domain: string;
  patterns: any[];
  reasoning: string;
  success: boolean;
  durationMs: number;
}

export interface MultiModelConsensusResult {
  allResults: DomainAnalysisResult[];
  consensusPatterns: any[];
  totalDurationMs: number;
}

// Domain specializations for each AI model
const DOMAIN_SPECIALIZATIONS = {
  'GPT-5.2': {
    domain: 'Social/Caregiver',
    fields: ['caregiver_medical_background', 'caregiver_proximity_minutes', 'caregiver_availability', 
             'caregiver_relationship', 'caregiver_age', 'caregiver_health_status', 'caregiver_override',
             'living_situation', 'has_caregiver'],
    description: 'Social determinants and caregiver support factors (including clinician overrides)'
  },
  'o3-2': {
    domain: 'Clinical',
    fields: ['adl_score', 'readmit_count_12m', 'los_at_decision', 'primary_diagnosis', 'comorbidity_count'],
    description: 'Clinical indicators and medical history factors'
  },
  'DeepSeek-V3.2': {
    domain: 'Behavioral',
    fields: ['patient_stated_preference', 'has_transportation', 'medication_adherence', 'follow_up_compliance'],
    description: 'Patient behavior, preferences, and compliance factors'
  },
  'grok-4-fast-reasoning': {
    domain: 'Cross-Domain',
    fields: ['*'], // All fields - looks for interactions across domains
    description: 'Cross-domain interaction patterns and complex combinations'
  }
};

export async function callParallelDomainAnalysis(
  outcomeData: string,
  systemPromptTemplate: string
): Promise<MultiModelConsensusResult> {
  const startTime = Date.now();
  const results: DomainAnalysisResult[] = [];
  
  // Create domain-specific prompts for each provider
  const analysisPromises = providers.map(async (provider) => {
    const spec = DOMAIN_SPECIALIZATIONS[provider.name as keyof typeof DOMAIN_SPECIALIZATIONS];
    if (!spec) return null;
    
    const domainPrompt = `You are a healthcare AI specialist focusing on ${spec.domain} factors.
Your expertise is in analyzing: ${spec.description}

Focus your pattern analysis ONLY on these fields: ${spec.fields.join(', ')}
${spec.fields[0] === '*' ? 'Look for complex interactions ACROSS multiple domains (social + clinical + behavioral combinations).' : ''}

${systemPromptTemplate}

IMPORTANT: Only propose patterns related to your domain expertise. Be specific and provide clinical reasoning.`;

    const userPrompt = `Analyze this patient outcome data for ${spec.domain} patterns that predict successful discharge outcomes:

${outcomeData}

Return your analysis as JSON with this structure:
{
  "domain": "${spec.domain}",
  "patterns": [
    {
      "name": "pattern name",
      "conditions": [{"field": "field_name", "operator": "eq|gt|lt|gte|lte", "value": "value"}],
      "reasoning": "clinical reasoning for why this pattern matters",
      "confidence": 0.0-1.0,
      "expectedLift": 0.0-0.3
    }
  ],
  "insights": "overall insights about ${spec.domain} factors"
}`;

    const providerStartTime = Date.now();
    
    try {
      const messages: { role: 'system' | 'user'; content: string }[] = [
        { role: 'system', content: domainPrompt },
        { role: 'user', content: userPrompt }
      ];

      const operationId = trackGenAIRequest({
        provider: provider.name,
        model: provider.model,
        systemPrompt: domainPrompt,
        userPrompt: userPrompt
      });

      const result = await callWithRetry(provider, messages, DEFAULT_RETRY_CONFIG, 60000); // 60s timeout for reasoning
      const durationMs = Date.now() - providerStartTime;

      if (result) {
        trackGenAIResponse(operationId, {
          provider: provider.name,
          model: provider.model,
          systemPrompt: domainPrompt,
          userPrompt: userPrompt
        }, {
          responseId: uuidv4(),
          content: result.content,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          success: true,
          durationMs
        });

        // Parse the response
        let patterns: any[] = [];
        let reasoning = '';
        try {
          const jsonMatch = result.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            patterns = parsed.patterns || [];
            reasoning = parsed.insights || '';
          }
        } catch (e) {
          console.log(`[${provider.name}] Failed to parse response as JSON, extracting patterns manually`);
          reasoning = result.content;
        }

        return {
          provider: provider.name,
          domain: spec.domain,
          patterns,
          reasoning,
          success: true,
          durationMs
        };
      }

      trackGenAIResponse(operationId, {
        provider: provider.name,
        model: provider.model,
        systemPrompt: domainPrompt,
        userPrompt: userPrompt
      }, {
        responseId: '',
        content: '',
        inputTokens: 0,
        outputTokens: 0,
        success: false,
        durationMs
      });

      return {
        provider: provider.name,
        domain: spec.domain,
        patterns: [],
        reasoning: 'Provider failed to respond',
        success: false,
        durationMs
      };
    } catch (error) {
      console.error(`[${provider.name}] Domain analysis failed:`, error);
      return {
        provider: provider.name,
        domain: spec.domain,
        patterns: [],
        reasoning: `Error: ${error}`,
        success: false,
        durationMs: Date.now() - providerStartTime
      };
    }
  });

  // Run all analyses in parallel
  const allResults = await Promise.all(analysisPromises);
  const validResults = allResults.filter((r): r is DomainAnalysisResult => r !== null);
  
  // Aggregate and find consensus patterns
  const consensusPatterns = aggregatePatterns(validResults);
  
  return {
    allResults: validResults,
    consensusPatterns,
    totalDurationMs: Date.now() - startTime
  };
}

function aggregatePatterns(results: DomainAnalysisResult[]): any[] {
  const patternMap = new Map<string, { pattern: any; sources: string[]; totalConfidence: number }>();
  
  for (const result of results) {
    if (!result.success) continue;
    
    for (const pattern of result.patterns) {
      // Create a normalized key for the pattern
      const conditions = pattern.conditions || [];
      const key = conditions
        .map((c: any) => `${c.field}:${c.operator}:${c.value}`)
        .sort()
        .join('|');
      
      if (patternMap.has(key)) {
        const existing = patternMap.get(key)!;
        existing.sources.push(result.provider);
        existing.totalConfidence += pattern.confidence || 0.5;
      } else {
        patternMap.set(key, {
          pattern: {
            ...pattern,
            domain: result.domain,
            originalProvider: result.provider
          },
          sources: [result.provider],
          totalConfidence: pattern.confidence || 0.5
        });
      }
    }
  }
  
  // Convert to array and calculate consensus scores
  const aggregated = Array.from(patternMap.values()).map(({ pattern, sources, totalConfidence }) => ({
    ...pattern,
    consensusSources: sources,
    consensusCount: sources.length,
    consensusScore: sources.length / results.filter(r => r.success).length,
    averageConfidence: totalConfidence / sources.length,
    // Boost confidence for patterns found by multiple models
    finalConfidence: Math.min(1.0, (totalConfidence / sources.length) * (1 + 0.2 * (sources.length - 1)))
  }));
  
  // Sort by consensus score and confidence
  return aggregated.sort((a, b) => {
    const scoreA = a.consensusScore * 0.4 + a.finalConfidence * 0.6;
    const scoreB = b.consensusScore * 0.4 + b.finalConfidence * 0.6;
    return scoreB - scoreA;
  });
}

// Devil's Advocate validation - adversarial AI review of proposed patterns
export interface DevilsAdvocateResult {
  pattern: any;
  challenges: string[];
  confoundingFactors: string[];
  clinicalPlausibility: 'high' | 'medium' | 'low';
  biasRisk: 'high' | 'medium' | 'low';
  recommendation: 'accept' | 'review' | 'reject';
  reasoning: string;
  adjustedConfidence: number;
}

export async function runDevilsAdvocateValidation(
  patterns: any[],
  outcomeDataSummary: string
): Promise<DevilsAdvocateResult[]> {
  console.log(`[Devil's Advocate] Validating ${patterns.length} proposed patterns...`);
  
  // Use o3-2 reasoning model for adversarial validation
  const provider = providers.find(p => p.name === 'o3-2');
  if (!provider) {
    console.log(`[Devil's Advocate] o3-2 not available, falling back to GPT-5.2`);
    const fallback = providers.find(p => p.name === 'GPT-5.2');
    if (!fallback) {
      return patterns.map(p => ({
        pattern: p,
        challenges: [],
        confoundingFactors: [],
        clinicalPlausibility: 'medium' as const,
        biasRisk: 'medium' as const,
        recommendation: 'review' as const,
        reasoning: 'Validation skipped - no AI provider available',
        adjustedConfidence: p.finalConfidence || p.confidence || 0.5
      }));
    }
  }

  const validationProvider = provider || providers[0];
  
  const systemPrompt = `You are a skeptical healthcare data scientist acting as a "Devil's Advocate" reviewer.
Your job is to CHALLENGE proposed patterns and look for reasons they might be WRONG or MISLEADING.

For each pattern, you must:
1. Identify potential CONFOUNDING FACTORS that could explain the correlation
2. Challenge the CLINICAL PLAUSIBILITY - does this make medical sense?
3. Look for DATA BIAS - could this be an artifact of how data was collected?
4. Consider SPURIOUS CORRELATIONS - is this just random chance?
5. Check for REVERSE CAUSALITY - could the outcome cause the pattern, not vice versa?

Be rigorous and skeptical. Only patterns that survive your scrutiny should be accepted.`;

  const results: DevilsAdvocateResult[] = [];
  
  // Process patterns in batches to avoid overwhelming the API
  const batchSize = 3;
  for (let i = 0; i < patterns.length; i += batchSize) {
    const batch = patterns.slice(i, i + batchSize);
    
    const userPrompt = `Review these proposed healthcare patterns for discharge readmission prediction.
Be SKEPTICAL and look for reasons each pattern might be WRONG.

Data context:
${outcomeDataSummary}

Patterns to review:
${JSON.stringify(batch, null, 2)}

For EACH pattern, return JSON:
{
  "reviews": [
    {
      "patternName": "name of pattern",
      "challenges": ["challenge 1", "challenge 2"],
      "confoundingFactors": ["factor 1", "factor 2"],
      "clinicalPlausibility": "high|medium|low",
      "biasRisk": "high|medium|low", 
      "recommendation": "accept|review|reject",
      "reasoning": "detailed reasoning for your decision",
      "confidenceAdjustment": -0.3 to +0.1 (negative if concerns, positive if very strong)
    }
  ]
}`;

    try {
      const messages: { role: 'system' | 'user'; content: string }[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const operationId = trackGenAIRequest({
        provider: validationProvider.name,
        model: validationProvider.model,
        systemPrompt,
        userPrompt
      });

      const startTime = Date.now();
      const result = await callWithRetry(validationProvider, messages, DEFAULT_RETRY_CONFIG, 90000); // 90s for reasoning
      const durationMs = Date.now() - startTime;

      if (result) {
        trackGenAIResponse(operationId, {
          provider: validationProvider.name,
          model: validationProvider.model,
          systemPrompt,
          userPrompt
        }, {
          responseId: uuidv4(),
          content: result.content,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          success: true,
          durationMs
        });

        // Parse the response
        try {
          const jsonMatch = result.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const reviews = parsed.reviews || [];
            
            for (let j = 0; j < batch.length; j++) {
              const review = reviews[j] || {};
              const originalConfidence = batch[j].finalConfidence || batch[j].confidence || 0.5;
              const adjustment = review.confidenceAdjustment || 0;
              
              results.push({
                pattern: batch[j],
                challenges: review.challenges || [],
                confoundingFactors: review.confoundingFactors || [],
                clinicalPlausibility: review.clinicalPlausibility || 'medium',
                biasRisk: review.biasRisk || 'medium',
                recommendation: review.recommendation || 'review',
                reasoning: review.reasoning || 'No detailed reasoning provided',
                adjustedConfidence: Math.max(0.1, Math.min(1.0, originalConfidence + adjustment))
              });
            }
          }
        } catch (e) {
          console.log(`[Devil's Advocate] Failed to parse response, using defaults`);
          for (const pattern of batch) {
            results.push({
              pattern,
              challenges: ['Unable to parse AI review'],
              confoundingFactors: [],
              clinicalPlausibility: 'medium',
              biasRisk: 'medium',
              recommendation: 'review',
              reasoning: 'AI review parsing failed',
              adjustedConfidence: pattern.finalConfidence || pattern.confidence || 0.5
            });
          }
        }
      } else {
        // Provider failed
        for (const pattern of batch) {
          results.push({
            pattern,
            challenges: ['AI validation unavailable'],
            confoundingFactors: [],
            clinicalPlausibility: 'medium',
            biasRisk: 'medium',
            recommendation: 'review',
            reasoning: 'AI provider failed to respond',
            adjustedConfidence: pattern.finalConfidence || pattern.confidence || 0.5
          });
        }
      }
    } catch (error) {
      console.error(`[Devil's Advocate] Batch validation failed:`, error);
      for (const pattern of batch) {
        results.push({
          pattern,
          challenges: ['Validation error'],
          confoundingFactors: [],
          clinicalPlausibility: 'medium',
          biasRisk: 'medium',
          recommendation: 'review',
          reasoning: `Error: ${error}`,
          adjustedConfidence: pattern.finalConfidence || pattern.confidence || 0.5
        });
      }
    }
  }

  // Log summary
  const accepted = results.filter(r => r.recommendation === 'accept').length;
  const rejected = results.filter(r => r.recommendation === 'reject').length;
  const review = results.filter(r => r.recommendation === 'review').length;
  console.log(`[Devil's Advocate] Results: ${accepted} accepted, ${review} need review, ${rejected} rejected`);

  return results;
}

export async function callSpecificProvider(providerName: string, prompt: string, systemPrompt?: string): Promise<string> {
  const provider = providers.find(p => p.name === providerName);
  if (!provider) {
    return JSON.stringify({ error: `Provider ${providerName} not found` });
  }

  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const operationId = trackGenAIRequest({
    provider: provider.name,
    model: provider.model,
    systemPrompt,
    userPrompt: prompt
  });

  const startTime = Date.now();
  const result = await callWithRetry(provider, messages);
  const durationMs = Date.now() - startTime;

  if (result) {
    const responseId = uuidv4();
    trackGenAIResponse(operationId, {
      provider: provider.name,
      model: provider.model,
      systemPrompt,
      userPrompt: prompt
    }, {
      responseId,
      content: result.content,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      success: true,
      durationMs
    });
    return result.content;
  }

  trackGenAIResponse(operationId, {
    provider: provider.name,
    model: provider.model,
    systemPrompt,
    userPrompt: prompt
  }, {
    responseId: '',
    content: '',
    inputTokens: 0,
    outputTokens: 0,
    success: false,
    durationMs
  });

  return JSON.stringify({ error: `Provider ${providerName} failed`, fallback: true });
}
