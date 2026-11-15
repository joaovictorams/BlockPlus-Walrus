// Header + footer shared by the landing page and the app pages.
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth, logoutUser, formatWalletAddress } from '../utils/auth'
import { Logo, Icon } from './ui'

const publicLinks = [
  { to: '/app/about', label: 'About' },
  { to: '/app/pricing', label: 'Pricing' },
  { to: '/app/contact', label: 'Contact' },
]
const appLinks = [
  { to: '/app/upload', label: 'Upload' },
  { to: '/app/files', label: 'My files' },
]

function NavLink({ to, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="rounded-full px-4 py-2 text-sm font-bold text-ink-soft transition-colors hover:bg-mist hover:text-ink"
      activeProps={{ className: '!bg-ink !text-white' }}
    >
      {children}
    </Link>
  )
}

export function SiteHeader() {
  const session = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // The mobile menu stays open only on the page where it was opened,
  // so navigating closes it without an extra effect.
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === pathname
  const setOpen = (fn) => setOpenOn(fn(open) ? pathname : null)

  const links = session ? [...appLinks, ...publicLinks] : publicLinks

  const signOut = () => {
    logoutUser()
    navigate({ to: '/' })
  }

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full bg-white/85 pl-6 pr-2 ring-1 ring-line backdrop-blur-md">
        <Link to={session ? '/app' : '/'} aria-label="Block+ home" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}>{l.label}</NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {session ? (
            <>
              <Link to="/app" className="flex items-center gap-2 rounded-full bg-mist py-1.5 pl-1.5 pr-4 text-sm transition-colors hover:bg-line">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ice"><Icon name="user" className="h-4 w-4" /></span>
                <span className="font-bold">{session.username || formatWalletAddress(session.wallet)}</span>
              </Link>
              <button onClick={signOut} className="btn btn-sm btn-soft" title="Sign out">
                <Icon name="logout" className="h-4 w-4" /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/app/login" className="btn btn-sm btn-soft">Log in</Link>
              <Link to="/app/register" className="btn btn-sm btn-ink">Get started</Link>
            </>
          )}
        </div>

        <button
          className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-mist md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <Icon name={open ? 'close' : 'menu'} className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="mx-auto mt-2 max-w-6xl animate-rise rounded-[2rem] bg-white p-3 ring-1 ring-line md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="rounded-2xl px-4 py-3 font-bold hover:bg-mist" activeProps={{ className: '!bg-ink !text-white' }}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex gap-2 border-t border-line pt-3">
            {session ? (
              <button onClick={signOut} className="btn btn-soft w-full"><Icon name="logout" className="h-4 w-4" /> Sign out</button>
            ) : (
              <>
                <Link to="/app/login" className="btn btn-soft flex-1">Log in</Link>
                <Link to="/app/register" className="btn btn-ink flex-1">Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-24 px-3 pb-3 sm:px-6">
      <div className="mx-auto max-w-6xl rounded-[2rem] bg-ink px-6 py-12 text-white sm:px-10">
        <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <Logo className="text-4xl" />
            <p className="mt-3 max-w-sm text-sm text-white/60">
              Encrypted file storage on Walrus, the decentralized storage network built on Sui.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold" aria-label="Footer">
            <Link to="/app/about" className="text-white/70 hover:text-white">About</Link>
            <Link to="/app/pricing" className="text-white/70 hover:text-white">Pricing</Link>
            <Link to="/app/contact" className="text-white/70 hover:text-white">Contact</Link>
            <Link to="/app/terms" className="text-white/70 hover:text-white">Terms</Link>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Block+</p>
          <p>Built on Sui · Stored on Walrus</p>
        </div>
      </div>
    </footer>
  )
}
