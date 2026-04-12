import { db, type JournalNote } from './index'
import { toDateKey } from '../lib/dates'

export async function getNotesForDate(date: Date): Promise<JournalNote[]> {
  const dayKey = toDateKey(date)
  const dayStart = new Date(dayKey)
  const dayEnd = new Date(dayKey + 'T23:59:59')
  return db.journalNotes
    .where('date')
    .between(dayStart, dayEnd, true, true)
    .toArray()
}

export async function addNote(date: Date, content: string): Promise<number> {
  return db.journalNotes.add({
    date: new Date(toDateKey(date) + 'T12:00:00'),
    content,
    createdAt: new Date(),
  }) as Promise<number>
}

export async function updateNote(id: number, content: string): Promise<void> {
  await db.journalNotes.update(id, { content })
}

export async function deleteNote(id: number): Promise<void> {
  await db.journalNotes.delete(id)
}
