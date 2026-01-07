import { useEffect } from 'react'
import { Calendar, ChevronRight, RotateCcw } from 'lucide-react'
import { useTimelineStore, getMonthLabel } from '../../store/timeline'

export default function Header() {
  const { currentMonth, totalMonths, fetchState, advanceMonth, resetTimeline, isLoading } = useTimelineStore()

  useEffect(() => {
    fetchState()
  }, [fetchState])

  return (
    <header className="h-20 px-6 flex items-center justify-between border-b border-white/5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Calendar size={18} />
          <span className="text-sm">Demo Timeline</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">{getMonthLabel(currentMonth)}</span>
          <span className="text-gray-500 text-sm">({currentMonth}/{totalMonths})</span>
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
          Advance Month
          <ChevronRight size={16} />
        </button>
      </div>
    </header>
  )
}
