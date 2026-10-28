/**
 * State Refresh Edge Function — all 50 states, one adapter per state.
 *
 * Which states run, and from which source, is controlled by the
 * `state_sources` table (migration 025), not by code:
 *   state | adapter ('legiscan' | 'ny' | ...) | active | last_run_at | last_status | last_error
 *
 * Each invocation processes a small batch of the states that are most overdue,
 * so 50 states never have to fit inside one edge-function time limit. pg_cron
 * calls it every 10 minutes overnight (see migration 025).
 *
 * Request body (all optional):
 *   { "states": ["NY","MI"] }   run exactly these (ignores schedule)
 *   { "dryRun": true }           fetch + normalize only, write nothing, return samples
 *
 * Auth: caller must send `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
 * (pg_cron does). Deployed with --no-verify-jwt, so this check is what stops
 * strangers from triggering runs and burning API quota.
 *
 * Secrets: LEGISCAN_API_KEY, NY_OPENLEG_API_KEY, STATE_BATCH_SIZE (default 3)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ADAPTERS } from './adapters/index.ts'
import { syncState } from './lib/store.ts'
import type { StateRunResult } from './lib/types.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BATCH_SIZE  = Number(Deno.env.get('STATE_BATCH_SIZE') ?? '3')
const TIME_BUDGET_MS = 110_000          // stop starting new states after this
const RERUN_AFTER_HOURS = 20            // a state is "due" once per night

Deno.serve(async (req: Request) => {
  if (req.headers.get('Authorization') !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const started = Date.now()
  const supabase = createClient(supabaseUrl, serviceKey)
  const body = await req.json().catch(() => ({})) as { states?: string[]; dryRun?: boolean }
  const dryRun = body.dryRun === true

  // ── Pick states ──
  let query = supabase.from('state_sources').select('state, adapter, active, last_run_at')
  if (body.states?.length) {
    query = query.in('state', body.states.map(s => s.toUpperCase()))
  } else {
    const due = new Date(Date.now() - RERUN_AFTER_HOURS * 3_600_000).toISOString()
    query = query.eq('active', true)
      .or(`last_run_at.is.null,last_run_at.lt.${due}`)
      .order('last_run_at', { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE)
  }
  const { data: rows, error } = await query
  if (error) return json({ ok: false, error: error.message }, 500)

  const results: StateRunResult[] = []
  const samples: Record<string, unknown[]> = {}

  for (const row of rows ?? []) {
    if (Date.now() - started > TIME_BUDGET_MS) break
    const t0 = Date.now()
    const r: StateRunResult = {
      state: row.state, adapter: row.adapter,
      fetched: 0, updated: 0, pending: 0, unchanged: 0, discovered: 0, ms: 0,
    }
    try {
      const adapter = ADAPTERS[row.adapter]
      if (!adapter) throw new Error(`No adapter named '${row.adapter}'`)
      const bills = await adapter.listBills(row.state)
      r.fetched = bills.length
      if (bills.length === 0) throw new Error('Source returned 0 bills — source may be down or changed')

      if (dryRun) {
        samples[row.state] = bills.slice(0, 5).map(({ raw: _raw, ...rest }) => rest)
      } else {
        Object.assign(r, await syncState(supabase, row.state, adapter, bills))
      }
    } catch (e) {
      r.error = e instanceof Error ? e.message : String(e)
      console.error(`[state-refresh] ${row.state} (${row.adapter}) FAILED: ${r.error}`)
    }
    r.ms = Date.now() - t0
    results.push(r)

    if (!dryRun) {
      await supabase.from('state_sources').update({
        last_run_at: new Date().toISOString(),
        last_status: r.error ? 'error' : 'ok',
        last_error:  r.error ?? null,
        last_result: r,
      }).eq('state', row.state)
    }
  }

  // One patch-notes line per batch that actually changed something
  const changed = results.filter(r => r.updated || r.discovered || r.pending)
  if (!dryRun && changed.length) {
    const summary = changed.map(r =>
      `${r.state}: ${r.updated} updated` +
      (r.discovered ? `, ${r.discovered} new` : '') +
      (r.pending ? `, ${r.pending} pending review` : ''),
    ).join(' · ') + '.'
    await supabase.from('patch_notes').insert({
      pull_date: new Date().toISOString().split('T')[0],
      summary,
      details: { state_refresh: results },
    })
  }

  const ok = results.every(r => !r.error)
  return json({ ok, dryRun, ran: results.length, results, ...(dryRun ? { samples } : {}) }, ok ? 200 : 207)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { 'Content-Type': 'application/json' } })
}
