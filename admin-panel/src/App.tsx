import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './pages/DashboardLayout'
import { Toaster } from 'react-hot-toast'

export const SA_TOKEN_KEY = 'sa_token'
export const SA_USER_KEY = 'sa_user'

export function getAdminUser() {
  try { return JSON.parse(localStorage.getItem(SA_USER_KEY) || '') } catch { return null }
}

export function getAdminToken() {
  return localStorage.getItem(SA_TOKEN_KEY) || ''
}

export async function saFetch(url: string, options: RequestInit = {}) {
  const token = getAdminToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...((options.headers as Record<string, string>) || {}),
    },
  })
  
  if (res.status === 401) {
    localStorage.removeItem(SA_TOKEN_KEY)
    localStorage.removeItem(SA_USER_KEY)
    window.location.reload()
  }
  
  return res
}

export default function App() {
  const [page, setPage] = useState<'login' | 'dashboard'>('login')

  useEffect(() => {
    const admin = getAdminUser()
    if (admin?.isSystemAdmin) setPage('dashboard')
  }, [])

  const handleLoginSuccess = () => setPage('dashboard')
  const handleLogout = () => {
    localStorage.removeItem(SA_TOKEN_KEY)
    localStorage.removeItem(SA_USER_KEY)
    setPage('login')
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        className: 'text-sm font-medium',
        style: { borderRadius: '12px', background: '#334155', color: '#fff' }
      }} />
      {page === 'login' ? <LoginPage onSuccess={handleLoginSuccess} /> : <DashboardLayout onLogout={handleLogout} />}
    </>
  )
}
