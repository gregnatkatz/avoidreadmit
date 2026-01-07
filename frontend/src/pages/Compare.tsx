import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, User, Heart, Home, Clock } from 'lucide-react'
import { decisionsApi } from '../api/client'

export default function Compare() {
  const { isLoading } = useQuery({
    queryKey: ['compare', 'DCG-MARIA-001', 'DCG-ROBERT-001'],
    queryFn: () => decisionsApi.compare('DCG-MARIA-001', 'DCG-ROBERT-001')
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading comparison...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Context Comparison</h2>
        <p className="text-gray-400 text-sm">
          Compare how context capture affects discharge outcomes
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Maria - Success Case */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="icon-box green-gradient">
                <User size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Maria Garcia</h3>
                <p className="text-xs text-gray-400">MRN: DCG-MARIA-001</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-green-400 text-sm font-medium">Success</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Caregiver Context</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Heart size={14} className="text-cyan-400" />
                  <span className="text-white text-sm">Carmen Garcia (Daughter)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs">
                    Medical Background: Former LPN (15 years)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Home size={14} className="text-cyan-400" />
                  <span className="text-white text-sm">Lives 5 minutes away</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-cyan-400" />
                  <span className="text-white text-sm">Full-time availability (retired)</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Context Factors</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs">
                  Medical Background +15%
                </span>
                <span className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs">
                  Close Proximity +8%
                </span>
                <span className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs">
                  Full-time Available +8%
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Predicted Success Rate</span>
                <span className="text-2xl font-bold text-green-400">92%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Rich context capture enabled accurate disposition
              </p>
            </div>
          </div>
        </div>

        {/* Robert - Failure Case */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="icon-box red-gradient">
                <User size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Robert Wilson</h3>
                <p className="text-xs text-gray-400">MRN: DCG-ROBERT-001</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20">
              <XCircle size={16} className="text-red-400" />
              <span className="text-red-400 text-sm font-medium">Readmitted</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Caregiver Context</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Heart size={14} className="text-gray-500" />
                  <span className="text-white text-sm">Son (unnamed)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 text-xs">
                    No Medical Background
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Home size={14} className="text-gray-500" />
                  <span className="text-white text-sm">Lives 45 minutes away</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-500" />
                  <span className="text-white text-sm">Weekends only (works full-time)</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Context Factors</h4>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs">
                  Limited Availability -10%
                </span>
                <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs">
                  Far Distance -5%
                </span>
                <span className="px-2 py-1 rounded-lg bg-gray-500/20 text-gray-400 text-xs">
                  Minimal Context Captured
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Predicted Success Rate</span>
                <span className="text-2xl font-bold text-red-400">45%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Insufficient context led to suboptimal disposition
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Key Insight</h3>
        <p className="text-gray-300">
          Both patients had similar clinical profiles (CHF, similar age, same unit). The critical difference 
          was the <span className="text-cyan-400 font-medium">caregiver context</span> captured through ambient 
          voice transcription. Maria's daughter had medical training, lived nearby, and was fully available. 
          Robert's son worked full-time and lived far away. This context, invisible in traditional EHR data, 
          was the key predictor of outcome.
        </p>
      </div>
    </div>
  )
}
