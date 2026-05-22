/**
 * Weekly refresh of Michigan state bills from LegiScan.
 *
 * Scheduled every Sunday at 06:00 UTC (1 AM US Eastern) via pg_cron.
 * Can also be triggered manually: POST /functions/v1/refresh-mi-bills
 *
 * Flow:
 *   1. getSessionList → find active MI legislative session
 *   2. getMasterList  → map every bill_number to a bill_id
 *   3. For each tracked Michigan state bill in our DB:
 *        a. Parse primary bill number from stored name
 *        b. Match against master list
 *        c. getBill → status, history, calendar events
 *        d. Map LegiScan status code → MI pipeline stage (5 stages)
 *        e. Detect upcoming hearings / votes within 14 days
 *        f. Apply two-layer update:
 *             unverified → overwrite Layer 1 fields
 *             verified   → write diff to pending_changes
 *        g. If hearing/vote within 14 days, escalate urgency to 'urgent'
 *           (intentional exception to Layer 2 rule — time-sensitive signal
 *           that cannot wait for manual review)
 *
 * Secrets required:
 *   LEGISCAN_API_KEY          — LegiScan API key
 *   SUPABASE_URL              — injected automatically
 *   SUPABASE_SERVICE_ROLE_KEY — injected automatically
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
const secretKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LEGISCAN_KEY = Deno.env.get('LEGISCAN_API_KEY') ?? ''
const LS_BASE      = 'https://api.legiscan.com/'

// MI pipeline stages: Introduced(0) Committee(1) First chamber(2) Second chamber(3) Governor(4)
// stage === 5 (MI_STAGE_COUNT) means enacted
const MI_STAGE_COUNT = 5

// Escalate to 'urgent' if a hearing or vote is this many days away
const HEARING_URGENCY_DAYS = 14

const LAYER1_KEYS = ['name', 'introduced', 'stage', 'stage_dates', 'stage_note'] as const

// ── LegiScan API ──────────────────────────────────────────────────────────────

async function legiScan(op: string, params: Record<string, string | number>): Promise<Record<string, unknown>> {
  const qp = new URLSearchParams({ key: LEGISCAN_KEY, op })
  for (const [k, v] of Object.entries(params)) qp.set(k, String(v))
  const res = await fetch(`${LS_BASE}?${qp}`)
  if (!res.ok) throw new Error(`LegiScan HTTP ${res.status} for op=${op}`)
  const json = await res.json() as Record<string, unknown>
  if (json.status !== 'OK') throw new Error(`LegiScan error for op=${op}: ${JSON.stringify(json).slice(0, 200)}`)
  return json
}

// ── Bill number parsing ───────────────────────────────────────────────────────
// "MI HB 4001 — Title"      → { prefix: "MI HB 4001",     lsNumber: "HB 4001" }
// "MI SBs 508-510 — Title"  → { prefix: "MI SBs 508-510", lsNumber: "SB 508"  }
// "MI HBs 4890-4892 — ..." → { prefix: "MI HBs 4890-4892", lsNumber: "HB 4890" }

function parseMiBillRef(name: string): { prefix: string; lsNumber: string } | null {
  const m = name.match(/^(MI\s+([HS])(B|R|CR|JR)s?\s+(\d+)(?:-\d+)?)(?:\s*—|\s*$)/i)
  if (!m) return null
  const prefix  = m[1].trim()
  const chamber = m[2].toUpperCase()   // 'H' or 'S'
  const suffix  = m[3].toUpperCase()   // 'B', 'R', etc.
  const num     = m[4]
  return { prefix, lsNumber: `${chamber}${suffix} ${num}` }
}

// ── Stage mapping ─────────────────────────────────────────────────────────────

function mapLegiScanStage(statusCode: number): number {
  switch (statusCode) {
    case 1:  return 0   // Introduced
    case 12: return 0   // Draft
    case 9:  return 1   // Refer to committee
    case 10: return 1   // Committee report pass
    case 11: return 1   // Committee report fail (still in committee)
    case 17: return 1   // Amendment pass (in committee)
    case 18: return 1   // Amendment fail (in committee)
    case 6:  return 1   // Failed (returned to committee)
    case 15: return 1   // Sine die
    case 2:  return 2   // Engrossed (passed first chamber)
    case 3:  return 3   // Enrolled (passed both chambers)
    case 13: return 3   // Conference committee
    case 14: return 3   // Concur
    case 16: return 3   // Adopted
    case 4:  return 4   // Passed (with governor)
    case 5:  return 4   // Vetoed (back at governor stage)
    case 7:  return 5   // Override (veto override → enacted)
    case 8:  return 5   // Chaptered (enacted)
    default: return 0
  }
}

// ── Stage dates ───────────────────────────────────────────────────────────────

function mergeStageDates(
  current: (string | null)[] | null | undefined,
  stage: number,
  stageDate: string | null,
): (string | null)[] {
  const arr: (string | null)[] = Array.isArray(current) ? [...current] : Array(MI_STAGE_COUNT).fill(null)
  while (arr.length < MI_STAGE_COUNT) arr.push(null)
  if (stage >= 0 && stage < arr.length && stageDate) arr[stage] = stageDate
  return arr
}

// ── Urgency / hearing detection ───────────────────────────────────────────────

interface CalendarEvent {
  date: string
  time?: string | null
  location?: string | null
  type: number   // 1=hearing, 2=exec session, 3=markup, 4=vote
  description?: string | null
}

function findUpcomingEvent(calendar: CalendarEvent[], today: Date): CalendarEvent | null {
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() + HEARING_URGENCY_DAYS)
  for (const ev of calendar) {
    if (![1, 2, 3, 4].includes(ev.type)) continue
    const d = new Date(ev.date)
    if (d >= today && d <= cutoff) return ev
  }
  return null
}

function formatEventNote(ev: CalendarEvent): string {
  const labels: Record<number, string> = { 1: 'Public hearing', 2: 'Executive session', 3: 'Markup session', 4: 'Vote scheduled' }
  const label = labels[ev.type] ?? 'Session'
  let note = `${label}: ${ev.date}`
  if (ev.time && ev.time !== '00:00:00') note += ` at ${ev.time.slice(0, 5)}`
  if (ev.location) note += ` — ${ev.location}`
  return note
}

// ── Diff ──────────────────────────────────────────────────────────────────────

function computeDiff(
  current: Record<string, unknown>,
  name: string, introduced: string | null, stage: number,
  stageDates: (string | null)[], stageNote: string | null,
): Record<string, { old: unknown; new: unknown }> | null {
  const incoming: Record<string, unknown> = { name, introduced, stage, stage_dates: stageDates, stage_note: stageNote }
  const diff: Record<string, { old: unknown; new: unknown }> = {}
  for (const key of LAYER1_KEYS) {
    if (JSON.stringify(current[key]) !== JSON.stringify(incoming[key])) {
      diff[key] = { old: current[key], new: incoming[key] }
    }
  }
  return Object.keys(diff).length > 0 ? diff : null
}

// ── Main refresh ──────────────────────────────────────────────────────────────

async function refresh(supabase: ReturnType<typeof createClient>) {
  // 1. Find active MI session
  const sessionResp = await legiScan('getSessionList', { state: 'MI' })
  const sessions = (sessionResp.sessions as Array<{ session_id: number; year_start: number; year_end: number; special: number }>) ?? []
  const year = new Date().getFullYear()
  const session = sessions.find(s => !s.special && s.year_start <= year && s.year_end >= year) ?? sessions[0]
  if (!session) throw new Error('No active MI session found in LegiScan')
  console.log(`[mi-bills] Session ${session.session_id} (${session.year_start}–${session.year_end})`)

  // 2. Master list → bill_number → bill_id lookup
  const masterResp = await legiScan('getMasterList', { session_id: session.session_id })
  const masterlist  = (masterResp.masterlist ?? {}) as Record<string, { bill_id?: number; number?: string; change_hash?: string; status_date?: string }>
  const lsLookup    = new Map<string, { bill_id: number; status_date: string }>()
  for (const entry of Object.values(masterlist)) {
    if (!entry?.bill_id) continue
    const norm = (entry.number ?? '').replace(/\s+/g, ' ').trim().toUpperCase()
    lsLookup.set(norm, { bill_id: entry.bill_id, status_date: entry.status_date ?? '' })
  }
  console.log(`[mi-bills] Master list: ${lsLookup.size} bills`)

  // 3. Fetch tracked MI state bills
  const { data: bills, error: dbErr } = await supabase
    .from('bills')
    .select('id, name, verified, stage, stage_dates, stage_note, introduced, urgency, pull_source')
    .eq('state', 'MI')
    .eq('level', 'michigan')
  if (dbErr) throw new Error(dbErr.message)

  let updated = 0, pending = 0, hearings = 0, skipped = 0
  const today = new Date(new Date().toDateString())

  for (const bill of bills ?? []) {
    const ref = parseMiBillRef(bill.name ?? '')
    if (!ref) {
      console.warn(`[mi-bills] Cannot parse bill number from: "${bill.name}" (id=${bill.id})`)
      skipped++
      continue
    }

    const lsEntry = lsLookup.get(ref.lsNumber)
    if (!lsEntry) {
      console.warn(`[mi-bills] No LegiScan match for "${ref.lsNumber}" (id=${bill.id})`)
      skipped++
      continue
    }

    // 4. Get full bill details
    let billData: Record<string, unknown>
    try {
      const resp = await legiScan('getBill', { bill_id: lsEntry.bill_id })
      billData = (resp.bill ?? {}) as Record<string, unknown>
    } catch (e) {
      console.warn(`[mi-bills] getBill failed bill_id=${lsEntry.bill_id}:`, String(e))
      skipped++
      await new Promise(r => setTimeout(r, 1000))
      continue
    }

    // 5. Map fields
    const statusCode   = Number(billData.status ?? 1)
    const statusDate   = (billData.status_date as string) || lsEntry.status_date || null
    const lsTitle      = (billData.title as string) || (billData.description as string) || ''
    const history      = (billData.history as Array<{ date: string; action: string }>) ?? []
    const calendar     = (billData.calendar as CalendarEvent[]) ?? []
    const introduced   = (billData.introduced as string) || history[0]?.date || null
    const lastAction   = history.at(-1)?.action ?? null

    const stage        = mapLegiScanStage(statusCode)
    const stageDates   = mergeStageDates(bill.stage_dates as (string | null)[] | null, stage, statusDate)
    const newName      = lsTitle ? `${ref.prefix} — ${lsTitle}` : (bill.name as string)

    // Build stage_note: last action + upcoming event if any
    const upcomingEv   = findUpcomingEvent(calendar, today)
    let stageNote      = lastAction ?? null
    if (upcomingEv) {
      const evNote = formatEventNote(upcomingEv)
      stageNote    = stageNote ? `${stageNote} · ${evNote}` : evNote
    }

    const pullSource = `https://api.legiscan.com/?op=getBill&bill_id=${lsEntry.bill_id}`
    const now_iso    = new Date().toISOString()

    // 6. Urgency escalation (intentional Layer 2 exception)
    // Only escalate to 'urgent'; never downgrade via pull.
    const escalate = !!(upcomingEv && bill.urgency !== 'urgent')

    // 7. Diff / apply
    const diff = computeDiff(bill as Record<string, unknown>, newName, introduced, stage, stageDates, stageNote)

    if (bill.verified) {
      const update: Record<string, unknown> = { last_pulled_at: now_iso, raw_pull_data: billData, pull_source: pullSource }
      if (diff) update.pending_changes = diff
      if (escalate) update.urgency = 'urgent'   // hearing urgency writes through on verified cards
      await supabase.from('bills').update(update).eq('id', bill.id)
      if (diff) pending++
    } else {
      const update: Record<string, unknown> = {
        name: newName, introduced, stage, stage_dates: stageDates, stage_note: stageNote,
        pull_source: pullSource, raw_pull_data: billData, last_pulled_at: now_iso,
      }
      if (escalate) update.urgency = 'urgent'
      await supabase.from('bills').update(update).eq('id', bill.id)
      updated++
    }

    if (escalate) hearings++
    await new Promise(r => setTimeout(r, 1000))   // LegiScan rate limit
  }

  console.log(`[mi-bills] updated=${updated} pending=${pending} hearings=${hearings} skipped=${skipped}`)
  return { updated, pending, hearings, skipped }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (_req: Request) => {
  if (!LEGISCAN_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: 'LEGISCAN_API_KEY secret not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, secretKey)
  try {
    const result = await refresh(supabase)
    const ts     = new Date().toISOString()

    const parts: string[] = [`${result.updated} MI bill${result.updated !== 1 ? 's' : ''} updated`]
    if (result.pending  > 0) parts.push(`${result.pending} pending review`)
    if (result.hearings > 0) parts.push(`${result.hearings} escalated to Act Now`)
    if (result.skipped  > 0) parts.push(`${result.skipped} skipped`)

    supabase.from('patch_notes').insert({
      pull_date: ts.split('T')[0],
      summary: parts.join(' · ') + '.',
      details: { mi_bills: result },
    }).then(({ error: e }) => { if (e) console.error('[mi-bills] patch_notes:', e.message) })

    return new Response(JSON.stringify({ ok: true, refreshed_at: ts, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[mi-bills] Fatal:', msg)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
