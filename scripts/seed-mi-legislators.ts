/**
 * Seed Michigan state legislators from the local OpenStates CSV snapshot.
 *
 * Usage (requires VITE_SUPABASE_URL + SUPABASE_SECRET_KEY in .env):
 *   node --env-file=.env --import tsx/esm scripts/seed-mi-legislators.ts
 *
 * The CSV is stored at src/data/seeds/mi_legislators.csv.
 * To refresh the snapshot before seeding:
 *   curl -L https://data.openstates.org/people/current/mi.csv \
 *        -o src/data/seeds/mi_legislators.csv
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

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
  if (r.includes('democrat'))   return 'Democrat'
  if (r.includes('republican')) return 'Republican'
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY — run with --env-file=.env')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const csvPath = join(process.cwd(), 'src/data/seeds/mi_legislators.csv')
  console.log(`\nReading ${csvPath}…`)
  const text = readFileSync(csvPath, 'utf-8')
  const [header, ...dataRows] = parseCsv(text)

  const col = (name: string) => header.indexOf(name)

  // Validate header
  const required = ['id', 'name', 'current_party', 'current_district', 'current_chamber', 'email', 'image', 'links']
  for (const f of required) {
    if (col(f) === -1) { console.error(`Missing expected column: ${f}`); process.exit(1) }
  }

  console.log(`Parsed ${dataRows.length} data rows.\n`)

  const records: object[] = []
  let skipped = 0

  for (const row of dataRows) {
    const ocdId  = row[col('id')]?.trim()
    const name   = row[col('name')]?.trim()
    const chamberRaw = row[col('current_chamber')]?.trim()

    if (!ocdId || !name || !chamberRaw) { skipped++; continue }
    if (!['lower', 'upper'].includes(chamberRaw)) {
      console.warn(`  Skip ${name} — unknown chamber "${chamberRaw}"`)
      skipped++; continue
    }

    const chamber  = mapChamber(chamberRaw)
    const district = row[col('current_district')]?.trim() || null

    records.push({
      bioguide_id: ocdId,
      name,
      party:      normalizeParty(row[col('current_party')] ?? ''),
      state:      'MI',
      district:   chamber === 'House' ? district : null,
      chamber,
      url:        firstUrl(row[col('links')] ?? ''),
      photo_url:  row[col('image')]?.trim() || null,
      email:      row[col('email')]?.trim() || null,
      source:     'openstates',
      verified:   false,
      updated_at: new Date().toISOString(),
    })

    const distLabel = chamber === 'House' ? `D${(district ?? '?').padStart(3)}` : 'Sen '
    console.log(`  ${chamber.padEnd(6)} ${distLabel}  ${name}`)
  }

  if (records.length === 0) {
    console.error('\nNo valid rows to upsert.')
    process.exit(1)
  }

  console.log(`\nUpserting ${records.length} rows into representatives (conflict on bioguide_id)…`)

  // Batch in chunks of 50 to stay under request limits
  const CHUNK = 50
  let upsertedTotal = 0
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('representatives')
      .upsert(chunk, { onConflict: 'bioguide_id' })
    if (error) { console.error(`Upsert error (chunk ${i}–${i + CHUNK}):`, error.message); process.exit(1) }
    upsertedTotal += chunk.length
  }

  console.log(`\n✓ Done — ${upsertedTotal} upserted, ${skipped} skipped.\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
