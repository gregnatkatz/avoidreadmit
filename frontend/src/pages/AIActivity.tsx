import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Bot, Brain, Search, Sparkles, CheckCircle, AlertCircle, Play } from 'lucide-react'
import { aiApi, contextApi } from '../api/client'
import { useTimelineStore, getMonthLabel } from '../store/timeline'

export default function AIActivity() {
  const { currentMonth } = useTimelineStore()
  const [isRunning, setIsRunning] = useState(false)
  const [activityLog, setActivityLog] = useState<{ agent: string; action: string; time: string; status: string }[]>([])

  const { data: aiStatus } = useQuery({
    queryKey: ['ai-status', currentMonth],
    queryFn: aiApi.getStatus,
    refetchInterval: 5000
  })

  const { data: contextStats } = useQuery({
    queryKey: ['context-stats', currentMonth],
    queryFn: contextApi.getStats,
    refetchInterval: 5000
  })

  const runAnalysis = async () => {
    setIsRunning(true)
    setActivityLog([])

    const steps = [
      { agent: 'Primary', action: 'Initializing context extraction pipeline', delay: 500 },
      { agent: 'Primary', action: 'Processing ambient voice transcripts', delay: 800 },
      { agent: 'Verifier', action: 'Validating extracted context accuracy', delay: 600 },
      { agent: 'Questioner', action: 'Identifying gaps in caregiver information', delay: 500 },
      { agent: 'Primary', action: 'Running context matching algorithm', delay: 700 },
      { agent: 'Verifier', action: 'Confirming match relevance scores', delay: 500 },
      { agent: 'Primary', action: 'Discovering new patterns from outcomes', delay: 900 },
      { agent: 'Verifier', action: 'Validating statistical significance', delay: 600 },
      { agent: 'Questioner', action: 'Suggesting additional data collection', delay: 400 },
      { agent: 'Primary', action: 'Analysis complete', delay: 300 }
    ]

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.delay))
      setActivityLog(prev => [...prev, {
        agent: step.agent,
        action: step.action,
        time: new Date().toLocaleTimeString(),
        status: 'complete'
      }])
    }

    setIsRunning(false)
  }

  const agents = [
    {
      name: 'Primary Agent',
      description: 'Executes core AI tasks: context extraction, matching, pattern discovery',
      icon: Brain,
      color: 'cyan'
    },
    {
      name: 'Verification Agent',
      description: 'Reviews outputs for accuracy, completeness, and consistency',
      icon: CheckCircle,
      color: 'green'
    },
    {
      name: 'Questioning Agent',
      description: 'Identifies gaps, ambiguities, and challenges assumptions',
      icon: AlertCircle,
      color: 'yellow'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">AI Activity</h2>
          <p className="text-gray-400 text-sm">
            Multi-agent pipeline for {getMonthLabel(currentMonth)}
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={isRunning}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Play size={16} />
          {isRunning ? 'Processing...' : 'Run AI Analysis'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div key={agent.name} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`icon-box ${agent.color === 'cyan' ? 'cyan-gradient' : agent.color === 'green' ? 'green-gradient' : 'bg-yellow-500'}`}>
                <agent.icon size={20} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
            </div>
            <p className="text-gray-400 text-sm">{agent.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Live Activity Log</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activityLog.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                Click "Run AI Analysis" to see agent activity
              </p>
            ) : (
              activityLog.map((log, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    log.agent === 'Primary' ? 'bg-cyan-400' :
                    log.agent === 'Verifier' ? 'bg-green-400' : 'bg-yellow-400'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{log.agent}</span>
                      <span className="text-xs text-gray-500">{log.time}</span>
                    </div>
                    <p className="text-sm text-white">{log.action}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Context Graph Growth</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <Bot size={20} className="text-cyan-400" />
                <span className="text-gray-300">Decision Traces</span>
              </div>
              <span className="text-2xl font-bold text-white">
                {contextStats?.totalTraces?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <Search size={20} className="text-green-400" />
                <span className="text-gray-300">Context Matches</span>
              </div>
              <span className="text-2xl font-bold text-white">
                {contextStats?.totalMatches?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <Sparkles size={20} className="text-yellow-400" />
                <span className="text-gray-300">Patterns Discovered</span>
              </div>
              <span className="text-2xl font-bold text-white">
                {contextStats?.totalPatterns || 0}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <h4 className="text-sm font-medium text-gray-400 mb-3">AI Providers</h4>
            <div className="space-y-2">
              {aiStatus?.providers?.map((provider: { name: string; priority: number; status: string }) => (
                <div key={provider.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{provider.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Priority {provider.priority}</span>
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
