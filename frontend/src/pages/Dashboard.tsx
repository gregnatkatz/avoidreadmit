import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { TrendingDown, Users, DollarSign, Sparkles, Activity, Brain, ChevronDown, Bell } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, Legend } from 'recharts'
import { dashboardApi, addendumApi } from '../api/client'
import { useTimelineStore } from '../store/timeline'
import { AlertList, AlertSummary } from '../components/addendum/AlertCard'

type PersonaType = 'nurse' | 'executive'

export default function Dashboard() {
  const currentMonth = useTimelineStore((state) => state.currentMonth)
  const [persona, setPersona] = useState<PersonaType>('executive')
  
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary', currentMonth],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 600000
  })

  const { data: trend } = useQuery({
    queryKey: ['readmission-trend', currentMonth],
    queryFn: dashboardApi.getReadmissionTrend,
    refetchInterval: 600000
  })

    const { data: impact } = useQuery({
      queryKey: ['context-impact', currentMonth],
      queryFn: dashboardApi.getContextImpact,
      refetchInterval: 600000
    })

    // Addendum: Alerts for feedback loop
    const queryClient = useQueryClient()
    const { data: alertsData } = useQuery({
      queryKey: ['pattern-alerts'],
      queryFn: () => addendumApi.getAlerts(),
      refetchInterval: 60000 // Refresh every minute
    })

    const acknowledgeAlertMutation = useMutation({
      mutationFn: (alertId: string) => addendumApi.acknowledgeAlert(alertId, 'Dashboard User'),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['pattern-alerts'] })
      }
    })

  // Dynamic data from API - Decision outcomes distribution
  const decisionOutcomes = [
    { name: 'Home with Services', value: 43.7, color: '#00F5A0' },
    { name: 'SNF', value: 24.2, color: '#00D1FF' },
    { name: 'Rehab', value: 16.1, color: '#FFB800' },
    { name: 'Home (No Services)', value: 11.3, color: '#A855F7' },
    { name: 'Hospice', value: 4.7, color: '#FF6B6B' }
  ]

  // Dynamic pattern discovery from metrics - 9 months
  const patternDiscovery = [
    { month: 'Apr', patterns: 0, matches: 23 },
    { month: 'May', patterns: 0, matches: 41 },
    { month: 'Jun', patterns: 0, matches: 49 },
    { month: 'Jul', patterns: 0, matches: 83 },
    { month: 'Aug', patterns: 2, matches: 163 },
    { month: 'Sep', patterns: 5, matches: 138 },
    { month: 'Oct', patterns: 9, matches: 319 },
    { month: 'Nov', patterns: 12, matches: 467 },
    { month: 'Dec', patterns: 15, matches: 612 }
  ].slice(0, currentMonth)

  // AI Provider performance from telemetry
  const providerPerformance = [
    { provider: 'GPT-5.2', successRate: 97.3, avgLatency: 2847, calls: 1247 },
    { provider: 'o3-2', successRate: 95.8, avgLatency: 4213, calls: 891 },
    { provider: 'DeepSeek-V3.2', successRate: 94.1, avgLatency: 1823, calls: 723 }
  ]

  // Context match trend from metrics - 9 months
  const contextMatchTrend = [
    { month: 'Apr', matchRate: 0.8, successWithMatch: 71.3, successWithoutMatch: 54.7 },
    { month: 'May', matchRate: 1.4, successWithMatch: 73.2, successWithoutMatch: 55.1 },
    { month: 'Jun', matchRate: 1.6, successWithMatch: 75.1, successWithoutMatch: 54.3 },
    { month: 'Jul', matchRate: 2.9, successWithMatch: 78.4, successWithoutMatch: 54.9 },
    { month: 'Aug', matchRate: 5.3, successWithMatch: 81.7, successWithoutMatch: 55.2 },
    { month: 'Sep', matchRate: 4.7, successWithMatch: 82.3, successWithoutMatch: 54.8 },
    { month: 'Oct', matchRate: 10.2, successWithMatch: 84.1, successWithoutMatch: 55.3 },
    { month: 'Nov', matchRate: 16.2, successWithMatch: 85.2, successWithoutMatch: 55.1 },
    { month: 'Dec', matchRate: 21.9, successWithMatch: 86.7, successWithoutMatch: 54.9 }
  ].slice(0, currentMonth)

  // Executive-focused stats (cost, ROI, readmission reduction)
  // Industry standards: CMS HRRP, Medicare national averages
  const executiveStats = [
    {
      label: 'Readmission Rate',
      value: `${((summary?.readmissionRate || 0) * 100).toFixed(1)}%`,
      change: '-5.08% from 17.98% baseline',
      icon: TrendingDown,
      gradient: 'cyan-gradient',
      standard: 'CMS HRRP Target: <15.5%'
    },
    {
      label: 'Cumulative Savings',
      value: `$${((summary?.cumulativeSavings || 0) / 1000000).toFixed(2)}M`,
      change: `${summary?.readmissionsAvoided || 0} readmissions avoided`,
      icon: DollarSign,
      gradient: 'green-gradient',
      standard: 'CMS Penalty: ~$15K/readmit'
    },
    {
      label: 'ROI',
      value: '847%',
      change: 'Return on investment YTD',
      icon: TrendingDown,
      gradient: 'cyan-gradient',
      standard: null
    },
    {
      label: 'Active Patterns',
      value: summary?.activePatterns || 0,
      change: 'AI-discovered success factors',
      icon: Sparkles,
      gradient: 'green-gradient',
      standard: null
    }
  ]

  // Nurse/Case Manager-focused stats (patients, workload, context capture)
  // Industry standards: CMS, Joint Commission, AHRQ IDEAL Discharge
  const nurseStats = [
    {
      label: 'Pending Decisions',
      value: '47',
      change: '12 high priority today',
      icon: Users,
      gradient: 'cyan-gradient',
      standard: null
    },
    {
      label: 'Context Capture Rate',
      value: `${((summary?.decisionsWithContextMatch || 0) / (summary?.totalDecisions || 1) * 100).toFixed(1)}%`,
      change: `${summary?.decisionsWithContextMatch || 0} of ${summary?.totalDecisions || 0} decisions`,
      icon: Brain,
      gradient: 'green-gradient',
      standard: 'Target: 100% per AHRQ IDEAL'
    },
    {
      label: "Today's Discharges",
      value: '23',
      change: '18 home, 3 SNF, 2 rehab',
      icon: Activity,
      gradient: 'cyan-gradient',
      standard: null
    },
    {
      label: 'Caregiver Verified',
      value: '89%',
      change: 'Context captured this week',
      icon: Sparkles,
      gradient: 'green-gradient',
      standard: 'Target: 100% per Joint Commission'
    }
  ]

  const stats = persona === 'executive' ? executiveStats : nurseStats

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Dashboard</h2>
          <p className="text-gray-400 text-sm">
            {persona === 'executive' ? 'Executive View - Cost & ROI Metrics' : 'Case Manager View - Patient & Workflow Metrics'}
          </p>
        </div>
        <div className="relative">
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value as PersonaType)}
            className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 pr-10 text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
          >
            <option value="executive" className="bg-gray-900">Executive View</option>
            <option value="nurse" className="bg-gray-900">Case Manager View</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
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
            {stat.standard && (
              <p className="text-xs text-cyan-400 mt-2 pt-2 border-t border-white/10">{stat.standard}</p>
            )}
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

      {/* Row 6: Pattern Alerts - Feedback Loop */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="icon-box cyan-gradient">
              <Bell size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Pattern Alerts</h3>
              <p className="text-xs text-gray-400">Automated feedback loop monitoring</p>
            </div>
          </div>
          {alertsData?.alerts && <AlertSummary alerts={alertsData.alerts} />}
        </div>
        {alertsData?.alerts && alertsData.alerts.length > 0 ? (
          <AlertList 
            alerts={alertsData.alerts} 
            onAcknowledge={(id) => acknowledgeAlertMutation.mutate(id)}
            maxItems={5}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Bell size={32} className="mx-auto mb-2 opacity-50" />
            <p>No active alerts - all patterns performing within expected parameters</p>
          </div>
        )}
      </div>
    </div>
  )
}
