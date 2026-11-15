// Authentication helpers shared by every page.
//
// The session lives in localStorage (jwtToken, walletAddress, username).
// Every change fires a window "authChange" event, and useAuth() keeps
// components in sync with it.

import { useEffect, useState } from 'react'

const KEYS = ['jwtToken', 'walletAddress', 'username']

function tokenPayload(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(part))
  } catch {
    return null
  }
}

function emit() {
  window.dispatchEvent(new CustomEvent('authChange'))
}

export function readSession() {
  const token = localStorage.getItem('jwtToken')
  const payload = token && tokenPayload(token)
  if (!payload || !(payload.exp > Date.now() / 1000)) return null
  return {
    token,
    wallet: localStorage.getItem('walletAddress') || '',
    username: localStorage.getItem('username') || payload.username || '',
    exp: payload.exp,
  }
}

export const isLoggedIn = () => readSession() !== null
export const getToken = () => readSession()?.token || null

export function saveSession({ token, wallet, username }) {
  localStorage.setItem('jwtToken', token)
  localStorage.setItem('walletAddress', wallet || '')
  localStorage.setItem('username', username || '')
  emit()
}

export function logoutUser() {
  KEYS.forEach((k) => localStorage.removeItem(k))
  localStorage.removeItem('rememberLogin') // left over from older versions
  emit()
}

// React hook: current session (or null), updated on login/logout/expiry.
export function useAuth() {
  const [session, setSession] = useState(() => readSession())
  useEffect(() => {
    const update = () => setSession(readSession())
    window.addEventListener('authChange', update)
    window.addEventListener('storage', update) // other tabs
    const timer = setInterval(update, 60_000) // token expiry
    return () => {
      window.removeEventListener('authChange', update)
      window.removeEventListener('storage', update)
      clearInterval(timer)
    }
  }, [])
  return session
}

async function errorMessage(response, fallback) {
  const data = await response.json().catch(() => null)
  return data?.message || data?.error || fallback
}

export async function loginUser(username, password) {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) throw new Error(await errorMessage(response, 'Login failed'))
  const result = await response.json()
  if (!result.token) throw new Error('Invalid response from server')
  saveSession(result)
  return result
}

export async function registerUser({ wallet, username, password, transactionHash }) {
  const response = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, username, password, transactionHash }),
  })
  if (!response.ok) throw new Error(await errorMessage(response, 'Registration failed'))
  const result = await response.json()
  if (!result.token) throw new Error('Invalid response from server')
  saveSession(result)
  return result
}

// fetch() with the session token. Logs out and throws on 401.
export async function apiFetch(url, options = {}) {
  const token = getToken()
  if (!token) {
    logoutUser()
    throw new Error('Not signed in. Please log in again.')
  }
  const response = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  })
  if (response.status === 401) {
    logoutUser()
    throw new Error('Your session expired. Please log in again.')
  }
  if (!response.ok) throw new Error(await errorMessage(response, `Request failed (${response.status})`))
  return response
}

export const formatWalletAddress = (address) =>
  !address || address.length < 12 ? address || '' : `${address.slice(0, 6)}…${address.slice(-4)}`
