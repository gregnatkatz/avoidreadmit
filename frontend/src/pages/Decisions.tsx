import { useQuery } from '@tanstack/react-query'
import { FileCheck, CheckCircle, XCircle } from 'lucide-react'
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
}

export default function Decisions() {
  const { currentMonth } = useTimelineStore()
  
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
                <th>Trace #</th>
                <th>Patient MRN</th>
                <th>Decision</th>
                <th>Decision Maker</th>
                <th>Policy</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {decisionList.slice(0, 50).map((decision: Decision) => (
                <tr key={decision.id}>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
