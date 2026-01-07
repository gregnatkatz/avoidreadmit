import OpenAI from 'openai';

interface AIProvider {
  name: string;
  client: OpenAI;
  model: string;
  priority: number;
}

const providers: AIProvider[] = [
  {
    name: 'GPT-5.2',
    client: new OpenAI({
      apiKey: process.env.GPT5_KEY || '',
      baseURL: process.env.GPT5_ENDPOINT || 'https://priorauth25-resource.openai.azure.com/openai/deployments/gpt-5.2'
    }),
    model: 'gpt-5.2',
    priority: 1
  },
  {
    name: 'o3-2',
    client: new OpenAI({
      apiKey: process.env.O3_KEY || '',
      baseURL: process.env.O3_ENDPOINT || 'https://grego-m5vgi1oz-swedencentral.openai.azure.com/openai/deployments/o3-2'
    }),
    model: 'o3-2',
    priority: 2
  },
  {
    name: 'DeepSeek-V3.2',
    client: new OpenAI({
      apiKey: process.env.DEEPSEEK_V32_KEY || '',
      baseURL: process.env.DEEPSEEK_V32_ENDPOINT || 'https://priorauth25-resource.services.ai.azure.com/models'
    }),
    model: 'DeepSeek-V3.2',
    priority: 3
  },
  {
    name: 'Model Router',
    client: new OpenAI({
      apiKey: process.env.MODEL_ROUTER_KEY || '',
      baseURL: process.env.MODEL_ROUTER_ENDPOINT || 'https://grego-m5vgi1oz-swedencentral.openai.azure.com/openai/deployments/model-router'
    }),
    model: 'model-router',
    priority: 4
  }
];

export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const sortedProviders = [...providers].sort((a, b) => a.priority - b.priority);

  for (const provider of sortedProviders) {
    try {
      const messages: { role: 'system' | 'user'; content: string }[] = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await provider.client.chat.completions.create({
        model: provider.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return content;
      }
    } catch (error) {
      console.error(`Provider ${provider.name} failed:`, error);
      continue;
    }
  }

  // Fallback response if all providers fail
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
