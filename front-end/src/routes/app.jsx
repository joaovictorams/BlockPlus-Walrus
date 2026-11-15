import { Outlet, createFileRoute } from '@tanstack/react-router'
import { SiteHeader, SiteFooter } from '../components/SiteShell'

export const Route = createFileRoute('/app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 sm:px-6 sm:pt-16">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
