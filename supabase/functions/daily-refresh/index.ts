/**
 * Daily Refresh Edge Function
 * Runs at 3 AM US Eastern (8:00 UTC EST / 7:00 UTC EDT).
 *
 * 1. Federal bills   — refresh existing + discover new from Congress.gov
 * 2. Michigan bills  — refresh existing + discover new from LegiScan
 * 3. Representatives — sync current members from Congress.gov
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
const LEGISCAN_API_BASE = 'https://api.legiscan.com'

// 119th Congress: Jan 3, 2025 – Jan 3, 2027
const CURRENT_CONGRESS = 119

// Layer 1 keys — auto-pulled; never human-written
const LAYER1_KEYS = ['name', 'introduced', 'stage', 'stage_dates', 'stage_note', 'committee'] as const

// ── Discovery keyword rules ───────────────────────────────────────────────────
// Map title keywords → issue tags used in the bills table

const DISCOVERY_RULES: Array<{ keywords: string[]; issues: string[] }> = [
  { keywords: ['reproductive', 'abortion', 'contracepti', 'planned parenthood', 'fetal', 'prenatal care'], issues: ['healthcare'] },
  { keywords: ['firearm', 'gun control', 'assault weapon', 'background check', 'second amendment', 'ammunition ban'], issues: ['policing'] },
  { keywords: ['immigration', 'border security', 'deportation', 'asylum seeker', 'refugee', 'daca', 'undocumented'], issues: ['immigration'] },
  { keywords: ['medicaid', 'medicare', 'affordable care act', 'prescription drug price', 'health insurance', 'drug pricing'], issues: ['healthcare'] },
  { keywords: ['eviction', 'rent control', 'affordable housing', 'section 8', 'fair housing', 'housing voucher'], issues: ['housing'] },
  { keywords: ['police accountability', 'qualified immunity', 'civil rights act', 'excessive force', 'law enforcement oversight'], issues: ['policing'] },
  { keywords: ['voting rights', 'voter id', 'voter suppression', 'gerrymandering', 'election integrity', 'mail-in ballot'], issues: ['voting'] },
  { keywords: ['public school', 'student loan', 'higher education', 'school choice', 'title i funding', 'pell grant'], issues: ['education'] },
  { keywords: ['climate change', 'clean energy', 'carbon emission', 'clean air act', 'clean water act', 'epa authority'], issues: ['environment'] },
  { keywords: ['lgbtq', 'transgender', 'gender identity', 'same-sex', 'conversion therapy', 'sexual orientation'], issues: ['policing'] },
  { keywords: ['minimum wage', 'worker classification', 'union organizing', 'collective bargaining', 'overtime pay', 'gig worker'], issues: ['labor'] },
  { keywords: ['surveillance', 'warrantless', 'data privacy', 'fourth amendment', 'facial recognition', 'mass surveillance'], issues: ['surveillance'] },
  { keywords: ['press freedom', 'free speech', 'social media censorship', 'first amendment', 'shield law', 'journalist'], issues: ['speech'] },
  { keywords: ['artificial intelligence', 'ai regulation', 'algorithmic', 'autonomous weapon', 'deepfake'], issues: ['technology'] },
  { keywords: ['criminal sentencing', 'mandatory minimum', 'cash bail', 'prison reform', 'recidivism', 'solitary confinement'], issues: ['policing'] },
]

function guessIssues(title: string): string[] {
  const t = title.toLowerCase()
  const found = new Set<string>()
  for (const rule of DISCOVERY_RULES) {
    if (rule.keywords.some(kw => t.includes(kw))) {
      rule.issues.forEach(i => found.add(i))
    }
  }
  return [...found]
}

function matchesDiscoveryRules(title: string): boolean {
  return guessIssues(title).length > 0
}

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

// ── Michigan (LegiScan) stage mapping ─────────────────────────────────────────
// MICHIGAN_STAGES = ['Introduced','Committee','First chamber','Second chamber','Governor']
// stage === 5 means enacted

function mapMichiganStage(legiScanStatus: number): number {
  switch (legiScanStatus) {
    case 8:  return 5  // Chaptered (enacted)
    case 4:  return 4  // Passed (governor signed)
    case 7:  return 4  // Override
    case 3:  return 3  // Enrolled (both chambers passed)
    case 2:  return 2  // Engrossed (passed first chamber)
    case 10: return 2  // Report Pass (out of committee)
    case 9:  return 1  // Refer (referred to committee)
    case 1:  return 1  // Introduced
    default: return 0
  }
}

// ── Committee name extraction ─────────────────────────────────────────────────

function parseCommittee(actionText: string): string | null {
  if (!actionText) return null
  // "Referred to the House Committee on the Judiciary."
  // "Referred to the Committee on Finance."
  // "Ordered to be Reported by the Committee on Armed Services."
  const m = actionText.match(
    /(?:referred to|reported by|ordered to be reported by)\s+(?:the\s+)?(?:house\s+|senate\s+)?(?:sub)?committee\s+on\s+(.+?)\.?\s*$/i
  )
  if (m) return m[1].trim()
  // "Referred to the [X] Committee" pattern
  const m2 = actionText.match(/referred to the\s+(.+?\s+committee)\.?\s*$/i)
  if (m2) return m2[1].trim()
  return null
}

// ── Ratify office inference ───────────────────────────────────────────────────

function inferRatifyOffice(stage: number, level: 'federal' | 'michigan'): string {
  if (level === 'federal') {
    if (stage <= 1) return 'committee'
    if (stage === 2) return 'committee'
    if (stage === 3) return 'us-senate'
    return 'president'
  }
  // michigan
  if (stage <= 1) return 'committee'
  if (stage === 2) return 'mi-senate'
  if (stage === 3) return 'mi-house'
  return 'governor'
}

// ── Bill reference parser ─────────────────────────────────────────────────────

interface BillRef {
  congress: number
  type: string
  number: number
}

function parseBillRef(name: string, pullSource: string | null): BillRef | null {
  if (pullSource) {
    const m = pullSource.match(/\/v3\/bill\/(\d+)\/([a-z]+)\/(\d+)/i)
    if (m) return { congress: Number(m[1]), type: m[2].toLowerCase(), number: Number(m[3]) }
  }

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
  stage_date: string | null
  stage_note: string | null
  committee: string | null
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
    const committee = parseCommittee(latestActionText)

    const cleanUrl = url.replace(`?api_key=${CONGRESS_API_KEY}`, '')

    return {
      name:           billName,
      introduced:     bill.introducedDate ?? null,
      stage,
      stage_date:     latestActionDate || null,
      stage_note:     latestActionText || null,
      committee,
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

const FEDERAL_STAGE_COUNT  = 6
const MICHIGAN_STAGE_COUNT = 5

function mergeStageDates(
  current: (string | null)[] | null | undefined,
  stage: number,
  stageDate: string | null,
  stageCount: number,
): (string | null)[] {
  const arr: (string | null)[] = Array.isArray(current)
    ? [...current]
    : Array(stageCount).fill(null)
  while (arr.length < stageCount) arr.push(null)
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
    committee:   incoming.committee,
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
    .select('id, name, pull_source, verified, stage, stage_dates, stage_note, introduced, committee')
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

    const mergedStageDates = mergeStageDates(
      bill.stage_dates as (string | null)[] | null,
      incoming.stage,
      incoming.stage_date,
      FEDERAL_STAGE_COUNT,
    )

    if (bill.verified) {
      const diff = computeDiff(bill as Record<string, unknown>, incoming, mergedStageDates)
      const verifiedUpdate: Record<string, unknown> = {
        last_pulled_at: incoming.last_pulled_at,
        raw_pull_data:  incoming.raw_pull_data,
      }
      if (!bill.pull_source) verifiedUpdate.pull_source = incoming.pull_source
      if (diff) verifiedUpdate.pending_changes = diff
      const { error } = await supabase.from('bills').update(verifiedUpdate).eq('id', bill.id)
      if (error) console.error(`[bills/federal] verified update error (id=${bill.id}):`, error.message)
      else if (diff) pending++
    } else {
      const { error } = await supabase
        .from('bills')
        .update({
          name:           incoming.name,
          introduced:     incoming.introduced,
          stage:          incoming.stage,
          stage_dates:    mergedStageDates,
          stage_note:     incoming.stage_note,
          committee:      incoming.committee,
          pull_source:    incoming.pull_source,
          raw_pull_data:  incoming.raw_pull_data,
          last_pulled_at: incoming.last_pulled_at,
        })
        .eq('id', bill.id)
      if (error) console.error(`[bills/federal] update error (id=${bill.id}):`, error.message)
      else updated++
    }

    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`[bills/federal] updated=${updated} pending=${pending} skipped=${skipped}`)
  return { updated, pending, skipped }
}

// ── Federal bill discovery ────────────────────────────────────────────────────

interface CongressListItem {
  congress: number
  type: string
  number: number
  title: string
  latestAction?: { actionDate?: string; text?: string }
  introducedDate?: string
}

async function discoverNewFederalBills(
  supabase: ReturnType<typeof createClient>,
): Promise<{ discovered: number; skipped: number; error?: string }> {
  if (!CONGRESS_API_KEY) return { discovered: 0, skipped: 0, error: 'CONGRESS_API_KEY not configured' }

  // Fetch bills updated in the last 7 days
  const fromDate = new Date(Date.now() - 7 * 86_400_000).toISOString().split('T')[0] + 'T00:00:00Z'
  const url = `${CONGRESS_API_BASE}/bill/${CURRENT_CONGRESS}?fromDateTime=${encodeURIComponent(fromDate)}&sort=updateDate+desc&limit=250&api_key=${CONGRESS_API_KEY}`

  let items: CongressListItem[] = []
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[discover/federal] List fetch HTTP ${res.status}`)
      return { discovered: 0, skipped: 0, error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    items = (data.bills ?? []) as CongressListItem[]
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[discover/federal] List fetch error:', msg)
    return { discovered: 0, skipped: 0, error: msg }
  }

  // Load all existing federal bill names to avoid duplicates
  const { data: existing } = await supabase
    .from('bills')
    .select('name, pull_source')
    .eq('state', 'US')

  const existingNames = new Set((existing ?? []).map((r: { name: string }) => r.name.toLowerCase()))
  const existingSources = new Set((existing ?? []).map((r: { pull_source: string | null }) => r.pull_source).filter(Boolean))

  let discovered = 0, skipped = 0
  const now = new Date().toISOString()

  for (const item of items) {
    const title = item.title ?? ''
    if (!matchesDiscoveryRules(title)) { skipped++; continue }

    const ref: BillRef = { congress: item.congress ?? CURRENT_CONGRESS, type: (item.type ?? '').toLowerCase(), number: item.number ?? 0 }
    if (!ref.type || !ref.number) { skipped++; continue }

    const pullSource = `${CONGRESS_API_BASE}/bill/${ref.congress}/${ref.type}/${ref.number}`
    if (existingSources.has(pullSource)) { skipped++; continue }

    const billLabel = typeLabel(ref.type)
    const prospectiveName = `${billLabel} ${ref.number} — ${title}`.toLowerCase()
    // Skip if a bill with this number already exists (comparing prefix match)
    const prefix = `${billLabel} ${ref.number}`.toLowerCase()
    if ([...existingNames].some(n => n.startsWith(prefix))) { skipped++; continue }

    // Fetch full bill details for accurate data
    const incoming = await fetchCongressBill(ref)
    if (!incoming) { skipped++; continue }

    const issues = guessIssues(title)
    const stage = incoming.stage
    const stageDates = mergeStageDates(null, stage, incoming.stage_date, FEDERAL_STAGE_COUNT)

    const { error } = await supabase.from('bills').insert({
      state:            'US',
      level:            'federal',
      name:             incoming.name,
      introduced:       incoming.introduced,
      stage,
      stage_dates:      stageDates,
      stage_note:       incoming.stage_note,
      committee:        incoming.committee,
      issues,
      urgency:          'months',
      policy_bias:      50,
      amend:            [],
      ratify_office:    inferRatifyOffice(stage, 'federal'),
      bill_desc:        '',
      decisions:        [],
      supporters:       '',
      blockers:         '',
      influence_window: '',
      municipality:     null,
      pull_source:      incoming.pull_source,
      raw_pull_data:    incoming.raw_pull_data,
      last_pulled_at:   now,
      verified:         false,
    })

    if (error) {
      console.error(`[discover/federal] Insert error for ${incoming.name}:`, error.message)
      skipped++
    } else {
      console.log(`[discover/federal] Added: ${incoming.name}`)
      existingNames.add(incoming.name.toLowerCase())
      existingSources.add(incoming.pull_source)
      discovered++
    }

    await new Promise(r => setTimeout(r, 300))
    if (discovered >= 20) break  // Cap per run
  }

  console.log(`[discover/federal] discovered=${discovered} skipped=${skipped}`)
  return { discovered, skipped }
}

// ── LegiScan helpers ──────────────────────────────────────────────────────────

interface LegiScanMasterItem {
  bill_id: number
  number: string   // e.g. "SB 123" or "HB 45"
  title: string
  status: number
  last_action: string
  last_action_date: string
  change_hash: string
  url: string
}

interface LegiScanBill {
  bill_id: number
  bill_number: string
  title: string
  status: number
  status_date: string
  introduced_date: string
  last_action: string
  last_action_date: string
  committee?: { committee_id: number; chamber: string; name: string } | null
  url: string
}

async function legiScanGet(op: string, params: Record<string, string | number>): Promise<unknown> {
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
  const url = `${LEGISCAN_API_BASE}/?key=${LEGISCAN_API_KEY}&op=${op}&${qs}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`LegiScan ${op} HTTP ${res.status}`)
  return res.json()
}

async function getMiMasterList(): Promise<LegiScanMasterItem[]> {
  // Get active MI session
  const sessData = await legiScanGet('getSessionList', { state: 'MI' }) as { sessions: Array<{ session_id: number; year_start: number; year_end: number; sine_die: number }> }
  const sessions = (sessData as { sessions: Array<{ session_id: number; year_start: number; year_end: number; sine_die: number }> }).sessions ?? []
  // Find most recent active session
  const active = sessions.filter(s => !s.sine_die).sort((a, b) => b.year_start - a.year_start)[0]
  if (!active) throw new Error('No active MI session found')

  const masterData = await legiScanGet('getMasterList', { id: active.session_id }) as { masterlist: Record<string, unknown> }
  const masterList = masterData.masterlist ?? {}
  // masterlist is an object with keys "0", "1", etc. and a "session" metadata key
  return Object.values(masterList).filter((v): v is LegiScanMasterItem =>
    typeof v === 'object' && v !== null && 'bill_id' in v
  )
}

async function fetchLegiScanBill(billId: number): Promise<LegiScanBill | null> {
  try {
    const data = await legiScanGet('getBill', { id: billId }) as { bill?: LegiScanBill }
    return data.bill ?? null
  } catch (e) {
    console.warn(`[legiscan] getBill(${billId}) error:`, e)
    return null
  }
}

function formatMiBillName(billNumber: string, title: string): string {
  const num = billNumber.trim()
  return title ? `${num} — ${title}` : num
}

// ── Michigan bills refresh ────────────────────────────────────────────────────

async function refreshMichiganBills(
  supabase: ReturnType<typeof createClient>,
): Promise<{ updated: number; pending: number; skipped: number; error?: string }> {
  if (!LEGISCAN_API_KEY) {
    console.warn('[bills/michigan] LEGISCAN_API_KEY not set — skipping.')
    return { updated: 0, pending: 0, skipped: 0, error: 'LEGISCAN_API_KEY not configured' }
  }

  let masterList: LegiScanMasterItem[]
  try {
    masterList = await getMiMasterList()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[bills/michigan] getMasterList failed:', msg)
    return { updated: 0, pending: 0, skipped: 0, error: msg }
  }

  // Build lookup: bill_id → master item
  const byId = new Map(masterList.map(item => [item.bill_id, item]))

  // Fetch existing MI bills from DB
  const { data: dbBills, error: dbErr } = await supabase
    .from('bills')
    .select('id, name, pull_source, verified, stage, stage_dates, stage_note, committee')
    .eq('state', 'MI')

  if (dbErr) {
    console.error('[bills/michigan] DB fetch error:', dbErr.message)
    return { updated: 0, pending: 0, skipped: 0, error: dbErr.message }
  }

  let updated = 0, pending = 0, skipped = 0
  const now = new Date().toISOString()

  for (const bill of dbBills ?? []) {
    // Extract LegiScan bill_id from pull_source
    const srcMatch = (bill.pull_source ?? '').match(/[?&]id=(\d+)/i)
    if (!srcMatch) { skipped++; continue }

    const billId = Number(srcMatch[1])
    const masterItem = byId.get(billId)
    if (!masterItem) { skipped++; continue }

    const stage = mapMichiganStage(masterItem.status)
    const stageDates = mergeStageDates(
      bill.stage_dates as (string | null)[] | null,
      stage,
      masterItem.last_action_date || null,
      MICHIGAN_STAGE_COUNT,
    )

    const incoming: Layer1Update = {
      name:           bill.name,  // preserve existing name; updated via getBill if needed
      introduced:     null,       // not in masterlist; preserved from DB
      stage,
      stage_date:     masterItem.last_action_date || null,
      stage_note:     masterItem.last_action || null,
      committee:      null,
      pull_source:    bill.pull_source,
      raw_pull_data:  masterItem,
      last_pulled_at: now,
    }

    if (bill.verified) {
      const diff = computeDiff(bill as Record<string, unknown>, incoming, stageDates)
      const update: Record<string, unknown> = { last_pulled_at: now, raw_pull_data: masterItem }
      if (diff) update.pending_changes = diff
      const { error } = await supabase.from('bills').update(update).eq('id', bill.id)
      if (error) console.error(`[bills/michigan] verified update error (id=${bill.id}):`, error.message)
      else if (diff) pending++
    } else {
      const { error } = await supabase
        .from('bills')
        .update({
          stage,
          stage_dates:    stageDates,
          stage_note:     masterItem.last_action || null,
          raw_pull_data:  masterItem,
          last_pulled_at: now,
        })
        .eq('id', bill.id)
      if (error) console.error(`[bills/michigan] update error (id=${bill.id}):`, error.message)
      else updated++
    }

    await new Promise(r => setTimeout(r, 150))
  }

  console.log(`[bills/michigan] updated=${updated} pending=${pending} skipped=${skipped}`)
  return { updated, pending, skipped }
}

// ── Michigan bill discovery ───────────────────────────────────────────────────

async function discoverNewMichiganBills(
  supabase: ReturnType<typeof createClient>,
): Promise<{ discovered: number; skipped: number; error?: string }> {
  if (!LEGISCAN_API_KEY) return { discovered: 0, skipped: 0, error: 'LEGISCAN_API_KEY not configured' }

  let masterList: LegiScanMasterItem[]
  try {
    masterList = await getMiMasterList()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { discovered: 0, skipped: 0, error: msg }
  }

  // Get existing MI pull_sources to detect new bills
  const { data: existing } = await supabase
    .from('bills')
    .select('pull_source')
    .eq('state', 'MI')

  const existingSources = new Set(
    (existing ?? []).map((r: { pull_source: string | null }) => r.pull_source).filter(Boolean)
  )

  // Filter: keyword match + not already in DB
  const candidates = masterList.filter(item => {
    if (!matchesDiscoveryRules(item.title)) return false
    const src = `${LEGISCAN_API_BASE}/?op=getBill&id=${item.bill_id}`
    return !existingSources.has(src)
  })

  let discovered = 0, skipped = 0
  const now = new Date().toISOString()

  for (const item of candidates.slice(0, 20)) {
    const fullBill = await fetchLegiScanBill(item.bill_id)
    if (!fullBill) { skipped++; continue }

    const issues = guessIssues(item.title)
    const stage = mapMichiganStage(item.status)
    const stageDates = mergeStageDates(null, stage, item.last_action_date || null, MICHIGAN_STAGE_COUNT)
    const committee = fullBill.committee?.name ?? null
    const pullSource = `${LEGISCAN_API_BASE}/?op=getBill&id=${item.bill_id}`

    const { error } = await supabase.from('bills').insert({
      state:            'MI',
      level:            'michigan',
      name:             formatMiBillName(item.number, item.title),
      introduced:       fullBill.introduced_date || null,
      stage,
      stage_dates:      stageDates,
      stage_note:       item.last_action || null,
      committee,
      issues,
      urgency:          'months',
      policy_bias:      50,
      amend:            [],
      ratify_office:    inferRatifyOffice(stage, 'michigan'),
      bill_desc:        '',
      decisions:        [],
      supporters:       '',
      blockers:         '',
      influence_window: '',
      municipality:     null,
      pull_source:      pullSource,
      raw_pull_data:    fullBill,
      last_pulled_at:   now,
      verified:         false,
    })

    if (error) {
      console.error(`[discover/michigan] Insert error for ${item.number}:`, error.message)
      skipped++
    } else {
      console.log(`[discover/michigan] Added: ${item.number} — ${item.title}`)
      existingSources.add(pullSource)
      discovered++
    }

    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`[discover/michigan] discovered=${discovered} skipped=${skipped}`)
  return { discovered, skipped }
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
  const latest = terms[terms.length - 1]
  if (!latest) return null
  const ct = (latest.chamber ?? '').toLowerCase()
  if (ct.includes('senate')) return 'Senate'
  if (ct.includes('house'))  return 'House'
  return null
}

function getDistrict(member: CongressMember): string | null {
  const terms = member.terms?.item ?? []
  const latest = terms[terms.length - 1]
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

  // Refresh existing bills first, then discover new ones
  const [federalResult, michiganResult, repResult] = await Promise.all([
    refreshFederalBills(supabase),
    refreshMichiganBills(supabase),
    refreshRepresentatives(supabase),
  ])

  const [federalDiscovery, michiganDiscovery] = await Promise.all([
    discoverNewFederalBills(supabase),
    discoverNewMichiganBills(supabase),
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

  const summaryParts: string[] = []
  if (!federalResult.error) {
    summaryParts.push(`${federalResult.updated} federal bill${federalResult.updated !== 1 ? 's' : ''} updated`)
    if (federalResult.pending > 0) summaryParts.push(`${federalResult.pending} pending review`)
  } else {
    summaryParts.push('Federal bills skipped')
  }
  if (federalDiscovery.discovered > 0) {
    summaryParts.push(`${federalDiscovery.discovered} new federal bill${federalDiscovery.discovered !== 1 ? 's' : ''} discovered`)
  }
  if (!michiganResult.error && michiganResult.updated > 0) {
    summaryParts.push(`${michiganResult.updated} MI bill${michiganResult.updated !== 1 ? 's' : ''} updated`)
  }
  if (michiganDiscovery.discovered > 0) {
    summaryParts.push(`${michiganDiscovery.discovered} new MI bill${michiganDiscovery.discovered !== 1 ? 's' : ''} discovered`)
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
      federal_bills:      federalResult,
      federal_discovery:  federalDiscovery,
      michigan_bills:     michiganResult,
      michigan_discovery: michiganDiscovery,
      representatives:    repResult,
    },
  }).then(({ error: pnErr }) => {
    if (pnErr) console.error('[daily-refresh] patch_notes insert failed:', pnErr.message)
  })

  return new Response(
    JSON.stringify({
      ok,
      refreshed_at:       ts,
      federal_bills:      federalResult,
      federal_discovery:  federalDiscovery,
      michigan_bills:     michiganResult,
      michigan_discovery: michiganDiscovery,
      representatives:    repResult,
    }),
    {
      status:  ok ? 200 : 207,
      headers: { 'Content-Type': 'application/json' },
    },
  )
})
