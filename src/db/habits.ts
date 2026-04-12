import { db, type Habit, type HabitCompletion } from './index'
import { toDateKey } from '../lib/dates'

// ---- Habit CRUD ----

export async function getActiveHabits(): Promise<Habit[]> {
  return db.habits.filter((h) => !h.archivedAt).toArray()
}

export async function getAllHabits(): Promise<Habit[]> {
  return db.habits.orderBy('createdAt').toArray()
}

export async function createHabit(
  habit: Omit<Habit, 'id' | 'createdAt'>
): Promise<number> {
  return db.habits.add({ ...habit, createdAt: new Date() }) as Promise<number>
}

export async function updateHabit(
  id: number,
  changes: Partial<Pick<Habit, 'name' | 'emoji' | 'frequencyPerWeek' | 'scheduledDays' | 'startDate' | 'endDate'>>
): Promise<void> {
  await db.habits.update(id, changes)
}

export async function archiveHabit(id: number): Promise<void> {
  await db.habits.update(id, { archivedAt: new Date() })
}

export async function unarchiveHabit(id: number): Promise<void> {
  await db.habits.update(id, { archivedAt: undefined })
}

export async function deleteHabit(id: number): Promise<void> {
  await db.transaction('rw', [db.habits, db.habitCompletions], async () => {
    await db.habitCompletions.where('habitId').equals(id).delete()
    await db.habits.delete(id)
  })
}

// ---- Completions ----

/** Toggle a habit's completion for a given date. Returns true if now completed. */
export async function toggleCompletion(
  habitId: number,
  date: Date
): Promise<boolean> {
  const dayKey = toDateKey(date)
  const dayStart = new Date(dayKey)
  const dayEnd = new Date(dayKey + 'T23:59:59')

  const existing = await db.habitCompletions
    .where('completedAt')
    .between(dayStart, dayEnd, true, true)
    .and((c) => c.habitId === habitId)
    .first()

  if (existing) {
    await db.habitCompletions.delete(existing.id!)
    return false
  } else {
    await db.habitCompletions.add({
      habitId,
      completedAt: new Date(dayKey + 'T12:00:00'),
    })
    return true
  }
}

/** Get completions for a specific habit on a specific date */
export async function getCompletionsForDate(
  habitId: number,
  date: Date
): Promise<HabitCompletion[]> {
  const dayKey = toDateKey(date)
  const dayStart = new Date(dayKey)
  const dayEnd = new Date(dayKey + 'T23:59:59')

  return db.habitCompletions
    .where('completedAt')
    .between(dayStart, dayEnd, true, true)
    .and((c) => c.habitId === habitId)
    .toArray()
}
