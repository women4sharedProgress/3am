import { useEffect } from 'react'
import PageTopBar from '../components/PageTopBar'

export default function Settings() {
  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-page', 'content')
    return () => {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.removeAttribute('data-page')
    }
  }, [])
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg-secondary)',
      padding: '50px 28px 32px',
      color: 'var(--color-text-primary)',
      fontFamily: "'Nunito', sans-serif",
    }}>
      <PageTopBar />
      <h1 style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 12, color: 'var(--page-title)' }}>
        Settings
      </h1>
      <p style={{ fontSize: 18, color: 'var(--page-title)', lineHeight: 1.6 }}>
        Settings page coming soon.
      </p>
    </div>
  )
}
