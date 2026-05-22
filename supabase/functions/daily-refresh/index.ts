/**
 * Daily Refresh Edge Function
 * Runs at 3 AM US Eastern (8:00 UTC EST / 7:00 UTC EDT).
 *
 * 1. Federal bills — fetches from Congress.gov, applies two-layer data model.
 * 2. Michigan bills — stub; replace when LEGISCAN_API_KEY is set.
 * 3. Representatives — fetches all current members from Congress.gov.
 *
 * Secrets (set via `supabase secrets set KEY=value`):
 *   CONGRESS_API_KEY          — Congress.gov API key
 *   LEGISCAN_API_KEY          — LegiScan API key (optional; MI bills skip if absent)
 *   SUPABASE_URL              — injected automatically
 *   SUPABASE_SERVICE_ROLE_KEY — injected automatically
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const secretKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CONGRESS_API_KEY  = Deno.env.get('CONGRESS_API_KEY') ?? ''
const LEGISCAN_API_KEY  = Deno.env.get('LEGISCAN_API_KEY') ?? ''
const CONGRESS_API_BASE = 'https://api.congress.gov/v3'

// 119th Congress: Jan 3, 2025 – Jan 3, 2027
const CURRENT_CONGRESS = 119

// Layer 1 keys — auto-pulled; never human-written
const LAYER1_KEYS = ['name', 'introduced', 'stage', 'stage_dates', 'stage_note'] as const

// ── Federal stage mapping ─────────────────────────────────────────────────────
// FEDERAL_STAGES = ['Introduced','Committee','House floor','Senate','Conference','Signed']
// stage === 6 means enacted (stage === stages.length)

function mapFederalStage(latestActionText: string): number {
  const t = (latestActionText ?? '').toLowerCase()
  if (t.includes('became public law') || t.includes('enacted into law') || t.includes('public law')) return 6
  if (t.includes('signed by president') || t.startsWith('signed') || t.includes('signed into law')) return 5
  if (t.includes('conference') || t.includes('resolving differences')) return 4
  if (t.includes('received in the senate') || t.includes('received in the house') ||
      t.includes('passed senate') || t.includes('passed house') ||
      t.includes('agreed to in senate') || t.includes('agreed to in house')) return 3
  if (t.includes('reported by') || t.includes('ordered to be reported') ||
      t.includes('markup') || t.includes('committee consideration')) return 2
  if (t.includes('referred to')) return 1
  return 0
}

// ── Bill reference parser ─────────────────────────────────────────────────────

interface BillRef {
  congress: number
  type: string   // 'hr' | 's' | 'hjres' | 'sjres' | 'hconres' | 'sconres' | 'hres' | 'sres'
  number: number
}

function parseBillRef(name: string, pullSource: string | null): BillRef | null {
  // Try pull_source URL first: .../v3/bill/119/hr/22
  if (pullSource) {
    const m = pullSource.match(/\/v3\/bill\/(\d+)\/([a-z]+)\/(\d+)/i)
    if (m) return { congress: Number(m[1]), type: m[2].toLowerCase(), number: Number(m[3]) }
  }

  // Parse from bill name, longest patterns first to avoid partial matches
  const typeMap: Array<[RegExp, string]> = [
    [/^H\.J\.Res\.?\s*(\d+)/i,   'hjres'],
    [/^S\.J\.Res\.?\s*(\d+)/i,   'sjres'],
    [/^H\.Con\.Res\.?\s*(\d+)/i, 'hconres'],
    [/^S\.Con\.Res\.?\s*(\d+)/i, 'sconres'],
    [/^H\.Res\.?\s*(\d+)/i,      'hres'],
    [/^S\.Res\.?\s*(\d+)/i,      'sres'],
    [/^H\.R\.?\s*(\d+)/i,        'hr'],
    [/^S\.?\s+(\d+)/i,           's'],
  ]

  for (const [re, type] of typeMap) {
    const m = name.match(re)
    if (m) return { congress: CURRENT_CONGRESS, type, number: Number(m[1]) }
  }

  return null
}

// ── Congress.gov bill fetch ───────────────────────────────────────────────────

interface Layer1Update {
  name: string
  introduced: string | null
  stage: number
  stage_date: string | null   // the raw date from latestAction — merged into array by caller
  stage_note: string | null
  pull_source: string
  raw_pull_data: unknown
  last_pulled_at: string
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    hr: 'H.R.', s: 'S.', hjres: 'H.J.Res.', sjres: 'S.J.Res.',
    hconres: 'H.Con.Res.', sconres: 'S.Con.Res.', hres: 'H.Res.', sres: 'S.Res.',
  }
  return labels[type] ?? type.toUpperCase()
}

async function fetchCongressBill(ref: BillRef): Promise<Layer1Update | null> {
  const url = `${CONGRESS_API_BASE}/bill/${ref.congress}/${ref.type}/${ref.number}?api_key=${CONGRESS_API_KEY}`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[bills/federal] ${typeLabel(ref.type)} ${ref.number}: HTTP ${res.status}`)
      return null
    }
    const data = await res.json()
    const bill = data.bill
    if (!bill) return null

    const title = bill.title ?? bill.shortTitle ?? ''
    const billName = `${typeLabel(ref.type)} ${ref.number}${title ? ' — ' + title : ''}`

    const latestActionText: string = bill.latestAction?.text ?? ''
    const latestActionDate: string = bill.latestAction?.actionDate ?? ''
    const stage = mapFederalStage(latestActionText)

    // Strip API key from stored URL
    const cleanUrl = url.replace(`?api_key=${CONGRESS_API_KEY}`, '')

    return {
      name:           billName,
      introduced:     bill.introducedDate ?? null,
      stage,
      stage_date:     latestActionDate || null,
      stage_note:     latestActionText || null,
      pull_source:    cleanUrl,
      raw_pull_data:  data,
      last_pulled_at: new Date().toISOString(),
    }
  } catch (e) {
    console.warn(`[bills/federal] Fetch error for ${ref.type} ${ref.number}:`, e)
    return null
  }
}

// ── Stage dates merge ─────────────────────────────────────────────────────────
// stage_dates is a 6-element array indexed by stage (Federal pipeline length).
// We only update the slot for the detected stage; other slots are preserved.

const FEDERAL_STAGE_COUNT = 6

function mergeStageDates(
  current: (string | null)[] | null | undefined,
  stage: number,
  stageDate: string | null,
): (string | null)[] {
  const arr: (string | null)[] = Array.isArray(current)
    ? [...current]
    : Array(FEDERAL_STAGE_COUNT).fill(null)
  // Pad to expected length
  while (arr.length < FEDERAL_STAGE_COUNT) arr.push(null)
  if (stage >= 0 && stage < arr.length && stageDate) arr[stage] = stageDate
  return arr
}

// ── Diff computation ──────────────────────────────────────────────────────────

function computeDiff(
  current: Record<string, unknown>,
  incoming: Layer1Update,
  mergedStageDates: (string | null)[],
): Record<string, { old: unknown; new: unknown }> | null {
  const diff: Record<string, { old: unknown; new: unknown }> = {}
  const incomingFlat: Record<string, unknown> = {
    name:        incoming.name,
    introduced:  incoming.introduced,
    stage:       incoming.stage,
    stage_dates: mergedStageDates,
    stage_note:  incoming.stage_note,
  }
  for (const key of LAYER1_KEYS) {
    const cur = current[key]
    const nxt = incomingFlat[key]
    if (JSON.stringify(cur) !== JSON.stringify(nxt)) {
      diff[key] = { old: cur, new: nxt }
    }
  }
  return Object.keys(diff).length > 0 ? diff : null
}

// ── Federal bills refresh ─────────────────────────────────────────────────────

async function refreshFederalBills(
  supabase: ReturnType<typeof createClient>,
): Promise<{ updated: number; pending: number; skipped: number; error?: string }> {
  if (!CONGRESS_API_KEY) {
    console.warn('[bills/federal] CONGRESS_API_KEY not set — skipping.')
    return { updated: 0, pending: 0, skipped: 0, error: 'CONGRESS_API_KEY not configured' }
  }

  const { data: bills, error: fetchErr } = await supabase
    .from('bills')
    .select('id, name, pull_source, verified, stage, stage_dates, stage_note, introduced')
    .eq('state', 'US')

  if (fetchErr) {
    console.error('[bills/federal] Could not fetch bills:', fetchErr.message)
    return { updated: 0, pending: 0, skipped: 0, error: fetchErr.message }
  }

  let updated = 0, pending = 0, skipped = 0

  for (const bill of bills ?? []) {
    const ref = parseBillRef(bill.name ?? '', bill.pull_source ?? null)
    if (!ref) {
      console.warn(`[bills/federal] Could not parse ref: "${bill.name}" (id=${bill.id})`)
      skipped++
      continue
    }

    const incoming = await fetchCongressBill(ref)
    if (!incoming) { skipped++; continue }

    // Merge new stage date into existing array — preserves dates already recorded at other stages
    const mergedStageDates = mergeStageDates(
      bill.stage_dates as (string | null)[] | null,
      incoming.stage,
      incoming.stage_date,
    )

    if (bill.verified) {
      // Verified: only write pending_changes if something actually changed.
      // Always persist pull_source so URL-based parsing works on every future run.
      const diff = computeDiff(bill as Record<string, unknown>, incoming, mergedStageDates)
      const verifiedUpdate: Record<string, unknown> = {
        last_pulled_at: incoming.last_pulled_at,
        raw_pull_data:  incoming.raw_pull_data,
      }
      if (!bill.pull_source) verifiedUpdate.pull_source = incoming.pull_source
      if (diff) verifiedUpdate.pending_changes = diff
      const { error } = await supabase
        .from('bills')
        .update(verifiedUpdate)
        .eq('id', bill.id)
      if (error) console.error(`[bills/federal] verified update error (id=${bill.id}):`, error.message)
      else if (diff) pending++
    } else {
      // Unverified: overwrite all Layer 1 fields directly
      const { error } = await supabase
        .from('bills')
        .update({
          name:           incoming.name,
          introduced:     incoming.introduced,
          stage:          incoming.stage,
          stage_dates:    mergedStageDates,
          stage_note:     incoming.stage_note,
          pull_source:    incoming.pull_source,
          raw_pull_data:  incoming.raw_pull_data,
          last_pulled_at: incoming.last_pulled_at,
        })
        .eq('id', bill.id)
      if (error) console.error(`[bills/federal] update error (id=${bill.id}):`, error.message)
      else updated++
    }

    // 200ms between calls — Congress.gov allows ~1000 req/hour without rate-limit errors
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`[bills/federal] updated=${updated} pending=${pending} skipped=${skipped}`)
  return { updated, pending, skipped }
}

// ── Michigan bills refresh (stub) ─────────────────────────────────────────────

async function refreshMichiganBills(
  _supabase: ReturnType<typeof createClient>,
): Promise<{ updated: number; error?: string }> {
  if (!LEGISCAN_API_KEY) {
    console.warn('[bills/michigan] LEGISCAN_API_KEY not set — skipping MI bill refresh.')
    return { updated: 0, error: 'LEGISCAN_API_KEY not configured' }
  }

  // TODO: implement LegiScan Michigan bill refresh once key is set.
  // Steps:
  //   1. getSessionList → find active MI session
  //   2. getMasterList → all bills in session
  //   3. getBill for each → map LegiScan status codes to 5-stage MI pipeline
  //   4. Apply two-layer update (same pattern as refreshFederalBills)
  console.warn('[bills/michigan] LegiScan integration not yet implemented.')
  return { updated: 0, error: 'Not yet implemented' }
}

// ── Representatives refresh ───────────────────────────────────────────────────

function normalizeParty(raw: string | null | undefined): string {
  if (!raw) return 'Unknown'
  const r = raw.toLowerCase()
  if (r.includes('democrat'))    return 'Democrat'
  if (r.includes('republican'))  return 'Republican'
  if (r.includes('independent')) return 'Independent'
  return raw
}

interface CongressMember {
  bioguideId: string
  name: string
  partyName?: string
  state?: string
  district?: number
  url?: string
  depiction?: { imageUrl?: string }
  terms?: { item?: Array<{ chamber?: string; district?: number; stateCode?: string; stateName?: string }> }
}

function getChamber(member: CongressMember): 'Senate' | 'House' | null {
  const terms = member.terms?.item ?? []
  const latest = terms[terms.length - 1]  // terms are oldest-first; last = current
  if (!latest) return null
  const ct = (latest.chamber ?? '').toLowerCase()
  if (ct.includes('senate')) return 'Senate'
  if (ct.includes('house'))  return 'House'
  return null
}

function getDistrict(member: CongressMember): string | null {
  const terms = member.terms?.item ?? []
  const latest = terms[terms.length - 1]  // terms are oldest-first; last = current
  const d = latest?.district ?? member.district
  if (d == null) return null
  return String(d)
}

const STATE_NAME_TO_CODE: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH',
  'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN',
  'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
  'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC', 'Puerto Rico': 'PR', 'Virgin Islands': 'VI',
  'Guam': 'GU', 'American Samoa': 'AS', 'Northern Mariana Islands': 'MP',
}

function getState(member: CongressMember): string | null {
  if (!member.state) return null
  return STATE_NAME_TO_CODE[member.state] ?? null
}

async function fetchAllMembers(): Promise<CongressMember[]> {
  const members: CongressMember[] = []
  let offset = 0
  const limit = 250

  while (true) {
    const url =
      `${CONGRESS_API_BASE}/member` +
      `?currentMember=true` +
      `&limit=${limit}` +
      `&offset=${offset}` +
      `&api_key=${CONGRESS_API_KEY}`

    console.log(`[representatives] Fetching offset=${offset}…`)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Congress.gov API error: ${res.status} ${res.statusText}`)

    const json = await res.json()
    const page: CongressMember[] = json.members ?? []
    members.push(...page)

    const total: number = json.pagination?.count ?? page.length
    offset += page.length
    if (offset >= total || page.length === 0) break
  }

  return members
}

async function refreshRepresentatives(
  supabase: ReturnType<typeof createClient>,
): Promise<{ upserted: number; error?: string }> {
  if (!CONGRESS_API_KEY) {
    console.warn('[representatives] CONGRESS_API_KEY not set — skipping.')
    return { upserted: 0, error: 'CONGRESS_API_KEY not configured' }
  }

  let raw: CongressMember[]
  try {
    raw = await fetchAllMembers()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[representatives] Fetch failed:', msg)
    return { upserted: 0, error: msg }
  }

  console.log(`[representatives] Fetched ${raw.length} members total`)

  const rows = []
  for (const m of raw) {
    const chamber = getChamber(m)
    if (chamber !== 'Senate' && chamber !== 'House') continue

    const state = getState(m)
    if (!state) continue

    rows.push({
      bioguide_id: m.bioguideId,
      name:        m.name,
      party:       normalizeParty(m.partyName),
      state,
      district:    chamber === 'House' ? getDistrict(m) : null,
      chamber,
      url:         m.url ?? null,
      photo_url:   m.depiction?.imageUrl ?? null,
      source:      'congress.gov',
      verified:    false,
      updated_at:  new Date().toISOString(),
    })
  }

  console.log(`[representatives] Upserting ${rows.length} rows…`)

  const { error } = await supabase
    .from('representatives')
    .upsert(rows, { onConflict: 'bioguide_id' })

  if (error) {
    console.error('[representatives] Upsert error:', error.message)
    return { upserted: 0, error: error.message }
  }

  console.log(`[representatives] Done — ${rows.length} rows upserted`)
  return { upserted: rows.length }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (_req: Request) => {
  const supabase = createClient(supabaseUrl, secretKey)

  const [federalResult, michiganResult, repResult] = await Promise.all([
    refreshFederalBills(supabase),
    refreshMichiganBills(supabase),
    refreshRepresentatives(supabase),
  ])

  // Fire-and-forget: trigger notification generation
  fetch(`${supabaseUrl}/functions/v1/notify-send`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type':  'application/json',
    },
    body: '{}',
  }).catch(e => console.error('[daily-refresh] notify-send trigger failed:', e))

  const ts = new Date().toISOString()
  const ok = !federalResult.error && !repResult.error

  // Write patch note summary
  const summaryParts: string[] = []
  if (!federalResult.error) {
    summaryParts.push(`${federalResult.updated} federal bill${federalResult.updated !== 1 ? 's' : ''} updated`)
    if (federalResult.pending > 0) summaryParts.push(`${federalResult.pending} pending review`)
  } else {
    summaryParts.push('Federal bills skipped')
  }
  if (!repResult.error) {
    summaryParts.push(`${repResult.upserted} representatives synced`)
  }
  const summary = summaryParts.length > 0
    ? summaryParts.join(' · ') + '.'
    : 'Nightly pull completed.'

  supabase.from('patch_notes').insert({
    pull_date: ts.split('T')[0],
    summary,
    details: {
      federal_bills:   federalResult,
      michigan_bills:  michiganResult,
      representatives: repResult,
    },
  }).then(({ error: pnErr }) => {
    if (pnErr) console.error('[daily-refresh] patch_notes insert failed:', pnErr.message)
  })

  return new Response(
    JSON.stringify({
      ok,
      refreshed_at:    ts,
      federal_bills:   federalResult,
      michigan_bills:  michiganResult,
      representatives: repResult,
    }),
    {
      status:  ok ? 200 : 207,
      headers: { 'Content-Type': 'application/json' },
    },
  )
})
