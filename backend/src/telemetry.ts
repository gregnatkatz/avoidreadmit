import appInsights from 'applicationinsights';

const client = appInsights.defaultClient;

export function trackDecisionMade(traceNumber: string, decisionType: string, patientMrn: string) {
  if (client) {
    client.trackEvent({
      name: 'DecisionMade',
      properties: { traceNumber, decisionType, patientMrn }
    });
  }
}

export function trackContextMatchFound(searchingTraceId: string, matchedTraceId: string, score: number) {
  if (client) {
    client.trackEvent({
      name: 'ContextMatchFound',
      properties: { searchingTraceId, matchedTraceId, score: score.toString() }
    });
  }
}

export function trackOutcomeRecorded(traceId: string, success: boolean, hadContextMatch: boolean) {
  if (client) {
    client.trackEvent({
      name: 'OutcomeRecorded',
      properties: { traceId, success: success.toString(), hadContextMatch: hadContextMatch.toString() }
    });
  }
}

export function trackTimelineAdvanced(fromMonth: number, toMonth: number) {
  if (client) {
    client.trackEvent({
      name: 'TimelineAdvanced',
      properties: { fromMonth: fromMonth.toString(), toMonth: toMonth.toString() }
    });
  }
}

export function trackMetric(name: string, value: number) {
  if (client) {
    client.trackMetric({ name, value });
  }
}
