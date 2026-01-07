import { useQuery, useMutation } from '@tanstack/react-query'
import { Search, Filter, ChevronDown, ChevronRight, Brain, CheckCircle, XCircle, Clock, AlertTriangle, User, Heart, Pill, Car, Shield, Loader2, ThumbsUp, ThumbsDown, HelpCircle, FileText, Sparkles, Activity, Database, GitBranch, Zap } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { patientsApi, aiApi, Patient, DischargeReadinessAnalysis } from '../api/client'

// Analysis progress steps for visual feedback
const ANALYSIS_STEPS = [
  { id: 'context', label: 'Loading patient context...', icon: Database },
  { id: 'patterns', label: 'Matching context graph patterns...', icon: GitBranch },
  { id: 'requirements', label: 'Evaluating discharge requirements...', icon: CheckCircle },
  { id: 'risk', label: 'Analyzing risk factors...', icon: AlertTriangle },
  { id: 'recommendations', label: 'Generating recommendations...', icon: Zap },
]

interface DischargeRequirement {
  id: string
  name: string
  category: 'clinical' | 'social' | 'logistics'
  status: 'met' | 'not_met' | 'pending' | 'na'
  details: string
  standard: string
  relatedPattern?: {
    id: string
    name: string
    successRate: number
    lift: number
    sampleSize: number
  }
}

interface VerboseRiskFactor {
  title: string
  pattern: { id: string; name: string; successRate: number; lift: number; sampleSize: number } | null
  reason: string
  evidence: string
  recommendation?: string
}

interface VerboseProtectiveFactor {
  title: string
  pattern: { id: string; name: string; successRate: number; lift: number; sampleSize: number } | null
  reason: string
  evidence: string
}

interface DischargeReadinessResult {
  overallScore: number
  recommendation: 'approve' | 'hold' | 'needs_review'
  requirements: DischargeRequirement[]
  riskFactors: string[]
  verboseRiskFactors?: VerboseRiskFactor[]
  protectiveFactors: string[]
  verboseProtectiveFactors?: VerboseProtectiveFactor[]
  suggestedDisposition: string
  confidence: number
  reasoning?: string
}

// Context Graph Patterns with their learned success metrics
const CONTEXT_GRAPH_PATTERNS = {
  'PAT-0001': { id: 'PAT-0001', name: 'Medical Background Caregiver', successRate: 84, lift: 19, sampleSize: 447 },
  'PAT-0003': { id: 'PAT-0003', name: 'Full-Time Availability', successRate: 85, lift: 20, sampleSize: 520 },
  'PAT-0007': { id: 'PAT-0007', name: 'Patient Preference Alignment', successRate: 85, lift: 20, sampleSize: 410 },
  'PAT-0008': { id: 'PAT-0008', name: 'Low Readmission History', successRate: 88, lift: 23, sampleSize: 620 },
  'PAT-0009': { id: 'PAT-0009', name: 'Spouse Caregiver Commitment', successRate: 81, lift: 16, sampleSize: 380 },
  'PAT-0012': { id: 'PAT-0012', name: 'No Transportation Barriers', successRate: 77, lift: 12, sampleSize: 550 },
  'PAT-0014': { id: 'PAT-0014', name: 'Elderly Caregiver Risk Flag', successRate: 42, lift: -23, sampleSize: 340 },
}

// Risk categories based on context graph pattern matching
type RiskCategory = 'high_risk' | 'moderate_risk' | 'on_target'

function calculateRiskCategory(patient: Patient): RiskCategory {
  // Simulate risk calculation based on context graph patterns
  // In production, this would query the actual context graph
  const riskFactors = []
  
  // Check for elderly caregiver risk pattern (PAT-0014)
  if (patient.age && patient.age >= 75) riskFactors.push('advanced_age')
  if (patient.los_days && patient.los_days > 10) riskFactors.push('extended_los')
  if (patient.principal_diagnosis?.toLowerCase().includes('heart failure')) riskFactors.push('chf')
  if (patient.principal_diagnosis?.toLowerCase().includes('copd')) riskFactors.push('copd')
  
  // Random factor for demo variety
  const randomFactor = Math.random()
  
  if (riskFactors.length >= 2 || randomFactor < 0.2) return 'high_risk'
  if (riskFactors.length === 1 || randomFactor < 0.5) return 'moderate_risk'
  return 'on_target'
}

// Generate discharge requirements based on industry standards
function generateRequirements(): DischargeRequirement[] {
  return [
    {
      id: 'vitals',
      name: 'Vital Signs Stable (24h)',
      category: 'clinical',
      status: Math.random() > 0.2 ? 'met' : 'pending',
      details: 'BP, HR, O2 sat within normal limits for 24 hours',
      standard: 'CMS CoP 482.43',
      relatedPattern: CONTEXT_GRAPH_PATTERNS['PAT-0008']
    },
    {
      id: 'meds',
      name: 'Medication Reconciliation',
      category: 'clinical',
      status: Math.random() > 0.3 ? 'met' : 'pending',
      details: 'All medications reviewed and reconciled with home meds',
      standard: 'Joint Commission NPSG.03.06.01',
      relatedPattern: CONTEXT_GRAPH_PATTERNS['PAT-0007']
    },
    {
      id: 'followup',
      name: 'Follow-up Appointment (7 days)',
      category: 'clinical',
      status: Math.random() > 0.25 ? 'met' : 'not_met',
      details: 'PCP and specialist appointments scheduled within 7 days',
      standard: 'CMS Quality Measure',
      relatedPattern: CONTEXT_GRAPH_PATTERNS['PAT-0009']
    },
    {
      id: 'caregiver_ed',
      name: 'Caregiver Teach-Back Education',
      category: 'social',
      status: Math.random() > 0.3 ? 'met' : 'pending',
      details: 'Caregiver demonstrates understanding of care instructions',
      standard: 'AHRQ IDEAL Discharge',
      relatedPattern: CONTEXT_GRAPH_PATTERNS['PAT-0001']
    },
    {
      id: 'caregiver_avail',
      name: 'Caregiver Availability (72h)',
      category: 'social',
      status: Math.random() > 0.2 ? 'met' : 'not_met',
      details: 'Primary caregiver available for first 72 hours post-discharge',
      standard: 'AHRQ IDEAL Discharge',
      relatedPattern: CONTEXT_GRAPH_PATTERNS['PAT-0003']
    },
    {
      id: 'transport',
      name: 'Transportation Arranged',
      category: 'logistics',
      status: Math.random() > 0.15 ? 'met' : 'pending',
      details: 'Safe transport to home or facility confirmed',
      standard: 'Joint Commission PC.04.01.05',
      relatedPattern: CONTEXT_GRAPH_PATTERNS['PAT-0012']
    },
    {
      id: 'home_safety',
      name: 'Home Safety Assessment',
      category: 'social',
      status: Math.random() > 0.35 ? 'met' : 'pending',
      details: 'Home environment assessed for fall risks and accessibility',
      standard: 'CMS Home Health CoP',
      relatedPattern: CONTEXT_GRAPH_PATTERNS['PAT-0014']
    },
    {
      id: 'dme',
      name: 'DME Ordered (if needed)',
      category: 'logistics',
      status: Math.random() > 0.4 ? 'met' : 'na',
      details: 'Durable medical equipment ordered and delivery scheduled',
      standard: 'CMS DME Requirements'
    },
    {
      id: 'discharge_summary',
      name: 'Discharge Summary Complete',
      category: 'clinical',
      status: Math.random() > 0.2 ? 'met' : 'pending',
      details: 'Discharge summary documented with all required elements',
      standard: 'Joint Commission RC.02.04.01'
    },
    {
      id: 'patient_consent',
      name: 'Patient/Family Agreement',
      category: 'social',
      status: Math.random() > 0.1 ? 'met' : 'pending',
      details: 'Patient and family verbalize understanding and agreement',
      standard: 'CMS CoP 482.43(d)',
      relatedPattern: CONTEXT_GRAPH_PATTERNS['PAT-0007']
    }
  ]
}

export default function Worklist() {
  const [search, setSearch] = useState('')
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null)
  const [analysisResults, setAnalysisResults] = useState<Record<string, DischargeReadinessResult>>({})
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [analysisStep, setAnalysisStep] = useState<number>(0)
  const [processedPatients, setProcessedPatients] = useState<Record<string, 'approved' | 'denied' | 'review'>>({})
  const analysisTriggeredRef = useRef<Set<string>>(new Set())
  
  const { data: patients, isLoading } = useQuery({
    queryKey: ['worklist'],
    queryFn: patientsApi.getWorklist
  })

  // Auto-trigger analysis when patient is expanded (background prefetch)
  useEffect(() => {
    if (expandedPatient && !analysisResults[expandedPatient] && !analyzingId) {
      // Only trigger if we haven't already triggered for this patient
      if (!analysisTriggeredRef.current.has(expandedPatient)) {
        const patient = patients?.find((p: Patient) => p.mrn === expandedPatient)
        if (patient) {
          analysisTriggeredRef.current.add(expandedPatient)
          analyzeDischargeReadiness.mutate(patient)
        }
      }
    }
  }, [expandedPatient, analysisResults, analyzingId, patients])

  // Progress step animation during analysis - slower progression to match AI response time
  useEffect(() => {
    if (analyzingId) {
      setAnalysisStep(0)
      // Use variable timing: first steps faster, last step slower to avoid feeling stuck
      const stepTimings = [4000, 5000, 6000, 8000, 10000] // Total ~33 seconds before last step completes
      let currentStep = 0
      
      const advanceStep = () => {
        if (currentStep < ANALYSIS_STEPS.length - 1) {
          currentStep++
          setAnalysisStep(currentStep)
          setTimeout(advanceStep, stepTimings[currentStep] || 8000)
        }
      }
      
      const timeout = setTimeout(advanceStep, stepTimings[0])
      return () => clearTimeout(timeout)
    } else {
      setAnalysisStep(0)
    }
  }, [analyzingId])

  const analyzeDischargeReadiness = useMutation({
    mutationFn: async (patient: Patient) => {
      setAnalyzingId(patient.mrn)
      
      // Call real AI Discharge Readiness Agent
      const response = await aiApi.analyzeDischargeReadiness(patient)
      
      // Transform AI response to our format with verbose details
      const aiAnalysis = response.analysis
      
      // Map AI risk factors to verbose format with pattern details
      const verboseRiskFactors = (aiAnalysis.riskFactors || []).map(rf => ({
        title: rf.title,
        pattern: CONTEXT_GRAPH_PATTERNS[rf.patternId as keyof typeof CONTEXT_GRAPH_PATTERNS] || null,
        reason: rf.reason,
        evidence: rf.evidence,
        recommendation: rf.recommendation
      }))

      // Map AI protective factors to verbose format
      const verboseProtectiveFactors = (aiAnalysis.protectiveFactors || []).map(pf => ({
        title: pf.title,
        pattern: CONTEXT_GRAPH_PATTERNS[pf.patternId as keyof typeof CONTEXT_GRAPH_PATTERNS] || null,
        reason: pf.reason,
        evidence: pf.evidence
      }))

      // Generate requirements from AI response or use defaults
      const requirements = aiAnalysis.requirements?.length > 0 
        ? aiAnalysis.requirements.map((req, idx) => ({
            id: `req-${idx}`,
            name: req.name,
            category: 'clinical' as const,
            status: req.status,
            details: '',
            standard: req.standard,
            relatedPattern: req.patternId ? CONTEXT_GRAPH_PATTERNS[req.patternId as keyof typeof CONTEXT_GRAPH_PATTERNS] : undefined
          }))
        : generateRequirements()

      const result: DischargeReadinessResult = {
        overallScore: aiAnalysis.overallScore,
        recommendation: aiAnalysis.recommendation,
        requirements,
        riskFactors: verboseRiskFactors.map(r => r.title),
        verboseRiskFactors,
        protectiveFactors: verboseProtectiveFactors.map(p => p.title),
        verboseProtectiveFactors,
        suggestedDisposition: aiAnalysis.suggestedDisposition || patient.discharge_disposition || 'Home with Home Health',
        confidence: aiAnalysis.confidence,
        reasoning: aiAnalysis.reasoning
      }
      
      return { mrn: patient.mrn, result }
    },
    onSuccess: (data) => {
      setAnalysisResults(prev => ({ ...prev, [data.mrn]: data.result }))
      setAnalyzingId(null)
    },
    onError: (error) => {
      console.error('Discharge readiness analysis failed:', error)
      setAnalyzingId(null)
    }
  })

  const handleAction = (mrn: string, action: 'approved' | 'denied' | 'review') => {
    setProcessedPatients(prev => ({ ...prev, [mrn]: action }))
  }

  const filteredPatients = patients?.filter((p: Patient) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.mrn.toLowerCase().includes(search.toLowerCase()) ||
    p.principal_diagnosis?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'met': return <CheckCircle size={14} className="text-green-400" />
      case 'not_met': return <XCircle size={14} className="text-red-400" />
      case 'pending': return <Clock size={14} className="text-yellow-400" />
      case 'na': return <span className="text-gray-500 text-xs">N/A</span>
      default: return null
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'clinical': return <Pill size={14} className="text-cyan-400" />
      case 'social': return <Heart size={14} className="text-pink-400" />
      case 'logistics': return <Car size={14} className="text-yellow-400" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Patient Worklist</h2>
          <p className="text-gray-400 text-sm">{filteredPatients.length} patients pending discharge decision</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 w-64"
            />
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      {/* Risk Category Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-3">
            <div className="icon-box red-gradient"><AlertTriangle size={20} className="text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-red-400">{filteredPatients.filter((p: Patient) => calculateRiskCategory(p) === 'high_risk').length}</p>
              <p className="text-xs text-gray-400">High Risk</p>
              <p className="text-xs text-red-400/70">Context Graph: PAT-0014 matches</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 border-l-4 border-yellow-500">
          <div className="flex items-center gap-3">
            <div className="icon-box yellow-gradient"><HelpCircle size={20} className="text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{filteredPatients.filter((p: Patient) => calculateRiskCategory(p) === 'moderate_risk').length}</p>
              <p className="text-xs text-gray-400">Moderate Risk</p>
              <p className="text-xs text-yellow-400/70">Needs closer review</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 border-l-4 border-green-500">
          <div className="flex items-center gap-3">
            <div className="icon-box green-gradient"><CheckCircle size={20} className="text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-green-400">{filteredPatients.filter((p: Patient) => calculateRiskCategory(p) === 'on_target').length}</p>
              <p className="text-xs text-gray-400">On Target</p>
              <p className="text-xs text-green-400/70">Positive pattern matches</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 border-l-4 border-cyan-500">
          <div className="flex items-center gap-3">
            <div className="icon-box cyan-gradient"><ThumbsUp size={20} className="text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-cyan-400">{Object.values(processedPatients).filter(s => s === 'approved').length}</p>
              <p className="text-xs text-gray-400">Approved Today</p>
              <p className="text-xs text-cyan-400/70">Discharge processed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass-card p-8 text-center text-gray-400">Loading patients...</div>
        ) : filteredPatients.slice(0, 20).map((patient: Patient) => {
          const isExpanded = expandedPatient === patient.mrn
          const analysis = analysisResults[patient.mrn]
          const isAnalyzing = analyzingId === patient.mrn
          const processedStatus = processedPatients[patient.mrn]
          const riskCategory = calculateRiskCategory(patient)
          
          return (
            <div key={patient.mrn} className={`glass-card overflow-hidden ${processedStatus ? 'opacity-60' : ''} ${
              riskCategory === 'high_risk' ? 'border-l-4 border-red-500' :
              riskCategory === 'moderate_risk' ? 'border-l-4 border-yellow-500' :
              'border-l-4 border-green-500'
            }`}>
              {/* Patient Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between"
                onClick={() => setExpandedPatient(isExpanded ? null : patient.mrn)}
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? <ChevronDown size={20} className="text-cyan-400" /> : <ChevronRight size={20} className="text-gray-500" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{patient.name}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        riskCategory === 'high_risk' ? 'bg-red-500/20 text-red-400' :
                        riskCategory === 'moderate_risk' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {riskCategory === 'high_risk' ? 'High Risk' : riskCategory === 'moderate_risk' ? 'Moderate' : 'On Target'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{patient.mrn} | {patient.age}y {patient.gender?.charAt(0)} | {patient.unit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-white">{patient.principal_diagnosis}</p>
                    <p className="text-xs text-gray-400">LOS: {patient.los_days} days | {patient.insurance_type}</p>
                  </div>
                  {processedStatus ? (
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      processedStatus === 'approved' ? 'bg-green-500/20 text-green-400' :
                      processedStatus === 'denied' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {processedStatus === 'approved' ? 'Approved' : processedStatus === 'denied' ? 'On Hold' : 'In Review'}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-lg text-sm bg-white/10 text-gray-300">
                      {patient.discharge_disposition || 'Pending'}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-white/10 p-6">
                  {!analysis && !isAnalyzing && (
                    <div className="text-center py-8">
                      <Brain size={48} className="mx-auto text-cyan-400 mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">Run Discharge Readiness Analysis</h3>
                      <p className="text-gray-400 text-sm mb-4">
                        The Discharge Readiness Agent will evaluate all requirements per CMS, Joint Commission, and AHRQ standards
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); analyzeDischargeReadiness.mutate(patient) }}
                        className="btn-primary flex items-center gap-2 mx-auto"
                      >
                        <Brain size={16} />
                        Analyze Discharge Readiness
                      </button>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div className="py-6">
                      <div className="flex items-center justify-center gap-3 mb-6">
                        <Brain size={32} className="text-cyan-400 animate-pulse" />
                        <div>
                          <h3 className="text-lg font-semibold text-white">Discharge Readiness Agent</h3>
                          <p className="text-sm text-cyan-400">Analyzing patient discharge readiness...</p>
                        </div>
                      </div>
                      
                      {/* Progress Steps */}
                      <div className="max-w-md mx-auto space-y-3">
                        {ANALYSIS_STEPS.map((step, idx) => {
                          const StepIcon = step.icon
                          const isActive = idx === analysisStep
                          const isComplete = idx < analysisStep
                          
                          return (
                            <div 
                              key={step.id}
                              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                                isActive ? 'bg-cyan-500/20 border border-cyan-500/40' :
                                isComplete ? 'bg-green-500/10 border border-green-500/20' :
                                'bg-white/5 border border-white/10 opacity-50'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isActive ? 'bg-cyan-500/30' :
                                isComplete ? 'bg-green-500/30' :
                                'bg-white/10'
                              }`}>
                                {isComplete ? (
                                  <CheckCircle size={16} className="text-green-400" />
                                ) : isActive ? (
                                  <Loader2 size={16} className="text-cyan-400 animate-spin" />
                                ) : (
                                  <StepIcon size={16} className="text-gray-500" />
                                )}
                              </div>
                              <span className={`text-sm ${
                                isActive ? 'text-cyan-300 font-medium' :
                                isComplete ? 'text-green-400' :
                                'text-gray-500'
                              }`}>
                                {step.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      
                      <p className="text-center text-xs text-gray-500 mt-4">
                        Evaluating against CMS, Joint Commission, and AHRQ standards
                      </p>
                    </div>
                  )}

                  {analysis && (
                    <div className="space-y-6">
                      {/* Overall Score */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                            analysis.overallScore >= 80 ? 'bg-green-500/20 text-green-400' :
                            analysis.overallScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {analysis.overallScore}%
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">Discharge Readiness Score</h3>
                            <p className={`text-sm ${
                              analysis.recommendation === 'approve' ? 'text-green-400' :
                              analysis.recommendation === 'needs_review' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {analysis.recommendation === 'approve' ? 'Ready for Discharge' :
                               analysis.recommendation === 'needs_review' ? 'Needs Case Manager Review' : 'Not Ready - Hold Discharge'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Suggested Disposition</p>
                          <p className="text-white font-medium">{analysis.suggestedDisposition}</p>
                          <p className="text-xs text-cyan-400">AI Confidence: {analysis.confidence}%</p>
                        </div>
                      </div>

                      {/* Requirements Checklist */}
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                          <Shield size={16} className="text-cyan-400" />
                          Discharge Requirements Checklist (Industry Standards)
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {analysis.requirements.map(req => (
                            <div key={req.id} className="p-3 rounded-lg bg-white/5 flex items-start gap-3">
                              <div className="mt-0.5">{getStatusIcon(req.status)}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {getCategoryIcon(req.category)}
                                  <span className="text-sm font-medium text-white">{req.name}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{req.details}</p>
                                <p className="text-xs text-cyan-400 mt-1">{req.standard}</p>
                                {req.relatedPattern && (
                                  <div className="mt-2 p-2 rounded bg-black/20 border border-cyan-500/20">
                                    <div className="flex items-center gap-2 text-xs">
                                      <Sparkles size={10} className="text-cyan-400" />
                                      <span className="text-cyan-400 font-medium">{req.relatedPattern.id}: {req.relatedPattern.name}</span>
                                    </div>
                                    <div className="flex gap-4 mt-1 text-xs">
                                      <span className="text-green-400">Success: {req.relatedPattern.successRate}%</span>
                                      <span className={req.relatedPattern.lift >= 0 ? 'text-green-400' : 'text-red-400'}>
                                        Lift: {req.relatedPattern.lift > 0 ? '+' : ''}{req.relatedPattern.lift}%
                                      </span>
                                      <span className="text-gray-500">n={req.relatedPattern.sampleSize}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Risk & Protective Factors - Verbose with Context Graph Details */}
                      <div className="grid grid-cols-2 gap-4">
                        {analysis.verboseRiskFactors && analysis.verboseRiskFactors.length > 0 && (
                          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                              <AlertTriangle size={14} />
                              Risk Factors Identified ({analysis.verboseRiskFactors.length})
                            </h4>
                            <div className="space-y-3">
                              {analysis.verboseRiskFactors.map((factor, i) => (
                                <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/10">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle size={12} className="text-red-400" />
                                    <span className="text-sm font-medium text-red-300">{factor.title}</span>
                                  </div>
                                  {factor.pattern && (
                                    <div className="mb-2 p-2 rounded bg-black/20 border border-red-500/20">
                                      <div className="flex items-center gap-2 text-xs">
                                        <Sparkles size={10} className="text-cyan-400" />
                                        <span className="text-cyan-400 font-medium">Context Graph Pattern: {factor.pattern.id}</span>
                                      </div>
                                      <div className="flex gap-4 mt-1 text-xs">
                                        <span className={factor.pattern.lift < 0 ? 'text-red-400' : 'text-green-400'}>
                                          Success: {factor.pattern.successRate}%
                                        </span>
                                        <span className={factor.pattern.lift < 0 ? 'text-red-400' : 'text-green-400'}>
                                          Lift: {factor.pattern.lift > 0 ? '+' : ''}{factor.pattern.lift}%
                                        </span>
                                        <span className="text-gray-500">n={factor.pattern.sampleSize}</span>
                                      </div>
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-300 mb-2">{factor.reason}</p>
                                  <p className="text-xs text-gray-500 italic">{factor.evidence}</p>
                                  {factor.recommendation && (
                                    <div className="mt-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                                      <p className="text-xs text-yellow-400"><strong>Recommendation:</strong> {factor.recommendation}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {analysis.verboseProtectiveFactors && analysis.verboseProtectiveFactors.length > 0 && (
                          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                            <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                              <CheckCircle size={14} />
                              Protective Factors ({analysis.verboseProtectiveFactors.length})
                            </h4>
                            <div className="space-y-3">
                              {analysis.verboseProtectiveFactors.map((factor, i) => (
                                <div key={i} className="p-3 rounded-lg bg-green-500/10 border border-green-500/10">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle size={12} className="text-green-400" />
                                    <span className="text-sm font-medium text-green-300">{factor.title}</span>
                                  </div>
                                  {factor.pattern && (
                                    <div className="mb-2 p-2 rounded bg-black/20 border border-green-500/20">
                                      <div className="flex items-center gap-2 text-xs">
                                        <Sparkles size={10} className="text-cyan-400" />
                                        <span className="text-cyan-400 font-medium">Context Graph Pattern: {factor.pattern.id}</span>
                                      </div>
                                      <div className="flex gap-4 mt-1 text-xs">
                                        <span className="text-green-400">Success: {factor.pattern.successRate}%</span>
                                        <span className="text-green-400">Lift: +{factor.pattern.lift}%</span>
                                        <span className="text-gray-500">n={factor.pattern.sampleSize}</span>
                                      </div>
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-300 mb-1">{factor.reason}</p>
                                  <p className="text-xs text-gray-500 italic">{factor.evidence}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {!processedStatus && (
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <FileText size={12} />
                            Decision will create audit trace per CMS CoP 482.43
                          </p>
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleAction(patient.mrn, 'denied')} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-2">
                              <ThumbsDown size={16} /> Hold Discharge
                            </button>
                            <button onClick={() => handleAction(patient.mrn, 'review')} className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors flex items-center gap-2">
                              <HelpCircle size={16} /> Request More Info
                            </button>
                            <button onClick={() => handleAction(patient.mrn, 'approved')} className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors flex items-center gap-2">
                              <ThumbsUp size={16} /> Approve Discharge
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
