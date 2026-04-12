import { db, type Workout } from './index'
import { toDateKey } from '../lib/dates'

export async function getAllWorkouts(): Promise<Workout[]> {
  return db.workouts.orderBy('createdAt').toArray()
}

export async function getActiveWorkouts(): Promise<Workout[]> {
  return db.workouts.filter((w) => !w.archivedAt).toArray()
}

export async function createWorkout(
  data: Omit<Workout, 'id' | 'createdAt'>
): Promise<number> {
  return db.workouts.add({ ...data, createdAt: new Date() }) as Promise<number>
}

export async function updateWorkout(
  id: number,
  changes: Partial<Pick<Workout, 'name' | 'emoji' | 'type' | 'exercises' | 'scheduledDays' | 'frequencyPerWeek' | 'startDate' | 'endDate'>>
): Promise<void> {
  await db.workouts.update(id, changes)
}

export async function archiveWorkout(id: number): Promise<void> {
  await db.workouts.update(id, { archivedAt: new Date() })
}

export async function unarchiveWorkout(id: number): Promise<void> {
  await db.workouts.update(id, { archivedAt: undefined })
}

export async function deleteWorkout(id: number): Promise<void> {
  await db.transaction('rw', [db.workouts, db.workoutLogs], async () => {
    await db.workoutLogs.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

// ---- Workout Logs ----

/** Toggle a workout log for a given date. Returns true if now logged. */
export async function toggleWorkoutLog(workoutId: number, date: Date): Promise<boolean> {
  const dayKey = toDateKey(date)
  const dayStart = new Date(dayKey)
  const dayEnd = new Date(dayKey + 'T23:59:59')

  const existing = await db.workoutLogs
    .where('completedAt')
    .between(dayStart, dayEnd, true, true)
    .and((l) => l.workoutId === workoutId)
    .first()

  if (existing) {
    await db.workoutLogs.delete(existing.id!)
    return false
  } else {
    await db.workoutLogs.add({
      workoutId,
      completedAt: new Date(dayKey + 'T12:00:00'),
    })
    return true
  }
}
