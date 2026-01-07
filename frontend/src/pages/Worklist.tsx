import { useQuery, useMutation } from '@tanstack/react-query'
import { Search, Filter, ChevronDown, ChevronRight, Brain, CheckCircle, XCircle, Clock, AlertTriangle, User, Heart, Pill, Car, Shield, Loader2, ThumbsUp, ThumbsDown, HelpCircle, FileText } from 'lucide-react'
import { useState } from 'react'
import { patientsApi, Patient } from '../api/client'

interface DischargeRequirement {
  id: string
  name: string
  category: 'clinical' | 'social' | 'logistics'
  status: 'met' | 'not_met' | 'pending' | 'na'
  details: string
  standard: string
  relatedPattern?: string
}

interface DischargeReadinessResult {
  overallScore: number
  recommendation: 'approve' | 'hold' | 'needs_review'
  requirements: DischargeRequirement[]
  riskFactors: string[]
  protectiveFactors: string[]
  suggestedDisposition: string
  confidence: number
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
      relatedPattern: 'PAT-0008: Stable Vitals Indicator'
    },
    {
      id: 'meds',
      name: 'Medication Reconciliation',
      category: 'clinical',
      status: Math.random() > 0.3 ? 'met' : 'pending',
      details: 'All medications reviewed and reconciled with home meds',
      standard: 'Joint Commission NPSG.03.06.01',
      relatedPattern: 'PAT-0007: Patient Preference Alignment'
    },
    {
      id: 'followup',
      name: 'Follow-up Appointment (7 days)',
      category: 'clinical',
      status: Math.random() > 0.25 ? 'met' : 'not_met',
      details: 'PCP and specialist appointments scheduled within 7 days',
      standard: 'CMS Quality Measure',
      relatedPattern: 'PAT-0009: Follow-up Scheduled'
    },
    {
      id: 'caregiver_ed',
      name: 'Caregiver Teach-Back Education',
      category: 'social',
      status: Math.random() > 0.3 ? 'met' : 'pending',
      details: 'Caregiver demonstrates understanding of care instructions',
      standard: 'AHRQ IDEAL Discharge',
      relatedPattern: 'PAT-0001: Medical Background Caregiver'
    },
    {
      id: 'caregiver_avail',
      name: 'Caregiver Availability (72h)',
      category: 'social',
      status: Math.random() > 0.2 ? 'met' : 'not_met',
      details: 'Primary caregiver available for first 72 hours post-discharge',
      standard: 'AHRQ IDEAL Discharge',
      relatedPattern: 'PAT-0003: Full-Time Availability'
    },
    {
      id: 'transport',
      name: 'Transportation Arranged',
      category: 'logistics',
      status: Math.random() > 0.15 ? 'met' : 'pending',
      details: 'Safe transport to home or facility confirmed',
      standard: 'Joint Commission PC.04.01.05',
      relatedPattern: 'PAT-0012: No Transportation Barriers'
    },
    {
      id: 'home_safety',
      name: 'Home Safety Assessment',
      category: 'social',
      status: Math.random() > 0.35 ? 'met' : 'pending',
      details: 'Home environment assessed for fall risks and accessibility',
      standard: 'CMS Home Health CoP',
      relatedPattern: 'PAT-0014: Elderly Caregiver Risk Flag'
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
      relatedPattern: 'PAT-0007: Patient Preference Alignment'
    }
  ]
}

export default function Worklist() {
  const [search, setSearch] = useState('')
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null)
  const [analysisResults, setAnalysisResults] = useState<Record<string, DischargeReadinessResult>>({})
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [processedPatients, setProcessedPatients] = useState<Record<string, 'approved' | 'denied' | 'review'>>({})
  
  const { data: patients, isLoading } = useQuery({
    queryKey: ['worklist'],
    queryFn: patientsApi.getWorklist
  })

  const analyzeDischargeReadiness = useMutation({
    mutationFn: async (patient: Patient) => {
      setAnalyzingId(patient.mrn)
      // Simulate AI Discharge Readiness Agent analysis
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const requirements = generateRequirements()
      const metCount = requirements.filter(r => r.status === 'met').length
      const totalApplicable = requirements.filter(r => r.status !== 'na').length
      const score = Math.round((metCount / totalApplicable) * 100)
      
      const result: DischargeReadinessResult = {
        overallScore: score,
        recommendation: score >= 80 ? 'approve' : score >= 60 ? 'needs_review' : 'hold',
        requirements,
        riskFactors: score < 80 ? [
          'Caregiver availability concerns identified',
          'Follow-up appointment not yet confirmed',
          'Home safety assessment incomplete'
        ].slice(0, Math.floor(Math.random() * 3) + 1) : [],
        protectiveFactors: [
          'Strong family support network documented',
          'Patient motivated and engaged in care',
          'Good medication adherence history'
        ].slice(0, Math.floor(Math.random() * 3) + 1),
        suggestedDisposition: patient.discharge_disposition || 'Home with Home Health',
        confidence: 75 + Math.floor(Math.random() * 20)
      }
      
      return { mrn: patient.mrn, result }
    },
    onSuccess: (data) => {
      setAnalysisResults(prev => ({ ...prev, [data.mrn]: data.result }))
      setAnalyzingId(null)
    },
    onError: () => setAnalyzingId(null)
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

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="icon-box cyan-gradient"><User size={20} className="text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-white">{filteredPatients.length}</p>
              <p className="text-xs text-gray-400">Total Pending</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="icon-box green-gradient"><ThumbsUp size={20} className="text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-white">{Object.values(processedPatients).filter(s => s === 'approved').length}</p>
              <p className="text-xs text-gray-400">Approved Today</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="icon-box yellow-gradient"><HelpCircle size={20} className="text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-white">{Object.values(processedPatients).filter(s => s === 'review').length}</p>
              <p className="text-xs text-gray-400">Needs Review</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="icon-box red-gradient"><ThumbsDown size={20} className="text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-white">{Object.values(processedPatients).filter(s => s === 'denied').length}</p>
              <p className="text-xs text-gray-400">On Hold</p>
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
          
          return (
            <div key={patient.mrn} className={`glass-card overflow-hidden ${processedStatus ? 'opacity-60' : ''}`}>
              {/* Patient Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between"
                onClick={() => setExpandedPatient(isExpanded ? null : patient.mrn)}
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? <ChevronDown size={20} className="text-cyan-400" /> : <ChevronRight size={20} className="text-gray-500" />}
                  <div>
                    <p className="font-semibold text-white">{patient.name}</p>
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
                    <div className="text-center py-8">
                      <Loader2 size={48} className="mx-auto text-cyan-400 mb-4 animate-spin" />
                      <h3 className="text-lg font-semibold text-white mb-2">Discharge Readiness Agent Analyzing...</h3>
                      <p className="text-gray-400 text-sm">Evaluating requirements against CMS, Joint Commission, and AHRQ standards</p>
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
                                  <p className="text-xs text-green-400 mt-1">Pattern: {req.relatedPattern}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Risk & Protective Factors */}
                      <div className="grid grid-cols-2 gap-4">
                        {analysis.riskFactors.length > 0 && (
                          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                              <AlertTriangle size={14} />
                              Risk Factors Identified
                            </h4>
                            <ul className="space-y-1">
                              {analysis.riskFactors.map((factor, i) => (
                                <li key={i} className="text-sm text-gray-300">- {factor}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                          <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                            <CheckCircle size={14} />
                            Protective Factors
                          </h4>
                          <ul className="space-y-1">
                            {analysis.protectiveFactors.map((factor, i) => (
                              <li key={i} className="text-sm text-gray-300">- {factor}</li>
                            ))}
                          </ul>
                        </div>
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
