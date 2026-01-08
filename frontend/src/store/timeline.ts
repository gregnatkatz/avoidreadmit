import { create } from 'zustand'
import { timelineApi } from '../api/client'
import { QueryClient } from '@tanstack/react-query'

// Global query client reference for invalidation
let queryClientRef: QueryClient | null = null

export const setQueryClient = (client: QueryClient) => {
  queryClientRef = client
}

const invalidateDashboardQueries = () => {
  if (queryClientRef) {
    // Invalidate all dashboard and data queries when month changes
    queryClientRef.invalidateQueries({ queryKey: ['dashboard-summary'] })
    queryClientRef.invalidateQueries({ queryKey: ['readmission-trend'] })
    queryClientRef.invalidateQueries({ queryKey: ['context-impact'] })
    queryClientRef.invalidateQueries({ queryKey: ['ai-status'] })
    queryClientRef.invalidateQueries({ queryKey: ['context-stats'] })
    queryClientRef.invalidateQueries({ queryKey: ['patterns'] })
    queryClientRef.invalidateQueries({ queryKey: ['worklist'] })
    queryClientRef.invalidateQueries({ queryKey: ['decisions'] })
    queryClientRef.invalidateQueries({ queryKey: ['pattern-alerts'] })
    queryClientRef.invalidateQueries({ queryKey: ['pattern-discovery'] })
    queryClientRef.invalidateQueries({ queryKey: ['decision-outcomes'] })
  }
}

interface ProgressStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'completed'
}

interface TimelineStore {
  currentMonth: number
  totalMonths: number
  isLoading: boolean
  progressSteps: ProgressStep[]
  showProgress: boolean
  fetchState: () => Promise<void>
  advanceMonth: () => Promise<void>
  gotoMonth: (month: number) => Promise<void>
  resetTimeline: () => Promise<void>
}

const MONTH_LABELS = [
  'April 2025',
  'May 2025',
  'June 2025',
  'July 2025',
  'August 2025',
  'September 2025',
  'October 2025',
  'November 2025',
  'December 2025'
]

const createProgressSteps = (action: 'advance' | 'goto' | 'reset', currentMonth?: number): ProgressStep[] => {
  if (action === 'reset') {
    return [
      { id: 'reset', label: 'Resetting demo to Month 1...', status: 'pending' },
      { id: 'clear', label: 'Clearing existing data...', status: 'pending' },
      { id: 'seed', label: 'Seeding baseline data...', status: 'pending' },
      { id: 'complete', label: 'Reset complete!', status: 'pending' }
    ]
  }
  
  // For month 6+, show enhanced multi-model AI analysis steps
  const targetMonth = (currentMonth || 1) + 1
  if (targetMonth >= 6) {
    return [
      { id: 'seed', label: 'Seeding new patient data...', status: 'pending' },
      { id: 'outcomes', label: 'Generating decision outcomes...', status: 'pending' },
      { id: 'evolve', label: 'Evolving patterns with new evidence...', status: 'pending' },
      { id: 'statistical', label: 'Running statistical pattern analysis...', status: 'pending' },
      { id: 'ai-social', label: 'GPT-5.2: Analyzing social/caregiver patterns...', status: 'pending' },
      { id: 'ai-clinical', label: 'o3-2: Analyzing clinical patterns (reasoning)...', status: 'pending' },
      { id: 'ai-behavioral', label: 'DeepSeek-V3.2: Analyzing behavioral patterns...', status: 'pending' },
      { id: 'ai-cross', label: 'grok-4: Finding cross-domain interactions...', status: 'pending' },
      { id: 'devils-advocate', label: 'Devil\'s Advocate: Validating patterns...', status: 'pending' },
      { id: 'consensus', label: 'Building multi-model consensus...', status: 'pending' },
      { id: 'complete', label: 'Enhanced AI analysis complete!', status: 'pending' }
    ]
  }
  
  // For month 5, show pattern evolution + emerging pattern discovery
  if (targetMonth === 5) {
    return [
      { id: 'seed', label: 'Seeding new patient data...', status: 'pending' },
      { id: 'outcomes', label: 'Generating decision outcomes...', status: 'pending' },
      { id: 'evolve', label: 'Evolving patterns with new evidence...', status: 'pending' },
      { id: 'analyze', label: 'Analyzing patterns in data...', status: 'pending' },
      { id: 'discover', label: 'Discovering emerging patterns...', status: 'pending' },
      { id: 'upgrade', label: 'Upgrading pattern confidence levels...', status: 'pending' },
      { id: 'complete', label: 'Pattern evolution complete!', status: 'pending' }
    ]
  }
  
  // For month 4, show candidate pattern discovery (no evolution yet)
  if (targetMonth === 4) {
    return [
      { id: 'seed', label: 'Seeding new patient data...', status: 'pending' },
      { id: 'outcomes', label: 'Generating decision outcomes...', status: 'pending' },
      { id: 'analyze', label: 'Analyzing patterns in data...', status: 'pending' },
      { id: 'discover', label: 'Discovering candidate patterns...', status: 'pending' },
      { id: 'validate', label: 'Validating pattern significance...', status: 'pending' },
      { id: 'complete', label: 'Pattern discovery complete!', status: 'pending' }
    ]
  }
  
  // For month 1-3, basic progress
  return [
    { id: 'seed', label: 'Seeding new patient data...', status: 'pending' },
    { id: 'outcomes', label: 'Generating decision outcomes...', status: 'pending' },
    { id: 'analyze', label: 'Analyzing patterns in data...', status: 'pending' },
    { id: 'complete', label: 'Month transition complete!', status: 'pending' }
  ]
}

const simulateProgress = async (set: any, steps: ProgressStep[]) => {
  for (let i = 0; i < steps.length; i++) {
    // Mark current step as running
    set((state: TimelineStore) => ({
      progressSteps: state.progressSteps.map((s, idx) => ({
        ...s,
        status: idx === i ? 'running' : idx < i ? 'completed' : 'pending'
      }))
    }))
    // Wait a bit to show progress (except for last step)
    if (i < steps.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 400))
    }
  }
  // Mark all as completed
  set((state: TimelineStore) => ({
    progressSteps: state.progressSteps.map(s => ({ ...s, status: 'completed' as const }))
  }))
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  currentMonth: 1,
  totalMonths: 9,
  isLoading: false,
  progressSteps: [],
  showProgress: false,

  fetchState: async () => {
    set({ isLoading: true })
    try {
      const state = await timelineApi.getState()
      set({ currentMonth: state.currentMonth, totalMonths: state.totalMonths })
    } finally {
      set({ isLoading: false })
    }
  },

  advanceMonth: async () => {
    const { currentMonth } = get()
    const steps = createProgressSteps('advance', currentMonth)
    set({ isLoading: true, showProgress: true, progressSteps: steps })
    try {
      // Start progress simulation in parallel with actual API call
      const progressPromise = simulateProgress(set, steps)
      const state = await timelineApi.advance()
      await progressPromise
      set({ currentMonth: state.currentMonth })
      // Invalidate all dashboard queries to force refetch with new month data
      invalidateDashboardQueries()
      // Keep progress visible briefly to show completion
      await new Promise(resolve => setTimeout(resolve, 800))
    } finally {
      set({ isLoading: false, showProgress: false, progressSteps: [] })
    }
  },

  gotoMonth: async (month: number) => {
    const steps = createProgressSteps('goto')
    set({ isLoading: true, showProgress: true, progressSteps: steps })
    try {
      const progressPromise = simulateProgress(set, steps)
      const state = await timelineApi.goto(month)
      await progressPromise
      set({ currentMonth: state.currentMonth })
      // Invalidate all dashboard queries to force refetch with new month data
      invalidateDashboardQueries()
      await new Promise(resolve => setTimeout(resolve, 800))
    } finally {
      set({ isLoading: false, showProgress: false, progressSteps: [] })
    }
  },

  resetTimeline: async () => {
    const steps = createProgressSteps('reset')
    set({ isLoading: true, showProgress: true, progressSteps: steps })
    try {
      const progressPromise = simulateProgress(set, steps)
      const state = await timelineApi.reset()
      await progressPromise
      set({ currentMonth: state.currentMonth })
      // Invalidate all dashboard queries to force refetch with new month data
      invalidateDashboardQueries()
      await new Promise(resolve => setTimeout(resolve, 800))
    } finally {
      set({ isLoading: false, showProgress: false, progressSteps: [] })
    }
  }
}))

export const getMonthLabel = (month: number): string => {
  return MONTH_LABELS[month - 1] || `Month ${month}`
}
