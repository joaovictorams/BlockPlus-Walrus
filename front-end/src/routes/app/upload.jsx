import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { requireAuth } from '../../utils/guard'
import { getToken, logoutUser } from '../../utils/auth'
import { formatFileSize, shortHash } from '../../utils/format'
import { Icon, Notice, PageHeader, Spinner } from '../../components/ui'

const MAX_BYTES = 100 * 1024 * 1024

export const Route = createFileRoute('/app/upload')({
  beforeLoad: requireAuth,
  component: UploadPage,
})

// XMLHttpRequest instead of fetch() so we get real upload progress events.
function uploadWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/file/upload')
    xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.upload.onload = () => onProgress(1)
    xhr.onload = () => {
      let data = null
      try { data = JSON.parse(xhr.responseText) } catch { /* not JSON */ }
      if (xhr.status === 401) {
        logoutUser()
        return reject(new Error('Your session expired. Please log in again.'))
      }
      if (xhr.status >= 200 && xhr.status < 300 && data) return resolve(data)
      reject(new Error(data?.error || data?.message || `Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Could not reach the server.'))
    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}

function UploadPage() {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | sending | storing
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const busy = phase !== 'idle'

  const pick = (f) => {
    setResult(null)
    setError('')
    if (!f) return
    if (f.size > MAX_BYTES) {
      setError(`"${f.name}" is ${formatFileSize(f.size)}. The limit is 100 MB.`)
      return
    }
    setFile(f)
  }

  const clear = () => {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const upload = async () => {
    if (!file || busy) return
    setError('')
    setResult(null)
    setProgress(0)
    setPhase('sending')
    try {
      const data = await uploadWithProgress(file, (p) => {
        setProgress(p)
        if (p >= 1) setPhase('storing')
      })
      setResult({ ...data, name: file.name })
      clear()
    } catch (err) {
      setError(err.message)
    } finally {
      setPhase('idle')
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (!busy) pick(e.dataTransfer.files?.[0])
  }

  return (
    <div className="animate-rise">
      <PageHeader eyebrow="Upload" title="Drop it" accent="here.">
        Files are encrypted with AES-256-GCM by Block+ and then stored on Walrus.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div>
          <label
            htmlFor="file-input"
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-8 text-center transition-colors ${
              dragging ? 'border-brand bg-ice' : 'border-line bg-white hover:border-ink'
            } ${busy ? 'pointer-events-none opacity-60' : ''}`}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-white">
              <Icon name="upload" className="h-7 w-7" />
            </span>
            {file ? (
              <>
                <p className="mt-5 max-w-full truncate text-xl font-bold">{file.name}</p>
                <p className="text-ink-soft">{formatFileSize(file.size)}</p>
              </>
            ) : (
              <>
                <p className="mt-5 text-xl font-bold">Drag a file here, or click to choose</p>
                <p className="text-ink-soft">Any file type · up to 100 MB</p>
              </>
            )}
            <input id="file-input" ref={inputRef} type="file" className="sr-only" disabled={busy}
              onChange={(e) => pick(e.target.files?.[0])} />
          </label>

          {busy && (
            <div className="card mt-4">
              <div className="mb-2 flex items-center justify-between text-sm font-bold">
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  {phase === 'sending' ? 'Sending to Block+…' : 'Encrypting and storing on Walrus…'}
                </span>
                {phase === 'sending' && <span>{Math.round(progress * 100)}%</span>}
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-mist">
                <div
                  className={`h-full rounded-full bg-brand transition-all duration-300 ${phase === 'storing' ? 'w-full animate-pulse' : ''}`}
                  style={phase === 'sending' ? { width: `${Math.max(3, progress * 100)}%` } : undefined}
                />
              </div>
              {phase === 'storing' && (
                <p className="mt-2 text-xs text-muted">Walrus is spreading the file over its storage nodes. This can take a few seconds.</p>
              )}
            </div>
          )}

          {error && <Notice type="bad" className="mt-4">{error}</Notice>}

          {result && (
            <div className="card-tint mt-4 bg-mint">
              <p className="flex items-center gap-2 text-lg font-bold">
                <Icon name="check" className="h-5 w-5" strokeWidth={3} /> "{result.name}" is stored on Walrus
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Blob ID <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">{shortHash(result.blobId)}</code>
                {result.endEpoch != null && <> · stored until epoch {result.endEpoch}</>}
              </p>
              <Link to="/app/files" className="btn btn-sm btn-ink mt-4">See my files <Icon name="arrow" className="h-4 w-4" /></Link>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button onClick={upload} disabled={!file || busy} className="btn btn-lg btn-ink flex-1">
              {busy ? <><Spinner /> Uploading…</> : <><Icon name="upload" /> Upload file</>}
            </button>
            {file && !busy && (
              <button onClick={clear} className="btn btn-lg btn-soft">Clear</button>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card-tint bg-ice">
            <p className="eyebrow mb-3 text-ink/60">What happens</p>
            <ol className="space-y-3 text-sm">
              {['Your file is sent to Block+', 'Block+ encrypts it (AES-256-GCM)', 'Walrus splits and spreads it over storage nodes', 'Sui certifies it, and you get a blob ID'].map((t, i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="card-tint bg-butter text-sm">
            <p className="mb-1 font-bold">Good to know</p>
            <p className="text-ink-soft">
              Data on Walrus is public, which is why only the encrypted version leaves Block+. On testnet, Walrus wipes data from time to time.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
