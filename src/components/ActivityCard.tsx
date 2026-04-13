import { useState } from 'react'
import type { Activity } from '../db/index'
import { decodePolyline } from '../lib/polyline'

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
        <span className="rounded border border-border px-1 py-0.5 text-xs text-muted dark:border-border-dark">{activity.type}</span>
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
            <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted dark:border-border-dark">
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
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

/** Convert lat/lng to tile x/y at a given zoom level */
function latLngToTile(lat: number, lng: number, zoom: number): [number, number] {
  const n = Math.pow(2, zoom)
  const x = ((lng + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  return [x, y]
}

function RouteMap({ polyline }: { polyline: string }) {
  const points = decodePolyline(polyline)
  if (points.length < 2) return null

  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  // Find zoom level that fits the bounds in ~3-4 tiles
  let zoom = 15
  for (let z = 16; z >= 1; z--) {
    const [x1] = latLngToTile(maxLat, minLng, z)
    const [x2] = latLngToTile(minLat, maxLng, z)
    const [, y1] = latLngToTile(maxLat, minLng, z)
    const [, y2] = latLngToTile(minLat, maxLng, z)
    if (Math.abs(x2 - x1) <= 3 && Math.abs(y2 - y1) <= 3) { zoom = z; break }
  }

  // Get tile range with 0.5 tile padding
  const [txMin, tyMin] = latLngToTile(maxLat, minLng, zoom)
  const [txMax, tyMax] = latLngToTile(minLat, maxLng, zoom)
  const tileX0 = Math.floor(txMin - 0.3)
  const tileX1 = Math.ceil(txMax + 0.3)
  const tileY0 = Math.floor(tyMin - 0.3)
  const tileY1 = Math.ceil(tyMax + 0.3)

  const tilesW = tileX1 - tileX0
  const tilesH = tileY1 - tileY0
  const TILE_SIZE = 256
  const imgW = tilesW * TILE_SIZE
  const imgH = tilesH * TILE_SIZE

  // Convert lat/lng to pixel position on the tile grid
  const toPixel = (lat: number, lng: number): [number, number] => {
    const [tx, ty] = latLngToTile(lat, lng, zoom)
    return [(tx - tileX0) * TILE_SIZE, (ty - tileY0) * TILE_SIZE]
  }

  // Build SVG path from points
  const svgPath = points
    .map((p, i) => {
      const [x, y] = toPixel(p[0], p[1])
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const [startX, startY] = toPixel(points[0][0], points[0][1])
  const [endX, endY] = toPixel(points[points.length - 1][0], points[points.length - 1][1])

  // Generate tile URLs
  const tiles: { x: number; y: number; url: string }[] = []
  for (let ty = tileY0; ty < tileY1; ty++) {
    for (let tx = tileX0; tx < tileX1; tx++) {
      tiles.push({
        x: (tx - tileX0) * TILE_SIZE,
        y: (ty - tileY0) * TILE_SIZE,
        url: `https://a.basemaps.cartocdn.com/light_nolabels/${zoom}/${tx}/${ty}.png`,
      })
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border dark:border-border-dark">
      <svg viewBox={`0 0 ${imgW} ${imgH}`} className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
        {/* Map tiles */}
        {tiles.map((t, i) => (
          <image key={i} href={t.url} x={t.x} y={t.y} width={TILE_SIZE} height={TILE_SIZE} />
        ))}

        {/* Route line shadow */}
        <path d={svgPath} fill="none" stroke="white" strokeWidth="6"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />

        {/* Route line */}
        <path d={svgPath} fill="none" stroke="#2d2a26" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Start dot */}
        <circle cx={startX} cy={startY} r="5" fill="white" stroke="#2d2a26" strokeWidth="1.5" />
        <circle cx={startX} cy={startY} r="2" fill="#2d2a26" />

        {/* End dot */}
        <circle cx={endX} cy={endY} r="5" fill="#2d2a26" />
      </svg>
      <p className="bg-paper px-2 py-0.5 text-[7px] text-muted dark:bg-paper-dark">
        © CARTO · © OpenStreetMap
      </p>
    </div>
  )
}
