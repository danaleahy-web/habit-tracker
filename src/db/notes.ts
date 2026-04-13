import { db } from './index'
import { toDateKey } from '../lib/dates'

export async function addTask(date: Date, content: string): Promise<number> {
  return db.journalNotes.add({
    date: new Date(toDateKey(date) + 'T12:00:00'),
    content,
    completed: false,
    createdAt: new Date(),
  }) as Promise<number>
}

export async function toggleTask(id: number): Promise<void> {
  const task = await db.journalNotes.get(id)
  if (task) {
    await db.journalNotes.update(id, { completed: !task.completed })
  }
}

export async function rescheduleTask(id: number, newDate: Date): Promise<void> {
  await db.journalNotes.update(id, {
    date: new Date(toDateKey(newDate) + 'T12:00:00'),
    completed: false,
  })
}

export async function deleteTask(id: number): Promise<void> {
  await db.journalNotes.delete(id)
}
