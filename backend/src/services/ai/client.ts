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
