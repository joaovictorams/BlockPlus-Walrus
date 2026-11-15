import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { requireAuth } from '../../utils/guard'
import { apiFetch } from '../../utils/auth'
import { formatDate, formatFileSize, shortHash } from '../../utils/format'
import { Icon, Notice, PageHeader, Spinner } from '../../components/ui'

export const Route = createFileRoute('/app/files')({
  beforeLoad: requireAuth,
  component: FilesPage,
})

function useToast() {
  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])
  return [toast, (text, type = 'ok') => setToast({ text, type, id: Date.now() })]
}

function FilesPage() {
  const [files, setFiles] = useState(null) // null = first load
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState({}) // hash -> 'download' | 'delete'
  const [copied, setCopied] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [toast, showToast] = useToast()

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const data = await (await apiFetch('/file/')).json()
      setFiles(data)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Refresh quietly in the background (no spinner, no flicker)
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  const setFileBusy = (hash, v) => setBusy((b) => ({ ...b, [hash]: v }))

  const download = async (file) => {
    setFileBusy(file.hash, 'download')
    try {
      const blob = await (await apiFetch(`/file/download/${encodeURIComponent(file.hash)}`)).blob()
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: file.original_filename || 'file' })
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      showToast(err.message, 'bad')
    } finally {
      setFileBusy(file.hash, null)
    }
  }

  const copy = async (hash) => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(hash)
      setTimeout(() => setCopied(''), 2000)
      showToast('Blob ID copied')
    } catch {
      showToast('Could not copy. Your browser blocked clipboard access.', 'bad')
    }
  }

  const remove = async () => {
    const file = toDelete
    setFileBusy(file.hash, 'delete')
    try {
      await apiFetch(`/file/${encodeURIComponent(file.hash)}`, { method: 'DELETE' })
      setFiles((fs) => fs.filter((f) => f.hash !== file.hash))
      showToast(`"${file.original_filename}" removed`)
      setToDelete(null)
    } catch (err) {
      showToast(err.message, 'bad')
    } finally {
      setFileBusy(file.hash, null)
    }
  }

  const total = files?.reduce((s, f) => s + (f.size || 0), 0) || 0

  return (
    <div className="animate-rise">
      <PageHeader eyebrow="My files" title="Your" accent="stash.">
        Everything you stored on Walrus, decrypted on download.
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="chip bg-ice">{files ? files.length : '–'} file{files?.length === 1 ? '' : 's'}</span>
          <span className="chip bg-lilac">{formatFileSize(total)}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={refreshing} className="btn btn-sm btn-soft">
            {refreshing ? <Spinner className="h-4 w-4" /> : <Icon name="refresh" className="h-4 w-4" />} Refresh
          </button>
          <Link to="/app/upload" className="btn btn-sm btn-ink"><Icon name="upload" className="h-4 w-4" /> Upload</Link>
        </div>
      </div>

      {error && (
        <Notice type="bad" className="mb-4 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={load} className="btn btn-sm btn-ink">Try again</button>
        </Notice>
      )}

      {files === null && !error ? (
        <div className="card flex items-center justify-center gap-3 py-16 text-ink-soft"><Spinner /> Loading your files…</div>
      ) : files?.length === 0 ? (
        <div className="card-tint flex flex-col items-center bg-mist py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white"><Icon name="file" className="h-7 w-7" /></span>
          <h2 className="display mt-5 text-4xl">Nothing here yet</h2>
          <p className="mt-2 text-ink-soft">Upload your first file to get started.</p>
          <Link to="/app/upload" className="btn btn-ink mt-6"><Icon name="upload" className="h-4 w-4" /> Upload a file</Link>
        </div>
      ) : files ? (
        <ul className="space-y-3">
          {files.map((f) => (
            <li key={f.id ?? f.hash} className="card flex flex-col gap-4 !p-5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ice"><Icon name="file" className="h-6 w-6" /></span>
                <div className="min-w-0">
                  <p className="truncate font-bold">{f.original_filename}</p>
                  <p className="text-sm text-ink-soft">
                    {formatFileSize(f.size)} · {formatDate(f.createdAt)}
                    {f.end_epoch != null && <> · until epoch {f.end_epoch}</>}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted">{shortHash(f.hash)}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => download(f)} disabled={!!busy[f.hash]} className="btn btn-sm btn-ink" title="Download">
                  {busy[f.hash] === 'download' ? <Spinner className="h-4 w-4" /> : <Icon name="download" className="h-4 w-4" />} Download
                </button>
                <button onClick={() => copy(f.hash)} className="btn btn-sm btn-soft" title="Copy blob ID" aria-label="Copy blob ID">
                  <Icon name={copied === f.hash ? 'check' : 'copy'} className="h-4 w-4" />
                </button>
                <button onClick={() => setToDelete(f)} disabled={!!busy[f.hash]} className="btn btn-sm btn-soft hover:!bg-coral" title="Remove" aria-label="Remove file">
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Delete confirmation */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="del-title">
          <div className="card w-full max-w-md animate-rise">
            <h2 id="del-title" className="display text-4xl">Remove file?</h2>
            <p className="mt-3 truncate font-bold">{toDelete.original_filename}</p>
            <p className="text-sm text-ink-soft">{formatFileSize(toDelete.size)} · {shortHash(toDelete.hash)}</p>
            <Notice type="warn" className="mt-4">
              The file disappears from Block+ right away. The encrypted copy stays on Walrus until its storage period
              ends, but nobody can read it without the Block+ key.
            </Notice>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setToDelete(null)} disabled={busy[toDelete.hash] === 'delete'} className="btn btn-soft flex-1">Cancel</button>
              <button onClick={remove} disabled={busy[toDelete.hash] === 'delete'} className="btn btn-danger flex-1">
                {busy[toDelete.hash] === 'delete' ? <><Spinner className="h-4 w-4" /> Removing…</> : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div key={toast.id} className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-rise">
          <div className={`rounded-full px-5 py-3 text-sm font-bold shadow-lg ${toast.type === 'bad' ? 'bg-bad text-white' : 'bg-ink text-white'}`}>
            {toast.text}
          </div>
        </div>
      )}
    </div>
  )
}
