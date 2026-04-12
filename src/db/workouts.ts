import { db, type Workout, type Exercise } from './index'
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

/** Get the workout log for a specific workout on a specific date */
async function getLogForDate(workoutId: number, date: Date) {
  const dayKey = toDateKey(date)
  return db.workoutLogs
    .where('completedAt')
    .between(new Date(dayKey), new Date(dayKey + 'T23:59:59'), true, true)
    .and((l) => l.workoutId === workoutId)
    .first()
}

/** Toggle the entire workout for a date. When completing, marks all exercises done. */
export async function toggleWorkoutLog(workoutId: number, date: Date, exerciseCount: number): Promise<boolean> {
  const existing = await getLogForDate(workoutId, date)

  if (existing) {
    await db.workoutLogs.delete(existing.id!)
    return false
  } else {
    const allExercises = Array.from({ length: exerciseCount }, (_, i) => i)
    await db.workoutLogs.add({
      workoutId,
      completedAt: new Date(toDateKey(date) + 'T12:00:00'),
      completedExercises: allExercises,
    })
    return true
  }
}

/** Toggle a single exercise within a workout log for a date. Creates the log if needed. */
export async function toggleExerciseInLog(
  workoutId: number,
  date: Date,
  exerciseIndex: number,
  _totalExercises: number
): Promise<void> {
  const existing = await getLogForDate(workoutId, date)

  if (existing) {
    const completed = new Set(existing.completedExercises || [])
    if (completed.has(exerciseIndex)) {
      completed.delete(exerciseIndex)
    } else {
      completed.add(exerciseIndex)
    }
    await db.workoutLogs.update(existing.id!, {
      completedExercises: [...completed],
    })
  } else {
    // Create a new log with just this exercise checked
    await db.workoutLogs.add({
      workoutId,
      completedAt: new Date(toDateKey(date) + 'T12:00:00'),
      completedExercises: [exerciseIndex],
    })
  }
}

// ---- Extra exercises (day-specific, not in template) ----

/** Add an extra exercise to a workout log for a specific day */
export async function addExtraExercise(
  workoutId: number,
  date: Date,
  exercise: Exercise
): Promise<void> {
  const existing = await getLogForDate(workoutId, date)

  if (existing) {
    const extras = [...(existing.extraExercises || []), exercise]
    await db.workoutLogs.update(existing.id!, { extraExercises: extras })
  } else {
    await db.workoutLogs.add({
      workoutId,
      completedAt: new Date(toDateKey(date) + 'T12:00:00'),
      extraExercises: [exercise],
    })
  }
}

/** Remove an extra exercise by index from a workout log */
export async function removeExtraExercise(
  workoutId: number,
  date: Date,
  extraIndex: number
): Promise<void> {
  const existing = await getLogForDate(workoutId, date)
  if (!existing) return

  const extras = [...(existing.extraExercises || [])]
  extras.splice(extraIndex, 1)

  const completedExtras = new Set(existing.completedExtras || [])
  completedExtras.delete(extraIndex)
  // Re-index completed extras after removal
  const reindexed = [...completedExtras].filter((i) => i < extras.length)

  await db.workoutLogs.update(existing.id!, {
    extraExercises: extras,
    completedExtras: reindexed,
  })
}

/** Toggle completion of an extra exercise */
export async function toggleExtraExercise(
  workoutId: number,
  date: Date,
  extraIndex: number
): Promise<void> {
  const existing = await getLogForDate(workoutId, date)
  if (!existing) return

  const completed = new Set(existing.completedExtras || [])
  completed.has(extraIndex) ? completed.delete(extraIndex) : completed.add(extraIndex)
  await db.workoutLogs.update(existing.id!, { completedExtras: [...completed] })
}
