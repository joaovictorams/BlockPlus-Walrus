import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { requireAuth } from '../../utils/guard'
import { useAuth, apiFetch, formatWalletAddress } from '../../utils/auth'
import { Icon, IconTile, Spinner } from '../../components/ui'
import { formatFileSize } from '../../utils/format'

export const Route = createFileRoute('/app/')({
  beforeLoad: requireAuth,
  component: Dashboard,
})

function Dashboard() {
  const session = useAuth()
  const [files, setFiles] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/file/')
      .then((r) => r.json())
      .then(setFiles)
      .catch((e) => setError(e.message))
  }, [])

  const total = files?.reduce((sum, f) => sum + (f.size || 0), 0) || 0

  return (
    <div className="animate-rise">
      <p className="eyebrow mb-3">Dashboard</p>
      <h1 className="display text-5xl sm:text-7xl">
        Hey{session?.username ? `, ${session.username}` : ''}<span className="text-brand">.</span>
      </h1>
      <p className="mt-4 text-lg text-ink-soft">
        Wallet <span className="font-bold text-ink">{formatWalletAddress(session?.wallet)}</span> · your files are encrypted and stored on Walrus.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="card-tint bg-ice">
          <p className="eyebrow text-ink/60">Files</p>
          <p className="display mt-2 text-6xl">{files ? files.length : <Spinner className="h-8 w-8" />}</p>
        </div>
        <div className="card-tint bg-lilac">
          <p className="eyebrow text-ink/60">Stored</p>
          <p className="display mt-2 text-6xl">{files ? formatFileSize(total) : <Spinner className="h-8 w-8" />}</p>
        </div>
        <div className="card-tint bg-butter">
          <p className="eyebrow text-ink/60">Encryption</p>
          <p className="display mt-2 text-6xl">AES-256</p>
        </div>
      </div>

      {error && <p className="notice notice-bad mt-4">{error}</p>}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Link to="/app/upload" className="group card flex items-center gap-5 transition-transform hover:-translate-y-1">
          <IconTile name="upload" tint="bg-ink text-white" />
          <div className="flex-1">
            <h2 className="text-xl font-bold">Upload a file</h2>
            <p className="text-ink-soft">Encrypt it and store it on Walrus.</p>
          </div>
          <Icon name="arrow" className="h-6 w-6 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link to="/app/files" className="group card flex items-center gap-5 transition-transform hover:-translate-y-1">
          <IconTile name="layers" tint="bg-mint" />
          <div className="flex-1">
            <h2 className="text-xl font-bold">My files</h2>
            <p className="text-ink-soft">Download, copy blob IDs or remove files.</p>
          </div>
          <Icon name="arrow" className="h-6 w-6 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  )
}
