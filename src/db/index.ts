import Dexie, { type EntityTable } from 'dexie'

// ---------- Type Definitions ----------

export interface Setting {
  key: string
  value: string
}

export interface Habit {
  id?: number
  name: string
  emoji: string
  /** How many times per week (used when scheduledDays is empty) */
  frequencyPerWeek: number
  /** Specific days of the week: 0=Sun, 1=Mon, ..., 6=Sat. Empty = flexible. */
  scheduledDays?: number[]
  /** When this habit starts being active (defaults to createdAt if unset) */
  startDate?: Date
  /** When this habit ends (undefined = ongoing forever) */
  endDate?: Date
  createdAt: Date
  archivedAt?: Date
}

export interface HabitCompletion {
  id?: number
  habitId: number
  completedAt: Date
  note?: string
}

export interface Exercise {
  name: string
  sets: number
  reps: number
  weight?: number
  unit?: 'kg' | 'lbs'
  notes?: string
}

export interface Workout {
  id?: number
  name: string
  emoji: string
  type: string            // "Strength", "Cardio", "Flexibility", etc.
  exercises: Exercise[]
  /** Min exercises to complete for the workout to count as done. Undefined = all. */
  minExercisesToComplete?: number
  /** Specific days: 0=Sun..6=Sat. Empty = flexible / every day. */
  scheduledDays?: number[]
  /** Times per week when using flexible scheduling */
  frequencyPerWeek?: number
  /** When this workout starts being active */
  startDate?: Date
  /** When this workout ends (undefined = ongoing) */
  endDate?: Date
  createdAt: Date
  archivedAt?: Date
}

export interface WorkoutLog {
  id?: number
  workoutId: number
  completedAt: Date
  /** Indices of individually completed exercises */
  completedExercises?: number[]
  /** Extra exercises added to this day only (not in the template) */
  extraExercises?: Exercise[]
  /** Indices of completed extra exercises */
  completedExtras?: number[]
  notes?: string
}

export interface JournalNote {
  id?: number
  date: Date
  content: string
  createdAt: Date
}

export interface Activity {
  id?: number
  stravaId: string
  name: string
  type: string
  distanceMeters: number
  movingTimeSecs: number
  startDate: Date
  linkedHabitId?: number
  raw?: string
}

// ---------- Database ----------

const db = new Dexie('HabitSyncDB') as Dexie & {
  settings: EntityTable<Setting, 'key'>
  habits: EntityTable<Habit, 'id'>
  habitCompletions: EntityTable<HabitCompletion, 'id'>
  workouts: EntityTable<Workout, 'id'>
  workoutLogs: EntityTable<WorkoutLog, 'id'>
  journalNotes: EntityTable<JournalNote, 'id'>
  activities: EntityTable<Activity, 'id'>
}

db.version(1).stores({
  settings: 'key',
  habits: '++id, name, createdAt',
  habitCompletions: '++id, habitId, completedAt, [habitId+completedAt]',
  activities: '++id, &stravaId, type, startDate, linkedHabitId',
})

db.version(2).stores({
  settings: 'key',
  habits: '++id, name, groupId, createdAt',
  habitCompletions: '++id, habitId, completedAt, [habitId+completedAt]',
  workouts: '++id, name, type, groupId, createdAt',
  planGroups: '++id, name, createdAt',
  activities: '++id, &stravaId, type, startDate, linkedHabitId',
})

// v3: Remove groups, clean up groupId from habits/workouts
db.version(3).stores({
  settings: 'key',
  habits: '++id, name, createdAt',
  habitCompletions: '++id, habitId, completedAt, [habitId+completedAt]',
  workouts: '++id, name, type, createdAt',
  planGroups: null, // delete table
  activities: '++id, &stravaId, type, startDate, linkedHabitId',
}).upgrade((tx) => {
  // Strip groupId from existing records
  tx.table('habits').toCollection().modify((h: Record<string, unknown>) => { delete h.groupId })
  tx.table('workouts').toCollection().modify((w: Record<string, unknown>) => { delete w.groupId })
})

// v4: Add workoutLogs table
db.version(4).stores({
  settings: 'key',
  habits: '++id, name, createdAt',
  habitCompletions: '++id, habitId, completedAt, [habitId+completedAt]',
  workouts: '++id, name, type, createdAt',
  workoutLogs: '++id, workoutId, completedAt, [workoutId+completedAt]',
  activities: '++id, &stravaId, type, startDate, linkedHabitId',
})

// v5: Add journalNotes table
db.version(5).stores({
  settings: 'key',
  habits: '++id, name, createdAt',
  habitCompletions: '++id, habitId, completedAt, [habitId+completedAt]',
  workouts: '++id, name, type, createdAt',
  workoutLogs: '++id, workoutId, completedAt, [workoutId+completedAt]',
  journalNotes: '++id, date, createdAt',
  activities: '++id, &stravaId, type, startDate, linkedHabitId',
})

export { db }
