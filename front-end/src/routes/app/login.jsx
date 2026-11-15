import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { loginUser, isLoggedIn } from '../../utils/auth'
import { Notice, Spinner } from '../../components/ui'

// Only allow redirects inside the app (no open redirects to other sites)
const safeRedirect = (r) => (typeof r === 'string' && r.startsWith('/app') && !r.startsWith('//') ? r : '/app')

export const Route = createFileRoute('/app/login')({
  validateSearch: (search) => ({ redirect: typeof search.redirect === 'string' ? search.redirect : undefined }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { redirect } = Route.useSearch()
  const target = safeRedirect(redirect)
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoggedIn()) navigate({ to: target, replace: true })
  }, [navigate, target])

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Please enter your username and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await loginUser(form.username.trim(), form.password)
      navigate({ to: target, replace: true })
    } catch (err) {
      setError(/fetch|network/i.test(err.message) ? 'Could not reach the server. Is Block+ running?' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md animate-rise">
      <p className="eyebrow mb-3 text-center">Welcome back</p>
      <h1 className="display text-center text-6xl">Log in<span className="text-brand">.</span></h1>
      <p className="mt-3 text-center text-ink-soft">Access your encrypted files on Walrus.</p>

      <form onSubmit={onSubmit} className="card mt-8 space-y-5" noValidate>
        <div>
          <label htmlFor="username" className="field-label">Username</label>
          <input id="username" name="username" autoComplete="username" className="input" value={form.username}
            onChange={onChange} disabled={loading} placeholder="your-username" />
        </div>
        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" className="input"
            value={form.password} onChange={onChange} disabled={loading} placeholder="••••••••" />
        </div>

        {error && <Notice type="bad">{error}</Notice>}

        <button type="submit" disabled={loading} className="btn btn-lg btn-ink w-full">
          {loading ? <><Spinner /> Logging in…</> : 'Log in'}
        </button>

        <p className="text-center text-sm text-ink-soft">
          New here? <Link to="/app/register" className="font-bold text-brand hover:underline">Create an account</Link>
        </p>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        Passwords are stored as bcrypt hashes. Sessions expire after 24 hours.
      </p>
    </div>
  )
}
