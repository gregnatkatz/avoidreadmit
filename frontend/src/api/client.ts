import axios from 'axios'

// Use relative URL for API calls - Vite proxy will forward to backend
// In production, set VITE_API_URL to the full backend URL
const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 
    'Content-Type': 'application/json'
  }
})

export interface DashboardSummary {
  currentMonth: number
  totalDecisions: number
  decisionsWithContextMatch: number
  readmissionRate: number
  activePatterns: number
  cumulativeSavings: number
  readmissionsAvoided: number
}

export interface ReadmissionTrend {
  month: string
  monthNumber: number
  readmissionRate: number
  totalDecisions: number
  withOutcomes: number
}

export interface ContextImpact {
  withRichContextSuccessRate: number
  withoutRichContextSuccessRate: number
  contextLift: number
}

export interface TimelineState {
  currentMonth: number
  totalMonths: number
}

export interface Patient {
  mrn: string
  name: string
  age: number
  gender: string
  insurance_type: string
  encounter_id: string
  encounter_number: string
  admit_date: string
  los_days: number
  principal_diagnosis: string
  diagnosis_category: string
  unit: string
  discharge_disposition: string
}

export interface AIStatus {
  currentMonth: number
  decisionTraces: number
  outcomesRecorded: number
  outcomePercentage: number
  contextMatches: number
  matchesFromLastMonth: number
  patternsDiscovered: number
  providers: { name: string; priority: number; status: string }[]
}

export interface ContextStats {
  currentMonth: number
  totalTraces: number
  totalOutcomes: number
  totalMatches: number
  totalPatterns: number
  monthlyStats: { month: number; label: string; decisions: number; matches: number; patterns: number }[]
}

export const dashboardApi = {
  getSummary: () => api.get<DashboardSummary>('/dashboard/summary').then(r => r.data),
  getReadmissionTrend: () => api.get<ReadmissionTrend[]>('/dashboard/readmission-trend').then(r => r.data),
  getContextImpact: () => api.get<ContextImpact>('/dashboard/context-impact').then(r => r.data),
  getCostSavings: () => api.get('/dashboard/cost-savings').then(r => r.data)
}

export const timelineApi = {
  getState: () => api.get<TimelineState>('/timeline/state').then(r => r.data),
  advance: () => api.post<TimelineState>('/timeline/advance').then(r => r.data),
  goto: (month: number) => api.post<TimelineState>('/timeline/goto', { month }).then(r => r.data),
  reset: () => api.post<TimelineState>('/timeline/reset').then(r => r.data)
}

export const patientsApi = {
  getWorklist: () => api.get<Patient[]>('/patients').then(r => r.data),
  getPatient: (mrn: string) => api.get(`/patients/${mrn}`).then(r => r.data),
  getPatientContext: (mrn: string) => api.get(`/patients/${mrn}/context`).then(r => r.data)
}

export const decisionsApi = {
  getDecisions: () => api.get('/decisions').then(r => r.data),
  getDecision: (id: string) => api.get(`/decisions/${id}`).then(r => r.data),
  compare: (mrn1: string, mrn2: string) => api.get(`/decisions/compare/${mrn1}/${mrn2}`).then(r => r.data)
}

export const contextApi = {
  getMatches: () => api.get('/context/matches').then(r => r.data),
  getStats: () => api.get<ContextStats>('/context/stats').then(r => r.data)
}

export interface PatternCandidate {
  id: string
  patternNumber: string
  title: string
  description: string
  contextCriteria: any[]
  sampleSize: number
  successRate: number
  lift: number
  pValue: number
  discoveryMethod: string
  hypothesis: string
  createdAt: string
}

export interface PatternDiscoveryResult {
  success: boolean
  message: string
  result: {
    statisticalCandidates: number
    llmCandidates: number
    validated: number
    promoted: number
    deprecated: number
    errors: string[]
  }
}

export interface PatternLifecycleStats {
  byStatus: Record<string, number>
  byMethod: Record<string, number>
}

export const patternsApi = {
  getPatterns: () => api.get('/patterns').then(r => r.data),
  getPattern: (id: string) => api.get(`/patterns/${id}`).then(r => r.data),
  getCandidates: () => api.get<PatternCandidate[]>('/patterns/candidates').then(r => r.data),
  approveCandidate: (id: string, data: { name?: string; notes?: string; approvedBy?: string }) => 
    api.post(`/patterns/${id}/approve`, data).then(r => r.data),
  rejectCandidate: (id: string, data: { reason: string; rejectedBy?: string }) => 
    api.post(`/patterns/${id}/reject`, data).then(r => r.data),
  validatePattern: (id: string) => api.post(`/patterns/${id}/validate`).then(r => r.data),
  runDiscovery: () => api.post<PatternDiscoveryResult>('/patterns/discover').then(r => r.data),
  getLifecycleStats: () => api.get<PatternLifecycleStats>('/patterns/lifecycle').then(r => r.data)
}

// Addendum API - Temporal Context, Provenance, Alerts, Enhanced Patterns
export interface PolicyVersion {
  id: string
  version: string
  effectiveDate: string
  retiredDate: string | null
  criteria: Record<string, unknown>
  description: string | null
  decisionCount: number
}

export interface PatternSnapshot {
  id: string
  patternId: string
  snapshotDate: string
  successRate: number
  lift: number
  sampleSize: number
  conditions: Record<string, unknown>
}

export interface AmbientContextSource {
  source: string
  confidence: number
  reliability: number
  data: Record<string, unknown>
  capturedAt: string
}

export interface AggregatedContext {
  patientMrn: string
  sources: AmbientContextSource[]
  aggregatedData: Record<string, unknown>
  overallConfidence: number
  conflictsResolved: number
}

export interface PatternAlert {
  id: string
  patternId: string
  patternTitle: string
  alertType: string
  severity: string
  message: string
  details: Record<string, unknown>
  createdAt: string
}

export interface PatternPerformance {
  id: string
  patternId: string
  periodStart: string
  periodEnd: string
  totalApplications: number
  successCount: number
  readmitCount: number
  pendingCount: number
  successRate: number
  liftVsBaseline: number
  confidenceInterval: { lower: number; upper: number }
  trend: string
  alertFlag: boolean
}

export interface EnhancedPattern {
  id: string
  patternNumber: string
  title: string
  description: string
  status: string
  metrics: {
    successRate: number
    sampleSize: number
    lift: number | null
    pValue: number | null
    statisticallySignificant: boolean
  }
  selfDescribing: {
    applicabilityRules: Record<string, unknown> | null
    retrievalStrategy: Record<string, unknown> | null
    contraindications: Record<string, unknown> | null
    minimumConfidence: number
  }
  learning: {
    discoveryMethod: string | null
    evidenceStrength: string
    lastValidated: string | null
    validationResults: Record<string, unknown> | null
  }
  counts: {
    snapshots: number
    performanceRecords: number
    activeAlerts: number
  }
  dataMonth: number
  createdAt: string
}

export interface DecisionTemporalContext {
  decision: {
    id: string
    traceNumber: string
    decisionDatetime: string
    decisionValue: string
    decisionMaker: string
  }
  policyVersion: {
    version: string
    effectiveDate: string
    criteria: Record<string, unknown>
  } | null
  contextSnapshot: Record<string, unknown> | null
  criteriaSnapshot: Record<string, unknown> | null
  aiReasoning: Record<string, unknown> | null
  aiRecommendation: string | null
  aiConfidence: number | null
  riskScore: number | null
  patternsApplied: Array<{
    patternId: string
    patternNumber: string
    patternTitle: string
    matchScore: number
    snapshotMetrics: {
      successRate: number
      lift: number
      sampleSize: number
    }
  }>
  outcome: Record<string, unknown> | null
}

export const addendumApi = {
  // Temporal Context
  getPolicyVersions: (active?: boolean) => 
    api.get<PolicyVersion[]>('/addendum/policy-versions', { params: { active } }).then(r => r.data),
  getPolicyVersion: (id: string) => 
    api.get<PolicyVersion>(`/addendum/policy-versions/${id}`).then(r => r.data),
  getPatternSnapshots: (patternId: string, limit?: number) => 
    api.get<PatternSnapshot[]>(`/addendum/pattern-snapshots/${patternId}`, { params: { limit } }).then(r => r.data),
  getDecisionTemporalContext: (decisionId: string) => 
    api.get<DecisionTemporalContext>(`/addendum/decision/${decisionId}/temporal`).then(r => r.data),

  // Provenance & Confidence
  getAmbientContext: (patientMrn: string, encounterId?: string) => 
    api.get<AggregatedContext>(`/addendum/ambient-context/${patientMrn}`, { params: { encounterId } }).then(r => r.data),
  detectConflicts: (patientMrn: string, timeWindowHours?: number) => 
    api.get(`/addendum/conflicts/${patientMrn}`, { params: { timeWindowHours } }).then(r => r.data),
  resolveConflict: (context1Id: string, context2Id: string, resolvedBy: string, winnerId?: string, note?: string) => 
    api.post('/addendum/conflicts/resolve', { context1Id, context2Id, resolvedBy, winnerId, note }).then(r => r.data),
  getSourceReliability: () => 
    api.get<Record<string, number>>('/addendum/source-reliability').then(r => r.data),

  // Pattern Matching
  matchPatterns: (patientContext: Record<string, unknown>, options?: Record<string, unknown>) => 
    api.post('/addendum/match-patterns', { patientContext, options }).then(r => r.data),
  getDecisionPatterns: (decisionId: string) => 
    api.get(`/addendum/decision/${decisionId}/patterns`).then(r => r.data),

  // Alerts & Feedback
  getAlerts: (patternId?: string, severity?: string) => 
    api.get<{ alertCount: number; alerts: PatternAlert[] }>('/addendum/alerts', { params: { patternId, severity } }).then(r => r.data),
  acknowledgeAlert: (alertId: string, acknowledgedBy: string, resolution?: string, resolutionNote?: string) => 
    api.post(`/addendum/alerts/${alertId}/acknowledge`, { acknowledgedBy, resolution, resolutionNote }).then(r => r.data),
  getPatternPerformance: (patternId: string, limit?: number) => 
    api.get<{ patternId: string; periods: PatternPerformance[] }>(`/addendum/pattern-performance/${patternId}`, { params: { limit } }).then(r => r.data),
  runFeedbackAnalysis: (periodStart?: string, periodEnd?: string) => 
    api.post('/addendum/run-feedback-analysis', { periodStart, periodEnd }).then(r => r.data),
  getEmergingPatterns: (minSampleSize?: number, minSuccessRate?: number) => 
    api.get('/addendum/emerging-patterns', { params: { minSampleSize, minSuccessRate } }).then(r => r.data),

  // Enhanced Patterns
  getEnhancedPatterns: (status?: string, evidenceStrength?: string) => 
    api.get<EnhancedPattern[]>('/addendum/patterns', { params: { status, evidenceStrength } }).then(r => r.data),
  getEnhancedPattern: (id: string) => 
    api.get<EnhancedPattern>(`/addendum/patterns/${id}`).then(r => r.data),
  updatePatternMetadata: (id: string, metadata: Record<string, unknown>) => 
    api.patch(`/addendum/patterns/${id}`, metadata).then(r => r.data),
}

export interface DischargeReadinessAnalysis {
  success: boolean
  analysis: {
    overallScore: number
    recommendation: 'approve' | 'hold' | 'needs_review'
    riskFactors: { title: string; patternId: string; reason: string; evidence: string; recommendation: string }[]
    protectiveFactors: { title: string; patternId: string; reason: string; evidence: string }[]
    requirements: { name: string; status: 'met' | 'not_met' | 'pending'; standard: string; patternId: string | null }[]
    suggestedDisposition: string
    confidence: number
    reasoning: string
  }
  patient: string
  timestamp: string
}

export const aiApi = {
  getStatus: () => api.get<AIStatus>('/ai/status').then(r => r.data),
  runAnalysis: (patientMrn?: string, transcriptId?: string) => 
    api.post('/ai/analyze', { patientMrn, transcriptId }).then(r => r.data),
  analyzeDischargeReadiness: (patient: Patient) => 
    api.post<DischargeReadinessAnalysis>('/ai/discharge-readiness', { patient }).then(r => r.data),
  analyzeReadmission: async (decisionId: string) => {
    // Simulate AI readmission analysis - in production this would call the backend
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Use deterministic hash based on decisionId for consistent results
    const hash = decisionId.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0)
    const seededValue = (seed: number, index: number) => ((hash * (seed + 1) * (index + 1) * 9301 + 49297) % 233280) / 233280
    
    const rootCauses = ['new_ailment', 'existing_worsened', 'care_gap', 'social_factors'] as const
    const rootCauseIndex = Math.floor(seededValue(1, 0) * rootCauses.length)
    const rootCause = rootCauses[rootCauseIndex]
    
    const allContributingFactors = [
      'Caregiver availability limited to weekends only',
      'No medical background in family support network',
      'Transportation barriers to follow-up appointments',
      'Medication complexity (8+ daily medications)'
    ]
    const factorCount = Math.floor(seededValue(2, 0) * 3) + 2
    
    const allPreventionInsights = [
      'Earlier identification of caregiver limitations could have triggered home health referral',
      'Medication teach-back was incomplete - patient demonstrated confusion',
      'Social work consult was not ordered despite risk factors'
    ]
    const insightCount = Math.floor(seededValue(3, 0) * 2) + 1
    
    return {
      rootCause,
      rootCauseDescription: rootCause === 'new_ailment' ? 'Patient developed new condition (UTI) post-discharge' :
        rootCause === 'existing_worsened' ? 'Primary condition (CHF) exacerbated due to medication non-adherence' :
        rootCause === 'care_gap' ? 'Gap in care coordination - follow-up appointment missed' :
        'Social factors - caregiver unavailable during critical recovery period',
      contributingFactors: allContributingFactors.slice(0, factorCount),
      preventionInsights: allPreventionInsights.slice(0, insightCount),
      suggestedPattern: seededValue(4, 0) > 0.5 ? {
        title: 'Weekend-Only Caregiver Risk',
        criteria: ['caregiver_availability = weekends_only', 'medication_count >= 5'],
        expectedLift: -0.18
      } : null
    }
  }
}

export default api
