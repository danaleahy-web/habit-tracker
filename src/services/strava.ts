import { getSetting, setSetting, deleteSetting } from '../db/settings'
import { db, type Activity } from '../db/index'

// ---------- Constants ----------

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize'
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
const STRAVA_API_URL = 'https://www.strava.com/api/v3'

// The redirect URI must match what's configured in your Strava app settings
function getRedirectUri(): string {
  return `${window.location.origin}/habit-tracker/settings`
}

// ---------- OAuth ----------

/** Build the Strava authorization URL and redirect the user */
export async function startOAuth(): Promise<void> {
  const clientId = await getSetting('strava_client_id')
  if (!clientId) throw new Error('Client ID not configured')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  })

  window.location.href = `${STRAVA_AUTH_URL}?${params.toString()}`
}

/** Exchange the authorization code for access + refresh tokens */
export async function exchangeToken(code: string): Promise<void> {
  const clientId = await getSetting('strava_client_id')
  const clientSecret = await getSetting('strava_client_secret')
  if (!clientId || !clientSecret) throw new Error('Strava credentials not configured')

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  const data = await res.json()
  await saveTokens(data)
}

/** Refresh an expired access token using the refresh token */
async function refreshAccessToken(): Promise<string> {
  const clientId = await getSetting('strava_client_id')
  const clientSecret = await getSetting('strava_client_secret')
  const refreshToken = await getSetting('strava_refresh_token')
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing credentials for token refresh')
  }

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    throw new Error('Token refresh failed — reconnect Strava')
  }

  const data = await res.json()
  await saveTokens(data)
  return data.access_token
}

/** Save token data from Strava's response */
async function saveTokens(data: {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete?: { id: number; firstname: string; lastname: string }
}): Promise<void> {
  await setSetting('strava_access_token', data.access_token)
  await setSetting('strava_refresh_token', data.refresh_token)
  await setSetting('strava_expires_at', String(data.expires_at))
  if (data.athlete) {
    await setSetting('strava_athlete_name', `${data.athlete.firstname} ${data.athlete.lastname}`)
    await setSetting('strava_athlete_id', String(data.athlete.id))
  }
}

/** Get a valid access token, refreshing if expired */
async function getValidToken(): Promise<string> {
  const token = await getSetting('strava_access_token')
  const expiresAt = await getSetting('strava_expires_at')

  if (!token || !expiresAt) {
    throw new Error('Not connected to Strava')
  }

  // Refresh if token expires within 5 minutes
  const expiresAtSec = parseInt(expiresAt, 10)
  const nowSec = Math.floor(Date.now() / 1000)

  if (nowSec >= expiresAtSec - 300) {
    return refreshAccessToken()
  }

  return token
}

/** Check if we have a stored Strava connection */
export async function isStravaConnected(): Promise<boolean> {
  const token = await getSetting('strava_access_token')
  const refresh = await getSetting('strava_refresh_token')
  return Boolean(token && refresh)
}

/** Get the connected athlete's name */
export async function getAthleteName(): Promise<string | undefined> {
  return getSetting('strava_athlete_name')
}

/** Disconnect Strava (clear all tokens) */
export async function disconnectStrava(): Promise<void> {
  await deleteSetting('strava_access_token')
  await deleteSetting('strava_refresh_token')
  await deleteSetting('strava_expires_at')
  await deleteSetting('strava_athlete_name')
  await deleteSetting('strava_athlete_id')
}

// ---------- Activity Sync ----------

interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  distance: number
  moving_time: number
  start_date_local: string
  [key: string]: unknown
}

export interface SyncResult {
  fetched: number
  newlyAdded: number
  alreadyExisted: number
}

/**
 * Fetch activities from Strava and upsert them into the local DB.
 * Deduplicates by stravaId (unique index).
 * Fetches up to `pages` pages of 100 activities each.
 */
export async function syncActivities(pages = 3): Promise<SyncResult> {
  const token = await getValidToken()

  let fetched = 0
  let newlyAdded = 0
  let alreadyExisted = 0

  for (let page = 1; page <= pages; page++) {
    const params = new URLSearchParams({
      page: String(page),
      per_page: '100',
    })

    const res = await fetch(`${STRAVA_API_URL}/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      if (res.status === 401) {
        // Token might have just expired — try one refresh
        const newToken = await refreshAccessToken()
        const retryRes = await fetch(`${STRAVA_API_URL}/athlete/activities?${params}`, {
          headers: { Authorization: `Bearer ${newToken}` },
        })
        if (!retryRes.ok) throw new Error(`Strava API error: ${retryRes.status}`)
        const retryData: StravaActivity[] = await retryRes.json()
        const result = await upsertActivities(retryData)
        fetched += retryData.length
        newlyAdded += result.added
        alreadyExisted += result.skipped
        if (retryData.length < 100) break
        continue
      }
      throw new Error(`Strava API error: ${res.status}`)
    }

    const activities: StravaActivity[] = await res.json()
    fetched += activities.length

    const result = await upsertActivities(activities)
    newlyAdded += result.added
    alreadyExisted += result.skipped

    // If we got fewer than 100, there are no more pages
    if (activities.length < 100) break
  }

  // Store last sync timestamp
  await setSetting('strava_last_sync', new Date().toISOString())

  return { fetched, newlyAdded, alreadyExisted }
}

/** Upsert a batch of Strava activities into the local DB */
async function upsertActivities(
  stravaActivities: StravaActivity[]
): Promise<{ added: number; skipped: number }> {
  let added = 0
  let skipped = 0

  for (const sa of stravaActivities) {
    const stravaId = String(sa.id)

    // Check if already exists (unique index on stravaId)
    const existing = await db.activities.where('stravaId').equals(stravaId).first()

    if (existing) {
      skipped++
      continue
    }

    const activity: Activity = {
      stravaId,
      name: sa.name,
      type: sa.sport_type || sa.type,
      distanceMeters: sa.distance,
      movingTimeSecs: sa.moving_time,
      startDate: new Date(sa.start_date_local),
      raw: JSON.stringify(sa),
    }

    try {
      await db.activities.add(activity)
      added++
    } catch {
      // Likely a duplicate constraint violation — skip
      skipped++
    }
  }

  return { added, skipped }
}

/** Get the last sync timestamp */
export async function getLastSyncTime(): Promise<string | undefined> {
  return getSetting('strava_last_sync')
}

/** Get total activity count in local DB */
export async function getLocalActivityCount(): Promise<number> {
  return db.activities.count()
}
