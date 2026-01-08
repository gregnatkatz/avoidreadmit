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

export const patternsApi = {
  getPatterns: () => api.get('/patterns').then(r => r.data),
  getPattern: (id: string) => api.get(`/patterns/${id}`).then(r => r.data)
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
    const rootCauses = ['new_ailment', 'existing_worsened', 'care_gap', 'social_factors'] as const
    const rootCause = rootCauses[Math.floor(Math.random() * rootCauses.length)]
    return {
      rootCause,
      rootCauseDescription: rootCause === 'new_ailment' ? 'Patient developed new condition (UTI) post-discharge' :
        rootCause === 'existing_worsened' ? 'Primary condition (CHF) exacerbated due to medication non-adherence' :
        rootCause === 'care_gap' ? 'Gap in care coordination - follow-up appointment missed' :
        'Social factors - caregiver unavailable during critical recovery period',
      contributingFactors: [
        'Caregiver availability limited to weekends only',
        'No medical background in family support network',
        'Transportation barriers to follow-up appointments',
        'Medication complexity (8+ daily medications)'
      ].slice(0, Math.floor(Math.random() * 3) + 2),
      preventionInsights: [
        'Earlier identification of caregiver limitations could have triggered home health referral',
        'Medication teach-back was incomplete - patient demonstrated confusion',
        'Social work consult was not ordered despite risk factors'
      ].slice(0, Math.floor(Math.random() * 2) + 1),
      suggestedPattern: Math.random() > 0.5 ? {
        title: 'Weekend-Only Caregiver Risk',
        criteria: ['caregiver_availability = weekends_only', 'medication_count >= 5'],
        expectedLift: -0.18
      } : null
    }
  }
}

export default api
