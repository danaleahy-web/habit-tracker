export function SettingsPage() {
  return (
    <div className="px-4 pb-6 pt-6">
      <h1 className="text-2xl font-bold text-ink dark:text-gray-100">Settings</h1>
      <p className="mt-1 text-sm text-muted">Manage your data and preferences.</p>

      <div className="mt-6 space-y-1">
        <SettingsButton label="Export to JSON" desc="Download a backup of all your data" />
        <SettingsButton label="Import from JSON" desc="Restore data from a backup file" />
        <div className="!mt-4 border-t border-border pt-4 dark:border-border-dark">
          <SettingsButton label="Reset Strava Credentials" desc="Remove saved API keys and re-enter them" danger />
        </div>
      </div>
    </div>
  )
}

function SettingsButton({ label, desc, danger }: { label: string; desc: string; danger?: boolean }) {
  return (
    <button className="flex w-full items-start gap-4 border-b border-border px-1 py-4 text-left transition-colors last:border-0 hover:bg-background dark:border-border-dark dark:hover:bg-background-dark">
      <div>
        <p className={`text-sm font-medium ${danger ? 'text-red-600 dark:text-red-400' : 'text-ink dark:text-gray-100'}`}>
          {label}
        </p>
        <p className="mt-0.5 text-xs text-muted">{desc}</p>
      </div>
    </button>
  )
}
