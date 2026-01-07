import { useQuery } from '@tanstack/react-query'
import { TrendingDown, Users, DollarSign, Sparkles, Activity, Brain } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, Legend } from 'recharts'
import { dashboardApi } from '../api/client'
import { useTimelineStore } from '../store/timeline'

export default function Dashboard() {
  const currentMonth = useTimelineStore((state) => state.currentMonth)
  
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

  // Decision outcomes distribution data
  const decisionOutcomes = [
    { name: 'Home with Services', value: 45, color: '#00F5A0' },
    { name: 'SNF', value: 25, color: '#00D1FF' },
    { name: 'Rehab', value: 15, color: '#FFB800' },
    { name: 'Home (No Services)', value: 10, color: '#A855F7' },
    { name: 'Hospice', value: 5, color: '#FF6B6B' }
  ]

  // Pattern discovery over time
  const patternDiscovery = [
    { month: 'Month 1', patterns: 0, matches: 0 },
    { month: 'Month 2', patterns: 0, matches: 0 },
    { month: 'Month 3', patterns: 2, matches: 50 },
    { month: 'Month 4', patterns: 5, matches: 120 },
    { month: 'Month 5', patterns: 9, matches: 280 },
    { month: 'Month 6', patterns: 12, matches: 450 }
  ].slice(0, currentMonth)

  // AI Provider performance
  const providerPerformance = [
    { provider: 'GPT-5.2', successRate: 98, avgLatency: 2800, calls: 1250 },
    { provider: 'o3-2', successRate: 96, avgLatency: 4200, calls: 890 },
    { provider: 'DeepSeek', successRate: 94, avgLatency: 1800, calls: 720 }
  ]

  // Context match trend over time
  const contextMatchTrend = [
    { month: 'Month 1', matchRate: 0, successWithMatch: 0, successWithoutMatch: 0 },
    { month: 'Month 2', matchRate: 0, successWithMatch: 0, successWithoutMatch: 82 },
    { month: 'Month 3', matchRate: 12, successWithMatch: 91, successWithoutMatch: 83 },
    { month: 'Month 4', matchRate: 28, successWithMatch: 93, successWithoutMatch: 82 },
    { month: 'Month 5', matchRate: 45, successWithMatch: 95, successWithoutMatch: 81 },
    { month: 'Month 6', matchRate: 62, successWithMatch: 97, successWithoutMatch: 80 }
  ].slice(0, currentMonth)

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

      {/* Row 2: Readmission Trend + Decision Outcomes Pie */}
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
          <h3 className="text-lg font-semibold text-white mb-4">Decision Outcomes Distribution</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={decisionOutcomes}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {decisionOutcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(6, 11, 40, 0.95)', 
                    border: '1px solid rgba(226, 232, 240, 0.1)',
                    borderRadius: '12px'
                  }}
                  formatter={(value: number) => [`${value}%`, 'Share']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-40 space-y-2">
              {decisionOutcomes.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-400">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Pattern Discovery + Context Match Trend */}
      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Pattern Discovery Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patternDiscovery}>
                <XAxis 
                  dataKey="month" 
                  stroke="#4a5568" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#4a5568" 
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#4a5568" 
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(6, 11, 40, 0.95)', 
                    border: '1px solid rgba(226, 232, 240, 0.1)',
                    borderRadius: '12px'
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="patterns" name="Patterns Discovered" fill="#00F5A0" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="matches" name="Context Matches" fill="#00D1FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Context Match Success Rate</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={contextMatchTrend}>
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
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(6, 11, 40, 0.95)', 
                    border: '1px solid rgba(226, 232, 240, 0.1)',
                    borderRadius: '12px'
                  }}
                  formatter={(value: number) => [`${value}%`]}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="successWithMatch" 
                  name="With Context Match"
                  stroke="#00F5A0" 
                  fill="#00F5A0"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="successWithoutMatch" 
                  name="Without Context Match"
                  stroke="#6B7280" 
                  fill="#6B7280"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: AI Provider Performance + Context Impact */}
      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">AI Provider Performance</h3>
          <div className="space-y-4">
            {providerPerformance.map((provider) => (
              <div key={provider.provider} className="p-4 bg-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg cyan-gradient flex items-center justify-center">
                      <Brain size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{provider.provider}</p>
                      <p className="text-xs text-gray-500">{provider.calls.toLocaleString()} calls</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-cyan-400">{provider.successRate}%</p>
                    <p className="text-xs text-gray-500">{provider.avgLatency}ms avg</p>
                  </div>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full cyan-gradient rounded-full transition-all duration-500"
                    style={{ width: `${provider.successRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Context Impact</h3>
          <div className="space-y-6 mt-4">
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

      {/* Row 5: Real-time Activity */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Real-time AI Activity</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 rounded-xl text-center">
            <Activity size={24} className="text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{summary?.totalDecisions || 0}</p>
            <p className="text-xs text-gray-500">Total Traces</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl text-center">
            <Brain size={24} className="text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{summary?.decisionsWithContextMatch || 0}</p>
            <p className="text-xs text-gray-500">Context Matches</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl text-center">
            <Sparkles size={24} className="text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{summary?.activePatterns || 0}</p>
            <p className="text-xs text-gray-500">Active Patterns</p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl text-center">
            <TrendingDown size={24} className="text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{summary?.readmissionsAvoided || 0}</p>
            <p className="text-xs text-gray-500">Readmissions Avoided</p>
          </div>
        </div>
      </div>
    </div>
  )
}
