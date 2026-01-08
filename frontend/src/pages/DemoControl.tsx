import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, ChevronRight, RotateCcw, TrendingDown, DollarSign, Sparkles, Loader2, Brain, BarChart3, CheckCircle2, Circle, Database } from 'lucide-react'
import { useTimelineStore, getMonthLabel } from '../store/timeline'
import { dashboardApi, patternsApi } from '../api/client'
import { useState } from 'react'

// Progress Modal Component
function ProgressModal({ steps, show }: { steps: { id: string; label: string; status: 'pending' | 'running' | 'completed' }[]; show: boolean }) {
  if (!show || steps.length === 0) return null
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card p-8 max-w-md w-full mx-4 border border-cyan-500/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-cyan-500/20">
            <Database size={24} className="text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Processing Data</h3>
            <p className="text-sm text-gray-400">Please wait while we update the demo...</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              {step.status === 'completed' ? (
                <CheckCircle2 size={20} className="text-green-400 flex-shrink-0" />
              ) : step.status === 'running' ? (
                <Loader2 size={20} className="text-cyan-400 animate-spin flex-shrink-0" />
              ) : (
                <Circle size={20} className="text-gray-600 flex-shrink-0" />
              )}
              <span className={`text-sm ${
                step.status === 'completed' ? 'text-green-400' :
                step.status === 'running' ? 'text-cyan-400 font-medium' :
                'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-6 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full cyan-gradient transition-all duration-300"
            style={{ 
              width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default function DemoControl() {
  const { currentMonth, totalMonths, advanceMonth, gotoMonth, resetTimeline, isLoading, progressSteps, showProgress } = useTimelineStore()
  const [discoveryResult, setDiscoveryResult] = useState<any>(null)
  const queryClient = useQueryClient()

  // Pattern discovery mutation
  const discoveryMutation = useMutation({
    mutationFn: patternsApi.runDiscovery,
    onSuccess: (data) => {
      setDiscoveryResult(data.result)
      queryClient.invalidateQueries({ queryKey: ['patterns'] })
      queryClient.invalidateQueries({ queryKey: ['pattern-candidates'] })
      queryClient.invalidateQueries({ queryKey: ['pattern-alerts'] })
    }
  })

  const { data: trend } = useQuery({
    queryKey: ['readmission-trend'],
    queryFn: dashboardApi.getReadmissionTrend,
    refetchInterval: 600000
  })

  const { data: savings } = useQuery({
    queryKey: ['cost-savings'],
    queryFn: dashboardApi.getCostSavings,
    refetchInterval: 600000
  })

  const months = Array.from({ length: totalMonths }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      {/* Progress Modal for month transitions */}
      <ProgressModal steps={progressSteps} show={showProgress} />
      
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Demo Control</h2>
        <p className="text-gray-400 text-sm">
          Navigate through 9 months of Context Graph implementation (April - December 2025)
        </p>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Timeline Navigation</h3>
        
        <div className="flex items-center gap-2 mb-6">
          {months.map((month) => (
            <button
              key={month}
              onClick={() => gotoMonth(month)}
              disabled={isLoading}
              className={`flex-1 py-3 px-4 rounded-xl transition-all ${
                month === currentMonth
                  ? 'sidebar-active text-white'
                  : month < currentMonth
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              <div className="text-center">
                <p className="text-xs opacity-70">Month {month}</p>
                <p className="font-medium text-sm">{getMonthLabel(month).split(' ')[0]}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-cyan-400" />
            <div>
              <p className="text-white font-semibold">{getMonthLabel(currentMonth)}</p>
              <p className="text-xs text-gray-400">Current demo position</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetTimeline}
              disabled={isLoading || currentMonth === 1}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <RotateCcw size={16} />
              Reset
            </button>
            <button
              onClick={advanceMonth}
              disabled={isLoading || currentMonth >= totalMonths}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              Advance
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Readmission Rate by Month</h3>
          <div className="space-y-3">
            {trend?.map((month: { month: string; monthNumber: number; readmissionRate: number }) => (
              <div key={month.monthNumber} className="flex items-center gap-4">
                <span className="text-sm text-gray-400 w-20">{month.month.split(' ')[0]}</span>
                <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden relative">
                  <div
                    className={`h-full transition-all duration-500 ${
                      month.monthNumber <= currentMonth ? 'cyan-gradient' : 'bg-gray-700'
                    }`}
                    style={{ width: `${month.readmissionRate * 500}%` }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-white">
                    {(month.readmissionRate * 100).toFixed(1)}%
                  </span>
                </div>
                {month.monthNumber <= currentMonth && (
                  <TrendingDown size={16} className="text-green-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Cumulative Savings</h3>
          <div className="space-y-3">
            {savings?.map((month: { month: string; monthNumber: number; cumulativeSavings: number; readmissionsAvoided: number }) => (
              <div key={month.monthNumber} className="flex items-center gap-4">
                <span className="text-sm text-gray-400 w-20">{month.month.split(' ')[0]}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${
                      month.monthNumber <= currentMonth ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      ${(month.cumulativeSavings / 1000000).toFixed(2)}M
                    </span>
                    <span className="text-xs text-gray-500">
                      {month.readmissionsAvoided} avoided
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        month.monthNumber <= currentMonth ? 'green-gradient' : 'bg-gray-700'
                      }`}
                      style={{ width: `${(month.cumulativeSavings / 5000000) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-3">
              <DollarSign size={24} className="text-green-400" />
              <div>
                <p className="text-xs text-gray-400">9-Month Target Savings</p>
                <p className="text-2xl font-bold text-green-400">$8.16M</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pattern Discovery Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Pattern Discovery</h3>
            <p className="text-sm text-gray-400">Run autonomous pattern discovery to find new patterns from outcome data</p>
          </div>
          <button
            onClick={() => discoveryMutation.mutate()}
            disabled={discoveryMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {discoveryMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Running Discovery...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Run Pattern Discovery Now
              </>
            )}
          </button>
        </div>

        {discoveryResult && (
          <div className="p-4 rounded-xl bg-white/5 space-y-3">
            <h4 className="font-medium text-white mb-2">Discovery Results</h4>
            <div className="grid grid-cols-5 gap-4">
              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 size={14} className="text-cyan-400" />
                  <span className="text-xs text-gray-400">Statistical</span>
                </div>
                <p className="text-xl font-bold text-cyan-400">{discoveryResult.statisticalCandidates}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Brain size={14} className="text-purple-400" />
                  <span className="text-xs text-gray-400">LLM</span>
                </div>
                <p className="text-xl font-bold text-purple-400">{discoveryResult.llmCandidates}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} className="text-green-400" />
                  <span className="text-xs text-gray-400">Validated</span>
                </div>
                <p className="text-xl font-bold text-green-400">{discoveryResult.validated}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <ChevronRight size={14} className="text-blue-400" />
                  <span className="text-xs text-gray-400">Promoted</span>
                </div>
                <p className="text-xl font-bold text-blue-400">{discoveryResult.promoted}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown size={14} className="text-yellow-400" />
                  <span className="text-xs text-gray-400">Deprecated</span>
                </div>
                <p className="text-xl font-bold text-yellow-400">{discoveryResult.deprecated}</p>
              </div>
            </div>
            {discoveryResult.errors?.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 mb-1">Errors:</p>
                <ul className="text-xs text-gray-400 list-disc list-inside">
                  {discoveryResult.errors.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              New candidates are available for review on the Patterns page.
            </p>
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Demo Narrative</h3>
        <div className="space-y-4">
          <div className={`p-4 rounded-xl ${currentMonth >= 1 ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5'}`}>
            <h4 className="font-medium text-white mb-1">Month 1-2: Baseline & Data Collection</h4>
            <p className="text-sm text-gray-400">
              Establish baseline readmission rate (17.98%). Begin capturing caregiver context through ambient voice transcription, hallway approvals, and nursing handoffs.
            </p>
          </div>
          <div className={`p-4 rounded-xl ${currentMonth >= 3 ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5'}`}>
            <h4 className="font-medium text-white mb-1">Month 3-4: Context Capture Expansion</h4>
            <p className="text-sm text-gray-400">
              Expand ambient capture to family meetings and rounding notes. Building data foundation for pattern discovery. Readmission rate drops to 16%.
            </p>
          </div>
          <div className={`p-4 rounded-xl ${currentMonth >= 5 ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5'}`}>
            <h4 className="font-medium text-white mb-1">Month 5-6: First Patterns Discovered</h4>
            <p className="text-sm text-gray-400">
              AI discovers first 5 validated patterns. Context matching begins showing value. Readmission rate drops to 14.9%. $2.7M cumulative savings.
            </p>
          </div>
          <div className={`p-4 rounded-xl ${currentMonth >= 7 ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5'}`}>
            <h4 className="font-medium text-white mb-1">Month 7-8: Breakthrough & Scaling</h4>
            <p className="text-sm text-gray-400">
              Major breakthrough - 12 patterns validated. Full ambient capture adoption. Readmission rate drops to 13.5%. $5.8M cumulative savings.
            </p>
          </div>
          <div className={`p-4 rounded-xl ${currentMonth >= 9 ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5'}`}>
            <h4 className="font-medium text-white mb-1">Month 9: Full Optimization</h4>
            <p className="text-sm text-gray-400">
              15 validated patterns. Context Graph fully optimized. Readmission rate reaches 12.9%. $8.16M cumulative savings achieved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
