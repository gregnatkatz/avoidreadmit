import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTimelineStore } from '../../store/timeline'
import { Loader2, CheckCircle2, Circle, Database } from 'lucide-react'

// Global Progress Modal Component - shows during month transitions
function ProgressModal() {
  const { progressSteps, showProgress } = useTimelineStore()
  
  if (!showProgress || progressSteps.length === 0) return null
  
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
          {progressSteps.map((step) => (
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
              width: `${(progressSteps.filter(s => s.status === 'completed').length / progressSteps.length) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-vision-gradient flex">
      {/* Global Progress Modal for month transitions */}
      <ProgressModal />
      
      <Sidebar />
      <div className="flex-1 flex flex-col ml-72">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
