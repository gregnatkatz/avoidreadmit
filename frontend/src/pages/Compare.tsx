import { useQuery } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { CheckCircle, XCircle, User, Heart, Home, Clock, Search, GitBranch, Sparkles, AlertTriangle, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react'
import { patientsApi, Patient } from '../api/client'

// Simulated historical cases with outcomes - in production this would come from the database
const HISTORICAL_CASES = [
  {
    id: 'HIST-001',
    name: 'James Thompson',
    age: 78,
    diagnosis: 'Heart failure, unspecified',
    los: 6,
    disposition: 'Home with Home Health',
    outcome: 'success' as const,
    readmitted: false,
    readmitDays: 0,
    patterns: ['PAT-0001', 'PAT-0003', 'PAT-0007'],
    keyFactors: {
      caregiver: 'Spouse (retired nurse)',
      proximity: '10 minutes',
      availability: 'Full-time',
      medicalBackground: true
    },
    successRate: 88
  },
  {
    id: 'HIST-002',
    name: 'Dorothy Mitchell',
    age: 82,
    diagnosis: 'COPD with acute exacerbation',
    los: 8,
    disposition: 'Home with Home Health',
    outcome: 'readmitted' as const,
    readmitted: true,
    readmitDays: 12,
    patterns: ['PAT-0014', 'PAT-0012'],
    keyFactors: {
      caregiver: 'Son (works full-time)',
      proximity: '45 minutes',
      availability: 'Weekends only',
      medicalBackground: false
    },
    successRate: 35
  },
  {
    id: 'HIST-003',
    name: 'Robert Anderson',
    age: 75,
    diagnosis: 'Pneumonia, unspecified',
    los: 7,
    disposition: 'SNF',
    outcome: 'success' as const,
    readmitted: false,
    readmitDays: 0,
    patterns: ['PAT-0008', 'PAT-0009'],
    keyFactors: {
      caregiver: 'Professional facility care',
      proximity: 'N/A',
      availability: '24/7',
      medicalBackground: true
    },
    successRate: 92
  },
  {
    id: 'HIST-004',
    name: 'Margaret Wilson',
    age: 80,
    diagnosis: 'Heart failure, unspecified',
    los: 5,
    disposition: 'Home',
    outcome: 'readmitted' as const,
    readmitted: true,
    readmitDays: 8,
    patterns: ['PAT-0014', 'PAT-0003'],
    keyFactors: {
      caregiver: 'Elderly spouse (85)',
      proximity: 'Same home',
      availability: 'Full-time but limited capacity',
      medicalBackground: false
    },
    successRate: 42
  },
  {
    id: 'HIST-005',
    name: 'William Davis',
    age: 72,
    diagnosis: 'Acute myocardial infarction',
    los: 6,
    disposition: 'Rehab',
    outcome: 'success' as const,
    readmitted: false,
    readmitDays: 0,
    patterns: ['PAT-0007', 'PAT-0009', 'PAT-0001'],
    keyFactors: {
      caregiver: 'Daughter (nurse practitioner)',
      proximity: '5 minutes',
      availability: 'Flexible schedule',
      medicalBackground: true
    },
    successRate: 94
  }
]

// Function to find similar historical cases based on patient characteristics
function findSimilarCases(patient: Patient | null) {
  if (!patient) return []
  
  // Score each historical case based on similarity
  const scoredCases = HISTORICAL_CASES.map(histCase => {
    let similarityScore = 0
    const matchReasons: string[] = []
    
    // Age similarity (within 10 years)
    if (Math.abs((patient.age || 0) - histCase.age) <= 10) {
      similarityScore += 25
      matchReasons.push('Similar age group')
    }
    
    // Diagnosis similarity
    if (patient.principal_diagnosis?.toLowerCase().includes('heart failure') && 
        histCase.diagnosis.toLowerCase().includes('heart failure')) {
      similarityScore += 35
      matchReasons.push('Same primary diagnosis')
    } else if (patient.principal_diagnosis?.toLowerCase().includes('copd') && 
               histCase.diagnosis.toLowerCase().includes('copd')) {
      similarityScore += 35
      matchReasons.push('Same primary diagnosis')
    } else if (patient.principal_diagnosis?.toLowerCase().includes('pneumonia') && 
               histCase.diagnosis.toLowerCase().includes('pneumonia')) {
      similarityScore += 35
      matchReasons.push('Same primary diagnosis')
    }
    
    // LOS similarity (within 3 days)
    if (Math.abs((patient.los_days || 0) - histCase.los) <= 3) {
      similarityScore += 20
      matchReasons.push('Similar length of stay')
    }
    
    // Disposition similarity
    if (patient.discharge_disposition?.toLowerCase().includes(histCase.disposition.toLowerCase().split(' ')[0])) {
      similarityScore += 20
      matchReasons.push('Same discharge disposition')
    }
    
    return {
      ...histCase,
      similarityScore,
      matchReasons
    }
  })
  
  // Sort by similarity and return top 3
  return scoredCases
    .filter(c => c.similarityScore > 20)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 3)
}

export default function Compare() {
  const [selectedPatientMrn, setSelectedPatientMrn] = useState<string>('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])
  
  const { data: patients, isLoading } = useQuery({
    queryKey: ['worklist'],
    queryFn: patientsApi.getWorklist
  })
  
  const selectedPatient = patients?.find((p: Patient) => p.mrn === selectedPatientMrn) || null
  const similarCases = findSimilarCases(selectedPatient)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading patients...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Pattern Comparison</h2>
        <p className="text-gray-400 text-sm">
          Select a patient to find similar historical cases and compare outcomes
        </p>
      </div>

      {/* Patient Selector */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Search size={18} className="text-cyan-400" />
          Select Patient to Analyze
        </h3>
        
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-left flex items-center justify-between hover:bg-white/10 transition-colors"
          >
            {selectedPatient ? (
              <div>
                <p className="text-white font-medium">{selectedPatient.name}</p>
                <p className="text-sm text-gray-400">
                  {selectedPatient.mrn} | {selectedPatient.age}y | {selectedPatient.principal_diagnosis}
                </p>
              </div>
            ) : (
              <span className="text-gray-400">Select a patient from the worklist...</span>
            )}
            <ChevronDown size={20} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-white/20 rounded-xl shadow-xl max-h-64 overflow-y-auto">
              {patients?.map((patient: Patient) => (
                <button
                  key={patient.mrn}
                  onClick={() => {
                    setSelectedPatientMrn(patient.mrn)
                    setIsDropdownOpen(false)
                  }}
                  className="w-full p-3 text-left hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                >
                  <p className="text-white font-medium">{patient.name}</p>
                  <p className="text-xs text-gray-400">
                    {patient.mrn} | {patient.age}y | {patient.principal_diagnosis}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Patient Summary */}
      {selectedPatient && (
        <div className="glass-card p-6 border-l-4 border-cyan-500">
          <div className="flex items-center gap-4 mb-4">
            <div className="icon-box cyan-gradient">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{selectedPatient.name}</h3>
              <p className="text-sm text-gray-400">
                {selectedPatient.mrn} | {selectedPatient.age}y {selectedPatient.gender?.charAt(0)} | {selectedPatient.unit}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-gray-400">Diagnosis</p>
              <p className="text-sm text-white font-medium">{selectedPatient.principal_diagnosis}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-gray-400">Length of Stay</p>
              <p className="text-sm text-white font-medium">{selectedPatient.los_days} days</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-gray-400">Planned Disposition</p>
              <p className="text-sm text-white font-medium">{selectedPatient.discharge_disposition || 'Pending'}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-gray-400">Insurance</p>
              <p className="text-sm text-white font-medium">{selectedPatient.insurance_type}</p>
            </div>
          </div>
        </div>
      )}

      {/* Similar Historical Cases */}
      {selectedPatient && similarCases.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <GitBranch size={18} className="text-cyan-400" />
            Similar Historical Cases ({similarCases.length} found)
          </h3>
          <p className="text-sm text-gray-400 -mt-2">
            These patients had similar characteristics. Compare their outcomes to inform your decision.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {similarCases.map((histCase) => (
              <div 
                key={histCase.id} 
                className={`glass-card p-5 border-l-4 ${
                  histCase.outcome === 'success' ? 'border-green-500' : 'border-red-500'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`icon-box ${histCase.outcome === 'success' ? 'green-gradient' : 'red-gradient'}`}>
                      <User size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{histCase.name}</p>
                      <p className="text-xs text-gray-400">{histCase.age}y | {histCase.diagnosis}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    histCase.outcome === 'success' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {histCase.outcome === 'success' ? (
                      <>
                        <CheckCircle size={12} />
                        Success
                      </>
                    ) : (
                      <>
                        <XCircle size={12} />
                        Readmitted ({histCase.readmitDays}d)
                      </>
                    )}
                  </div>
                </div>
                
                {/* Similarity Score */}
                <div className="mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-cyan-400 font-medium flex items-center gap-1">
                      <Sparkles size={12} />
                      Similarity Match
                    </span>
                    <span className="text-lg font-bold text-cyan-400">{histCase.similarityScore}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {histCase.matchReasons.map((reason, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Key Factors */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Key Context Factors</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Heart size={14} className={histCase.keyFactors.medicalBackground ? 'text-green-400' : 'text-gray-500'} />
                      <span className="text-gray-300">{histCase.keyFactors.caregiver}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Home size={14} className="text-gray-400" />
                      <span className="text-gray-300">{histCase.keyFactors.proximity}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-gray-300">{histCase.keyFactors.availability}</span>
                    </div>
                  </div>
                </div>
                
                {/* Outcome Prediction */}
                <div className={`p-3 rounded-lg ${
                  histCase.outcome === 'success' 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Success Rate</span>
                    <div className="flex items-center gap-1">
                      {histCase.successRate >= 70 ? (
                        <TrendingUp size={14} className="text-green-400" />
                      ) : (
                        <TrendingDown size={14} className="text-red-400" />
                      )}
                      <span className={`text-lg font-bold ${
                        histCase.successRate >= 70 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {histCase.successRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Insights */}
      {selectedPatient && similarCases.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-yellow-400" />
            Pattern Insights
          </h3>
          
          <div className="space-y-4">
            {/* Success patterns */}
            {similarCases.filter(c => c.outcome === 'success').length > 0 && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <h4 className="text-sm font-semibold text-green-400 mb-2">What Worked (Success Cases)</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  {similarCases.filter(c => c.outcome === 'success').map(c => (
                    <li key={c.id} className="flex items-start gap-2">
                      <CheckCircle size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>{c.name}</strong>: {c.keyFactors.medicalBackground ? 'Caregiver with medical background' : 'Strong support system'}, 
                        {c.keyFactors.availability.toLowerCase().includes('full') ? ' full-time availability' : ' adequate availability'}, 
                        discharged to {c.disposition}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Failure patterns */}
            {similarCases.filter(c => c.outcome === 'readmitted').length > 0 && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <h4 className="text-sm font-semibold text-red-400 mb-2">What Didn't Work (Readmission Cases)</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  {similarCases.filter(c => c.outcome === 'readmitted').map(c => (
                    <li key={c.id} className="flex items-start gap-2">
                      <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>{c.name}</strong>: {!c.keyFactors.medicalBackground ? 'No medical background in caregiver' : ''}, 
                        {c.keyFactors.availability.toLowerCase().includes('weekend') || c.keyFactors.availability.toLowerCase().includes('limited') 
                          ? ' limited caregiver availability' 
                          : ''}, 
                        readmitted after {c.readmitDays} days
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Recommendation */}
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <h4 className="text-sm font-semibold text-cyan-400 mb-2">Recommendation for {selectedPatient.name}</h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                Based on {similarCases.length} similar historical cases, the key success factors are: 
                <strong className="text-cyan-400"> caregiver with medical background or training</strong>, 
                <strong className="text-cyan-400"> full-time availability</strong>, and 
                <strong className="text-cyan-400"> close proximity</strong>. 
                Before discharge, verify these context factors are in place. 
                {similarCases.filter(c => c.outcome === 'readmitted').length > 0 && (
                  <span className="text-yellow-400">
                    {' '}Cases with limited caregiver availability or no medical background showed higher readmission rates.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No patient selected state */}
      {!selectedPatient && (
        <div className="glass-card p-12 text-center">
          <GitBranch size={48} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">Select a Patient to Compare</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Choose a patient from the dropdown above to find similar historical cases and compare 
            discharge outcomes. This helps identify patterns that lead to successful discharges.
          </p>
        </div>
      )}

      {/* No similar cases found */}
      {selectedPatient && similarCases.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Search size={48} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No Similar Cases Found</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            We couldn't find historical cases with similar characteristics to {selectedPatient.name}. 
            This may indicate a unique case that requires additional clinical judgment.
          </p>
        </div>
      )}
    </div>
  )
}
