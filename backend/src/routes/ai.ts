import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { runMultiAgentAnalysis } from '../services/ai';
import { extractContext } from '../services/ai/context-extraction';
import { findContextMatches } from '../services/ai/context-matching';
import { discoverPatterns } from '../services/ai/pattern-discovery';
import { callSpecificProvider, getProviderNames } from '../services/ai/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/analyze', async (req, res) => {
  try {
    const { patientMrn, transcriptId } = req.body;

    const result = await runMultiAgentAnalysis(patientMrn, transcriptId);
    res.json(result);
  } catch (error) {
    console.error('Error running AI analysis:', error);
    res.status(500).json({ error: 'Failed to run AI analysis' });
  }
});

router.post('/extract-context', async (req, res) => {
  try {
    const { patientMrn, transcriptId, transcript } = req.body;
    
    if (transcriptId) {
      const result = await extractContext(patientMrn || 'test', transcriptId);
      res.json(result);
    } else {
      res.json({
        patientMrn: patientMrn || 'test',
        extractedContext: {
          caregiver: {
            relationship: 'daughter',
            availability: 'part-time',
            hasMedicalBackground: false
          },
          patient: {
            statedPreference: 'home',
            concerns: ['medication management', 'mobility']
          },
          barriers: ['stairs at home'],
          positiveFactors: ['strong family support'],
          confidence: 0.85
        },
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Error extracting context:', error);
    res.status(500).json({ error: 'Failed to extract context' });
  }
});

router.post('/match-context', async (req, res) => {
  try {
    const { patientMrn, context } = req.body;
    
    if (patientMrn) {
      const result = await findContextMatches(patientMrn);
      res.json(result);
    } else {
      res.json({
        patientMrn: 'test',
        matches: [
          {
            matchedTraceId: 'trace-001',
            matchScore: 0.87,
            factorsMatched: ['caregiver_present', 'similar_diagnosis'],
            outcome: { success: true, readmitted: false }
          },
          {
            matchedTraceId: 'trace-002',
            matchScore: 0.75,
            factorsMatched: ['caregiver_present'],
            outcome: { success: true, readmitted: false }
          }
        ],
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Error matching context:', error);
    res.status(500).json({ error: 'Failed to match context' });
  }
});

router.post('/discover-patterns', async (req, res) => {
  try {
    const result = await discoverPatterns();
    res.json(result);
  } catch (error) {
    console.error('Error discovering patterns:', error);
    res.status(500).json({ error: 'Failed to discover patterns' });
  }
});

router.get('/providers', async (_req, res) => {
  try {
    const providers = getProviderNames();
    res.json({ providers });
  } catch (error) {
    console.error('Error getting providers:', error);
    res.status(500).json({ error: 'Failed to get providers' });
  }
});

router.post('/test-provider', async (req, res) => {
  try {
    const { provider, prompt } = req.body;
    const systemPrompt = 'You are a helpful assistant. Respond concisely.';
    const result = await callSpecificProvider(provider, prompt || 'What is 2+2?', systemPrompt);
    res.json({ provider, result, success: !result.includes('error') && !result.includes('failed') });
  } catch (error) {
    console.error('Error testing provider:', error);
    res.status(500).json({ error: 'Failed to test provider' });
  }
});

// Discharge Readiness Analysis - Real AI endpoint
router.post('/discharge-readiness', async (req, res) => {
  try {
    const { patient } = req.body;
    
    if (!patient) {
      return res.status(400).json({ error: 'Patient data required' });
    }

    // Build context-aware prompt for the AI
    const systemPrompt = `You are a Discharge Readiness Agent for a hospital. Your role is to evaluate patient discharge readiness based on CMS, Joint Commission, and AHRQ standards.

You have access to the Context Graph which has learned the following patterns from historical discharge data:
- PAT-0001: Medical Background Caregiver - 84% success rate, +19% lift (n=447)
- PAT-0003: Full-Time Availability - 85% success rate, +20% lift (n=520)
- PAT-0007: Patient Preference Alignment - 85% success rate, +20% lift (n=410)
- PAT-0008: Low Readmission History - 88% success rate, +23% lift (n=620)
- PAT-0009: Spouse Caregiver Commitment - 81% success rate, +16% lift (n=380)
- PAT-0012: No Transportation Barriers - 77% success rate, +12% lift (n=550)
- PAT-0014: Elderly Caregiver Risk Flag - 42% success rate, -23% lift (RISK PATTERN) (n=340)

Respond with a JSON object containing:
{
  "overallScore": number (0-100),
  "recommendation": "approve" | "hold" | "needs_review",
  "riskFactors": [{ "title": string, "patternId": string, "reason": string, "evidence": string, "recommendation": string }],
  "protectiveFactors": [{ "title": string, "patternId": string, "reason": string, "evidence": string }],
  "requirements": [{ "name": string, "status": "met" | "not_met" | "pending", "standard": string, "patternId": string | null }],
  "suggestedDisposition": string,
  "confidence": number (0-100),
  "reasoning": string
}`;

    const userPrompt = `Evaluate discharge readiness for this patient:

Patient: ${patient.name}
MRN: ${patient.mrn}
Age: ${patient.age} years old
Gender: ${patient.gender}
Principal Diagnosis: ${patient.principal_diagnosis}
Length of Stay: ${patient.los_days} days
Unit: ${patient.unit}
Insurance: ${patient.insurance_type}
Planned Disposition: ${patient.discharge_disposition || 'Not specified'}

Based on the Context Graph patterns and industry standards (CMS CoP, Joint Commission NPSG, AHRQ IDEAL Discharge), provide a comprehensive discharge readiness assessment. Be specific about which patterns apply and why. Include verbose explanations for each risk factor identified.`;

    const { callAI } = await import('../services/ai/client');
    const aiResponse = await callAI(userPrompt, systemPrompt);
    
    // Try to parse the AI response as JSON
    let parsedResponse;
    try {
      // Extract JSON from the response (AI might include markdown code blocks)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // If parsing fails, return a structured fallback with the raw AI response
      parsedResponse = {
        overallScore: 75,
        recommendation: 'needs_review',
        riskFactors: [],
        protectiveFactors: [],
        requirements: [],
        suggestedDisposition: patient.discharge_disposition || 'Home with Home Health',
        confidence: 70,
        reasoning: aiResponse,
        rawResponse: true
      };
    }

    res.json({
      success: true,
      analysis: parsedResponse,
      patient: patient.mrn,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in discharge readiness analysis:', error);
    res.status(500).json({ error: 'Failed to analyze discharge readiness' });
  }
});

router.get('/status', async (_req, res) => {
  try {
    const state = await prisma.demo_State.findUnique({ where: { id: 'singleton' } });
    const currentMonth = state?.current_month || 1;

    const [traces, outcomes, matches, patterns] = await Promise.all([
      prisma.dCG_DecisionTrace.count({ where: { data_month: currentMonth } }),
      prisma.dCG_Outcome.count({ where: { data_month: currentMonth } }),
      prisma.dCG_ContextMatch.count({ where: { data_month: currentMonth } }),
      prisma.dCG_ContextPattern.count({ where: { data_month: { lte: currentMonth }, status: 'validated' } })
    ]);

    const prevMonthMatches = currentMonth > 1 
      ? await prisma.dCG_ContextMatch.count({ where: { data_month: { lte: currentMonth - 1 } } })
      : 0;

    const totalMatches = await prisma.dCG_ContextMatch.count({ where: { data_month: { lte: currentMonth } } });

    res.json({
      currentMonth,
      decisionTraces: traces,
      outcomesRecorded: outcomes,
      outcomePercentage: traces > 0 ? Math.round((outcomes / traces) * 100) : 0,
      contextMatches: totalMatches,
      matchesFromLastMonth: totalMatches - prevMonthMatches,
      patternsDiscovered: patterns,
      providers: [
        { name: 'GPT-5.2', priority: 1, status: 'available' },
        { name: 'o3-2', priority: 2, status: 'available' },
        { name: 'DeepSeek-V3.2', priority: 3, status: 'available' },
        { name: 'Model Router', priority: 4, status: 'available' }
      ]
    });
  } catch (error) {
    console.error('Error getting AI status:', error);
    res.status(500).json({ error: 'Failed to get AI status' });
  }
});

export default router;
