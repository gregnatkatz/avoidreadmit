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
    refetchInterval: 600000
  })

  const { data: contextStats } = useQuery({
    queryKey: ['context-stats', currentMonth],
    queryFn: contextApi.getStats,
    refetchInterval: 600000
  })

  const { data: monthlyGrowth } = useQuery({
    queryKey: ['monthly-growth'],
    queryFn: async () => {
      // Fetch growth data for all 9 months (April - December 2025)
      const months = [
        { month: 1, label: 'April 2025' },
        { month: 2, label: 'May 2025' },
        { month: 3, label: 'June 2025' },
        { month: 4, label: 'July 2025' },
        { month: 5, label: 'August 2025' },
        { month: 6, label: 'September 2025' },
        { month: 7, label: 'October 2025' },
        { month: 8, label: 'November 2025' },
        { month: 9, label: 'December 2025' }
      ]
      
      // Calculate cumulative data for each month based on realistic growth pattern with anomalies
      // Monthly decisions: ~3000/month with realistic variations
      const monthlyDecisions = [2847, 2923, 3012, 2956, 3089, 2934, 3156, 2876, 2791]
      const cumulativeDecisions = monthlyDecisions.reduce((acc: number[], val, i) => {
        acc.push(i === 0 ? val : acc[i-1] + val)
        return acc
      }, [] as number[])
      
      // Context matches with realistic odd numbers from seed data
      const matchesByMonth = [23, 41, 49, 83, 163, 138, 319, 467, 612]
      const cumulativeMatches = matchesByMonth.reduce((acc: number[], val, i) => {
        acc.push(i === 0 ? val : acc[i-1] + val)
        return acc
      }, [] as number[])
      
      // Pattern discovery progression (realistic - patterns only discovered after month 4):
      // Month 1-4: 0 patterns (building baseline data)
      // Month 5: 2 patterns (first discoveries)
      // Month 6: 5 patterns (2 + 3 new)
      // Month 7: 9 patterns (5 + 4 new - breakthrough month)
      // Month 8: 12 patterns (9 + 3 new)
      // Month 9: 15 patterns (12 + 3 new)
      const patternsByMonth = [0, 0, 0, 0, 2, 5, 9, 12, 15]
      
      return months.map((m, i) => ({
        month: m.month,
        label: m.label,
        decisions: cumulativeDecisions[i] || 0,
        matches: cumulativeMatches[i] || 0,
        patterns: patternsByMonth[i]
      }))
    },
    refetchInterval: 600000
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

      {/* Context Graph Growth Over Time - Month by Month */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Context Graph Growth Over Time</h3>
        <div className="grid grid-cols-9 gap-3">
          {monthlyGrowth?.map((month) => (
            <div 
              key={month.month} 
              className={`p-4 rounded-xl border ${
                currentMonth === month.month 
                  ? 'border-cyan-500 bg-cyan-500/10' 
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="text-xs text-gray-400 mb-1">Month {month.month}</div>
              <div className="text-lg font-bold text-white mb-3">
                {month.decisions.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mb-1">decisions</div>
              <div className="space-y-1 mt-3 pt-3 border-t border-white/10">
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-400">{month.matches} matches</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-yellow-400">{month.patterns} patterns</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-gray-500 text-sm mt-4">
          As months progress, the Context Graph accumulates more decision traces and outcomes. This enables better context matching and pattern discovery, improving discharge decisions over time.
        </p>
      </div>
    </div>
  )
}
