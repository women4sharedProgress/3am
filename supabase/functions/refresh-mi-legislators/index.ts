/**
 * Refresh Michigan state legislators from the OpenStates bulk data CSV.
 *
 * Fetches https://data.openstates.org/people/current/mi.csv, parses it,
 * and upserts into the representatives table (conflict on bioguide_id).
 *
 * Scheduled monthly via pg_cron (migration 016_refresh_mi_legislators_cron.sql).
 * Can also be triggered manually: POST /functions/v1/refresh-mi-legislators
 *
 * Secrets (auto-injected by Supabase):
 *   SUPABASE_URL              — project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key for upsert
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const secretKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const OPENSTATES_CSV_URL = 'https://data.openstates.org/people/current/mi.csv'
const CHUNK = 50

// ── CSV parser (RFC 4180) ─────────────────────────────────────────────────────

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++ }
      else if (ch === '"')            { inQuotes = false }
      else                            { field += ch }
    } else {
      if      (ch === '"')                          { inQuotes = true }
      else if (ch === ',')                          { row.push(field); field = '' }
      else if (ch === '\r' && next === '\n')        { row.push(field); rows.push(row); row = []; field = ''; i++ }
      else if (ch === '\n' || ch === '\r')          { row.push(field); rows.push(row); row = []; field = '' }
      else                                          { field += ch }
    }
  }
  if (row.length > 0 || field) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(f => f.trim()))
}

// ── Field mapping ─────────────────────────────────────────────────────────────

function normalizeParty(raw: string): string {
  const r = raw.toLowerCase()
  if (r.includes('democrat'))    return 'Democrat'
  if (r.includes('republican'))  return 'Republican'
  if (r.includes('independent')) return 'Independent'
  return raw || 'Unknown'
}

function mapChamber(raw: string): 'House' | 'Senate' {
  return raw.trim() === 'lower' ? 'House' : 'Senate'
}

function firstUrl(raw: string): string | null {
  if (!raw) return null
  const u = raw.split(/[;|]/).map(s => s.trim()).find(s => s.startsWith('http'))
  return u ?? null
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  const supabase = createClient(supabaseUrl, secretKey)

  // Fetch CSV
  let csvText: string
  try {
    const res = await fetch(OPENSTATES_CSV_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status} from OpenStates`)
    csvText = await res.text()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Failed to fetch OpenStates CSV:', msg)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const [header, ...dataRows] = parseCsv(csvText)
  const col = (name: string) => header.indexOf(name)

  const required = ['id', 'name', 'current_party', 'current_district', 'current_chamber', 'email', 'image', 'links']
  for (const f of required) {
    if (col(f) === -1) {
      return new Response(JSON.stringify({ ok: false, error: `Missing CSV column: ${f}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // Build records
  const records: object[] = []
  let skipped = 0
  const now = new Date().toISOString()

  for (const row of dataRows) {
    const ocdId      = row[col('id')]?.trim()
    const name       = row[col('name')]?.trim()
    const chamberRaw = row[col('current_chamber')]?.trim()

    if (!ocdId || !name || !chamberRaw) { skipped++; continue }
    if (!['lower', 'upper'].includes(chamberRaw)) { skipped++; continue }

    const chamber  = mapChamber(chamberRaw)
    const district = row[col('current_district')]?.trim() || null

    records.push({
      bioguide_id: ocdId,
      name,
      party:      normalizeParty(row[col('current_party')] ?? ''),
      state:      'MI',
      district:   district || null,
      chamber,
      url:        firstUrl(row[col('links')] ?? ''),
      photo_url:  row[col('image')]?.trim() || null,
      email:      row[col('email')]?.trim() || null,
      source:     'openstates',
      verified:   false,
      updated_at: now,
    })
  }

  if (records.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: 'No valid rows parsed', skipped }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Upsert in chunks
  let upsertedTotal = 0
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('representatives_state')
      .upsert(chunk, { onConflict: 'bioguide_id' })
    if (error) {
      console.error(`Upsert error (chunk ${i}–${i + CHUNK}):`, error.message)
      return new Response(JSON.stringify({ ok: false, error: error.message, upsertedSoFar: upsertedTotal }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    upsertedTotal += chunk.length
  }

  console.log(`refresh-mi-legislators: upserted=${upsertedTotal} skipped=${skipped}`)
  return new Response(
    JSON.stringify({ ok: true, upserted: upsertedTotal, skipped, source: OPENSTATES_CSV_URL }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
