import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/ThemeToggle'
import { getOfficialsByState, type Official, type OfficialParty } from '../lib/officials'
import { supabase } from '../lib/supabase'
import { getIdsByStatus, syncStatusesAfterLogin } from '../lib/billStatus'
import { userKey } from '../lib/userKey'
import {
  fetchNotifications, markAllRead,
  type AppNotification,
} from '../lib/notificationClient'
import {
  type GreetingPrefs, DEFAULT_GREETING, GREETING_STORAGE_KEY,
  buildGreetingText, buildGreetingLines,
} from '../lib/greetingPrefs'
import { renderGreeting } from '../lib/greetingRender'

interface RepRow {
  bioguide_id: string
  name: string
  party: string
  state: string
  district: string | null
  chamber: 'Senate' | 'House'
  url: string | null
  email: string | null
}

interface LocalOfficialRow {
  id: string
  role: string
  name: string
  phone: string | null
  email: string | null
  county: string | null
  state: string
  since: string | null
  term_ends: string | null
  verification_count: number
  submitted_by: string | null
}

// ─── Icon components ───────────────────────────────────────────────────────
type IP = { size?: number; color?: string }


function ChangeLogIcon({ size = 48, color = 'white' }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 15.5 14.5"/>
      <path d="M21.5 4.5 19 7l-2.5-2.5"/>
      <path d="M19 7A10 10 0 1 0 21 12"/>
    </svg>
  )
}

function AlertSettingsIcon({ size = 48, color = 'white' }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6"/>
      <line x1="8" y1="12" x2="20" y2="12"/>
      <line x1="12" y1="18" x2="20" y2="18"/>
      <circle cx="2" cy="6" r="2" fill={color} stroke="none"/>
      <circle cx="6" cy="12" r="2" fill={color} stroke="none"/>
      <circle cx="10" cy="18" r="2" fill={color} stroke="none"/>
    </svg>
  )
}

function ProfileCardIcon({ size = 48, color = 'white' }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
}

function BellIcon({ size = 20, color = 'white' }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function WatchIcon({ size = 20, color = 'white' }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function ArchiveIcon({ size = 20, color = '#5a3a00' }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="21 8 21 21 3 21 3 8"/>
      <rect x="1" y="3" width="22" height="5"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  )
}

function AboutIcon({ size = 20, color = '#2D1B4E' }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}


function CivicCalendarIcon({ size = 20, color = 'white' }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="3"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="8" y1="15" x2="8" y2="15"/>
      <circle cx="8" cy="15" r=".6" fill={color}/>
      <line x1="12" y1="15" x2="12" y2="15"/>
      <circle cx="12" cy="15" r=".6" fill={color}/>
      <line x1="16" y1="15" x2="16" y2="15"/>
      <circle cx="16" cy="15" r=".6" fill={color}/>
    </svg>
  )
}

function SignInIcon({ size = 20, color = '#5a3a00' }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  )
}

function SignOutIcon({ size = 20, color = 'white' }: IP) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}



function EggGremlinSVG() {
  return (
    <svg viewBox="0 0 58 88" width="58" height="88" aria-hidden="true">
      <defs>
        <radialGradient id="egg-skin" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#8fdf68"/>
          <stop offset="100%" stopColor="#3a8a28"/>
        </radialGradient>
      </defs>

      {/* victory buns - behind everything */}
      <circle cx="13" cy="32" r="8"  fill="#1a1230"/>
      <circle cx="13" cy="32" r="5"  fill="#2a2040"/>
      <circle cx="11" cy="29" r="2"  fill="white" opacity=".15"/>
      <circle cx="33" cy="32" r="8"  fill="#1a1230"/>
      <circle cx="33" cy="32" r="5"  fill="#2a2040"/>
      <circle cx="31" cy="29" r="2"  fill="white" opacity=".15"/>
      <path d="M13,32 Q23,25 33,32" stroke="#1a1230" strokeWidth="6" fill="none" strokeLinecap="round"/>

      {/* overall bib drawn before head so face renders on top */}
      <rect x="17" y="51" width="12" height="10" rx="2" fill="#8B4513" opacity=".85"/>
      <rect x="19" y="53" width="8"  height="5"  rx="1" fill="none" stroke="#7a3a10" strokeWidth=".8"/>

      {/* left ear */}
      <polygon points="9,51 3,39 13,47"  fill="url(#egg-skin)"/>
      <polygon points="9,50 5,41 12,47"  fill="#7a4535"/>
      {/* right ear */}
      <polygon points="37,51 43,39 33,47" fill="url(#egg-skin)"/>
      <polygon points="37,50 41,41 34,47" fill="#7a4535"/>

      {/* head - on top of bib so face shows */}
      <ellipse cx="23" cy="46" rx="14" ry="13" fill="url(#egg-skin)"/>

      {/* eyes */}
      <ellipse cx="17" cy="45" rx="5"   ry="5.5" fill="#f8f4e8"/>
      <ellipse cx="29" cy="45" rx="5"   ry="5.5" fill="#f8f4e8"/>
      <circle  cx="18" cy="46" r="3.2"  fill="#1a0820"/>
      <circle  cx="30" cy="46" r="3.2"  fill="#1a0820"/>
      <circle  cx="19" cy="44.5" r="1.2" fill="white"/>
      <circle  cx="31" cy="44.5" r="1.2" fill="white"/>

      {/* eyebrows */}
      <path d="M12,40 Q17,37 22,40" stroke="#2a4218" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <path d="M24,40 Q29,37 34,40" stroke="#2a4218" strokeWidth="1.8" fill="none" strokeLinecap="round"/>

      {/* nose */}
      <ellipse cx="23" cy="51" rx="3" ry="2" fill="#3a7828"/>
      <circle cx="21.5" cy="51.8" r="1" fill="#2a6018"/>
      <circle cx="24.5" cy="51.8" r="1" fill="#2a6018"/>

      {/* smile - on top of head and bib */}
      <path d="M15,55 Q23,63 31,55" stroke="#5a1010" strokeWidth="1.2" fill="#d03030" strokeLinecap="round"/>
      <path d="M17,55 Q23,62 29,55 Z" fill="#e84040"/>
      <path d="M17,55 Q23,62 29,55" stroke="white" strokeWidth="1.8" fill="none" opacity=".6"/>

      {/* neck */}
      <rect x="19" y="58" width="8" height="6" rx="3" fill="url(#egg-skin)"/>

      {/* body skin */}
      <ellipse cx="23" cy="71" rx="13" ry="10" fill="url(#egg-skin)"/>
      <line x1="23" y1="62" x2="23" y2="81" stroke="#2a7018" strokeWidth="1"/>
      <circle cx="16" cy="69" r="3"   fill="#2a7018" opacity=".45"/>
      <circle cx="30" cy="69" r="3"   fill="#2a7018" opacity=".45"/>
      <circle cx="18" cy="77" r="2.5" fill="#2a7018" opacity=".45"/>
      <circle cx="28" cy="77" r="2.5" fill="#2a7018" opacity=".45"/>

      {/* overall lower body - over skin, below face */}
      <path d="M11,63 Q11,72 10,81 L36,81 Q35,72 35,63 Q35,62 23,62 Q11,62 11,63 Z" fill="#8B4513" opacity=".9"/>

      {/* right arm raised */}
      <path d="M34,67 C42,59 50,47 48,33" stroke="#3a8a28" strokeWidth="7" strokeLinecap="round" fill="none"/>
      {/* emoji-style fist: rounded rect body + knuckle creases + thumb */}
      <rect x="41" y="27" width="13" height="10" rx="4.5" fill="url(#egg-skin)"/>
      <path d="M42,31 Q46.5,30 51,31" stroke="#3a7828" strokeWidth=".9" fill="none"/>
      <line x1="44"   y1="28" x2="44"   y2="36" stroke="#3a7828" strokeWidth=".6" opacity=".5"/>
      <line x1="47.5" y1="28" x2="47.5" y2="36" stroke="#3a7828" strokeWidth=".6" opacity=".5"/>
      <ellipse cx="40" cy="31.5" rx="3" ry="2" fill="url(#egg-skin)" transform="rotate(-15 40 31.5)"/>
      {/* ring spanner wrench: handle + solid head with bolt hole */}
      <rect x="44.5" y="18" width="4" height="10" rx="2" fill="#9a9a9a"/>
      <circle cx="46.5" cy="12" r="7.5" fill="#9a9a9a"/>
      <circle cx="46.5" cy="12" r="4"   fill="#1a0820"/>
      <polygon points="46.5,8.8 48,9.7 48,11.3 46.5,12.2 45,11.3 45,9.7" fill="none" stroke="#7a7a7a" strokeWidth=".6"/>

      {/* left arm */}
      <path d="M12,67 L5,77" stroke="#3a8a28" strokeWidth="6" strokeLinecap="round" fill="none"/>

      {/* legs */}
      <line x1="18" y1="80" x2="14" y2="88" stroke="#8B4513" strokeWidth="5" strokeLinecap="round"/>
      <line x1="28" y1="80" x2="32" y2="88" stroke="#8B4513" strokeWidth="5" strokeLinecap="round"/>
    </svg>
  )
}

function MiniBugRed() {
  return (
    <svg width="22" height="28" viewBox="0 0 22 28" aria-hidden="true">
      <ellipse cx="11" cy="18" rx="7" ry="5" fill="#cc0000"/>
      <line x1="11" y1="13" x2="11" y2="23" stroke="#880000" strokeWidth="0.8"/>
      <circle cx="8.5"  cy="16" r="1.2" fill="#880000"/>
      <circle cx="13.5" cy="16" r="1.2" fill="#880000"/>
      <circle cx="9"    cy="19.5" r="1" fill="#880000"/>
      <circle cx="13"   cy="19.5" r="1" fill="#880000"/>
      <circle cx="11" cy="9" r="4" fill="#1a1a1a"/>
      <circle cx="9.5"  cy="8.3" r="1"  fill="white"/>
      <circle cx="12.5" cy="8.3" r="1"  fill="white"/>
      <circle cx="9.7"  cy="8.5" r=".5" fill="#333"/>
      <circle cx="12.7" cy="8.5" r=".5" fill="#333"/>
      <line x1="5" y1="16" x2="1"  y2="14" stroke="#1a1a1a" strokeWidth="0.7"/>
      <line x1="5" y1="18" x2="1"  y2="18" stroke="#1a1a1a" strokeWidth="0.7"/>
      <line x1="5" y1="20" x2="1"  y2="22" stroke="#1a1a1a" strokeWidth="0.7"/>
      <line x1="17" y1="16" x2="21" y2="14" stroke="#1a1a1a" strokeWidth="0.7"/>
      <line x1="17" y1="18" x2="21" y2="18" stroke="#1a1a1a" strokeWidth="0.7"/>
      <line x1="17" y1="20" x2="21" y2="22" stroke="#1a1a1a" strokeWidth="0.7"/>
    </svg>
  )
}

function MiniBugBlue() {
  return (
    <svg width="22" height="28" viewBox="0 0 22 28" aria-hidden="true">
      <ellipse cx="11" cy="18" rx="7" ry="5" fill="#0070c0"/>
      <line x1="11" y1="13" x2="11" y2="23" stroke="#004a96" strokeWidth="0.8"/>
      <circle cx="8.5"  cy="16" r="1.2" fill="#004a96"/>
      <circle cx="13.5" cy="16" r="1.2" fill="#004a96"/>
      <circle cx="9"    cy="19.5" r="1" fill="#004a96"/>
      <circle cx="13"   cy="19.5" r="1" fill="#004a96"/>
      <circle cx="11" cy="9" r="4" fill="#E97132"/>
      <circle cx="9.5"  cy="8.3" r="1"  fill="white"/>
      <circle cx="12.5" cy="8.3" r="1"  fill="white"/>
      <circle cx="9.7"  cy="8.5" r=".5" fill="#333"/>
      <circle cx="12.7" cy="8.5" r=".5" fill="#333"/>
      <line x1="5" y1="16" x2="1"  y2="14" stroke="#0070c0" strokeWidth="0.7"/>
      <line x1="5" y1="18" x2="1"  y2="18" stroke="#0070c0" strokeWidth="0.7"/>
      <line x1="5" y1="20" x2="1"  y2="22" stroke="#0070c0" strokeWidth="0.7"/>
      <line x1="17" y1="16" x2="21" y2="14" stroke="#0070c0" strokeWidth="0.7"/>
      <line x1="17" y1="18" x2="21" y2="18" stroke="#0070c0" strokeWidth="0.7"/>
      <line x1="17" y1="20" x2="21" y2="22" stroke="#0070c0" strokeWidth="0.7"/>
    </svg>
  )
}

function MiniBugYellow() {
  return (
    <svg width="22" height="28" viewBox="0 0 22 28" aria-hidden="true">
      <ellipse cx="11" cy="18" rx="7" ry="5" fill="#FFC000"/>
      <line x1="11" y1="13" x2="11" y2="23" stroke="#CC9600" strokeWidth="0.8"/>
      <circle cx="8.5"  cy="16" r="1.2" fill="#CC9600"/>
      <circle cx="13.5" cy="16" r="1.2" fill="#CC9600"/>
      <circle cx="9"    cy="19.5" r="1" fill="#CC9600"/>
      <circle cx="13"   cy="19.5" r="1" fill="#CC9600"/>
      <circle cx="11" cy="9" r="4" fill="#1a1a1a"/>
      <circle cx="9.5"  cy="8.3" r="1"  fill="white"/>
      <circle cx="12.5" cy="8.3" r="1"  fill="white"/>
      <circle cx="9.7"  cy="8.5" r=".5" fill="#333"/>
      <circle cx="12.7" cy="8.5" r=".5" fill="#333"/>
      <line x1="5" y1="16" x2="1"  y2="14" stroke="#1a1a1a" strokeWidth="0.7"/>
      <line x1="5" y1="18" x2="1"  y2="18" stroke="#1a1a1a" strokeWidth="0.7"/>
      <line x1="5" y1="20" x2="1"  y2="22" stroke="#1a1a1a" strokeWidth="0.7"/>
      <line x1="17" y1="16" x2="21" y2="14" stroke="#1a1a1a" strokeWidth="0.7"/>
      <line x1="17" y1="18" x2="21" y2="18" stroke="#1a1a1a" strokeWidth="0.7"/>
      <line x1="17" y1="20" x2="21" y2="22" stroke="#1a1a1a" strokeWidth="0.7"/>
    </svg>
  )
}

// ─── Data types & constants ────────────────────────────────────────────────

const PRESIDENT = {
  name:        'Donald J. Trump',
  dateElected: '2024-11-05',
  termEnds:    '2029-01-20',
  previousTerm: { start: '2017-01-20', end: '2021-01-20' },
}

const ELECTION_DATES = [
  { label: 'Voter Registration Deadline', date: '2026-10-19' },
  { label: 'Primary Election',            date: '2026-08-04' },
  { label: 'General Election',            date: '2026-11-03' },
]

const LOCAL_ROLES_FALLBACK = [
  'County Sheriff', 'County Prosecutor', 'County Clerk', 'County Treasurer',
  'County Commissioner', 'County Drain Commissioner', 'Register of Deeds',
  'Mayor', 'Township Supervisor', 'City Council Member', 'Township Council Member',
  'City Clerk', 'Township Clerk', 'City Treasurer', 'Township Treasurer',
  'School Board Member', 'District Court Judge', 'Circuit Court Judge',
  'Community College Board Member',
]

// Michigan election dates by cycle year (year the seat is on the ballot)
const MI_ELECTION_DATES: Record<number, { label: string; date: string }[]> = {
  2026: [
    { label: 'Voter Registration Deadline', date: '2026-10-19' },
    { label: 'Primary Election',            date: '2026-08-04' },
    { label: 'General Election',            date: '2026-11-03' },
  ],
  2028: [
    { label: 'Voter Registration Deadline', date: '2028-10-23' },
    { label: 'Primary Election',            date: '2028-08-01' },
    { label: 'General Election',            date: '2028-11-07' },
  ],
  2030: [
    { label: 'Voter Registration Deadline', date: '2030-10-21' },
    { label: 'Primary Election',            date: '2030-08-06' },
    { label: 'General Election',            date: '2030-11-05' },
  ],
}


function getRepElectionDates(o: Official): { year: number; dates: { label: string; date: string }[] } | null {
  if (!o.termEnds) return null
  const termYear = parseInt(o.termEnds.split('-')[0], 10)
  const year = termYear - 1
  return { year, dates: MI_ELECTION_DATES[year] ?? [] }
}


function fmtPhone(val: string): string {
  const d = val.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function normalizeName(raw: string): string {
  if (!raw.includes(',')) return raw
  const [last, rest] = raw.split(',', 2)
  return `${rest.trim()} ${last.trim()}`
}


// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { user, ready, signOut } = useAuth()
  const navigate                  = useNavigate()
  const [presidentMode, setPresidentMode] = useState<'president' | 'election'>(() =>
    localStorage.getItem('wsp-president-mode') === 'election' ? 'election' : 'president'
  )
  const [dbReps, setDbReps]               = useState<RepRow[]>([])
  const [repElectionKeys, setRepElectionKeys] = useState<Set<string>>(new Set())
  const toggleRepElection = (key: string) =>
    setRepElectionKeys(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s })

  const [customLocalReps, setCustomLocalReps] = useState<Official[]>(() => {
    try {
      const r = localStorage.getItem(userKey('wsp-local-reps'))
      return r ? JSON.parse(r) as Official[] : []
    } catch { return [] }
  })
  const [showAddLocal, setShowAddLocal]   = useState(false)
  const [addLocalForm, setAddLocalForm]   = useState({ name: '', role: '', phone: '', email: '', contact_url: '' })

  const [localRoles, setLocalRoles]               = useState<string[]>([])
  const [localRolesLoaded, setLocalRolesLoaded]   = useState(false)
  const [localDBOfficials, setLocalDBOfficials]   = useState<LocalOfficialRow[]>([])
  const [localForms, setLocalForms]               = useState<Record<string, { name: string; phone: string; email: string; since: string; term_ends: string }>>(() => {
    try { const r = localStorage.getItem(userKey('wsp-local-forms')); return r ? JSON.parse(r) : {} } catch { return {} }
  })
  const [localSaveStatus, setLocalSaveStatus]               = useState<Record<string, 'saving' | 'saved' | 'error'>>({})
  const [localFromDropdown, setLocalFromDropdown]           = useState<Record<string, Record<string, boolean>>>({})
  const [localFieldDropdownOpen, setLocalFieldDropdownOpen] = useState<Record<string, string | null>>({})
  const [localEditMode, setLocalEditMode]                   = useState<Set<string>>(new Set())
  const [localSelfVerified, setLocalSelfVerified]           = useState<Set<string>>(new Set())
  const [localRefreshKey, setLocalRefreshKey]               = useState(0)
  const [hiddenLocalRoles, setHiddenLocalRoles]   = useState<Set<string>>(() => {
    try {
      const r = localStorage.getItem(userKey('wsp-hidden-local-roles'))
      return r ? new Set(JSON.parse(r) as string[]) : new Set()
    } catch { return new Set() }
  })
  const [localViewMode, setLocalViewMode]         = useState<'show' | 'hide'>('show')
  const [localParty, setLocalParty]               = useState<Record<string, string>>(() => {
    try { const r = localStorage.getItem(userKey('wsp-local-party')); return r ? JSON.parse(r) : {} } catch { return {} }
  })

  const profileAddr = (() => {
    try {
      const r = localStorage.getItem(userKey('wsp-profile'))
      return r ? JSON.parse(r) as {
        state?: string; city?: string; zip?: string; county?: string
        congressional_district?: string
        state_senate_district?: string
        state_house_district?: string
        county_commissioner?: string
      } : null
    } catch { return null }
  })()
  const hasProfileAddr = (profileAddr?.state ?? '').trim() !== ''

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    return () => { document.documentElement.removeAttribute('data-theme') }
  }, [])

  useEffect(() => {
    localStorage.setItem('wsp-president-mode', presidentMode)
  }, [presidentMode])

  useEffect(() => {
    const state = profileAddr?.state?.toUpperCase()
    if (!state) { setDbReps([]); return }
    supabase
      .from('representatives')
      .select('bioguide_id,name,party,state,district,chamber,url,email')
      .eq('state', state)
      .then(({ data, error }) => {
        if (!error) setDbReps((data ?? []) as RepRow[])
      })
  }, [profileAddr?.state])

  useEffect(() => {
    localStorage.setItem(userKey('wsp-local-reps'), JSON.stringify(customLocalReps))
  }, [customLocalReps])

  useEffect(() => {
    localStorage.setItem(userKey('wsp-hidden-local-roles'), JSON.stringify([...hiddenLocalRoles]))
  }, [hiddenLocalRoles])

  useEffect(() => {
    localStorage.setItem(userKey('wsp-local-forms'), JSON.stringify(localForms))
  }, [localForms])

  useEffect(() => {
    localStorage.setItem(userKey('wsp-local-party'), JSON.stringify(localParty))
  }, [localParty])

  useEffect(() => {
    if (!user?.username) return
    try {
      const r = localStorage.getItem(`wsp-self-verified-${user.username}`)
      if (r) setLocalSelfVerified(new Set(JSON.parse(r) as string[]))
    } catch {}
  }, [user?.username])

  useEffect(() => {
    if (user?.username) {
      localStorage.setItem(`wsp-self-verified-${user.username}`, JSON.stringify([...localSelfVerified]))
    }
  }, [localSelfVerified, user?.username])

  useEffect(() => {
    const close = () => setLocalFieldDropdownOpen({})
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // Fetch local_official_roles for the user's state
  useEffect(() => {
    if (!user || !profileAddr?.state) { setLocalRoles([]); setLocalRolesLoaded(true); return }
    supabase
      .from('local_official_roles')
      .select('label')
      .eq('state', profileAddr.state.toUpperCase())
      .order('label')
      .then(({ data, error }) => {
        if (error) console.error('[local_official_roles] fetch error:', error.message)
        setLocalRoles((data ?? []).map(r => r.label as string))
        setLocalRolesLoaded(true)
      })
  }, [user, profileAddr?.state])

  // Fetch submitted local officials for state + optional county
  useEffect(() => {
    if (!user || !profileAddr?.state) { setLocalDBOfficials([]); return }
    const state = profileAddr.state.toUpperCase()
    const county = (profileAddr.county ?? '').trim()
    ;(async () => {
      if (county) {
        const { data } = await supabase
          .from('local_officials')
          .select('id,role,name,phone,email,county,state,since,term_ends,verification_count,submitted_by')
          .eq('state', state)
          .eq('county', county)
        setLocalDBOfficials((data ?? []) as LocalOfficialRow[])
      } else {
        const { data } = await supabase
          .from('local_officials')
          .select('id,role,name,phone,email,county,state,since,term_ends,verification_count,submitted_by')
          .eq('state', state)
        setLocalDBOfficials((data ?? []) as LocalOfficialRow[])
      }
    })()
  }, [user, profileAddr?.state, profileAddr?.county, localRefreshKey])

  const autoSaveLocalOfficial = async (
    role: string,
    form: { name: string; phone: string; email: string; since: string; term_ends: string },
    markVerified?: boolean,
  ) => {
    if (!form.name.trim() || !user) return
    setLocalSaveStatus(prev => ({ ...prev, [role]: 'saving' }))
    const { error } = await supabase
      .from('local_officials')
      .upsert(
        {
          role,
          name:         form.name.trim(),
          phone:        form.phone.trim()     || null,
          email:        form.email.trim()     || null,
          since:        form.since.trim()     || null,
          term_ends:    form.term_ends.trim() || null,
          county:       (profileAddr?.county ?? '').trim() || null,
          state:        (profileAddr?.state ?? '').toUpperCase(),
          submitted_by: user.username,
        },
        { onConflict: 'role,state,submitted_by' },
      )
    if (!error) {
      if (markVerified) setLocalSelfVerified(prev => new Set(prev).add(role))
      setLocalFromDropdown(prev => { const n = { ...prev }; delete n[role]; return n })
      setLocalSaveStatus(prev => ({ ...prev, [role]: 'saved' }))
      setLocalEditMode(prev => { const s = new Set(prev); s.delete(role); return s })
      setLocalRefreshKey(k => k + 1)
      setTimeout(() => setLocalSaveStatus(prev => { const n = { ...prev }; delete n[role]; return n }), 2000)
      if (gremlinTimerRef.current) clearTimeout(gremlinTimerRef.current)
      setGremlinEgg(true)
      setGremlinKey(k => k + 1)
      gremlinTimerRef.current = setTimeout(() => setGremlinEgg(false), 3700)
    } else {
      console.error('[local_officials] upsert error:', error.message)
      setLocalSaveStatus(prev => ({ ...prev, [role]: 'error' }))
    }
  }

  const saveLocalRep = () => {
    const name = addLocalForm.name.trim()
    const role = addLocalForm.role.trim()
    if (!name || !role) return
    const rep: Official = {
      level: 'local',
      role,
      name,
      party: 'other',
      phone:       addLocalForm.phone.trim()       || undefined,
      email:       addLocalForm.email.trim()       || undefined,
      contact_url: addLocalForm.contact_url.trim() || undefined,
      source: 'user',
      id: crypto.randomUUID(),
    }
    setCustomLocalReps(prev => [...prev, rep])
    setAddLocalForm({ name: '', role: '', phone: '', email: '', contact_url: '' })
    setShowAddLocal(false)
  }
  const deleteLocalRep = (id: string) =>
    setCustomLocalReps(prev => prev.filter(r => r.id !== id))


  const [gremlinEgg, setGremlinEgg] = useState(false)
  const [gremlinKey, setGremlinKey] = useState(0)
  const gremlinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scurryPhase, setScurryPhase] = useState<'start' | 'scatter' | null>(null)
  const scurryPositions = useRef<Array<{ x: number; y: number; rot: number }>>([])
  const scurryTimers   = useRef<ReturnType<typeof setTimeout>[]>([])

  const [theme, setTheme] = useState(() => localStorage.getItem('wsp-theme') ?? 'dark')
  const [greetingPrefs, setGreetingPrefs] = useState<GreetingPrefs>(() => {
    try {
      const raw = localStorage.getItem(userKey(GREETING_STORAGE_KEY))
      if (!raw) return DEFAULT_GREETING
      return { ...DEFAULT_GREETING, ...(JSON.parse(raw) as Partial<GreetingPrefs>) }
    } catch { return DEFAULT_GREETING }
  })

  const [alertCount,   setAlertCount]   = useState(() => getIdsByStatus('alert').size)
  const [watchCount,   setWatchCount]   = useState(() => getIdsByStatus('watch').size)
  const [archiveCount, setArchiveCount] = useState(() => getIdsByStatus('archive').size)

  useEffect(() => {
    function sync() {
      setAlertCount(getIdsByStatus('alert').size)
      setWatchCount(getIdsByStatus('watch').size)
      setArchiveCount(getIdsByStatus('archive').size)
    }
    window.addEventListener('bill-status-change', sync)
    return () => window.removeEventListener('bill-status-change', sync)
  }, [])

  const [notifications,     setNotifications]     = useState<AppNotification[]>([])
  const [showNotifDrop,     setShowNotifDrop]     = useState(false)
  const notifDropRef = useRef<HTMLDivElement>(null)

  // On login: fetch notifications and sync bill statuses to DB
  useEffect(() => {
    if (!user) return
    fetchNotifications().then(setNotifications)
    syncStatusesAfterLogin()
  }, [user?.username])

  // Reload greeting prefs when user becomes known (handles login-on-this-session)
  useEffect(() => {
    if (!user?.username) return
    try {
      const raw = localStorage.getItem(userKey(GREETING_STORAGE_KEY))
      setGreetingPrefs(raw
        ? { ...DEFAULT_GREETING, ...(JSON.parse(raw) as Partial<GreetingPrefs>) }
        : DEFAULT_GREETING
      )
    } catch { setGreetingPrefs(DEFAULT_GREETING) }
  }, [user?.username])

  // Close notification dropdown on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (notifDropRef.current && !notifDropRef.current.contains(e.target as Node)) {
        setShowNotifDrop(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (!ready) return null

  const isLoggedIn = !!user
  const unreadCount = notifications.filter(n => !n.read).length

  function openNotifDrop() {
    setShowNotifDrop(v => !v)
    if (unreadCount > 0) {
      markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  async function handleSignOut() { await signOut() }

  function triggerScurry(newIsDark: boolean) {
    setTheme(localStorage.getItem('wsp-theme') ?? 'dark')
    if (newIsDark) return  // only on switch to light mode
    scurryTimers.current.forEach(t => clearTimeout(t))
    const vw = window.innerWidth
    const vh = window.innerHeight
    // scatter off-page in different directions (up-left, up, up-right)
    scurryPositions.current = [
      { x: -(vw * (0.65 + Math.random() * .15)), y: -(vh * (1.1 + Math.random() * .1)), rot:  720 + Math.random() * 360 },
      { x: -(vw * (0.25 + Math.random() * .10)), y: -(vh * (1.2 + Math.random() * .1)), rot: -(540 + Math.random() * 360) },
      { x:  (vw * (0.15 + Math.random() * .10)), y: -(vh * (1.1 + Math.random() * .1)), rot:  540 + Math.random() * 360 },
    ]
    setScurryPhase('start')
    requestAnimationFrame(() => requestAnimationFrame(() => setScurryPhase('scatter')))
    const t = setTimeout(() => setScurryPhase(null), 10000)
    scurryTimers.current = [t]
  }

  return (
    <div className="home-page">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="home-header-bar" aria-label="3AM Pipeline site header">
        <div className="home-header-title-group">
          <h1 className="home-header-title">3AM Pipeline</h1>
          <p className="home-header-tagline"><span>Legislation</span><span>Matters</span></p>
        </div>
        <p className="home-header-org">by Women for Shared Progress (W4SP)</p>
      </header>
      <div style={{ position: 'fixed', top: 8, right: 12, zIndex: 100, display: 'flex', alignItems: 'center', gap: 8 }}>
        {isLoggedIn && (
          <div ref={notifDropRef} style={{ position: 'relative' }}>
            <button
              onClick={openNotifDrop}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              style={{
                background: 'rgba(128,100,180,.18)',
                border: '1px solid rgba(128,100,180,.32)',
                borderRadius: 20, padding: '5px 10px', cursor: 'pointer',
                color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 5,
                position: 'relative',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#C00000', color: 'white',
                  borderRadius: '50%', width: 16, height: 16,
                  fontSize: 10, fontWeight: 700, fontFamily: "'Quicksand', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifDrop && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                width: 320, maxHeight: 400, overflowY: 'auto',
                background: 'var(--color-card, #2a2840)',
                border: '1px solid var(--color-border-light)',
                borderRadius: 12, zIndex: 200,
                boxShadow: '0 8px 32px rgba(0,0,0,.4)',
              }}>
                <div style={{
                  padding: '12px 14px 10px',
                  borderBottom: '1px solid var(--color-border-light)',
                  fontFamily: "'Quicksand', sans-serif", fontSize: 13, fontWeight: 700,
                  color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em',
                }}>
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '20px 14px', textAlign: 'center',
                    fontFamily: "'Nunito', sans-serif", fontSize: 13,
                    color: 'var(--color-text-tertiary)',
                  }}>
                    No notifications yet
                  </div>
                ) : notifications.map(n => (
                  <div key={n.id} style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--color-border-light)',
                    background: n.read ? 'transparent' : 'rgba(0,176,240,.06)',
                  }}>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                      {n.title}
                    </div>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      {n.body}
                    </div>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <ThemeToggle onToggle={triggerScurry} />
      </div>

      <div className="home-content">

        {/* ── Main row: 2×2 grid + stoplight column ───── */}
        <div className="home-main-row">
        <div className="home-main-grid">

          {/* Top-left: LawTracker — blue left / red right diagonal */}
          <button
            className="home-main-card"
            onClick={() => navigate('/tracker')}
            aria-label="LawTracker — browse active legislation"
          >
            <div aria-hidden="true" style={{
              position: 'absolute', inset: 0, background: '#003F87',
              clipPath: 'polygon(0% 0%, 80% 0%, 20% 100%, 0% 100%)',
            }} />
            <div aria-hidden="true" style={{
              position: 'absolute', inset: 0, background: '#CC0000',
              clipPath: 'polygon(80% 0%, 100% 0%, 100% 100%, 20% 100%)',
            }} />
            <span className="home-card-label">LawTracker</span>
            <span className="home-card-desc">Browse active legislation</span>
          </button>

          {/* Top-right: Change Log */}
          <button
            className="home-main-card"
            style={{ background: '#008080' }}
            onClick={() => navigate('/changelog')}
            aria-label="Change Log — update capture"
          >
            <div className="home-card-icon-wrap"><ChangeLogIcon size={34} /></div>
            <span className="home-card-label">Change Log</span>
            <span className="home-card-desc">Update capture last 30 days</span>
          </button>

          {/* Bottom-left: Alert Settings (logged-in only) */}
          {isLoggedIn && (
            <button
              className="home-main-card"
              style={{ background: '#C00000' }}
              onClick={() => navigate('/alerts/settings')}
              aria-label="Alert Settings — configure your alerts"
            >
              <div className="home-card-icon-wrap"><AlertSettingsIcon size={34} /></div>
              <span className="home-card-label">Alerts &amp; Settings</span>
              <span className="home-card-desc">Configure your preferences</span>
            </button>
          )}

          {/* Bottom-right: My Profile (logged-in only) */}
          {isLoggedIn && (
            <button
              className="home-main-card"
              style={{ background: '#00B050' }}
              onClick={() => navigate('/profile')}
              aria-label="My Profile — your account and preferences"
            >
              <div className="home-card-icon-wrap"><ProfileCardIcon size={34} /></div>
              <span className="home-card-label">My Profile</span>
              <span className="home-card-desc">Your account</span>
            </button>
          )}

        </div>{/* end main grid */}

        {/* Stoplight column — 3 pills stacked to the right (logged-in only) */}
        {isLoggedIn && <div className="home-stoplight-col">

          <button
            className="home-stoplight-pill"
            style={{ background: '#C00000' }}
            onClick={() => navigate('/alerts')}
            aria-label={`My Alerts: ${alertCount} bills`}
          >
            <div className="home-stoplight-circle">
              <BellIcon size={20} color="white" />
            </div>
            <div className="home-stoplight-pill-text">
              <span className="home-stoplight-pill-label" style={{ color: 'white' }}>My Alerts</span>
              <span className="home-stoplight-pill-count" style={{ color: 'white' }}>{alertCount}</span>
            </div>
          </button>

          <button
            className="home-stoplight-pill"
            style={{ background: '#E97132' }}
            onClick={() => navigate('/watching')}
            aria-label={`Watching: ${watchCount} bills`}
          >
            <div className="home-stoplight-circle">
              <WatchIcon size={20} color="white" />
            </div>
            <div className="home-stoplight-pill-text">
              <span className="home-stoplight-pill-label" style={{ color: 'white' }}>Watching</span>
              <span className="home-stoplight-pill-count" style={{ color: 'white' }}>{watchCount}</span>
            </div>
          </button>

          <button
            className="home-stoplight-pill"
            style={{ background: '#FFC000' }}
            onClick={() => navigate('/archive')}
            aria-label={`Archive: ${archiveCount} bills`}
          >
            <div className="home-stoplight-circle" style={{ background: 'rgba(0,0,0,.14)' }}>
              <ArchiveIcon size={20} color="#5a3a00" />
            </div>
            <div className="home-stoplight-pill-text">
              <span className="home-stoplight-pill-label" style={{ color: '#1a1a18' }}>Archive</span>
              <span className="home-stoplight-pill-count" style={{ color: '#1a1a18' }}>{archiveCount}</span>
            </div>
          </button>

          {isLoggedIn && (() => {
            const isDark = !['light', 'outline', 'dots'].includes(theme)
            const isBig  = greetingPrefs.size === 'big'
            const isMobileW = typeof window !== 'undefined' && window.innerWidth <= 600

            if (isBig && isMobileW) {
              const lines = buildGreetingLines(greetingPrefs.word, user!.username)
              if (!lines) return null
              const maxLen   = Math.max(...lines.map(l => l.length))
              const fsVw     = Math.min(36, Math.max(4, 88 / (maxLen * 0.60))).toFixed(2)
              return (
                <div className="home-stoplight-greeting home-stoplight-greeting--big">
                  {lines.map((line, i) => (
                    <div key={i} style={{ fontSize: `${fsVw}vw`, lineHeight: 1.1, textAlign: 'center' }}>
                      {renderGreeting(line, greetingPrefs.color, isDark)}
                    </div>
                  ))}
                </div>
              )
            }

            const txt = buildGreetingText(greetingPrefs.word, user!.username)
            if (!txt) return null
            return (
              <div className="home-stoplight-greeting" style={isBig ? { fontSize: 28 } : undefined}>
                {renderGreeting(txt, greetingPrefs.color, isDark)}
              </div>
            )
          })()}
        </div>}{/* end stoplight col */}
        </div>{/* end main row */}

        {/* ── Secondary row — 8 tiles ──────────────────── */}
        <div className="home-secondary-row">

          <button
            className="home-secondary-card" style={{ background: '#1D4ED8' }}
            onClick={() => navigate('/civic-calendar')}
            aria-label="Civic Calendar — elections and registration deadlines"
          >
            <CivicCalendarIcon size={20} color="white" />
            <span className="home-secondary-label">Civic Calendar</span>
          </button>

          <button
            className="home-secondary-card" style={{ background: '#B597D5' }}
            onClick={() => navigate('/about')}
            aria-label="About Women for Shared Progress"
          >
            <AboutIcon size={20} color="#2D1B4E" />
            <span className="home-secondary-label" style={{ color: '#2D1B4E' }}>About</span>
          </button>


          <button
            className="home-secondary-card" style={{ background: '#4F4262' }}
            onClick={() => navigate('/enacted-legislation')}
            aria-label="Enacted Legislation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="11" fill="#00B050"/>
              <polyline points="7 12.5 10.5 16 17 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="home-secondary-label">Passed Law</span>
            <span className="home-secondary-badge">5 year History</span>
          </button>

          <button
            className="home-secondary-card"
            style={{ background: isLoggedIn ? '#808080' : '#FFC000' }}
            onClick={() => isLoggedIn ? handleSignOut() : navigate('/login')}
            aria-label={isLoggedIn ? `Sign out (${user!.username})` : 'Sign in to your account'}
          >
            {isLoggedIn
              ? <SignOutIcon size={20} color="white" />
              : <SignInIcon size={20} color="#5a3a00" />
            }
            <span className="home-secondary-label" style={{ color: isLoggedIn ? 'white' : '#1a1a18' }}>
              {isLoggedIn ? 'Sign Out' : 'Sign In'}
            </span>
          </button>

        </div>{/* end secondary row */}

        {/* ── Political district section (logged-in users) ─ */}
        {isLoggedIn && (
          <section className="home-district-section" aria-label="Your Representatives">

            {/* Rep columns — Local | State | National */}
            <h2 className="home-district-heading">Your Representatives</h2>

            <p className="home-district-intro">
              This is a great way to help each other out. If something autofills or populates, it is because someone else filled it out and yet another person verified the information was correct. If there is an empty field to fill out, no one from that county or district has entered and verified it. You could be the first! Thank you in advance for assisting. If you run into any problems, use the feedback button and the gremlins will gremlin.
            </p>

            {/* President / Election Cycle toggle panel */}
            <div className="home-president-panel">
              <div className="home-president-toggle" role="group" aria-label="View mode">
                <button
                  className={presidentMode === 'president' ? 'hpt-active' : ''}
                  onClick={() => setPresidentMode('president')}
                  aria-pressed={presidentMode === 'president'}
                >President</button>
                <button
                  className={presidentMode === 'election' ? 'hpt-active' : ''}
                  onClick={() => setPresidentMode('election')}
                  aria-pressed={presidentMode === 'election'}
                >Election Cycle</button>
              </div>

              {presidentMode === 'president' ? (
                <div className="home-president-info">
                  <div className="home-president-name">{PRESIDENT.name}</div>
                  <div className="home-president-meta">
                    <span><span className="home-pmeta-lbl">Elected</span>{fmtDate(PRESIDENT.dateElected)}</span>
                    <span><span className="home-pmeta-lbl">Term ends</span>{fmtDate(PRESIDENT.termEnds)}</span>
                  </div>
                  {PRESIDENT.previousTerm && (
                    <div className="home-president-meta">
                      <span><span className="home-pmeta-lbl">Previous term</span>{fmtDate(PRESIDENT.previousTerm.start)} – {fmtDate(PRESIDENT.previousTerm.end)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="home-election-cycle">
                  <div className="home-election-dates">
                    {ELECTION_DATES.map(d => (
                      <div key={d.label} className="home-election-date-item">
                        <span className="home-election-date-label">{d.label}</span>
                        <span className="home-election-date-val">{fmtDate(d.date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button className="home-district-action-btn" style={{ background: '#4F4262' }} onClick={() => navigate('/administration')}>Administration</button>
            </div>
            {!hasProfileAddr && (
              <div className="home-no-profile-msg" style={{ marginBottom: 14 }}>
                <span>Set your address in</span>
                <button onClick={() => navigate('/profile')}>My Profile</button>
                <span>to load your elected officials.</span>
              </div>
            )}

            <div className="home-district-grid">
              {(['local', 'state', 'national'] as const).map(level => {
                const officials = (() => {
                  if (!hasProfileAddr) return []
                  if (level === 'national') {
                    const normDist = (d: string | null | undefined) => {
                      const n = parseInt((d ?? '').replace(/\D/g, ''), 10)
                      return isNaN(n) ? '' : String(n)
                    }
                    const userDistrictNorm = normDist(profileAddr?.congressional_district ?? '')
                    const stateOfficials = getOfficialsByState(profileAddr?.state ?? '')

                    const toOfficial = (r: RepRow): Official => {
                      const lastName = r.name.split(',')[0].trim().toLowerCase()
                      const isSenate = r.chamber === 'Senate'
                      const s = stateOfficials.find(o =>
                        isSenate
                          ? o.role === 'U.S. Senator' && o.name.toLowerCase().split(/\s+/).some(p => p === lastName)
                          : o.role === 'U.S. Representative' && normDist(o.district) === normDist(r.district)
                      )
                      return {
                        level: 'national',
                        role: isSenate ? 'U.S. Senator' : 'U.S. Representative',
                        name: normalizeName(r.name),
                        party: r.party.toLowerCase() as OfficialParty,
                        district: r.district ?? undefined,
                        contact_url: s?.contact_url ?? r.url ?? undefined,
                        since: s?.since,
                        termEnds: s?.termEnds,
                        phone: s?.phone,
                        email: r.email ?? s?.email,
                      }
                    }

                    // Senators: prefer live DB rows; fall back to officials.ts while DB loads
                    const dbSenators = dbReps.filter(r => r.chamber === 'Senate')
                    const senators: Official[] = dbSenators.length > 0
                      ? dbSenators.map(toOfficial)
                      : stateOfficials.filter(o => o.role === 'U.S. Senator')

                    // House: only from DB, matched to user's district
                    const houseReps: Official[] = userDistrictNorm
                      ? dbReps
                          .filter(r => r.chamber === 'House' && normDist(r.district) === userDistrictNorm)
                          .map(toOfficial)
                      : []

                    return [...senators, ...houseReps]
                  }
                  return getOfficialsByState(profileAddr?.state ?? '').filter(o => {
                    if (o.level !== level) return false
                    if (level === 'local' && o.city) {
                      const userCity = (profileAddr?.city ?? '').trim().toUpperCase()
                      if (!userCity || o.city.toUpperCase() !== userCity) return false
                    }
                    if (!o.district) return true
                    if (o.role === 'State Senator')
                      return o.district === profileAddr?.state_senate_district
                    if (o.role === 'State Representative')
                      return o.district === profileAddr?.state_house_district
                    if (o.role === 'County Commissioner')
                      return o.district === profileAddr?.county_commissioner
                    return true
                  })
                })()

                return (
                  <div key={level} className="home-district-col">
                    <div className="home-district-col-header">
                      {level === 'local' && profileAddr?.city
                        ? `Local — ${profileAddr.city.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}`
                        : level.charAt(0).toUpperCase() + level.slice(1)}
                    </div>
                    {(level !== 'local' || !isLoggedIn || !hasProfileAddr || !profileAddr?.state) && officials.map((o, i) => {
                      const cardKey = `${level}-${i}`
                      const showElection = repElectionKeys.has(cardKey)
                      return (
                        <div key={i} className="home-rep-card" data-party={o.party}>
                          <div className="home-rep-card-toggle" role="group" aria-label="Card view mode">
                            <button
                              className={!showElection ? 'hrct-active' : ''}
                              onClick={() => showElection && toggleRepElection(cardKey)}
                              aria-pressed={!showElection}
                            >Info</button>
                            <button
                              className={showElection ? 'hrct-active' : ''}
                              onClick={() => !showElection && toggleRepElection(cardKey)}
                              aria-pressed={showElection}
                            >Election</button>
                          </div>

                          {!showElection ? (
                            <>
                              <div className="home-rep-role">
                                {profileAddr?.state ? `${profileAddr.state} ${o.role}` : o.role}
                              </div>
                              {o.district && (
                                <div className="home-rep-district">District {o.district}</div>
                              )}
                              <div className="home-rep-name">{o.name}</div>
                              {o.since && (
                                <div className="home-rep-meta">
                                  Elected {fmtDate(o.since)}{o.termEnds ? `–${fmtDate(o.termEnds)}` : ''}
                                </div>
                              )}
                              {o.phone && (
                                <a href={`tel:${o.phone.replace(/\D/g, '')}`} className="home-rep-phone" aria-label={`Call ${o.name}`}>
                                  {o.phone}
                                </a>
                              )}
                              {o.email && (
                                <a href={`mailto:${o.email}`} className="home-rep-email" aria-label={`Email ${o.name}`}>
                                  {o.email}
                                </a>
                              )}
                              {o.contact_url && (
                                <a href={o.contact_url} target="_blank" rel="noopener noreferrer" className="home-rep-contact-btn" aria-label={`Contact ${o.name}`}>
                                  Contact
                                </a>
                              )}
                            </>
                          ) : (() => {
                            const cycle = getRepElectionDates(o)
                            if (!cycle) return (
                              <div className="home-rep-no-election">Election dates unavailable</div>
                            )
                            if (cycle.dates.length === 0) return (
                              <div className="home-rep-no-election">Next election: {cycle.year}</div>
                            )
                            return (
                              <div className="home-election-dates">
                                {cycle.dates.map(d => (
                                  <div key={d.label} className="home-election-date-item">
                                    <span className="home-election-date-label">{d.label}</span>
                                    <span className="home-election-date-val">{fmtDate(d.date)}</span>
                                  </div>
                                ))}
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })}

                    {/* ── DB-backed local role cards ── */}
                    {level === 'local' && isLoggedIn && hasProfileAddr && !!profileAddr?.state && (
                      <>
                        {!profileAddr?.county?.trim() ? (
                          <div className="home-rep-no-election" style={{ padding: '12px 0', fontStyle: 'italic' }}>
                            Set your county in your profile to see your local representatives.
                          </div>
                        ) : (
                        <>
                        <div className="home-local-view-toggle" role="group" aria-label="Local view mode">
                          <button
                            className={localViewMode === 'show' ? 'hlvt-active' : ''}
                            onClick={() => setLocalViewMode('show')}
                            aria-pressed={localViewMode === 'show'}
                          >Show</button>
                          <button
                            className={localViewMode === 'hide' ? 'hlvt-active' : ''}
                            onClick={() => setLocalViewMode('hide')}
                            aria-pressed={localViewMode === 'hide'}
                          >Hide</button>
                        </div>
                        {localRolesLoaded && localDBOfficials.length === 0 && (
                          <div className="home-rep-no-election" style={{ padding: '10px 0', fontStyle: 'italic' }}>
                            No local roles found for your county yet — be the first to add one!
                          </div>
                        )}
                        {!localRolesLoaded
                          ? <div className="home-rep-no-election">Loading...</div>
                          : (localRoles.length > 0 ? localRoles : LOCAL_ROLES_FALLBACK)
                              .filter(role => localViewMode === 'show' || !hiddenLocalRoles.has(role))
                              .map(role => {
                            const emptyForm  = { name: '', phone: '', email: '', since: '', term_ends: '' }
                            const userEntry  = localDBOfficials.find(o => o.role === role && o.submitted_by === user?.username) ?? null
                            const isEditing  = localEditMode.has(role)
                            const isViewMode = !!userEntry && !isEditing
                            const form       = localForms[role] ?? emptyForm
                            const saveStatus = localSaveStatus[role]
                            const upd = (field: string, val: string) => {
                              const updated = { ...(localForms[role] ?? emptyForm), [field]: val }
                              setLocalForms(prev => ({ ...prev, [role]: updated }))
                            }
                            const allFilled = !!(form.name.trim() && form.phone.trim() && form.email.trim() && form.since.trim() && form.term_ends.trim())
                            const isHidden  = hiddenLocalRoles.has(role)
                            const otherEntries = localDBOfficials
                              .filter(o => o.role === role && o.submitted_by !== user?.username)
                              .sort((a, b) => b.verification_count - a.verification_count)
                            const hasCommunityEntries = otherEntries.length > 0
                            const isSelfVerified = localSelfVerified.has(role)
                            const fromDropdown = localFromDropdown[role] ?? {}
                            const anyFromDropdown = Object.values(fromDropdown).some(Boolean)
                            const openField = localFieldDropdownOpen[role] ?? null
                            const uniqueVals = (field: keyof LocalOfficialRow): string[] => {
                              const map = new Map<string, string>()
                              for (const e of otherEntries) {
                                const v = e[field]
                                if (typeof v !== 'string' || !v) continue
                                const key = v.toLowerCase()
                                const existing = map.get(key)
                                if (!existing || (!existing.match(/[A-Z]/) && v.match(/[A-Z]/))) map.set(key, v)
                              }
                              return [...map.values()]
                            }
                            const fieldWrap = (field: string, vals: string[], inputEl: React.ReactNode) => (
                              <div className="home-local-field-wrap" onMouseDown={e => e.stopPropagation()}>
                                {inputEl}
                                {vals.length > 0 && (
                                  <button
                                    className="home-local-field-arrow"
                                    type="button"
                                    aria-label="Show suggestions"
                                    onClick={() => setLocalFieldDropdownOpen(prev => ({
                                      ...prev,
                                      [role]: prev[role] === field ? null : field,
                                    }))}
                                  >▾</button>
                                )}
                                {openField === field && (
                                  <div className="home-local-field-dropdown">
                                    {vals.map(v => (
                                      <button
                                        key={v}
                                        className="home-local-field-option"
                                        type="button"
                                        onClick={() => {
                                          upd(field, v)
                                          setLocalFromDropdown(prev => ({
                                            ...prev,
                                            [role]: { ...(prev[role] ?? {}), [field]: true },
                                          }))
                                          setLocalFieldDropdownOpen(prev => ({ ...prev, [role]: null }))
                                        }}
                                      >
                                        {(field === 'since' || field === 'term_ends') && /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtDate(v) : v}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                            return (
                              <div key={role} className={`home-rep-card${isHidden ? ' home-local-card--hidden' : ''}`} data-party={localParty[role] ?? 'other'}>
                                <button
                                  className={`home-local-hide-btn${isHidden ? ' home-local-hide-btn--active' : ''}`}
                                  onClick={() => {
                                    const isCurrentlyHidden = hiddenLocalRoles.has(role)
                                    setHiddenLocalRoles(prev => { const s = new Set(prev); s.has(role) ? s.delete(role) : s.add(role); return s })
                                    if (!isCurrentlyHidden) setLocalViewMode('hide')
                                  }}
                                  aria-label={isHidden ? `Show ${role}` : `Hide ${role}`}
                                >{isHidden ? 'Show' : 'Hide'}</button>
                                <div className="home-rep-role">
                                  <span style={{ display: 'block', paddingRight: '52px' }}>{profileAddr?.state}{profileAddr?.county ? ` ${profileAddr.county} County` : ''}</span>
                                  <span style={{ display: 'block' }}>{role.replace(/^County\s+/i, '')}</span>
                                </div>

                                {/* User's submitted entry (view mode) or form (edit/new mode) */}
                                {isViewMode ? (
                                  <div className="home-local-view-entry">
                                    {localParty[role] && localParty[role] !== 'other' && (
                                      <div className="home-rep-meta" style={{ textTransform: 'capitalize', marginBottom: 2 }}>{localParty[role]}</div>
                                    )}
                                    <div className="home-rep-name">{userEntry!.name}</div>
                                    {(userEntry!.since || userEntry!.term_ends) && (
                                      <div className="home-rep-meta">
                                        {userEntry!.since && <span>Elected {fmtDate(userEntry!.since)}</span>}
                                        {userEntry!.since && userEntry!.term_ends && <span> – </span>}
                                        {userEntry!.term_ends && <span>{fmtDate(userEntry!.term_ends)}</span>}
                                      </div>
                                    )}
                                    {userEntry!.phone && <a href={`tel:${userEntry!.phone.replace(/\D/g, '')}`} className="home-rep-phone">{userEntry!.phone}</a>}
                                    {userEntry!.email && <a href={`mailto:${userEntry!.email}`} className="home-rep-email">{userEntry!.email}</a>}
                                    <button
                                      className="home-local-edit-btn"
                                      onClick={() => {
                                        setLocalEditMode(prev => new Set(prev).add(role))
                                        setLocalSelfVerified(prev => { const s = new Set(prev); s.delete(role); return s })
                                        setLocalFromDropdown(prev => { const n = { ...prev }; delete n[role]; return n })
                                        if (userEntry && !localForms[role]?.name) {
                                          setLocalForms(prev => ({ ...prev, [role]: {
                                            name:      userEntry.name,
                                            phone:     userEntry.phone      ?? '',
                                            email:     userEntry.email      ?? '',
                                            since:     userEntry.since      ?? '',
                                            term_ends: userEntry.term_ends  ?? '',
                                          }}))
                                        }
                                      }}
                                    >Edit</button>
                                    {hasCommunityEntries && !isSelfVerified && (
                                      <label className="home-local-self-verify">
                                        <input
                                          type="checkbox"
                                          onChange={() => setLocalSelfVerified(prev => new Set(prev).add(role))}
                                        />
                                        Information is correct
                                      </label>
                                    )}
                                  </div>
                                ) : (
                                  <div className="home-add-local-form">
                                    {fieldWrap('name', uniqueVals('name'),
                                      <input
                                        className="home-add-local-input"
                                        placeholder="Official's name"
                                        value={form.name}
                                        onChange={e => {
                                          upd('name', e.target.value)
                                          if (fromDropdown.name) setLocalFromDropdown(prev => ({ ...prev, [role]: { ...prev[role], name: false } }))
                                        }}
                                      />
                                    )}
                                    {fieldWrap('phone', uniqueVals('phone'),
                                      <input
                                        className="home-add-local-input"
                                        placeholder="Phone"
                                        value={form.phone}
                                        onChange={e => {
                                          upd('phone', fmtPhone(e.target.value))
                                          if (fromDropdown.phone) setLocalFromDropdown(prev => ({ ...prev, [role]: { ...prev[role], phone: false } }))
                                        }}
                                      />
                                    )}
                                    {fieldWrap('email', uniqueVals('email'),
                                      <input
                                        className="home-add-local-input"
                                        placeholder="Email"
                                        value={form.email}
                                        onChange={e => {
                                          upd('email', e.target.value)
                                          if (fromDropdown.email) setLocalFromDropdown(prev => ({ ...prev, [role]: { ...prev[role], email: false } }))
                                        }}
                                      />
                                    )}
                                    {fieldWrap('since', uniqueVals('since'),
                                      <input
                                        className="home-add-local-input"
                                        type="date"
                                        value={form.since}
                                        onChange={e => {
                                          upd('since', e.target.value)
                                          if (fromDropdown.since) setLocalFromDropdown(prev => ({ ...prev, [role]: { ...prev[role], since: false } }))
                                        }}
                                        title="Date Elected"
                                      />
                                    )}
                                    {fieldWrap('term_ends', uniqueVals('term_ends'),
                                      <input
                                        className="home-add-local-input"
                                        type="date"
                                        value={form.term_ends}
                                        onChange={e => {
                                          upd('term_ends', e.target.value)
                                          if (fromDropdown.term_ends) setLocalFromDropdown(prev => ({ ...prev, [role]: { ...prev[role], term_ends: false } }))
                                        }}
                                        title="Term Ends"
                                      />
                                    )}
                                    <select
                                      className="home-add-local-input"
                                      value={localParty[role] ?? ''}
                                      onChange={e => setLocalParty(prev => ({ ...prev, [role]: e.target.value }))}
                                    >
                                      <option value="">— Party —</option>
                                      <option value="democrat">Democrat</option>
                                      <option value="republican">Republican</option>
                                      <option value="independent">Independent</option>
                                      <option value="nonpartisan">Nonpartisan</option>
                                      <option value="other">Other</option>
                                    </select>
                                    {allFilled && (
                                      anyFromDropdown
                                        ? (
                                          <label className="home-local-self-verify">
                                            <input
                                              type="checkbox"
                                              onChange={() => { void autoSaveLocalOfficial(role, form, true) }}
                                            />
                                            Information is correct
                                          </label>
                                        )
                                        : (
                                          <button
                                            className="home-local-submit-btn"
                                            onClick={() => { void autoSaveLocalOfficial(role, form) }}
                                          >Submit</button>
                                        )
                                    )}
                                    {saveStatus === 'saving' && <span className="home-local-save-status">Saving…</span>}
                                    {saveStatus === 'saved'  && <span className="home-local-save-status home-local-save-status--ok">Saved ✓</span>}
                                    {saveStatus === 'error'  && <span className="home-local-save-status home-local-save-status--err">Error saving</span>}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </>
                        )}
                      </>
                    )}

                    {/* ── User-added local reps (shown only when not in DB mode) ── */}
                    {level === 'local' && !(isLoggedIn && hasProfileAddr && profileAddr?.state) && customLocalReps.map(r => {
                      const cardKey = `local-user-${r.id}`
                      const showElection = repElectionKeys.has(cardKey)
                      return (
                        <div key={r.id} className="home-rep-card home-rep-card--user" data-party="other">
                          <button
                            className="home-rep-delete-btn"
                            onClick={() => deleteLocalRep(r.id!)}
                            aria-label={`Remove ${r.name}`}
                          >×</button>
                          <div className="home-rep-card-toggle" role="group" aria-label="Card view mode">
                            <button className={!showElection ? 'hrct-active' : ''} onClick={() => showElection && toggleRepElection(cardKey)} aria-pressed={!showElection}>Info</button>
                            <button className={showElection ? 'hrct-active' : ''} onClick={() => !showElection && toggleRepElection(cardKey)} aria-pressed={showElection}>Election</button>
                          </div>
                          {!showElection ? (
                            <>
                              <div className="home-rep-role">
                                {profileAddr?.state ? `${profileAddr.state} ${r.role}` : r.role}
                              </div>
                              <div className="home-rep-name">{r.name}</div>
                              {r.phone && <a href={`tel:${r.phone.replace(/\D/g, '')}`} className="home-rep-phone" aria-label={`Call ${r.name}`}>{r.phone}</a>}
                              {r.email && <a href={`mailto:${r.email}`} className="home-rep-email" aria-label={`Email ${r.name}`}>{r.email}</a>}
                              {r.contact_url && <a href={r.contact_url} target="_blank" rel="noopener noreferrer" className="home-rep-contact-btn" aria-label={`Contact ${r.name}`}>Contact</a>}
                            </>
                          ) : (
                            <div className="home-rep-no-election">Election dates unavailable</div>
                          )}
                        </div>
                      )
                    })}

                    {/* ── Add manually (shown only when not in DB mode) ── */}
                    {level === 'local' && !(isLoggedIn && hasProfileAddr && profileAddr?.state) && !showAddLocal && (
                      <button className="home-add-local-btn" onClick={() => setShowAddLocal(true)}>+ Add manually</button>
                    )}
                    {level === 'local' && !(isLoggedIn && hasProfileAddr && profileAddr?.state) && showAddLocal && (
                      <div className="home-add-local-form">
                        <div className="home-add-local-title">Add representative</div>
                        <input
                          className="home-add-local-input"
                          placeholder="Name *"
                          value={addLocalForm.name}
                          onChange={e => setAddLocalForm(f => ({ ...f, name: e.target.value }))}
                        />
                        <input
                          className="home-add-local-input"
                          placeholder="Role * (e.g. Mayor, City Council)"
                          value={addLocalForm.role}
                          onChange={e => setAddLocalForm(f => ({ ...f, role: e.target.value }))}
                        />
                        <input
                          className="home-add-local-input"
                          placeholder="Phone"
                          value={addLocalForm.phone}
                          onChange={e => setAddLocalForm(f => ({ ...f, phone: e.target.value }))}
                        />
                        <input
                          className="home-add-local-input"
                          placeholder="Email"
                          value={addLocalForm.email}
                          onChange={e => setAddLocalForm(f => ({ ...f, email: e.target.value }))}
                        />
                        <input
                          className="home-add-local-input"
                          placeholder="Contact URL"
                          value={addLocalForm.contact_url}
                          onChange={e => setAddLocalForm(f => ({ ...f, contact_url: e.target.value }))}
                        />
                        <div className="home-add-local-actions">
                          <button
                            className="home-add-local-save"
                            onClick={saveLocalRep}
                            disabled={!addLocalForm.name.trim() || !addLocalForm.role.trim()}
                          >Save</button>
                          <button
                            className="home-add-local-cancel"
                            onClick={() => { setShowAddLocal(false); setAddLocalForm({ name: '', role: '', phone: '', email: '', contact_url: '' }) }}
                          >Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>


          </section>
        )}

      </div>{/* end content */}


      {/* Scurrying bugs */}
      {scurryPhase !== null && scurryPositions.current.map((pos, i) => {
        const scattered = scurryPhase === 'scatter'
        return (
          <div key={i} style={{
            position: 'fixed',
            bottom: 28 + i * 3,
            right: 28 + i * 5,
            zIndex: 4,
            pointerEvents: 'none',
            transform: scattered
              ? `translate(${pos.x}px, ${pos.y}px) rotate(${pos.rot}deg)`
              : 'translate(0, 0) rotate(0deg)',
            transition: scattered
              ? `transform ${5.0 + i * 1.2}s cubic-bezier(.2,.05,.3,1), opacity ${3.0 + i * 0.5}s ease-in ${1.5 + i * 0.5}s`
              : 'none',
            opacity: scattered ? 0 : 1,
          }}>
            {i === 0 && <MiniBugRed />}
            {i === 1 && <MiniBugBlue />}
            {i === 2 && <MiniBugYellow />}
          </div>
        )
      })}

      {gremlinEgg && (
        <div key={gremlinKey} className="egg-gremlin">
          <EggGremlinSVG />
        </div>
      )}

    </div>
  )
}
