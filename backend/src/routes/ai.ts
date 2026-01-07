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
