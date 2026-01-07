import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { FileCheck, CheckCircle, XCircle, ChevronDown, ChevronRight, User, Stethoscope, Heart } from 'lucide-react'
import { decisionsApi } from '../api/client'
import { useTimelineStore, getMonthLabel } from '../store/timeline'

interface Decision {
  id: string
  traceNumber: string
  patientMrn: string
  decisionType: string
  decisionValue: string
  decisionDatetime: string
  decisionMakerName: string
  followedPolicy: boolean
  hasOutcome: boolean
  outcomeSuccess?: boolean
  // Extended fields for trace details
  patientAge?: number
  diagnosis?: string
  lengthOfStay?: number
  caregiverName?: string
  caregiverRelationship?: string
  caregiverAvailability?: string
  caregiverProximity?: string
  hasMedicalBackground?: boolean
  contextRichness?: number
  aiRecommendation?: string
  aiConfidence?: number
}

export default function Decisions() {
  const { currentMonth } = useTimelineStore()
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  
  const { data: decisions, isLoading } = useQuery({
    queryKey: ['decisions', currentMonth],
    queryFn: decisionsApi.getDecisions
  })

  const decisionList = decisions || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Decision Traces</h2>
          <p className="text-gray-400 text-sm">
            {decisionList.length} decisions for {getMonthLabel(currentMonth)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="icon-box cyan-gradient">
              <FileCheck size={20} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{decisionList.length}</p>
              <p className="text-xs text-gray-400">Total Decisions</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="icon-box green-gradient">
              <CheckCircle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {decisionList.filter((d: Decision) => d.outcomeSuccess).length}
              </p>
              <p className="text-xs text-gray-400">Successful Outcomes</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="icon-box red-gradient">
              <XCircle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {decisionList.filter((d: Decision) => d.hasOutcome && !d.outcomeSuccess).length}
              </p>
              <p className="text-xs text-gray-400">Readmissions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading decisions...</div>
        ) : decisionList.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No decisions recorded for this month yet. Advance the timeline to see more data.
          </div>
        ) : (
          <table className="vision-table">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Trace #</th>
                <th>Patient MRN</th>
                <th>Decision</th>
                <th>Decision Maker</th>
                <th>Policy</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {decisionList.slice(0, 50).map((decision: Decision) => {
                const isExpanded = expandedRow === decision.id
                // Generate mock trace details based on decision data
                const mockDetails = {
                  patientAge: 65 + Math.floor(Math.random() * 25),
                  diagnosis: ['CHF', 'COPD', 'Pneumonia', 'Hip Fracture', 'Stroke'][Math.floor(Math.random() * 5)],
                  lengthOfStay: 3 + Math.floor(Math.random() * 10),
                  caregiverName: ['Maria', 'John', 'Sarah', 'Michael', 'Jennifer'][Math.floor(Math.random() * 5)],
                  caregiverRelationship: ['Daughter', 'Son', 'Spouse', 'Sibling', 'Friend'][Math.floor(Math.random() * 5)],
                  caregiverAvailability: ['Full-time', 'Part-time', 'Weekends only', 'Limited'][Math.floor(Math.random() * 4)],
                  caregiverProximity: ['Lives with patient', '5 min away', '15 min away', '30+ min away'][Math.floor(Math.random() * 4)],
                  hasMedicalBackground: Math.random() > 0.7,
                  contextRichness: 40 + Math.floor(Math.random() * 60),
                  aiRecommendation: decision.decisionValue,
                  aiConfidence: 65 + Math.floor(Math.random() * 30)
                }
                
                return (
                  <>
                    <tr 
                      key={decision.id} 
                      className="cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedRow(isExpanded ? null : decision.id)}
                    >
                      <td className="w-8">
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-cyan-400" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-500" />
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-cyan-400">{decision.traceNumber}</span>
                      </td>
                      <td>
                        <span className="text-gray-400">{decision.patientMrn}</span>
                      </td>
                      <td>
                        <span className="px-2 py-1 rounded-lg bg-white/5 text-sm">
                          {decision.decisionValue}
                        </span>
                      </td>
                      <td>{decision.decisionMakerName}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-lg text-xs ${
                          decision.followedPolicy 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {decision.followedPolicy ? 'Followed' : 'Exception'}
                        </span>
                      </td>
                      <td>
                        {decision.hasOutcome ? (
                          <span className={`px-2 py-1 rounded-lg text-xs ${
                            decision.outcomeSuccess 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {decision.outcomeSuccess ? 'Success' : 'Readmitted'}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">Pending</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${decision.id}-details`} className="bg-white/5">
                        <td colSpan={7} className="p-0">
                          <div className="p-6 border-t border-white/10">
                            <div className="grid grid-cols-3 gap-6">
                              {/* Patient Info */}
                              <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                  <User size={14} className="text-cyan-400" />
                                  Patient Information
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Age</span>
                                    <span className="text-white">{mockDetails.patientAge} years</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Primary Diagnosis</span>
                                    <span className="text-white">{mockDetails.diagnosis}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Length of Stay</span>
                                    <span className="text-white">{mockDetails.lengthOfStay} days</span>
                                  </div>
                                </div>
                              </div>

                              {/* Caregiver Context */}
                              <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                  <Heart size={14} className="text-green-400" />
                                  Caregiver Context
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Name</span>
                                    <span className="text-white">{mockDetails.caregiverName} ({mockDetails.caregiverRelationship})</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Availability</span>
                                    <span className={`${mockDetails.caregiverAvailability === 'Full-time' ? 'text-green-400' : 'text-yellow-400'}`}>
                                      {mockDetails.caregiverAvailability}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Proximity</span>
                                    <span className="text-white">{mockDetails.caregiverProximity}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Medical Background</span>
                                    <span className={mockDetails.hasMedicalBackground ? 'text-green-400' : 'text-gray-400'}>
                                      {mockDetails.hasMedicalBackground ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* AI Analysis */}
                              <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                  <Stethoscope size={14} className="text-yellow-400" />
                                  AI Analysis
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Context Richness</span>
                                    <span className={`${mockDetails.contextRichness > 70 ? 'text-green-400' : mockDetails.contextRichness > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                      {mockDetails.contextRichness}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">AI Recommendation</span>
                                    <span className="text-white">{mockDetails.aiRecommendation}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Confidence</span>
                                    <span className="text-cyan-400">{mockDetails.aiConfidence}%</span>
                                  </div>
                                </div>
                                <div className="mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                  <p className="text-xs text-cyan-300">
                                    Context captured via ambient voice transcription during discharge planning conversation.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
