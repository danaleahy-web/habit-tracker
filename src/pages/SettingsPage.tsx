import { useState, useEffect, useCallback, useRef } from 'react'
import { getSetting, setSetting } from '../db/settings'
import { downloadBackup, importFromJson } from '../services/backup'
import {
  startOAuth, exchangeToken, isStravaConnected, getAthleteName,
  disconnectStrava, syncActivities, getLastSyncTime, getLocalActivityCount,
  type SyncResult,
} from '../services/strava'

type StravaState = 'loading' | 'no-credentials' | 'has-credentials' | 'connected'

export function SettingsPage() {
  const [stravaState, setStravaState] = useState<StravaState>('loading')
  const [athleteName, setAthleteName] = useState('')
  const [lastSync, setLastSync] = useState<string | undefined>()
  const [activityCount, setActivityCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState('')
  const [oauthProcessing, setOauthProcessing] = useState(false)

  // Backup state
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string>('')
  const [confirmImport, setConfirmImport] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Credential form
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [savingCreds, setSavingCreds] = useState(false)

  const loadStravaState = useCallback(async () => {
    const connected = await isStravaConnected()
    if (connected) {
      setStravaState('connected')
      setAthleteName((await getAthleteName()) || 'Athlete')
      setLastSync(await getLastSyncTime())
      setActivityCount(await getLocalActivityCount())
      return
    }

    const cid = await getSetting('strava_client_id')
    const csec = await getSetting('strava_client_secret')
    if (cid && csec) {
      setStravaState('has-credentials')
    } else {
      setStravaState('no-credentials')
    }
  }, [])

  // Handle OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const oauthError = params.get('error')

    if (oauthError) {
      setError(`Authorization denied: ${oauthError}`)
      window.history.replaceState({}, '', window.location.pathname)
      loadStravaState()
      return
    }

    if (code) {
      setOauthProcessing(true)
      window.history.replaceState({}, '', window.location.pathname)
      exchangeToken(code)
        .then(async () => {
          setOauthProcessing(false)
          await loadStravaState()
          setSyncing(true)
          try { setSyncResult(await syncActivities()) }
          catch (err) { setError(err instanceof Error ? err.message : 'Sync failed') }
          finally { setSyncing(false); await loadStravaState() }
        })
        .catch((err) => {
          setOauthProcessing(false)
          setError(err instanceof Error ? err.message : 'OAuth failed')
          loadStravaState()
        })
    } else {
      loadStravaState()
    }
  }, [loadStravaState])

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimId = clientId.trim()
    const trimSecret = clientSecret.trim()
    if (!trimId || !trimSecret) { setError('Both fields are required.'); return }

    setSavingCreds(true)
    setError('')
    try {
      await setSetting('strava_client_id', trimId)
      await setSetting('strava_client_secret', trimSecret)
      setStravaState('has-credentials')
      setClientId('')
      setClientSecret('')
    } catch {
      setError('Failed to save credentials.')
    } finally {
      setSavingCreds(false)
    }
  }

  const handleConnect = async () => {
    setError('')
    try { await startOAuth() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to start OAuth') }
  }

  const handleSync = async () => {
    setError(''); setSyncResult(null); setSyncing(true)
    try { setSyncResult(await syncActivities()); await loadStravaState() }
    catch (err) { setError(err instanceof Error ? err.message : 'Sync failed') }
    finally { setSyncing(false) }
  }

  const handleDisconnect = async () => {
    await disconnectStrava()
    setStravaState('has-credentials')
    setAthleteName(''); setLastSync(undefined); setSyncResult(null)
  }

  const handleResetCredentials = async () => {
    await disconnectStrava()
    // Also clear client ID/secret
    const { deleteSetting } = await import('../db/settings')
    await deleteSetting('strava_client_id')
    await deleteSetting('strava_client_secret')
    setStravaState('no-credentials')
    setAthleteName(''); setLastSync(undefined); setSyncResult(null)
  }

  const fmtSync = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff}m ago`
    const h = Math.floor(diff / 60)
    if (h < 24) return `${h}h ago`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const handleExport = async () => {
    setExporting(true)
    try { await downloadBackup() }
    catch (err) { setError(err instanceof Error ? err.message : 'Export failed') }
    finally { setExporting(false) }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setConfirmImport(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImportConfirm = async () => {
    if (!pendingFile) return
    setConfirmImport(false)
    setImporting(true)
    setImportResult('')
    try {
      const text = await pendingFile.text()
      const result = await importFromJson(text)
      const total = result.habits + result.workouts + result.habitCompletions + result.workoutLogs + result.activities + result.journalNotes
      setImportResult(`Imported ${total} records (${result.habits} habits, ${result.workouts} workouts, ${result.activities} activities)`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      setPendingFile(null)
    }
  }

  return (
    <div className="px-4 pb-4 pt-4">
      <h1 className="text-xl font-bold text-ink dark:text-gray-100">Settings</h1>
      <p className="mt-0.5 text-sm text-muted">Manage your data and connections.</p>

      {/* ===== Strava Section ===== */}
      <div className="mt-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Strava</h2>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button onClick={() => setError('')} className="mt-1 text-xs text-red-500 underline underline-offset-2">Dismiss</button>
          </div>
        )}

        {(stravaState === 'loading' || oauthProcessing) ? (
          <p className="py-4 text-center text-sm text-muted">
            {oauthProcessing ? 'Connecting to Strava…' : 'Loading…'}
          </p>

        ) : stravaState === 'no-credentials' ? (
          /* Step 1: Enter API credentials */
          <div>
            <p className="text-sm text-ink-light dark:text-gray-400">
              Enter your Strava API credentials to get started. Find them at{' '}
              <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener noreferrer"
                className="text-accent underline underline-offset-2">strava.com/settings/api</a>
            </p>
            <form onSubmit={handleSaveCredentials} className="mt-3 space-y-3">
              <div>
                <label htmlFor="clientId" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                  Client ID
                </label>
                <input id="clientId" type="text" inputMode="numeric" autoComplete="off"
                  value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="12345"
                  className="w-full rounded-lg border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 dark:border-border-dark dark:bg-paper-dark dark:text-gray-100" />
              </div>
              <div>
                <label htmlFor="clientSecret" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                  Client Secret
                </label>
                <input id="clientSecret" type="password" autoComplete="off"
                  value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="••••••••••"
                  className="w-full rounded-lg border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 dark:border-border-dark dark:bg-paper-dark dark:text-gray-100" />
              </div>
              <button type="submit" disabled={savingCreds}
                className="w-full rounded-lg bg-ink py-2.5 text-sm font-semibold uppercase tracking-wider text-paper transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-50 dark:bg-gray-200 dark:text-gray-900">
                {savingCreds ? 'Saving…' : 'Save Credentials'}
              </button>
            </form>
            <p className="mt-2 text-xs text-muted">Stored locally on your device only.</p>
          </div>

        ) : stravaState === 'has-credentials' ? (
          /* Step 2: Credentials saved, connect OAuth */
          <div>
            <p className="text-sm text-ink-light dark:text-gray-400">
              Credentials saved. Connect your Strava account to start syncing.
            </p>
            <button onClick={handleConnect}
              className="mt-3 w-full rounded-lg bg-ink py-2.5 text-sm font-semibold uppercase tracking-wider text-paper transition-all hover:bg-primary-dark active:scale-[0.98] dark:bg-gray-200 dark:text-gray-900">
              Connect with Strava
            </button>
            <p className="mt-2 text-xs text-muted">Uses OAuth2 — your password is never shared.</p>
          </div>

        ) : (
          /* Connected */
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3 dark:border-border-dark">
              <div>
                <p className="text-sm font-medium text-ink dark:text-gray-100">{athleteName}</p>
                <p className="text-xs text-accent">Connected</p>
              </div>
              <button onClick={handleDisconnect}
                className="text-xs text-red-400 underline underline-offset-2 hover:text-red-600">
                Disconnect
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-paper px-4 py-3 dark:border-border-dark dark:bg-paper-dark">
                <p className="text-xl font-bold text-ink dark:text-gray-100">{activityCount}</p>
                <p className="text-xs text-muted">Activities</p>
              </div>
              <div className="rounded-lg border border-border bg-paper px-4 py-3 dark:border-border-dark dark:bg-paper-dark">
                <p className="text-sm font-semibold text-ink dark:text-gray-100">{lastSync ? fmtSync(lastSync) : 'Never'}</p>
                <p className="text-xs text-muted">Last synced</p>
              </div>
            </div>

            <button onClick={handleSync} disabled={syncing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-2.5 text-sm font-semibold uppercase tracking-wider text-paper transition-all hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60 dark:bg-gray-200 dark:text-gray-900">
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>

            {syncResult && !syncing && (
              <div className="rounded-lg border border-border bg-paper px-4 py-3 dark:border-border-dark dark:bg-paper-dark">
                <p className="text-sm font-semibold text-ink dark:text-gray-100">Sync complete</p>
                <p className="mt-1 text-xs text-muted">
                  {syncResult.fetched} fetched · {syncResult.newlyAdded} new · {syncResult.alreadyExisted} skipped
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Data Section ===== */}
      <div className="mt-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Data</h2>
        <div className="space-y-1">
          <button onClick={handleExport} disabled={exporting}
            className="flex w-full items-start gap-4 border-b border-border px-1 py-4 text-left transition-colors hover:bg-background dark:border-border-dark dark:hover:bg-background-dark disabled:opacity-50">
            <div>
              <p className="text-sm font-medium text-ink dark:text-gray-100">{exporting ? 'Exporting…' : 'Export to JSON'}</p>
              <p className="mt-0.5 text-xs text-muted">Download a backup of all your data</p>
            </div>
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            className="flex w-full items-start gap-4 border-b border-border px-1 py-4 text-left transition-colors hover:bg-background dark:border-border-dark dark:hover:bg-background-dark disabled:opacity-50">
            <div>
              <p className="text-sm font-medium text-ink dark:text-gray-100">{importing ? 'Importing…' : 'Import from JSON'}</p>
              <p className="mt-0.5 text-xs text-muted">Restore data from a backup file</p>
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
        </div>
        {importResult && (
          <p className="mt-2 rounded-lg border border-border bg-paper px-3 py-2 text-xs text-ink-light dark:border-border-dark dark:bg-paper-dark dark:text-gray-400">
            {importResult}
          </p>
        )}
      </div>

      {/* Import confirmation */}
      {confirmImport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setConfirmImport(false); setPendingFile(null) }} />
          <div className="relative mx-6 w-full max-w-sm rounded-2xl bg-paper p-6 shadow-xl dark:bg-paper-dark">
            <h3 className="text-lg font-bold text-ink dark:text-gray-100">Import backup?</h3>
            <p className="mt-2 text-sm text-muted">
              This will replace all existing data with the contents of the backup file. This cannot be undone.
            </p>
            <p className="mt-1 text-xs text-ink-light dark:text-gray-400">
              File: {pendingFile?.name}
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => { setConfirmImport(false); setPendingFile(null) }}
                className="flex-1 rounded-lg border border-border py-3 text-sm font-medium text-ink-light dark:border-border-dark dark:text-gray-400">
                Cancel
              </button>
              <button onClick={handleImportConfirm}
                className="flex-1 rounded-lg bg-ink py-3 text-sm font-semibold text-paper hover:bg-primary-dark active:scale-[0.98] dark:bg-gray-200 dark:text-gray-900">
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Danger Zone ===== */}
      <div className="mt-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Danger Zone</h2>
        <button onClick={handleResetCredentials}
          className="flex w-full items-start gap-4 border-b border-border px-1 py-4 text-left transition-colors hover:bg-background dark:border-border-dark dark:hover:bg-background-dark">
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Reset Strava Credentials</p>
            <p className="mt-0.5 text-xs text-muted">Remove saved API keys and disconnect</p>
          </div>
        </button>
      </div>
    </div>
  )
}

