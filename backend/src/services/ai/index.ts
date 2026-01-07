import { extractContext } from './context-extraction';
import { findContextMatches } from './context-matching';
import { discoverPatterns } from './pattern-discovery';
import { runWithVerification } from './agents';

export async function runMultiAgentAnalysis(patientMrn?: string, transcriptId?: string) {
  const results = {
    extraction: null as unknown,
    matching: null as unknown,
    patterns: null as unknown,
    agentActivity: [] as { agent: string; action: string; timestamp: Date; status: string }[]
  };

  try {
    // Primary Agent: Context Extraction
    results.agentActivity.push({
      agent: 'Primary',
      action: 'Starting context extraction',
      timestamp: new Date(),
      status: 'in_progress'
    });

    if (patientMrn && transcriptId) {
      const extractionResult = await runWithVerification(
        () => extractContext(patientMrn, transcriptId),
        'context_extraction'
      );
      results.extraction = extractionResult;
    }

    results.agentActivity.push({
      agent: 'Primary',
      action: 'Context extraction complete',
      timestamp: new Date(),
      status: 'complete'
    });

    // Context Matching
    results.agentActivity.push({
      agent: 'Primary',
      action: 'Finding context matches',
      timestamp: new Date(),
      status: 'in_progress'
    });

    if (patientMrn) {
      const matchingResult = await runWithVerification(
        () => findContextMatches(patientMrn),
        'context_matching'
      );
      results.matching = matchingResult;
    }

    results.agentActivity.push({
      agent: 'Primary',
      action: 'Context matching complete',
      timestamp: new Date(),
      status: 'complete'
    });

    // Pattern Discovery
    results.agentActivity.push({
      agent: 'Primary',
      action: 'Discovering patterns',
      timestamp: new Date(),
      status: 'in_progress'
    });

    const patternResult = await runWithVerification(
      () => discoverPatterns(),
      'pattern_discovery'
    );
    results.patterns = patternResult;

    results.agentActivity.push({
      agent: 'Primary',
      action: 'Pattern discovery complete',
      timestamp: new Date(),
      status: 'complete'
    });

    return results;
  } catch (error) {
    console.error('Error in multi-agent analysis:', error);
    throw error;
  }
}

export { extractContext, findContextMatches, discoverPatterns };
