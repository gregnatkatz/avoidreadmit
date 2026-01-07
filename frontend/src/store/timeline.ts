import { create } from 'zustand'
import { timelineApi } from '../api/client'

interface TimelineStore {
  currentMonth: number
  totalMonths: number
  isLoading: boolean
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

export const useTimelineStore = create<TimelineStore>((set) => ({
  currentMonth: 1,
  totalMonths: 9,
  isLoading: false,

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
    set({ isLoading: true })
    try {
      const state = await timelineApi.advance()
      set({ currentMonth: state.currentMonth })
    } finally {
      set({ isLoading: false })
    }
  },

  gotoMonth: async (month: number) => {
    set({ isLoading: true })
    try {
      const state = await timelineApi.goto(month)
      set({ currentMonth: state.currentMonth })
    } finally {
      set({ isLoading: false })
    }
  },

  resetTimeline: async () => {
    set({ isLoading: true })
    try {
      const state = await timelineApi.reset()
      set({ currentMonth: state.currentMonth })
    } finally {
      set({ isLoading: false })
    }
  }
}))

export const getMonthLabel = (month: number): string => {
  return MONTH_LABELS[month - 1] || `Month ${month}`
}
