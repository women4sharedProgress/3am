import { useEffect } from 'react'
import PageTopBar from '../components/PageTopBar'

const wrap: React.CSSProperties = {
  maxWidth: 680,
  margin: '0 auto',
  padding: '0 24px',
}

const h1Style: React.CSSProperties = {
  fontFamily: "'Quicksand', sans-serif",
  fontSize: 28,
  fontWeight: 700,
  color: '#4f4262',
  marginBottom: 20,
  letterSpacing: '.2px',
}

const p: React.CSSProperties = {
  fontFamily: "'Nunito', sans-serif",
  fontSize: 15,
  lineHeight: 1.75,
  color: 'var(--color-text-primary)',
  marginBottom: 16,
}

export default function OpenSource() {
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
      color: 'var(--color-text-primary)',
      padding: '50px 0 64px',
    }}>
      <PageTopBar />

      <div style={wrap}>
        <h1 style={h1Style}>Clone &amp; Deploy</h1>

        <p style={p}>
          Developer documentation and clone instructions — coming soon.
        </p>
      </div>
    </div>
  )
}
