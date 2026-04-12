import { useState, useEffect } from 'react'
import { db, type Habit, type HabitCompletion, type Activity } from '../db/index'
import { toDateKey } from '../lib/dates'

export interface CalendarData {
  habits: Habit[]
  completions: Map<string, HabitCompletion[]> // keyed by "YYYY-MM-DD"
  activities: Map<string, Activity[]>          // keyed by "YYYY-MM-DD"
  loading: boolean
}

/**
 * Fetches all habits, completions, and activities within a date range.
 * Data is grouped by date key for efficient per-day lookups.
 */
export function useCalendarData(startDate: Date, endDate: Date, refreshKey = 0): CalendarData {
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Map<string, HabitCompletion[]>>(new Map())
  const [activities, setActivities] = useState<Map<string, Activity[]>>(new Map())
  const [loading, setLoading] = useState(true)

  const startKey = toDateKey(startDate)
  const endKey = toDateKey(endDate)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchData() {
      // Fetch all non-archived habits
      const allHabits = await db.habits
        .filter((h) => !h.archivedAt)
        .toArray()

      // Fetch completions in date range
      const rangeCompletions = await db.habitCompletions
        .where('completedAt')
        .between(new Date(startKey), new Date(endKey + 'T23:59:59'), true, true)
        .toArray()

      // Fetch activities in date range
      const rangeActivities = await db.activities
        .where('startDate')
        .between(new Date(startKey), new Date(endKey + 'T23:59:59'), true, true)
        .toArray()

      if (cancelled) return

      // Group completions by date
      const compMap = new Map<string, HabitCompletion[]>()
      for (const c of rangeCompletions) {
        const key = toDateKey(c.completedAt)
        const arr = compMap.get(key) || []
        arr.push(c)
        compMap.set(key, arr)
      }

      // Group activities by date
      const actMap = new Map<string, Activity[]>()
      for (const a of rangeActivities) {
        const key = toDateKey(a.startDate)
        const arr = actMap.get(key) || []
        arr.push(a)
        actMap.set(key, arr)
      }

      setHabits(allHabits)
      setCompletions(compMap)
      setActivities(actMap)
      setLoading(false)
    }

    fetchData()
    return () => { cancelled = true }
  }, [startKey, endKey, refreshKey])

  return { habits, completions, activities, loading }
}
