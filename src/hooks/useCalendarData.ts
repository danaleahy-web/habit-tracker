import { useState, useEffect } from 'react'
import { db, type Habit, type HabitCompletion, type Workout, type WorkoutLog, type JournalNote, type Activity } from '../db/index'
import { toDateKey } from '../lib/dates'

export interface CalendarData {
  habits: Habit[]
  completions: Map<string, HabitCompletion[]>
  workouts: Workout[]
  workoutLogs: Map<string, WorkoutLog[]>
  notes: Map<string, JournalNote[]>
  activities: Map<string, Activity[]>
  loading: boolean
}

export function useCalendarData(startDate: Date, endDate: Date, refreshKey = 0): CalendarData {
  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Map<string, HabitCompletion[]>>(new Map())
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<Map<string, WorkoutLog[]>>(new Map())
  const [notes, setNotes] = useState<Map<string, JournalNote[]>>(new Map())
  const [activities, setActivities] = useState<Map<string, Activity[]>>(new Map())
  const [loading, setLoading] = useState(true)

  const startKey = toDateKey(startDate)
  const endKey = toDateKey(endDate)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchData() {
      const allHabits = await db.habits.filter((h) => !h.archivedAt).toArray()
      const allWorkouts = await db.workouts.filter((w) => !w.archivedAt).toArray()

      const rangeCompletions = await db.habitCompletions
        .where('completedAt')
        .between(new Date(startKey), new Date(endKey + 'T23:59:59'), true, true)
        .toArray()

      const rangeWorkoutLogs = await db.workoutLogs
        .where('completedAt')
        .between(new Date(startKey), new Date(endKey + 'T23:59:59'), true, true)
        .toArray()

      const rangeNotes = await db.journalNotes
        .where('date')
        .between(new Date(startKey), new Date(endKey + 'T23:59:59'), true, true)
        .toArray()

      const rangeActivities = await db.activities
        .where('startDate')
        .between(new Date(startKey), new Date(endKey + 'T23:59:59'), true, true)
        .toArray()

      if (cancelled) return

      const compMap = new Map<string, HabitCompletion[]>()
      for (const c of rangeCompletions) {
        const key = toDateKey(c.completedAt)
        const arr = compMap.get(key) || []
        arr.push(c)
        compMap.set(key, arr)
      }

      const wlMap = new Map<string, WorkoutLog[]>()
      for (const l of rangeWorkoutLogs) {
        const key = toDateKey(l.completedAt)
        const arr = wlMap.get(key) || []
        arr.push(l)
        wlMap.set(key, arr)
      }

      const noteMap = new Map<string, JournalNote[]>()
      for (const n of rangeNotes) {
        const key = toDateKey(n.date)
        const arr = noteMap.get(key) || []
        arr.push(n)
        noteMap.set(key, arr)
      }

      const actMap = new Map<string, Activity[]>()
      for (const a of rangeActivities) {
        const key = toDateKey(a.startDate)
        const arr = actMap.get(key) || []
        arr.push(a)
        actMap.set(key, arr)
      }

      setHabits(allHabits)
      setCompletions(compMap)
      setWorkouts(allWorkouts)
      setWorkoutLogs(wlMap)
      setNotes(noteMap)
      setActivities(actMap)
      setLoading(false)
    }

    fetchData()
    return () => { cancelled = true }
  }, [startKey, endKey, refreshKey])

  return { habits, completions, workouts, workoutLogs, notes, activities, loading }
}
