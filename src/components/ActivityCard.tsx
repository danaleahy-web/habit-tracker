import { useState } from 'react'
import type { Activity } from '../db/index'
import { decodePolyline, polylineToSvgPath } from '../lib/polyline'

interface ActivityCardProps {
  activity: Activity
  compact?: boolean
}

function formatDistance(meters: number): string {
  const km = meters / 1000
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatPace(meters: number, secs: number): string {
  if (meters === 0) return '—'
  const paceSecsPerKm = secs / (meters / 1000)
  const m = Math.floor(paceSecsPerKm / 60)
  const s = Math.round(paceSecsPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`
}

/** Parse extra data from the raw Strava JSON blob */
function parseRaw(raw?: string) {
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    return {
      polyline: data.map?.summary_polyline as string | undefined,
      totalElevationGain: data.total_elevation_gain as number | undefined,
      averageSpeed: data.average_speed as number | undefined,
      maxSpeed: data.max_speed as number | undefined,
      averageHeartrate: data.average_heartrate as number | undefined,
      maxHeartrate: data.max_heartrate as number | undefined,
      calories: data.calories as number | undefined,
      elapsedTime: data.elapsed_time as number | undefined,
      sufferScore: data.suffer_score as number | undefined,
    }
  } catch {
    return null
  }
}

export function ActivityCard({ activity, compact }: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false)
  const raw = parseRaw(activity.raw)
  const polyline = raw?.polyline

  if (compact) {
    return (
      <div className="flex items-baseline gap-2 text-xs">
        <span className="font-medium text-ink-light dark:text-gray-400">{activity.name}</span>
        <span className="rounded border border-border px-1 py-0.5 text-[9px] text-muted dark:border-border-dark">{activity.type}</span>
      </div>
    )
  }

  return (
    <div className="border-t border-border dark:border-border-dark">
      <button onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink dark:text-gray-100">{activity.name}</span>
            <span className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted dark:border-border-dark">
              {activity.type}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
            <span>{formatDistance(activity.distanceMeters)}</span>
            <span>{formatDuration(activity.movingTimeSecs)}</span>
            <span>{formatPace(activity.distanceMeters, activity.movingTimeSecs)}</span>
            {raw?.totalElevationGain != null && raw.totalElevationGain > 0 && (
              <span>↑ {formatElevation(raw.totalElevationGain)}</span>
            )}
          </div>
        </div>
        <svg className={`mt-1 h-3 w-3 shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 dark:border-border-dark">
          {/* Route map */}
          {polyline && <RouteMap polyline={polyline} />}

          {/* Detailed stats grid */}
          <div className={`grid grid-cols-3 gap-2 ${polyline ? 'mt-3' : ''}`}>
            <StatCell label="Distance" value={formatDistance(activity.distanceMeters)} />
            <StatCell label="Moving time" value={formatDuration(activity.movingTimeSecs)} />
            <StatCell label="Pace" value={formatPace(activity.distanceMeters, activity.movingTimeSecs)} />
            {raw?.elapsedTime != null && (
              <StatCell label="Elapsed" value={formatDuration(raw.elapsedTime)} />
            )}
            {raw?.totalElevationGain != null && raw.totalElevationGain > 0 && (
              <StatCell label="Elevation" value={`↑ ${formatElevation(raw.totalElevationGain)}`} />
            )}
            {raw?.averageHeartrate != null && (
              <StatCell label="Avg HR" value={`${Math.round(raw.averageHeartrate)} bpm`} />
            )}
            {raw?.maxHeartrate != null && (
              <StatCell label="Max HR" value={`${Math.round(raw.maxHeartrate)} bpm`} />
            )}
            {raw?.calories != null && raw.calories > 0 && (
              <StatCell label="Calories" value={`${Math.round(raw.calories)}`} />
            )}
            {raw?.sufferScore != null && raw.sufferScore > 0 && (
              <StatCell label="Suffer" value={`${raw.sufferScore}`} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background px-2 py-1.5 dark:bg-background-dark">
      <p className="text-xs font-semibold text-ink dark:text-gray-200">{value}</p>
      <p className="text-[9px] text-muted">{label}</p>
    </div>
  )
}

function RouteMap({ polyline }: { polyline: string }) {
  const points = decodePolyline(polyline)
  if (points.length < 2) return null

  const W = 320
  const H = 180
  const path = polylineToSvgPath(points, W, H, 12)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background dark:border-border-dark dark:bg-background-dark">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink dark:text-gray-400"
        />
        {/* Start dot */}
        {points.length > 0 && (() => {
          const startPts = polylineToSvgPath([points[0], points[0]], W, H, 12)
          const [, coords] = startPts.split('M')[1]?.split('L') ?? ['', '']
          const [x, y] = (coords || startPts.replace('M', '')).split(',').map(Number)
          return <circle cx={x || 0} cy={y || 0} r="4" className="fill-accent" />
        })()}
      </svg>
    </div>
  )
}
