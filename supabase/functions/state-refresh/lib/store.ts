/**
 * Writes normalized bills into the `bills` table, following the 3am Soft
 * Update rules in CLAUDE.md:
 *   - Unverified cards: Layer 1 fields overwritten directly.
 *   - Verified cards:   diff goes to pending_changes only; live card untouched.
 *   - Layer 2 fields (bill_desc, decisions, supporters, blockers,
 *     influence_window, policy_bias, urgency) are NEVER written on update.
 *   - No deletes. Bills missing from a pull stay in the system.
 *   - New bills are only inserted when they match DISCOVERY_RULES.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { NormalizedBill, StateAdapter, STATE_STAGE_COUNT } from './types.ts'
import {
  billKey, billNumberFromName, formatBillName, guessIssues,
  inferRatifyOffice, mergeStageDates, sleep,
} from './normalize.ts'

const LAYER1_KEYS = ['name', 'introduced', 'stage', 'stage_dates', 'stage_note', 'committee'] as const
const MAX_NEW_PER_STATE = 20

interface DbBill {
  id: number
  name: string
  pull_source: string | null
  verified: boolean | null
  stage: number
  stage_dates: (string | null)[] | null
  stage_note: string | null
  introduced: string | null
  committee: string | null
}

/** Layer 1 values the source wants; null-valued fields mean "source didn't say, keep current". */
function incomingLayer1(db: DbBill | null, b: NormalizedBill): Record<string, unknown> {
  // Keep the existing number text ("SB 12") if the source writes it differently ("SB0012")
  const dbNum = db ? billNumberFromName(db.name) : ''
  const num = dbNum && billKey(dbNum) === billKey(b.billNumber) ? dbNum : b.billNumber
  return {
    name:        formatBillName(num, b.title) || db?.name,
    introduced:  b.introduced ?? db?.introduced ?? '',   // column is NOT NULL default ''
    stage:       b.stage,
    stage_dates: mergeStageDates(db?.stage_dates, b.stage, b.stageDate, STATE_STAGE_COUNT),
    stage_note:  b.lastAction ?? db?.stage_note ?? '',
    committee:   b.committee ?? db?.committee ?? null,
  }
}

function diffLayer1(db: DbBill, next: Record<string, unknown>) {
  const diff: Record<string, { old: unknown; new: unknown }> = {}
  for (const k of LAYER1_KEYS) {
    const cur = (db as unknown as Record<string, unknown>)[k]
    if (JSON.stringify(cur ?? null) !== JSON.stringify(next[k] ?? null)) diff[k] = { old: cur, new: next[k] }
  }
  return Object.keys(diff).length ? diff : null
}

export async function syncState(
  supabase: SupabaseClient,
  state: string,
  adapter: StateAdapter,
  bills: NormalizedBill[],
): Promise<{ updated: number; pending: number; unchanged: number; discovered: number }> {
  const { data, error } = await supabase
    .from('bills')
    .select('id, name, pull_source, verified, stage, stage_dates, stage_note, introduced, committee')
    .eq('state', state)
  if (error) throw new Error(`DB read failed: ${error.message}`)
  const dbBills = (data ?? []) as DbBill[]

  // Match by pull_source first, then by bill number (handles source switches)
  const bySource = new Map(dbBills.filter(b => b.pull_source).map(b => [b.pull_source!, b]))
  const byKey = new Map(dbBills.map(b => [billKey(billNumberFromName(b.name)), b]))

  let updated = 0, pending = 0, unchanged = 0, discovered = 0
  const now = new Date().toISOString()
  const newCandidates: NormalizedBill[] = []

  for (const b of bills) {
    const db = bySource.get(b.pullSource) ?? byKey.get(billKey(b.billNumber)) ?? null
    if (!db) {
      if (guessIssues(b.title).length) newCandidates.push(b)
      continue
    }

    const next = incomingLayer1(db, b)
    const diff = diffLayer1(db, next)

    if (!diff && db.pull_source === b.pullSource) {
      // Nothing changed — just stamp the pull time (keeps "stale" flag accurate)
      await supabase.from('bills').update({ last_pulled_at: now }).eq('id', db.id)
      unchanged++
      continue
    }

    if (db.verified) {
      const upd: Record<string, unknown> = { last_pulled_at: now, raw_pull_data: b.raw }
      if (diff) upd.pending_changes = diff
      const { error: e } = await supabase.from('bills').update(upd).eq('id', db.id)
      if (e) console.error(`[${state}] verified update id=${db.id}:`, e.message)
      else if (diff) pending++
      else unchanged++
    } else {
      const { error: e } = await supabase.from('bills').update({
        ...next,
        pull_source:    b.pullSource,
        raw_pull_data:  b.raw,
        last_pulled_at: now,
      }).eq('id', db.id)
      if (e) console.error(`[${state}] update id=${db.id}:`, e.message)
      else updated++
    }
    await sleep(50)
  }

  // Discovery — newest activity first, capped per run
  newCandidates.sort((a, b) => (b.stageDate ?? '').localeCompare(a.stageDate ?? ''))
  for (let b of newCandidates.slice(0, MAX_NEW_PER_STATE)) {
    if (adapter.getDetails) {
      try { b = await adapter.getDetails(b) } catch (e) { console.warn(`[${state}] details ${b.billNumber}:`, e) }
    }
    const l1 = incomingLayer1(null, b)
    const { error: e } = await supabase.from('bills').insert({
      state,
      level:            'state',
      ...l1,
      issues:           guessIssues(b.title),
      urgency:          'months',
      policy_bias:      50,
      amend:            [],
      ratify_office:    inferRatifyOffice(b.stage, state),
      bill_desc:        '',
      decisions:        [],
      supporters:       '',
      blockers:         '',
      influence_window: '',
      municipality:     null,
      pull_source:      b.pullSource,
      raw_pull_data:    b.raw,
      last_pulled_at:   now,
      verified:         false,
    })
    if (e) console.error(`[${state}] insert ${b.billNumber}:`, e.message)
    else { discovered++; console.log(`[${state}] added ${b.billNumber} — ${b.title}`) }
    await sleep(100)
  }

  return { updated, pending, unchanged, discovered }
}
