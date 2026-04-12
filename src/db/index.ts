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
  frequencyPerWeek: number
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
  createdAt: Date
  archivedAt?: Date
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

export { db }
