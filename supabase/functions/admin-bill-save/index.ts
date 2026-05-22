import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveSession, CORS, json } from '../_shared/auth-utils.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const secretKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Only these columns may be written by the admin-bill-save function.
const EDITABLE = new Set([
  'name', 'introduced', 'stage', 'stage_dates', 'stage_note',
  'bill_desc', 'decisions', 'supporters', 'blockers',
  'influence_window', 'policy_bias', 'urgency',
  'level', 'municipality', 'amend', 'issues', 'ratify_office', 'state',
  'source_url', 'notes',
])

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(supabaseUrl, secretKey)
  const user = await resolveSession(req, supabase)
  if (!user)         return json({ ok: false, error: 'Not authenticated' }, 401)
  if (user.tier < 3) return json({ ok: false, error: 'Insufficient tier' }, 403)

  let body: { bill_id?: number; fields?: Record<string, unknown>; verify?: boolean; unverify?: boolean }
  try { body = await req.json() } catch { return json({ ok: false, error: 'Invalid JSON' }, 400) }

  const { bill_id, fields = {}, verify, unverify } = body
  if (!bill_id || typeof bill_id !== 'number') {
    return json({ ok: false, error: 'bill_id required' }, 400)
  }

  const update: Record<string, unknown> = {}

  for (const [k, v] of Object.entries(fields)) {
    if (EDITABLE.has(k)) update[k] = v
  }

  if (verify) {
    update.verified    = true
    update.verified_by = user.username
    update.verified_at = new Date().toISOString()
    // Any human edit clears pending_changes per data model rules
    update.pending_changes = null
  } else if (unverify) {
    update.verified    = false
    update.verified_by = null
    update.verified_at = null
  }

  // A human field edit always clears verification
  if (Object.keys(fields).length > 0 && !verify && !unverify) {
    update.verified    = false
    update.verified_by = null
    update.verified_at = null
  }

  if (Object.keys(update).length === 0) {
    return json({ ok: false, error: 'No valid fields to update' }, 400)
  }

  const { data, error: updateErr } = await supabase
    .from('bills')
    .update(update)
    .eq('id', bill_id)
    .select()
    .maybeSingle()

  if (updateErr) return json({ ok: false, error: updateErr.message }, 500)
  return json({ ok: true, bill: data })
})
