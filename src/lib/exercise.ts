import type { Exercise } from '../db/index'

/** Format the detail string for an exercise (sets × reps or sets × duration) */
export function formatExerciseDetail(ex: Exercise): string {
  const parts: string[] = []

  if (ex.mode === 'time') {
    const secs = ex.duration ?? 30
    const m = Math.floor(secs / 60)
    const s = secs % 60
    const timeStr = m > 0 && s > 0 ? `${m}m${s}s` : m > 0 ? `${m}m` : `${s}s`
    parts.push(`${ex.sets}×${timeStr}`)
  } else {
    parts.push(`${ex.sets}×${ex.reps}`)
  }

  if (ex.weight) {
    parts.push(`${ex.weight}${ex.unit || 'kg'}`)
  }

  return parts.join(' · ')
}
