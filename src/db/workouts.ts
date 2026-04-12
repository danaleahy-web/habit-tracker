import { db, type Workout } from './index'

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
  changes: Partial<Pick<Workout, 'name' | 'emoji' | 'type' | 'exercises'>>
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
  await db.workouts.delete(id)
}
