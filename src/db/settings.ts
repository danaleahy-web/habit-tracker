import { db } from './index'

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await db.settings.get(key)
  return row?.value
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value })
}

export async function deleteSetting(key: string): Promise<void> {
  await db.settings.delete(key)
}

export async function isSetupComplete(): Promise<boolean> {
  const clientId = await getSetting('strava_client_id')
  const clientSecret = await getSetting('strava_client_secret')
  return Boolean(clientId && clientSecret)
}
