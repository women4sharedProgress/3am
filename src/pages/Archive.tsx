import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ActiveFilters, Bill } from '../types/bill'
import { useBills } from '../hooks/useBills'
import { filterBills } from '../lib/billUtils'
import { getIdsByStatus } from '../lib/billStatus'
import Header from '../components/Header'
import FilterGroups from '../components/FilterGroups'
import BillCard from '../components/BillCard'
import ThemeToggle from '../components/ThemeToggle'
import type React from 'react'

const DEFAULT_FILTERS: ActiveFilters = {
  level: 'all', timing: 'all', impact: 'all', issue: 'all',
  policy: 'all', office: 'all', city: 'all', search: '',
}

const BTN: React.CSSProperties = {
  background: '#4F4262', color: '#fff',
  border: 'none', borderRadius: 20, padding: '5px 11px',
  display: 'flex', alignItems: 'center', gap: 5,
  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.25)',
  fontSize: 12, fontFamily: 'inherit',
}

function csvEscape(v: string) { return `"${v.replace(/"/g, '""')}"` }

function downloadCsv(bills: Bill[]) {
  const headers = ['Bill Number', 'Title', 'Level', 'Stage', 'Introduced', 'Urgency']
  const rows = bills.map(b => {
    const idx = b.name.indexOf(' — ')
    const num   = idx >= 0 ? b.name.slice(0, idx) : b.name
    const title = idx >= 0 ? b.name.slice(idx + 3) : ''
    return [num, title, b.level, String(b.stage), b.introduced, b.urgency]
      .map(csvEscape).join(',')
  })
  const csv = [headers.join(','), ...rows].join('\n')
  const d = new Date()
  const date = `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleDateString('en-US', { month: 'short' })}-${String(d.getFullYear()).slice(2)}`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `archive-${date}.csv`; a.click()
  URL.revokeObjectURL(url)
}

export default function Archive() {
  const navigate = useNavigate()
  const { bills, loading, error } = useBills(['MI', 'US'])
  const [active, setActive]         = useState<ActiveFilters>(DEFAULT_FILTERS)
  const [archiveIds, setArchiveIds] = useState<Set<number>>(() => getIdsByStatus('archive'))
  const [copied, setCopied]         = useState(false)

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-page', 'tracker')
    return () => {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.removeAttribute('data-page')
    }
  }, [])

  useEffect(() => {
    function sync() { setArchiveIds(getIdsByStatus('archive')) }
    window.addEventListener('bill-status-change', sync)
    return () => window.removeEventListener('bill-status-change', sync)
  }, [])

  function handleFilterChange(group: keyof ActiveFilters, value: string) {
    setActive(prev => ({ ...prev, [group]: value }))
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const archiveBills = bills.filter(b => archiveIds.has(b.id))
  const filtered     = filterBills(archiveBills, active)

  return (
    <div style={{ paddingTop: 44 }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border-light)',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/')} style={{
            background: '#4F4262', color: '#fff', border: 'none', borderRadius: 20,
            padding: '5px 9px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.25)',
          }} aria-label="Go to home">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </button>
          <button onClick={() => downloadCsv(filtered)} style={{ ...BTN, opacity: filtered.length === 0 ? 0.5 : 1 }}
            aria-label="Download CSV" disabled={filtered.length === 0}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
            Download CSV
          </button>
          <button onClick={handleCopyLink} style={BTN} aria-label="Copy link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
        <ThemeToggle />
      </div>

      <Header stateName="Archive" bills={archiveBills} onSearch={q => handleFilterChange('search', q)} />
      <FilterGroups active={active} onChange={handleFilterChange} />

      {loading && <div className="loading">Loading bills…</div>}
      {error   && <div className="empty">Error loading bills: {error}</div>}

      {!loading && !error && archiveIds.size === 0 && (
        <div className="empty" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 15, marginBottom: 8 }}>Your archive is empty.</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 20 }}>
            Tap the yellow dot on any bill card — selection dot found in the top right corner of policy card — to add it here. Archived bills are removed from the main tracker and kept here.
          </div>
          <button onClick={() => navigate('/tracker')} style={{ ...BTN, margin: '0 auto', fontSize: 13, padding: '7px 18px' }}>
            Go to tracker
          </button>
        </div>
      )}

      {!loading && !error && archiveIds.size > 0 && (
        <>
          <div className="count">
            {filtered.length} of {archiveBills.length} archived bill{archiveBills.length !== 1 ? 's' : ''} shown
          </div>
          {filtered.length === 0
            ? <div className="empty">No archived bills match these filters.</div>
            : filtered.map(b => <BillCard key={b.id} bill={b} />)
          }
        </>
      )}
    </div>
  )
}
