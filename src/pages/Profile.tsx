import { useEffect, useRef, useState } from 'react'
import PageTopBar from '../components/PageTopBar'
import { useAuth } from '../contexts/AuthContext'
import { userKey } from '../lib/userKey'
import { getMichiganCounty } from '../lib/michiganCounties'
import { lookupZipCounty } from '../lib/zipCounty'
import { getStateConfig } from '../lib/stateDistrictConfig'
import { supabase } from '../lib/supabase'
import { profileSave, personalInfoGet, personalInfoSave, verifySend, verifyConfirm } from '../lib/authApi'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC',
]

// 3-digit ZIP prefix ranges → state abbreviation (USPS geographic distribution)
const ZIP_STATE_RANGES: [number, number, string][] = [
  [10,  27,  'MA'], [28,  29,  'RI'], [30,  38,  'NH'], [39,  49,  'ME'],
  [50,  59,  'VT'], [60,  69,  'CT'], [70,  89,  'NJ'],
  [100, 149, 'NY'], [150, 196, 'PA'], [197, 199, 'DE'],
  [200, 205, 'DC'], [206, 219, 'MD'], [220, 246, 'VA'],
  [247, 268, 'WV'], [270, 289, 'NC'], [290, 299, 'SC'],
  [300, 319, 'GA'], [320, 349, 'FL'], [350, 369, 'AL'],
  [370, 385, 'TN'], [386, 399, 'MS'], [400, 427, 'KY'],
  [430, 459, 'OH'], [460, 479, 'IN'], [480, 499, 'MI'],
  [500, 528, 'IA'], [530, 549, 'WI'], [550, 567, 'MN'],
  [570, 577, 'SD'], [580, 588, 'ND'], [590, 599, 'MT'],
  [600, 629, 'IL'], [630, 658, 'MO'], [660, 679, 'KS'],
  [680, 693, 'NE'], [700, 714, 'LA'], [716, 729, 'AR'],
  [730, 749, 'OK'], [750, 799, 'TX'], [800, 816, 'CO'],
  [820, 831, 'WY'], [832, 838, 'ID'], [840, 847, 'UT'],
  [850, 865, 'AZ'], [870, 884, 'NM'], [889, 898, 'NV'],
  [900, 961, 'CA'], [967, 968, 'HI'], [970, 979, 'OR'],
  [980, 994, 'WA'], [995, 999, 'AK'],
]

// 5-digit ZIPs that map to exactly one primary city — conservative, high-confidence only
const ZIP_CITY: Record<string, string> = {
  // Michigan
  '49036': 'Coldwater',        '49601': 'Cadillac',
  '49770': 'Petoskey',         '49783': 'Sault Ste. Marie',
  '49855': 'Marquette',        '49883': 'Newberry',
  '49931': 'Houghton',         '49935': 'Iron Mountain',
  '49946': "L'Anse",           '48858': 'Mount Pleasant',
  // New England
  '04609': 'Bar Harbor',       '04976': 'Skowhegan',
  '03301': 'Concord',          '05401': 'Burlington',
  // Mid-Atlantic
  '13326': 'Cooperstown',      '17325': 'Gettysburg',
  // South / Appalachia
  '25425': 'Harpers Ferry',    '33040': 'Key West',
  // Mountain West
  '80517': 'Estes Park',       '82001': 'Cheyenne',
  // Great Plains
  '57501': 'Pierre',           '57785': 'Sturgis',
  '58501': 'Bismarck',
  // Pacific / Alaska
  '99901': 'Ketchikan',
  // Famous
  '90210': 'Beverly Hills',
}

// Strips non-digits and removes leading zeros → "06" → "6", "003" → "3"
function normalizeDistrict(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const n = parseInt(digits, 10)
  return isNaN(n) ? '' : String(n)
}

function normalizeProfileData(d: ProfileData): ProfileData {
  return {
    ...d,
    congressional_district: normalizeDistrict(d.congressional_district),
    state_senate_district:  normalizeDistrict(d.state_senate_district),
    state_house_district:   normalizeDistrict(d.state_house_district),
    county_commissioner:    normalizeDistrict(d.county_commissioner),
    ward:                   normalizeDistrict(d.ward),
    precinct:               normalizeDistrict(d.precinct),
  }
}

function lookupZip(zip: string): { state: string | null; city: string | null } {
  if (zip.length < 5) return { state: null, city: null }
  const prefix = parseInt(zip.slice(0, 3), 10)
  const match = ZIP_STATE_RANGES.find(([lo, hi]) => prefix >= lo && prefix <= hi)
  const key = zip.slice(0, 5)
  return {
    state: match ? match[2] : null,
    city:  ZIP_CITY[key] ?? null,
  }
}

type Provenance = 'empty' | 'manual' | 'autofill' | 'election'
interface FieldEntry {
  current_value: string
  previous_value: string
  provenance: Provenance
  source: string
  timestamp: string
  original_autofill_value: string
}
type FieldStore = Record<AutofillField, FieldEntry>
const AUTOFILL_FIELDS = ['state', 'city', 'county', 'congressional_district', 'state_senate_district', 'state_house_district'] as const
type AutofillField = typeof AUTOFILL_FIELDS[number]

interface CivicOffice {
  name: string
  divisionId: string
  levels?: string[]
  roles?: string[]
}
interface CivicApiResponse {
  offices?: CivicOffice[]
}

interface ProfileData {
  country: string
  street: string
  zip: string
  state: string
  county: string
  city: string
  // Legislative
  congressional_district:    string
  state_senate_district:     string
  state_house_district:      string
  county_commissioner:       string
  // Jurisdiction
  jurisdiction:              string
  ward:                      string
  precinct:                  string
  village:                   string
  // Courts (state-specific)
  circuit_court:             string
  probate_court:             string
  district_court:            string
  // Education
  school_district:           string
  // Meta
  confirmed: boolean
  city_link: string
}

const EMPTY: ProfileData = {
  country: 'United States', street: '', zip: '', state: '', county: '', city: '',
  congressional_district: '', state_senate_district: '', state_house_district: '',
  county_commissioner: '',
  jurisdiction: '', ward: '', precinct: '', village: '',
  circuit_court: '', probate_court: '', district_court: '',
  school_district: '',
  confirmed: false, city_link: '',
}

function load(): ProfileData {
  try {
    const raw = localStorage.getItem(userKey('wsp-profile'))
    if (raw) return normalizeProfileData({ ...EMPTY, ...JSON.parse(raw) })
  } catch { /* ignore */ }
  return { ...EMPTY }
}

function hasEnough(d: ProfileData): boolean {
  return d.state.trim() !== ''
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border-medium)',
  background: 'var(--color-bg-primary)',
  color: 'var(--color-text-primary)',
  fontFamily: "'Nunito', sans-serif",
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
  textTransform: 'uppercase',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: "'Quicksand', sans-serif",
  fontSize: 13,
  fontWeight: 700,
  color: '#1a7a72',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '.5px',
}

const tealLabelStyle: React.CSSProperties = {
  ...labelStyle,
  color: 'var(--color-teal)',
}

const STATE_LEGISLATURE: Record<string, { senate: number; house: number; houseName: string }> = {
  AL: { senate: 35,  house: 105, houseName: 'House'      },
  AK: { senate: 20,  house: 40,  houseName: 'House'      },
  AZ: { senate: 30,  house: 60,  houseName: 'House'      },
  AR: { senate: 35,  house: 100, houseName: 'House'      },
  CA: { senate: 40,  house: 80,  houseName: 'Assembly'   },
  CO: { senate: 35,  house: 65,  houseName: 'House'      },
  CT: { senate: 36,  house: 151, houseName: 'House'      },
  DE: { senate: 21,  house: 41,  houseName: 'House'      },
  FL: { senate: 40,  house: 120, houseName: 'House'      },
  GA: { senate: 56,  house: 180, houseName: 'House'      },
  HI: { senate: 25,  house: 51,  houseName: 'House'      },
  ID: { senate: 35,  house: 70,  houseName: 'House'      },
  IL: { senate: 59,  house: 118, houseName: 'House'      },
  IN: { senate: 50,  house: 100, houseName: 'House'      },
  IA: { senate: 50,  house: 100, houseName: 'House'      },
  KS: { senate: 40,  house: 125, houseName: 'House'      },
  KY: { senate: 38,  house: 100, houseName: 'House'      },
  LA: { senate: 39,  house: 105, houseName: 'House'      },
  ME: { senate: 35,  house: 151, houseName: 'House'      },
  MD: { senate: 47,  house: 141, houseName: 'Delegates'  },
  MA: { senate: 40,  house: 160, houseName: 'House'      },
  MI: { senate: 38,  house: 110, houseName: 'House'      },
  MN: { senate: 67,  house: 134, houseName: 'House'      },
  MS: { senate: 52,  house: 122, houseName: 'House'      },
  MO: { senate: 34,  house: 163, houseName: 'House'      },
  MT: { senate: 50,  house: 100, houseName: 'House'      },
  NE: { senate: 49,  house: 0,   houseName: 'Unicameral' },
  NV: { senate: 21,  house: 42,  houseName: 'Assembly'   },
  NH: { senate: 24,  house: 400, houseName: 'House'      },
  NJ: { senate: 40,  house: 80,  houseName: 'Assembly'   },
  NM: { senate: 42,  house: 70,  houseName: 'House'      },
  NY: { senate: 63,  house: 150, houseName: 'Assembly'   },
  NC: { senate: 50,  house: 120, houseName: 'House'      },
  ND: { senate: 47,  house: 94,  houseName: 'House'      },
  OH: { senate: 33,  house: 99,  houseName: 'House'      },
  OK: { senate: 48,  house: 101, houseName: 'House'      },
  OR: { senate: 30,  house: 60,  houseName: 'House'      },
  PA: { senate: 50,  house: 203, houseName: 'House'      },
  RI: { senate: 38,  house: 75,  houseName: 'House'      },
  SC: { senate: 46,  house: 124, houseName: 'House'      },
  SD: { senate: 35,  house: 70,  houseName: 'House'      },
  TN: { senate: 33,  house: 99,  houseName: 'House'      },
  TX: { senate: 31,  house: 150, houseName: 'House'      },
  UT: { senate: 29,  house: 75,  houseName: 'House'      },
  VT: { senate: 30,  house: 150, houseName: 'House'      },
  VA: { senate: 40,  house: 100, houseName: 'Delegates'  },
  WA: { senate: 49,  house: 98,  houseName: 'House'      },
  WV: { senate: 34,  house: 100, houseName: 'Delegates'  },
  WI: { senate: 33,  house: 99,  houseName: 'Assembly'   },
  WY: { senate: 30,  house: 60,  houseName: 'House'      },
  DC: { senate: 0,   house: 13,  houseName: 'Council'    },
}

// U.S. House seats per state (post-2020 apportionment). DC has 1 non-voting delegate.
const STATE_FEDERAL_SEATS: Record<string, number> = {
  AL: 7,  AK: 1,  AZ: 9,  AR: 4,  CA: 52, CO: 8,  CT: 5,  DE: 1,  FL: 28, GA: 14,
  HI: 2,  ID: 2,  IL: 17, IN: 9,  IA: 4,  KS: 4,  KY: 6,  LA: 6,  ME: 2,  MD: 8,
  MA: 9,  MI: 13, MN: 8,  MS: 4,  MO: 8,  MT: 2,  NE: 3,  NV: 4,  NH: 2,  NJ: 12,
  NM: 3,  NY: 26, NC: 14, ND: 1,  OH: 15, OK: 5,  OR: 6,  PA: 17, RI: 2,  SC: 7,
  SD: 1,  TN: 9,  TX: 38, UT: 4,  VT: 1,  VA: 11, WA: 10, WV: 2,  WI: 8,  WY: 1,
  DC: 1,
}

// Cities with local bill tracking. Expand as jurisdictions are added.
const TRACKED_CITIES = new Set<string>([])

// Voter / district portals per state. lookupUrl drives both "Lookup" and "District & Polling" buttons.
// voterInfoUrl drives the "Voter Info" button and may differ from lookupUrl in some states.
const STATE_PORTALS: Record<string, { lookupUrl: string; voterInfoUrl: string }> = {
  MI: {
    lookupUrl:    'https://mvic.sos.state.mi.us/Voter/Index',
    voterInfoUrl: 'https://mvic.sos.state.mi.us/Voter/Index',
  },
  KS: {
    lookupUrl:    'https://www.kssos.org/elections/elections_voterlookup.aspx',
    voterInfoUrl: 'https://www.kssos.org/elections/elections_voterlookup.aspx',
  },
}

interface DistrictLookupRow {
  id:                     string
  zip:                    string
  state:                  string | null
  county:                 string | null
  congressional_district: string | null
  state_senate_district:  string | null
  state_house_district:   string | null
  county_commissioner:    string | null
  jurisdiction:           string | null
  ward:                   string | null
  precinct:               string | null
  village:                string | null
  circuit_court:          string | null
  probate_court:          string | null
  district_court:         string | null
  school_district:        string | null
  submitted_by:           string
  verification_count:     number
  admin_verified:         boolean
  created_at:             string
  updated_at:             string
}

export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [data, setData]                         = useState<ProfileData>(load)
  const [fieldStore, setFieldStore]             = useState<FieldStore>(() => {
    const d = load()
    const now = new Date().toISOString()
    const entry = (val: string): FieldEntry => ({
      current_value: val, previous_value: '',
      provenance: val ? 'manual' : 'empty',
      source: val ? 'saved' : '', timestamp: now,
      original_autofill_value: '',
    })
    return {
      state:                  entry(d.state),
      city:                   entry(d.city),
      county:                 entry(d.county),
      congressional_district: entry(d.congressional_district),
      state_senate_district:  entry(d.state_senate_district),
      state_house_district:   entry(d.state_house_district),
    }
  })
  const [pendingElection, setPendingElection]   = useState<Partial<Record<AutofillField, string>> | null>(null)
  const [saved, setSaved]                       = useState(false)
  const [cityMismatch, setCityMismatch]         = useState<string | null>(null)
  const [lookupRows, setLookupRows]             = useState<DistrictLookupRow[]>([])
  const [lookupStatus, setLookupStatus]         = useState<'idle' | 'loading' | 'done'>('idle')
  const [lookupVerifiedIds, setLookupVerifiedIds] = useState<Set<string>>(new Set())
  const [countyChoices, setCountyChoices]       = useState<string[]>([])
  const saveTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dbSyncTimer      = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Prevents DB sync from firing on programmatic data loads (mount, auth restore).
  // Only actual user edits should push to the DB.
  const skipNextDbSync   = useRef(true)
  const autofillSourceRef = useRef<string>('')

  // ── Personal info (tier 3+) ──────────────────────────────────────────────
  const [pi, setPi] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    phone_verified: false, email_verified: false,
    library_card: '', party: '', personal_roles: [] as string[],
  })
  const [piLoaded,    setPiLoaded]    = useState(false)
  const [piSaving,    setPiSaving]    = useState(false)
  const [piSaved,     setPiSaved]     = useState(false)
  const [verifyState, setVerifyState] = useState<{
    type: 'email' | 'phone' | null
    step: 'idle' | 'sent' | 'confirmed' | 'error'
    otp: string
    error: string
    busy: boolean
  }>({ type: null, step: 'idle', otp: '', error: '', busy: false })

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-page', 'content')
    return () => {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.removeAttribute('data-page')
    }
  }, [])

  useEffect(() => {
    if (!user) return
    skipNextDbSync.current = true  // this load must not trigger a DB write
    try {
      const raw = localStorage.getItem(`wsp-profile-${user.username}`)
      setData(raw ? normalizeProfileData({ ...EMPTY, ...JSON.parse(raw) }) : { ...EMPTY })
    } catch { setData({ ...EMPTY }) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username])

  useEffect(() => {
    localStorage.setItem(userKey('wsp-profile'), JSON.stringify(data))
    setSaved(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaved(false), 2000)
    // Debounced DB sync — only for real user edits, never for programmatic loads
    if (user && !skipNextDbSync.current) {
      if (dbSyncTimer.current) clearTimeout(dbSyncTimer.current)
      dbSyncTimer.current = setTimeout(() => { profileSave(data).catch(() => {}) }, 3000)
    }
    skipNextDbSync.current = false
  }, [data, user])

  // Load personal info for tier 3+ users
  useEffect(() => {
    if (!user || user.tier < 3 || piLoaded) return
    personalInfoGet().then(res => {
      if (res.ok) {
        setPi({
          first_name:     res.first_name     ?? '',
          last_name:      res.last_name      ?? '',
          phone:          res.phone          ?? '',
          email:          res.email          ?? '',
          phone_verified: res.phone_verified ?? false,
          email_verified: res.email_verified ?? false,
          library_card:   res.library_card   ?? '',
          party:          res.party          ?? '',
          personal_roles: res.personal_roles ?? [],
        })
      }
      setPiLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.tier])

  // On mount: if a ZIP is already saved, fetch community data for it.
  useEffect(() => {
    const zip = data.zip.replace(/\D/g, '').slice(0, 5)
    if (zip.length === 5) void fetchLookupData(zip)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When county or state changes, fill empty MI court fields from static lookup.
  useEffect(() => {
    if (data.state !== 'MI' || !data.county) return
    const miData = getMichiganCounty(data.county)
    if (!miData) return
    setData(prev => {
      if (prev.state !== 'MI' || prev.county !== data.county) return prev
      const next = { ...prev }
      let changed = false
      const fill = (field: keyof ProfileData, value: string | null) => {
        if (value && !prev[field]) {
          ;(next as Record<string, unknown>)[field] = value.toUpperCase()
          changed = true
        }
      }
      fill('circuit_court', miData.circuitCourt)
      fill('probate_court', miData.probateCourt)
      return changed ? next : prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.county, data.state])

  function set(field: keyof ProfileData, value: string) {
    const stored = field !== 'city_link' ? value.toUpperCase() : value
    setData(prev => {
      const next = { ...prev, [field]: stored }
      if (field !== 'city_link') next.confirmed = false
      return next
    })
    if ((AUTOFILL_FIELDS as readonly string[]).includes(field)) {
      const now = new Date().toISOString()
      setFieldStore(prev => ({
        ...prev,
        [field as AutofillField]: {
          ...prev[field as AutofillField],
          current_value: stored,
          previous_value: prev[field as AutofillField].current_value,
          provenance: stored ? 'manual' : 'empty',
          source: 'user',
          timestamp: now,
        },
      }))
    }
  }

  function writeAutofillFields(
    updates: Partial<Record<AutofillField, { value: string; provenance: Provenance; source: string }>>
  ) {
    const now = new Date().toISOString()
    setData(prev => {
      const next = { ...prev }
      for (const [f, upd] of Object.entries(updates) as [AutofillField, { value: string; provenance: Provenance; source: string }][]) {
        if (upd) (next as Record<string, unknown>)[f] = upd.value
      }
      return next
    })
    setFieldStore(prev => {
      const next = { ...prev }
      for (const [f, upd] of Object.entries(updates) as [AutofillField, { value: string; provenance: Provenance; source: string }][]) {
        if (upd) next[f] = {
          current_value: upd.value,
          previous_value: prev[f].current_value,
          provenance: upd.value ? upd.provenance : 'empty',
          source: upd.source,
          timestamp: now,
          original_autofill_value: upd.provenance === 'autofill'
            ? (prev[f].original_autofill_value || upd.value)
            : prev[f].original_autofill_value,
        }
      }
      return next
    })
  }

  function acceptElection() {
    if (!pendingElection) return
    const updates: Partial<Record<AutofillField, { value: string; provenance: Provenance; source: string }>> = {}
    for (const [f, v] of Object.entries(pendingElection) as [AutofillField, string][]) {
      updates[f] = { value: v, provenance: 'election', source: 'election_data' }
    }
    writeAutofillFields(updates)
    setPendingElection(null)
  }

  function dismissElection() { setPendingElection(null) }


  function applyLookupRow(row: DistrictLookupRow, onlyEmpty = false) {
    setData(prev => {
      const next = { ...prev }
      const fill = (field: keyof ProfileData, value: string | null | undefined) => {
        if (!value) return
        if (onlyEmpty && prev[field]) return
        ;(next as Record<string, unknown>)[field] = value.toUpperCase()
      }
      fill('congressional_district', row.congressional_district)
      fill('state_senate_district',  row.state_senate_district)
      fill('state_house_district',   row.state_house_district)
      fill('county_commissioner',    row.county_commissioner)
      fill('jurisdiction',           row.jurisdiction)
      fill('ward',                   row.ward)
      fill('precinct',               row.precinct)
      fill('village',                row.village)
      fill('circuit_court',          row.circuit_court)
      fill('probate_court',          row.probate_court)
      fill('district_court',         row.district_court)
      fill('school_district',        row.school_district)
      fill('county',                 row.county)
      return next
    })
  }

  async function fetchLookupData(zip: string) {
    setLookupStatus('loading')
    try {
      const { data: rows, error } = await supabase
        .from('district_lookup')
        .select('*')
        .eq('zip', zip)
        .order('admin_verified', { ascending: false })
        .order('verification_count', { ascending: false })
      if (error) throw error
      const typed = (rows ?? []) as DistrictLookupRow[]
      setLookupRows(typed)
      if (user && typed.length > 0) {
        const { data: verifs } = await supabase
          .from('district_lookup_verifications')
          .select('lookup_id')
          .in('lookup_id', typed.map(r => r.id))
          .eq('username', user.username)
        if (verifs) {
          setLookupVerifiedIds(new Set((verifs as { lookup_id: string }[]).map(v => v.lookup_id)))
        }
      }
      // Auto-fill empty fields from admin-verified row only.
      const verified = typed.find(r => r.admin_verified)
      if (verified) applyLookupRow(verified, true)
    } catch (e) {
      console.warn('[district] fetch error:', e)
    } finally {
      setLookupStatus('done')
    }
  }


  async function handleDistrictVerify(id: string) {
    if (!user) return
    try {
      const { error } = await supabase
        .from('district_lookup_verifications')
        .insert({ lookup_id: id, username: user.username })
      if (error) {
        if (error.code === '23505') setLookupVerifiedIds(prev => new Set([...prev, id]))
        return
      }
      await supabase.rpc('increment_district_verification', { row_id: id })
      setLookupVerifiedIds(prev => new Set([...prev, id]))
      setLookupRows(prev => prev.map(r =>
        r.id === id ? { ...r, verification_count: r.verification_count + 1 } : r
      ))
    } catch (e) {
      console.warn('[district] verify error:', e)
    }
  }

  function handleZipChange(raw: string) {
    const zip = raw.replace(/[^\d-]/g, '')
    setData(prev => ({ ...prev, zip, confirmed: false }))
    setCityMismatch(null)
    setCountyChoices([])
    setLookupRows([])
    setLookupStatus('idle')
  }

  function handleZipBlur() {
    const zip = data.zip.replace(/\D/g, '').slice(0, 5)
    if (zip.length !== 5) return
    const addressKey = `${data.street.trim().toUpperCase()}|${zip}`
    if (addressKey !== autofillSourceRef.current) {
      const now = new Date().toISOString()
      setData(prev => {
        const next = { ...prev }
        AUTOFILL_FIELDS.forEach(f => {
          if (fieldStore[f].provenance === 'autofill') (next as Record<string, unknown>)[f] = ''
        })
        return next
      })
      setFieldStore(prev => {
        const next = { ...prev }
        AUTOFILL_FIELDS.forEach(f => {
          if (prev[f].provenance === 'autofill') {
            next[f] = { ...prev[f], current_value: '', previous_value: prev[f].current_value, provenance: 'empty', source: '', timestamp: now }
          }
        })
        return next
      })
      autofillSourceRef.current = addressKey
    }
    const { state, city } = lookupZip(zip)
    const updates: Partial<Record<AutofillField, { value: string; provenance: Provenance; source: string }>> = {}
    if (state && fieldStore.state.provenance === 'empty') updates.state = { value: state, provenance: 'autofill', source: 'zip_lookup' }
    if (city  && fieldStore.city.provenance  === 'empty') updates.city  = { value: city,  provenance: 'autofill', source: 'zip_lookup' }
    if (Object.keys(updates).length > 0) writeAutofillFields(updates)
    if (city && data.city && data.city.toLowerCase() !== city.toLowerCase()) setCityMismatch(city)
    const countyResult = lookupZipCounty(zip)
    if (countyResult) {
      if (countyResult.length === 1) {
        if (fieldStore.county.provenance === 'empty')
          writeAutofillFields({ county: { value: countyResult[0], provenance: 'autofill', source: 'zip_county_lookup' } })
        setCountyChoices([])
      } else {
        setCountyChoices(countyResult)
      }
    }
    setLookupRows([])
    setLookupStatus('idle')
    void fetchLookupData(zip)
    const effectiveState = fieldStore.state.provenance === 'empty' && state ? state : data.state
    const effectiveCity  = fieldStore.city.provenance  === 'empty' && city  ? city  : data.city
    if (data.street && effectiveCity && effectiveState) {
      void callCivicApi(`${data.street}, ${effectiveCity}, ${effectiveState} ${zip}`)
    }
  }

  async function callCivicApi(address: string) {
    const key = import.meta.env.VITE_GOOGLE_CIVIC_API_KEY as string | undefined
    if (!key) return
    try {
      const res = await fetch(
        `https://www.googleapis.com/civicinfo/v2/representatives?key=${key}&address=${encodeURIComponent(address)}`
      )
      if (!res.ok) return
      const json = await res.json() as CivicApiResponse
      let congressional: string | null = null
      let stateSenate: string | null   = null
      let stateHouse: string | null    = null
      for (const office of json.offices ?? []) {
        const levels = office.levels ?? []
        const roles  = office.roles  ?? []
        const divId  = office.divisionId ?? ''
        if (levels.includes('country') && roles.includes('legislatorLowerBody')) {
          const m = divId.match(/\/cd:(\d+)/); if (m) congressional = m[1]
        }
        if (levels.includes('administrativeArea1') && roles.includes('legislatorUpperBody')) {
          const m = divId.match(/\/sldu:(\d+)/); if (m) stateSenate = m[1]
        }
        if (levels.includes('administrativeArea1') && roles.includes('legislatorLowerBody')) {
          const m = divId.match(/\/sldl:(\d+)/); if (m) stateHouse = m[1]
        }
      }
      const civicUpdates: Partial<Record<AutofillField, { value: string; provenance: Provenance; source: string }>> = {}
      if (congressional && fieldStore.congressional_district.provenance === 'empty')
        civicUpdates.congressional_district = { value: congressional, provenance: 'autofill', source: 'google_civic_api' }
      if (stateSenate && fieldStore.state_senate_district.provenance === 'empty')
        civicUpdates.state_senate_district = { value: stateSenate, provenance: 'autofill', source: 'google_civic_api' }
      if (stateHouse && fieldStore.state_house_district.provenance === 'empty')
        civicUpdates.state_house_district = { value: stateHouse, provenance: 'autofill', source: 'google_civic_api' }
      if (Object.keys(civicUpdates).length > 0) writeAutofillFields(civicUpdates)
    } catch { /* ignore network/parse errors */ }
  }

  const config      = getStateConfig(data.state)
  const enough      = hasEnough(data)
  const leg         = data.state ? STATE_LEGISLATURE[data.state] : null
  const cityTracked = !!(data.city && TRACKED_CITIES.has(data.city.toLowerCase()))

  async function savePiField(partial: Partial<typeof pi>) {
    const next = { ...pi, ...partial }
    setPi(next)
    setPiSaving(true)
    const { first_name, last_name, phone, library_card, party, personal_roles } = next
    const res = await personalInfoSave({ first_name, last_name, phone, library_card, party, personal_roles }).catch(() => ({ ok: false }))
    setPiSaving(false)
    setPiSaved(true)
    setTimeout(() => setPiSaved(false), 2000)
    if (res.tier_upgraded) await refreshUser()
  }

  function toggleRole(role: string) {
    const has  = pi.personal_roles.includes(role)
    const next = has ? pi.personal_roles.filter(r => r !== role) : [...pi.personal_roles, role]
    void savePiField({ personal_roles: next })
  }

  async function handleVerifySend(type: 'email' | 'phone') {
    const target = type === 'email' ? pi.email : pi.phone
    if (!target.trim()) return
    setVerifyState(s => ({ ...s, type, step: 'idle', otp: '', error: '', busy: true }))
    const res = await verifySend(type, target)
    if (res.ok) {
      setVerifyState(s => ({ ...s, step: 'sent', busy: false }))
    } else {
      setVerifyState(s => ({ ...s, step: 'error', error: res.error ?? 'Failed to send', busy: false }))
    }
  }

  async function handleVerifyConfirm(type: 'email' | 'phone') {
    setVerifyState(s => ({ ...s, busy: true, error: '' }))
    const res = await verifyConfirm(type, verifyState.otp)
    if (res.ok) {
      const update = type === 'email' ? { email_verified: true } : { phone_verified: true }
      setPi(s => ({ ...s, ...update }))
      setVerifyState(s => ({ ...s, step: 'confirmed', busy: false }))
      if (res.tier_upgraded) await refreshUser()
    } else {
      setVerifyState(s => ({ ...s, step: 'error', error: res.error ?? 'Invalid code', busy: false }))
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg-secondary)',
      padding: '50px 28px 32px',
      color: 'var(--color-text-primary)',
      fontFamily: "'Nunito', sans-serif",
    }}>
      <PageTopBar />

      <div>

        {/* title + description constrained to narrow width */}
        <div style={{ maxWidth: 480, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              My Profile
            </h1>
            <span style={{
              fontSize: 12, fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
              color: 'var(--color-text-success)',
              opacity: saved ? 1 : 0,
              transition: 'opacity .25s',
              paddingTop: 2,
            }}>
              Saved
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.6, margin: 0 }}>
            Location information is used to populate Your Representatives on your dashboard. If the outline is green, we have what we need and you don't have to fill anything else out for the pipeline to do its job.
          </p>
        </div>

        {/* Election data preview gate */}
        {pendingElection && (
          <div style={{
            maxWidth: 480, marginBottom: 20,
            background: 'var(--color-card)',
            border: '2px solid #b8860b',
            borderRadius: 10, padding: '16px 18px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: 14, color: '#b8860b' }}>
              Election data available — review before accepting
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(Object.entries(pendingElection) as [AutofillField, string][]).map(([f, v]) => {
                const entry = fieldStore[f]
                const userCorrected =
                  v !== entry.current_value &&
                  entry.current_value !== entry.original_autofill_value &&
                  entry.original_autofill_value !== ''
                return (
                  <div key={f} style={{
                    display: 'flex', flexDirection: 'column', gap: 3,
                    padding: userCorrected ? '6px 8px' : '2px 0',
                    borderRadius: userCorrected ? 6 : 0,
                    background: userCorrected ? 'rgba(184,134,11,0.12)' : 'transparent',
                    borderLeft: userCorrected ? '3px solid #b8860b' : 'none',
                    paddingLeft: userCorrected ? 8 : 0,
                  }}>
                    <div style={{ display: 'flex', gap: 10, fontSize: 13, fontFamily: "'Nunito', sans-serif", alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-tertiary)', minWidth: 180 }}>{f.replace(/_/g, ' ')}</span>
                      <span style={{ color: 'var(--color-text-secondary)', textDecoration: 'line-through' }}>{entry.current_value || '—'}</span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{v}</span>
                    </div>
                    {userCorrected && (
                      <div style={{ fontSize: 11, fontFamily: "'Nunito', sans-serif", color: '#b8860b', fontStyle: 'italic' }}>
                        overwrites your correction (was {entry.original_autofill_value || '—'})
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={acceptElection} style={{
                padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: '#00B050', color: '#fff',
                fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: 13,
              }}>Accept</button>
              <button onClick={dismissElection} style={{
                padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
                background: 'transparent', border: '1px solid var(--color-border-medium)',
                color: 'var(--color-text-secondary)',
                fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: 13,
              }}>Dismiss</button>
            </div>
          </div>
        )}

        {/* cards row — address left, districts right */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* ── Home Address ── */}
          <div style={{ flex: '0 1 380px', minWidth: 260 }}>
            <div style={{
              background: 'var(--color-card, #fff)',
              border: enough ? '4px solid #00B050' : '1px solid var(--color-border-light)',
              borderRadius: 12,
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              transition: 'border-color .2s',
            }}>
              <h2 style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                Home Address
              </h2>

              <div>
                <label style={labelStyle} htmlFor="prof-country">Country</label>
                <input id="prof-country" style={inputStyle} type="text" autoComplete="country-name"
                  value={data.country} onChange={e => set('country', e.target.value)} />
              </div>

              <div>
                <label style={labelStyle} htmlFor="prof-zip">ZIP code</label>
                <input id="prof-zip" style={inputStyle} type="text" autoComplete="postal-code"
                  inputMode="numeric" maxLength={10} value={data.zip}
                  onChange={e => handleZipChange(e.target.value)}
                  onBlur={() => handleZipBlur()} />
              </div>

              <div>
                <label style={labelStyle} htmlFor="prof-street">Street address</label>
                <input id="prof-street" style={inputStyle} type="text" autoComplete="street-address"
                  placeholder="123 MAIN ST"
                  value={data.street} onChange={e => set('street', e.target.value)} />
              </div>

              <div>
                <label style={labelStyle} htmlFor="prof-state">State</label>
                <select id="prof-state" style={{ ...inputStyle, cursor: 'pointer' }} autoComplete="address-level1"
                  value={data.state} onChange={e => set('state', e.target.value)}>
                  <option value="" />
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle} htmlFor="prof-county">{config.countyLabel}</label>
                {countyChoices.length > 0 ? (
                  <select
                    id="prof-county"
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={data.county}
                    onChange={e => {
                      if (e.target.value === '') { setCountyChoices([]); return }
                      set('county', e.target.value)
                      setCountyChoices([])
                    }}
                  >
                    <option value="">— select or type manually —</option>
                    {countyChoices.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input id="prof-county" style={inputStyle} type="text" autoComplete="off"
                    value={data.county} onChange={e => set('county', e.target.value)} />
                )}
              </div>

              <div>
                <label style={labelStyle} htmlFor="prof-city">City</label>
                <input id="prof-city" style={inputStyle} type="text" autoComplete="address-level2"
                  value={data.city} onChange={e => { set('city', e.target.value); setCityMismatch(null) }} />
                {cityMismatch && (
                  <div style={{ fontSize: 12, color: '#b8860b', marginTop: 4 }}>
                    ZIP suggests {cityMismatch}
                  </div>
                )}
              </div>

            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '12px 0', lineHeight: 1.6, fontFamily: "'Nunito', sans-serif" }}>
              Your address is used for district lookups and is stored only on this device.
            </p>
          </div>

          {/* ── My District Information ── */}
          <div style={{ flex: '0 1 380px', minWidth: 260 }}>
            <div style={{
              background: 'var(--color-card, #fff)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 12,
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              transition: 'border-color .2s',
            }}>
              <h2 style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                My District Information
              </h2>

              {/* National legislature */}
              <div>
                <label style={labelStyle}>National Legislature</label>
                <div style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.8, fontFamily: "'Nunito', sans-serif" }}>
                  <div>
                    U.S. Senate: 100 senators
                    {data.state ? ` — 2 from ${data.state}` : ''}
                  </div>
                  <div>
                    U.S. House: 435 members
                    {data.state && STATE_FEDERAL_SEATS[data.state] != null
                      ? ` — ${STATE_FEDERAL_SEATS[data.state]} from ${data.state}${data.state === 'DC' ? ' (non-voting)' : ''}`
                      : ''}
                  </div>
                </div>
              </div>

              {/* State legislature size */}
              <div>
                <label style={labelStyle}>State Legislature</label>
                {leg ? (
                  <div style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.8, fontFamily: "'Nunito', sans-serif" }}>
                    {leg.houseName === 'Unicameral' ? (
                      <div>Unicameral: {leg.senate} senators</div>
                    ) : (
                      <>
                        <div>Senate: {leg.senate} senators</div>
                        <div>{leg.houseName}: {leg.house} members</div>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontFamily: "'Nunito', sans-serif" }}>
                    Select your state to see legislature size
                  </div>
                )}
              </div>

              {/* Political Districts header + look-up links */}
              {(() => {
                const portals = data.country === 'United States' ? STATE_PORTALS[data.state] : undefined
                const btnStyle = {
                  fontSize: 11, fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
                  padding: '4px 9px', borderRadius: 6,
                  border: '1px solid var(--color-border-medium)',
                  background: 'var(--color-bg-secondary)',
                  color: 'var(--color-teal)',
                  whiteSpace: 'nowrap' as const,
                  textDecoration: 'none',
                  display: 'inline-block',
                }
                return (
                  <div>
                    <label style={labelStyle}>Political Districts</label>
                    {portals && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        <a href={portals.lookupUrl} target="_blank" rel="noopener noreferrer" style={btnStyle}>
                          {data.state} Lookup
                        </a>
                        <a href={portals.voterInfoUrl} target="_blank" rel="noopener noreferrer" style={btnStyle}>
                          {data.state} Voter Info
                        </a>
                        <a href={portals.lookupUrl} target="_blank" rel="noopener noreferrer" style={btnStyle}>
                          {data.state} District &amp; Polling
                        </a>
                      </div>
                    )}
                  </div>
                )
              })()}

              <div>
                <label style={tealLabelStyle} htmlFor="dist-cd">Congressional District</label>
                <input id="dist-cd" style={inputStyle} type="text" autoComplete="off"
                  inputMode="numeric" maxLength={2}
                  value={data.congressional_district}
                  onChange={e => set('congressional_district', normalizeDistrict(e.target.value))} />
              </div>

              {config.unicameral ? (
                <div>
                  <label style={tealLabelStyle} htmlFor="dist-leg">State {config.houseName} District</label>
                  <input id="dist-leg" style={inputStyle} type="text" autoComplete="off"
                    inputMode="numeric" maxLength={3}
                    value={data.state_senate_district}
                    onChange={e => set('state_senate_district', normalizeDistrict(e.target.value))} />
                </div>
              ) : (
                <>
                  <div>
                    <label style={tealLabelStyle} htmlFor="dist-ss">State Senate District</label>
                    <input id="dist-ss" style={inputStyle} type="text" autoComplete="off"
                      inputMode="numeric" maxLength={3}
                      value={data.state_senate_district}
                      onChange={e => set('state_senate_district', normalizeDistrict(e.target.value))} />
                  </div>
                  <div>
                    <label style={tealLabelStyle} htmlFor="dist-sh">State {config.houseName} District</label>
                    <input id="dist-sh" style={inputStyle} type="text" autoComplete="off"
                      inputMode="numeric" maxLength={3}
                      value={data.state_house_district}
                      onChange={e => set('state_house_district', normalizeDistrict(e.target.value))} />
                  </div>
                </>
              )}

              <div>
                <label style={tealLabelStyle} htmlFor="dist-cc">{config.countyLabel} Commissioner District</label>
                <input id="dist-cc" style={inputStyle} type="text" autoComplete="off"
                  inputMode="numeric" maxLength={2}
                  value={data.county_commissioner}
                  onChange={e => set('county_commissioner', normalizeDistrict(e.target.value))} />
              </div>

              <div>
                <label style={tealLabelStyle} htmlFor="dist-sch">School District</label>
                <input id="dist-sch" style={inputStyle} type="text" autoComplete="off"
                  maxLength={100}
                  value={data.school_district}
                  onChange={e => set('school_district', e.target.value)} />
              </div>

              {/* Local Jurisdiction */}
              <label style={labelStyle}>Local Jurisdiction</label>

              <div>
                <label style={tealLabelStyle} htmlFor="dist-jur">City / Township</label>
                <input id="dist-jur" style={inputStyle} type="text" autoComplete="off"
                  maxLength={80}
                  value={data.jurisdiction}
                  onChange={e => set('jurisdiction', e.target.value)} />
              </div>

              <div>
                <label style={tealLabelStyle} htmlFor="dist-ward">Ward</label>
                <input id="dist-ward" style={inputStyle} type="text" autoComplete="off"
                  inputMode="numeric" maxLength={3}
                  value={data.ward}
                  onChange={e => set('ward', normalizeDistrict(e.target.value))} />
              </div>

              <div>
                <label style={tealLabelStyle} htmlFor="dist-prec">Precinct</label>
                <input id="dist-prec" style={inputStyle} type="text" autoComplete="off"
                  inputMode="numeric" maxLength={4}
                  value={data.precinct}
                  onChange={e => set('precinct', normalizeDistrict(e.target.value))} />
              </div>

              {config.showVillage && (
                <div>
                  <label style={tealLabelStyle} htmlFor="dist-vil">Village</label>
                  <input id="dist-vil" style={inputStyle} type="text" autoComplete="off"
                    maxLength={80}
                    value={data.village}
                    onChange={e => set('village', e.target.value)} />
                </div>
              )}

              {/* Courts — only for states where they apply */}
              {(config.showCircuitCourt || config.showProbateCourt || config.showDistrictCourt) && (
                <>
                  <label style={labelStyle}>Courts</label>
                  {config.showCircuitCourt && (
                    <div>
                      <label style={tealLabelStyle} htmlFor="dist-circ">Circuit Court</label>
                      <input id="dist-circ" style={inputStyle} type="text" autoComplete="off"
                        maxLength={60}
                        value={data.circuit_court}
                        onChange={e => set('circuit_court', e.target.value)} />
                    </div>
                  )}
                  {config.showProbateCourt && (
                    <div>
                      <label style={tealLabelStyle} htmlFor="dist-prob">Probate Court</label>
                      <input id="dist-prob" style={inputStyle} type="text" autoComplete="off"
                        maxLength={80}
                        value={data.probate_court}
                        onChange={e => set('probate_court', e.target.value)} />
                    </div>
                  )}
                  {config.showDistrictCourt && (
                    <div>
                      <label style={tealLabelStyle} htmlFor="dist-dc">District Court</label>
                      <input id="dist-dc" style={inputStyle} type="text" autoComplete="off"
                        maxLength={80}
                        value={data.district_court}
                        onChange={e => set('district_court', e.target.value)} />
                    </div>
                  )}
                </>
              )}

              {/* City tracking status */}
              <div>
                <label style={labelStyle}>City in LawTracker</label>
                {cityTracked ? (
                  <div style={{ fontSize: 14, color: '#00B050', fontFamily: "'Nunito', sans-serif" }}>
                    ✓ {data.city} is included in LawTracker
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontFamily: "'Nunito', sans-serif" }}>
                    {data.city ? `${data.city} is not yet tracked locally.` : 'No city on file.'}
                  </div>
                )}
              </div>

              {/* Community district lookup */}
              {(() => {
                const zip = data.zip.replace(/\D/g, '').slice(0, 5)
                const hasZip = zip.length === 5
                const best = lookupRows[0] ?? null
                const isVerifiedByMe = best ? lookupVerifiedIds.has(best.id) : false
                const isMyRow = best ? best.submitted_by === user?.username : false

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {lookupStatus === 'loading' && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: "'Nunito', sans-serif" }}>
                        Looking up community data…
                      </div>
                    )}
                    {lookupStatus === 'done' && !best && hasZip && (
                      <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontFamily: "'Nunito', sans-serif" }}>
                        No community data for ZIP {zip} yet.
                      </div>
                    )}
                    {lookupStatus === 'done' && best && (
                      <div style={{
                        background: 'var(--color-bg-secondary)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}>
                        <div style={{
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: "'Quicksand', sans-serif",
                          color: best.admin_verified ? '#00B050' : 'var(--color-text-primary)',
                        }}>
                          {best.admin_verified
                            ? '✓ Admin-verified data available'
                            : `Community data · ${best.verification_count} ${best.verification_count === 1 ? 'verification' : 'verifications'}${lookupRows.length > 1 ? ` · ${lookupRows.length} submissions` : ''}`}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {user && !isVerifiedByMe && !isMyRow && !best.admin_verified && (
                            <button
                              type="button"
                              onClick={() => void handleDistrictVerify(best.id)}
                              style={{
                                padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                                border: '1px solid var(--color-border-medium)',
                                background: 'transparent', color: 'var(--color-text-primary)',
                                fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: 12,
                              }}
                            >
                              Verify this is correct
                            </button>
                          )}
                          {isVerifiedByMe && (
                            <span style={{ fontSize: 12, color: '#00B050', alignSelf: 'center', fontFamily: "'Nunito', sans-serif" }}>
                              ✓ You verified this
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {!user && hasZip && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic', fontFamily: "'Nunito', sans-serif" }}>
                        Sign in to submit or verify district data.
                      </div>
                    )}
                  </div>
                )
              })()}


            </div>
          </div>

        </div>

        {/* ── Personal Information (tier 3+) ───────────────────────────── */}
        {user && user.tier >= 3 && (
          <div style={{ maxWidth: 480, marginTop: 32 }}>
            <div style={{
              border: '1.5px solid var(--color-border-light)',
              borderRadius: 12,
              padding: '18px 20px',
              background: 'var(--color-bg-primary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h2 style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 17, fontWeight: 700, margin: 0, color: '#4f4262' }}>
                  Personal Information
                </h2>
                {piSaved && (
                  <span style={{ fontSize: 11, fontFamily: "'Quicksand', sans-serif", fontWeight: 700, color: 'var(--color-text-success)' }}>
                    Saved
                  </span>
                )}
                {piSaving && (
                  <span style={{ fontSize: 11, fontFamily: "'Nunito', sans-serif", color: 'var(--color-text-tertiary)' }}>
                    Saving…
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 16px', fontFamily: "'Nunito', sans-serif" }}>
                This information is used for identity verification and is never shared publicly.
              </p>

              {/* Name row */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={piLabelStyle}>First name</label>
                  <input
                    style={piInputStyle}
                    value={pi.first_name}
                    placeholder="First name"
                    onChange={e => setPi(s => ({ ...s, first_name: e.target.value }))}
                    onBlur={() => savePiField({ first_name: pi.first_name })}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={piLabelStyle}>Last name</label>
                  <input
                    style={piInputStyle}
                    value={pi.last_name}
                    placeholder="Last name"
                    onChange={e => setPi(s => ({ ...s, last_name: e.target.value }))}
                    onBlur={() => savePiField({ last_name: pi.last_name })}
                  />
                </div>
              </div>

              {/* Phone */}
              <div style={{ marginBottom: 12 }}>
                <label style={piLabelStyle}>Phone</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    style={{ ...piInputStyle, flex: 1, minWidth: 160 }}
                    value={pi.phone}
                    placeholder="e.g. +1 555 000 0000"
                    onChange={e => setPi(s => ({ ...s, phone: e.target.value, phone_verified: false }))}
                    onBlur={() => savePiField({ phone: pi.phone })}
                  />
                  {pi.phone_verified ? (
                    <span style={{ fontSize: 12, color: '#00B050', fontFamily: "'Nunito', sans-serif", whiteSpace: 'nowrap' }}>✓ Verified</span>
                  ) : (
                    <button
                      disabled={!pi.phone.trim() || verifyState.busy}
                      onClick={() => handleVerifySend('phone')}
                      style={piVerifyBtnStyle}
                    >Send code</button>
                  )}
                </div>
                <VerifyOtpRow type="phone" state={verifyState} onConfirm={handleVerifyConfirm} onChange={otp => setVerifyState(s => ({ ...s, otp }))} />
              </div>

              {/* Email */}
              <div style={{ marginBottom: 12 }}>
                <label style={piLabelStyle}>Email</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    style={{ ...piInputStyle, flex: 1, minWidth: 160 }}
                    value={pi.email}
                    placeholder="your@email.com"
                    onChange={e => setPi(s => ({ ...s, email: e.target.value, email_verified: false }))}
                    onBlur={() => savePiField({ ...pi, phone: pi.phone })}
                  />
                  {pi.email_verified ? (
                    <span style={{ fontSize: 12, color: '#00B050', fontFamily: "'Nunito', sans-serif", whiteSpace: 'nowrap' }}>✓ Verified</span>
                  ) : (
                    <button
                      disabled={!pi.email.trim() || verifyState.busy}
                      onClick={() => handleVerifySend('email')}
                      style={piVerifyBtnStyle}
                    >Send code</button>
                  )}
                </div>
                <VerifyOtpRow type="email" state={verifyState} onConfirm={handleVerifyConfirm} onChange={otp => setVerifyState(s => ({ ...s, otp }))} />
              </div>

              {/* Library card */}
              <div style={{ marginBottom: 12 }}>
                <label style={piLabelStyle}>Library card number</label>
                <input
                  style={piInputStyle}
                  value={pi.library_card}
                  placeholder="Optional"
                  onChange={e => setPi(s => ({ ...s, library_card: e.target.value }))}
                  onBlur={() => savePiField({ library_card: pi.library_card })}
                />
              </div>

              {/* Party */}
              <div style={{ marginBottom: 16 }}>
                <label style={piLabelStyle}>Party affiliation</label>
                <select
                  style={{ ...piInputStyle, cursor: 'pointer' }}
                  value={pi.party}
                  onChange={e => savePiField({ party: e.target.value })}
                >
                  <option value="">Select…</option>
                  {['Democrat', 'Republican', 'Independent', 'Green', 'Libertarian', 'Other'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Roles */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ ...piLabelStyle, marginBottom: 8, display: 'block' }}>I am a… (select all that apply)</label>
                {[
                  { value: 'local_official',    label: 'Local elected official' },
                  { value: 'state_official',    label: 'Elected state official' },
                  { value: 'national_official', label: 'Elected national official' },
                  { value: 'broadcaster',       label: 'Broadcaster / influencer / journalist / media spokesperson' },
                ].map(({ value, label }) => (
                  <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={pi.personal_roles.includes(value)}
                      onChange={() => toggleRole(value)}
                      style={{ width: 15, height: 15, accentColor: '#4f4262', cursor: 'pointer' }}
                    />
                    {label}
                  </label>
                ))}
              </div>

              {/* Volunteer toggle */}
              <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      Verification volunteer
                    </div>
                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      I volunteer to be a W4SP verification agent
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRole('verification_volunteer')}
                    style={{
                      fontFamily: "'Quicksand', sans-serif", fontSize: 12, fontWeight: 700,
                      padding: '5px 16px', borderRadius: 20, border: '1.5px solid',
                      borderColor: pi.personal_roles.includes('verification_volunteer') ? '#4f4262' : 'var(--color-border-light)',
                      background: pi.personal_roles.includes('verification_volunteer') ? '#4f4262' : 'transparent',
                      color: pi.personal_roles.includes('verification_volunteer') ? '#fff' : 'var(--color-text-tertiary)',
                      cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
                    }}
                  >
                    {pi.personal_roles.includes('verification_volunteer') ? 'Yes' : 'No'}
                  </button>
                </div>
              </div>

              {/* Tier 4 auto-grant notice */}
              {user.tier >= 4 ? (
                <p style={{ marginTop: 14, fontSize: 11, color: '#00B050', fontFamily: "'Nunito', sans-serif" }}>
                  ✓ Verified — Tier 4 active.
                </p>
              ) : (
                <p style={{ marginTop: 14, fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: "'Nunito', sans-serif", lineHeight: 1.5 }}>
                  Verify your email, phone, or save a library card number to automatically receive Tier 4 access.
                </p>
              )}
            </div>
          </div>
        )}


      </div>
    </div>
  )
}

// ── Shared styles for personal info section ───────────────────────────────────
const piLabelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Quicksand', sans-serif",
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '.6px',
  marginBottom: 4,
}

const piInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 8,
  border: '1.5px solid var(--color-border-light)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text-primary)',
  fontFamily: "'Nunito', sans-serif",
  fontSize: 13,
  boxSizing: 'border-box',
  outline: 'none',
}

const piVerifyBtnStyle: React.CSSProperties = {
  fontFamily: "'Quicksand', sans-serif",
  fontSize: 12,
  fontWeight: 700,
  padding: '5px 14px',
  borderRadius: 20,
  border: '1.5px solid #4f4262',
  background: 'transparent',
  color: '#4f4262',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

// ── OTP entry row ─────────────────────────────────────────────────────────────
function VerifyOtpRow({
  type, state, onConfirm, onChange,
}: {
  type: 'email' | 'phone'
  state: { type: 'email' | 'phone' | null; step: string; otp: string; error: string; busy: boolean }
  onConfirm: (type: 'email' | 'phone') => void
  onChange: (otp: string) => void
}) {
  if (state.type !== type || state.step === 'idle') return null

  return (
    <div style={{ marginTop: 8 }}>
      {state.step === 'sent' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            style={{ ...piInputStyle, width: 120 }}
            placeholder="6-digit code"
            maxLength={6}
            value={state.otp}
            onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <button
            disabled={state.otp.length !== 6 || state.busy}
            onClick={() => onConfirm(type)}
            style={{ ...piVerifyBtnStyle, background: '#4f4262', color: '#fff', opacity: (state.otp.length !== 6 || state.busy) ? 0.5 : 1 }}
          >
            Confirm
          </button>
        </div>
      )}
      {state.step === 'confirmed' && (
        <span style={{ fontSize: 12, color: '#00B050', fontFamily: "'Nunito', sans-serif" }}>✓ Verified</span>
      )}
      {state.step === 'error' && (
        <span style={{ fontSize: 12, color: '#E97132', fontFamily: "'Nunito', sans-serif" }}>{state.error}</span>
      )}
    </div>
  )
}
