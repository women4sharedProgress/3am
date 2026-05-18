/**
 * bill-status-sync — sync per-card bill statuses between client and DB.
 *
 * GET  → returns all statuses for the current user: { ok, statuses: [{bill_id, status}] }
 * POST { changes: [{ bill_id: number, status: 'alert'|'watch'|'archive'|null }] }
 *      status null = delete the row.
 *
 * Requires: wsp_session cookie
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CORS, json, resolveSession } from '../_shared/auth-utils.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

interface Change { bill_id: number; status: string | null }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const user = await resolveSession(req, supabase)
  if (!user) return json({ ok: false, reason: 'unauthorized' }, 401)

  // GET: return all statuses for this user so the client can seed localStorage.
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('bill_user_status')
      .select('bill_id, status')
      .eq('user_id', user.id)
    if (error) return json({ ok: false, reason: error.message }, 500)
    return json({ ok: true, statuses: data ?? [] })
  }

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.changes)) {
    return json({ ok: false, reason: 'invalid body' }, 400)
  }

  const changes: Change[] = body.changes
  const toDelete = changes.filter(c => c.status === null).map(c => c.bill_id)
  const toUpsert = changes
    .filter(c => c.status !== null)
    .map(c => ({
      user_id:    user.id,
      bill_id:    c.bill_id,
      status:     c.status,
      updated_at: new Date().toISOString(),
    }))

  const errors: string[] = []

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('bill_user_status')
      .delete()
      .eq('user_id', user.id)
      .in('bill_id', toDelete)
    if (error) errors.push(error.message)
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from('bill_user_status')
      .upsert(toUpsert, { onConflict: 'user_id,bill_id' })
    if (error) errors.push(error.message)
  }

  if (errors.length > 0) return json({ ok: false, errors }, 500)
  return json({ ok: true })
})
