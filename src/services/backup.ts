import { db } from '../db/index'

interface BackupData {
  version: number
  exportedAt: string
  habits: unknown[]
  habitCompletions: unknown[]
  workouts: unknown[]
  workoutLogs: unknown[]
  journalNotes: unknown[]
  activities: unknown[]
}

/** Export the entire database as a JSON string */
export async function exportToJson(): Promise<string> {
  const [habits, habitCompletions, workouts, workoutLogs, journalNotes, activities] =
    await Promise.all([
      db.habits.toArray(),
      db.habitCompletions.toArray(),
      db.workouts.toArray(),
      db.workoutLogs.toArray(),
      db.journalNotes.toArray(),
      db.activities.toArray(),
    ])

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
    habitCompletions,
    workouts,
    workoutLogs,
    journalNotes,
    activities,
  }

  return JSON.stringify(backup, null, 2)
}

/** Download the backup as a .json file */
export async function downloadBackup(): Promise<void> {
  const json = await exportToJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const date = new Date().toISOString().slice(0, 10)

  const a = document.createElement('a')
  a.href = url
  a.download = `habitsync-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Import data from a JSON backup. Returns counts of imported records. */
export async function importFromJson(json: string): Promise<{
  habits: number
  habitCompletions: number
  workouts: number
  workoutLogs: number
  journalNotes: number
  activities: number
}> {
  const data: BackupData = JSON.parse(json)

  if (!data.version || !data.habits) {
    throw new Error('Invalid backup file format')
  }

  // Clear existing data and import
  await db.transaction('rw',
    [db.habits, db.habitCompletions, db.workouts, db.workoutLogs, db.journalNotes, db.activities],
    async () => {
      await db.habits.clear()
      await db.habitCompletions.clear()
      await db.workouts.clear()
      await db.workoutLogs.clear()
      await db.journalNotes.clear()
      await db.activities.clear()

      if (data.habits.length) await db.habits.bulkAdd(data.habits as never[])
      if (data.habitCompletions.length) await db.habitCompletions.bulkAdd(data.habitCompletions as never[])
      if (data.workouts.length) await db.workouts.bulkAdd(data.workouts as never[])
      if (data.workoutLogs.length) await db.workoutLogs.bulkAdd(data.workoutLogs as never[])
      if (data.journalNotes.length) await db.journalNotes.bulkAdd(data.journalNotes as never[])
      if (data.activities.length) await db.activities.bulkAdd(data.activities as never[])
    }
  )

  return {
    habits: data.habits.length,
    habitCompletions: data.habitCompletions.length,
    workouts: data.workouts.length,
    workoutLogs: data.workoutLogs.length,
    journalNotes: data.journalNotes.length,
    activities: data.activities.length,
  }
}
