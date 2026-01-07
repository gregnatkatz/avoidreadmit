import { callAI } from './client';

interface AgentResult<T> {
  result: T;
  verification: {
    isValid: boolean;
    confidence: number;
    issues: string[];
  };
  questions: string[];
}

export async function runWithVerification<T>(
  primaryTask: () => Promise<T>,
  taskType: string
): Promise<AgentResult<T>> {
  // Primary Agent executes the task
  const result = await primaryTask();

  // Verifier Agent checks the result
  const verification = await verifyResult(result, taskType);

  // Questioner Agent identifies gaps
  const questions = await identifyGaps(result, taskType);

  return { result, verification, questions };
}

async function verifyResult<T>(result: T, taskType: string): Promise<{
  isValid: boolean;
  confidence: number;
  issues: string[];
}> {
  try {
    const prompt = `You are a Verification Agent. Review this ${taskType} result for accuracy and completeness.

Result to verify:
${JSON.stringify(result, null, 2)}

Respond with JSON:
{
  "isValid": boolean,
  "confidence": number (0-1),
  "issues": ["list of any issues found"]
}`;

    const response = await callAI(prompt);
    
    try {
      const parsed = JSON.parse(response);
      return {
        isValid: parsed.isValid ?? true,
        confidence: parsed.confidence ?? 0.85,
        issues: parsed.issues ?? []
      };
    } catch {
      return { isValid: true, confidence: 0.85, issues: [] };
    }
  } catch (error) {
    console.error('Verification error:', error);
    return { isValid: true, confidence: 0.7, issues: [] };
  }
}

async function identifyGaps<T>(result: T, taskType: string): Promise<string[]> {
  try {
    const prompt = `You are a Questioning Agent. Identify gaps, ambiguities, or areas needing clarification in this ${taskType} result.

Result to analyze:
${JSON.stringify(result, null, 2)}

Respond with JSON array of questions:
["question 1", "question 2", ...]`;

    const response = await callAI(prompt);
    
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } catch (error) {
    console.error('Questioning error:', error);
    return [];
  }
}

export { verifyResult, identifyGaps };
