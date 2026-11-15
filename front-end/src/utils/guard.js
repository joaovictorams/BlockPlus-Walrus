import { redirect } from '@tanstack/react-router'
import { isLoggedIn } from './auth'

// Use as `beforeLoad: requireAuth` on routes that need a session.
// Sends visitors to the login page and brings them back afterwards.
export function requireAuth({ location }) {
  if (!isLoggedIn()) {
    throw redirect({ to: '/app/login', search: { redirect: location.pathname } })
  }
}
