import { useQuery } from '@tanstack/react-query'
import { TrendingDown, Users, DollarSign, Sparkles } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { dashboardApi } from '../api/client'

export default function Dashboard() {
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 5000
  })

  const { data: trend } = useQuery({
    queryKey: ['readmission-trend'],
    queryFn: dashboardApi.getReadmissionTrend,
    refetchInterval: 5000
  })

  const { data: impact } = useQuery({
    queryKey: ['context-impact'],
    queryFn: dashboardApi.getContextImpact,
    refetchInterval: 5000
  })

  const stats = [
    {
      label: 'Readmission Rate',
      value: `${((summary?.readmissionRate || 0) * 100).toFixed(1)}%`,
      change: '-3.7% from baseline',
      icon: TrendingDown,
      gradient: 'cyan-gradient'
    },
    {
      label: 'Total Decisions',
      value: (summary?.totalDecisions || 0).toLocaleString(),
      change: `${summary?.decisionsWithContextMatch || 0} with context match`,
      icon: Users,
      gradient: 'green-gradient'
    },
    {
      label: 'Cumulative Savings',
      value: `$${((summary?.cumulativeSavings || 0) / 1000000).toFixed(1)}M`,
      change: `${summary?.readmissionsAvoided || 0} readmissions avoided`,
      icon: DollarSign,
      gradient: 'cyan-gradient'
    },
    {
      label: 'Active Patterns',
      value: summary?.activePatterns || 0,
      change: 'Validated success patterns',
      icon: Sparkles,
      gradient: 'green-gradient'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Dashboard</h2>
        <p className="text-gray-400 text-sm">Context Graph performance metrics</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
              <div className={`icon-box ${stat.gradient}`}>
                <stat.icon size={20} className="text-white" />
              </div>
            </div>
            <p className="text-xs text-gray-500">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Readmission Rate Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend || []}>
                <XAxis 
                  dataKey="month" 
                  stroke="#4a5568" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#4a5568" 
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  domain={[0.1, 0.2]}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(6, 11, 40, 0.95)', 
                    border: '1px solid rgba(226, 232, 240, 0.1)',
                    borderRadius: '12px'
                  }}
                  formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Rate']}
                />
                <Line 
                  type="monotone" 
                  dataKey="readmissionRate" 
                  stroke="#00D1FF" 
                  strokeWidth={3}
                  dot={{ fill: '#00D1FF', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Context Impact</h3>
          <div className="space-y-6 mt-8">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">With Rich Context</span>
                <span className="text-white font-semibold">
                  {((impact?.withRichContextSuccessRate || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full green-gradient rounded-full transition-all duration-500"
                  style={{ width: `${(impact?.withRichContextSuccessRate || 0) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">Without Rich Context</span>
                <span className="text-white font-semibold">
                  {((impact?.withoutRichContextSuccessRate || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-500 rounded-full transition-all duration-500"
                  style={{ width: `${(impact?.withoutRichContextSuccessRate || 0) * 100}%` }}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Context Lift</span>
                <span className="text-2xl font-bold text-cyan-400">
                  +{((impact?.contextLift || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Improvement in success rate with rich context capture
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
