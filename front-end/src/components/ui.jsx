// Small shared UI pieces.

// The display font draws "+" very small, so the plus is an SVG sized to the cap height.
export function Plus({ className = '' }) {
  return (
    <svg viewBox="0 0 10 10" className={`inline-block h-[0.62em] w-[0.62em] align-[0.04em] text-brand ${className}`} aria-hidden="true">
      <path d="M5 0.5v9M0.5 5h9" stroke="currentColor" strokeWidth="3" />
    </svg>
  )
}

export function Logo({ className = '' }) {
  return (
    <span className={`display whitespace-nowrap text-[1.65rem] leading-none ${className}`} aria-label="Block+">
      block<Plus className="ml-[0.06em]" />
    </span>
  )
}

// Inline icons (stroke = currentColor)
const paths = {
  upload: 'M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  download: 'M12 4v12m0 0l-4-4m4 4l4-4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  file: 'M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm7 0v5h5',
  lock: 'M7 11V7a5 5 0 0110 0v4M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  check: 'M5 13l4 4L19 7',
  trash: 'M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  arrow: 'M5 12h14m-6-6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  refresh: 'M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0012 2.5M18.5 9A7 7 0 006.5 6.5',
  wallet: 'M3 7a2 2 0 012-2h13a1 1 0 011 1v2M3 7v10a2 2 0 002 2h14a1 1 0 001-1v-3M3 7h16a1 1 0 011 1v3m0 0h-4a2 2 0 000 4h4',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.5 3.5-5.5 3.5-9S14.5 5.5 12 3m0 18c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3M3.5 9h17M3.5 15h17',
  layers: 'M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5M3 16l9 5 9-5',
  clock: 'M12 7v5l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  logout: 'M15 17l5-5-5-5m5 5H9m4 9H6a2 2 0 01-2-2V5a2 2 0 012-2h7',
  info: 'M12 8h.01M11 12h1v5h1m-1 4a9 9 0 110-18 9 9 0 010 18z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
}

export function Icon({ name, className = 'h-5 w-5', strokeWidth = 2 }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

const noticeStyles = { info: 'notice-info', ok: 'notice-ok', bad: 'notice-bad', warn: 'notice-warn' }

export function Notice({ type = 'info', children, className = '' }) {
  return (
    <div role={type === 'bad' ? 'alert' : 'status'} className={`notice ${noticeStyles[type]} ${className}`}>
      {children}
    </div>
  )
}

// Page title block used by the inner pages
export function PageHeader({ eyebrow, title, accent, children }) {
  return (
    <header className="mb-10 animate-rise">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h1 className="display text-5xl sm:text-6xl">
        {title} {accent && <span className="text-brand">{accent}</span>}
      </h1>
      {children && <p className="mt-4 max-w-2xl text-lg text-ink-soft">{children}</p>}
    </header>
  )
}

// Rounded pastel tile with an icon
export function IconTile({ name, tint = 'bg-ice', className = '' }) {
  return (
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tint} ${className}`}>
      <Icon name={name} className="h-6 w-6" />
    </div>
  )
}
