import { useQuery } from '@tanstack/react-query'
import { Sparkles, TrendingUp, CheckCircle } from 'lucide-react'
import { patternsApi } from '../api/client'

interface Pattern {
  id: string
  patternNumber: string
  title: string
  description: string
  contextCriteria: string[]
  sampleSize: number
  successCount: number
  successRate: number
  baselineRate: number
  liftVsBaseline: number
  statisticallySignificant: boolean
  status: string
  dataMonth: number
}

export default function Patterns() {
  const { data: patterns, isLoading } = useQuery({
    queryKey: ['patterns'],
    queryFn: patternsApi.getPatterns
  })

  const patternList = patterns || []
  const validatedPatterns = patternList.filter((p: Pattern) => p.status === 'validated')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Context Patterns</h2>
          <p className="text-gray-400 text-sm">
            AI-discovered patterns that predict successful outcomes
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20">
          <Sparkles size={18} className="text-green-400" />
          <span className="text-green-400 font-medium">{validatedPatterns.length} Validated Patterns</span>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-card p-8 text-center text-gray-400">Loading patterns...</div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {patternList.map((pattern: Pattern) => (
            <div key={pattern.id} className="glass-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="icon-box cyan-gradient">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{pattern.title}</h3>
                    <p className="text-xs text-gray-400">{pattern.patternNumber}</p>
                  </div>
                </div>
                {pattern.status === 'validated' && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20">
                    <CheckCircle size={14} className="text-green-400" />
                    <span className="text-green-400 text-xs">Validated</span>
                  </div>
                )}
              </div>

              <p className="text-gray-300 text-sm mb-4">{pattern.description}</p>

              <div className="space-y-3 mb-4">
                <div className="flex flex-wrap gap-2">
                  {pattern.contextCriteria.map((criteria: string, i: number) => (
                    <span key={i} className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs">
                      {criteria}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-white/5">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Sample Size</p>
                  <p className="text-lg font-semibold text-white">{pattern.sampleSize}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Success Rate</p>
                  <p className="text-lg font-semibold text-green-400">
                    {(pattern.successRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Lift vs Baseline</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp size={16} className="text-cyan-400" />
                    <p className="text-lg font-semibold text-cyan-400">
                      +{(pattern.liftVsBaseline * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              {pattern.statisticallySignificant && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Statistically significant (p &lt; 0.05)
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {patternList.length === 0 && !isLoading && (
        <div className="glass-card p-8 text-center">
          <Sparkles size={48} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Patterns Yet</h3>
          <p className="text-gray-400">
            Patterns will be discovered as more decision traces and outcomes are recorded.
            Advance the timeline to see patterns emerge.
          </p>
        </div>
      )}
    </div>
  )
}
