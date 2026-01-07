import { v4 as uuidv4 } from 'uuid';
import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';

// NOTE: Azure Monitor OpenTelemetry is initialized in index.ts
// We use OpenTelemetry API directly here for Gen AI telemetry

// Get the OpenTelemetry tracer lazily (after Azure Monitor is initialized)
function getTracer() {
  return trace.getTracer('gen-ai-tracer', '1.0.0');
}

export interface GenAIRequest {
  provider: string;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
}

export interface GenAIResponse {
  responseId: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  success: boolean;
  durationMs: number;
}

export function trackGenAIRequest(request: GenAIRequest): string {
  const operationId = uuidv4();
  // Request tracking is handled by the response span
  return operationId;
}

export function trackGenAIResponse(operationId: string, request: GenAIRequest, response: GenAIResponse) {
  // Create OpenTelemetry span with Gen AI semantic conventions
  // This is the format that App Insights Gen AI tracing expects
  console.log(`[Telemetry] Creating OpenTelemetry span for ${request.provider}/${request.model} with ${response.inputTokens} input tokens, ${response.outputTokens} output tokens`);
  
  // Get tracer lazily to ensure Azure Monitor is initialized first
  const tracer = getTracer();
  const span = tracer.startSpan(`${request.provider}/${request.model}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      // Gen AI semantic conventions - these MUST be set as span attributes (not properties)
      'gen_ai.system': 'azure_openai',
      'gen_ai.provider.name': request.provider,
      'gen_ai.request.model': request.model,
      'gen_ai.response.id': response.responseId || operationId,
      'gen_ai.usage.input_tokens': response.inputTokens,  // Must be number, not string
      'gen_ai.usage.output_tokens': response.outputTokens, // Must be number, not string
      'span_type': 'GenAI',
      // Additional context
      'gen_ai.request.max_tokens': 2000,
      'gen_ai.response.finish_reason': 'stop',
    }
  });

  // Log span context for debugging
  const spanContext = span.spanContext();
  console.log(`[Telemetry] Span created with traceId: ${spanContext.traceId}, spanId: ${spanContext.spanId}`);

  // Set span status based on success
  if (response.success) {
    span.setStatus({ code: SpanStatusCode.OK });
  } else {
    span.setStatus({ code: SpanStatusCode.ERROR, message: 'AI request failed' });
  }

  // End the span (this triggers export to Azure Monitor)
  span.end();
  console.log(`[Telemetry] Span ended for ${request.provider}/${request.model}`);

}

export function trackDecisionMade(traceNumber: string, decisionType: string, patientMrn: string) {
  const tracer = getTracer();
  const span = tracer.startSpan('DecisionMade', {
    kind: SpanKind.INTERNAL,
    attributes: { traceNumber, decisionType, patientMrn }
  });
  span.end();
}

export function trackContextMatchFound(searchingTraceId: string, matchedTraceId: string, score: number) {
  const tracer = getTracer();
  const span = tracer.startSpan('ContextMatchFound', {
    kind: SpanKind.INTERNAL,
    attributes: { searchingTraceId, matchedTraceId, score }
  });
  span.end();
}

export function trackOutcomeRecorded(traceId: string, success: boolean, hadContextMatch: boolean) {
  const tracer = getTracer();
  const span = tracer.startSpan('OutcomeRecorded', {
    kind: SpanKind.INTERNAL,
    attributes: { traceId, success, hadContextMatch }
  });
  span.end();
}

export function trackTimelineAdvanced(fromMonth: number, toMonth: number) {
  const tracer = getTracer();
  const span = tracer.startSpan('TimelineAdvanced', {
    kind: SpanKind.INTERNAL,
    attributes: { fromMonth, toMonth }
  });
  span.end();
}

export function trackMetric(name: string, value: number) {
  // Metrics are handled by Azure Monitor OpenTelemetry automatically
  console.log(`[Telemetry] Metric: ${name} = ${value}`);
}
