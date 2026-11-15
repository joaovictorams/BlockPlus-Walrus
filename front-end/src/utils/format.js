export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${parseFloat((bytes / 1024 ** i).toFixed(i ? 1 : 0))} ${units[i]}`
}

// SQLite's CURRENT_TIMESTAMP is UTC without a zone ("2026-11-15 11:37:02"),
// which browsers would read as local time. Mark it as UTC first.
export function parseDbDate(value) {
  if (!value) return null
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`
  const d = new Date(iso)
  return isNaN(d) ? null : d
}

export function formatDate(value) {
  const d = parseDbDate(value)
  return d
    ? d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Unknown'
}

export const shortHash = (hash, start = 8, end = 6) =>
  !hash || hash.length <= start + end ? hash || '' : `${hash.slice(0, start)}…${hash.slice(-end)}`
