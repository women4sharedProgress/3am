import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, resolveSession, CORS } from '../_shared/auth-utils.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const session = await resolveSession(req, supabase)
  if (!session) return json({ ok: false, error: 'Not signed in' }, 401)
  if (session.role !== 'admin') return json({ ok: false, error: 'Forbidden' }, 403)

  let body: { request_id?: number; status?: string }
  try { body = await req.json() } catch { return json({ ok: false, error: 'Invalid JSON' }, 400) }

  const { request_id, status } = body
  if (!request_id || !['approved', 'disapproved', 'pending'].includes(status ?? '')) {
    return json({ ok: false, error: 'request_id and valid status required' }, 400)
  }

  const { error } = await supabase
    .from('tier_requests')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.username,
    })
    .eq('id', request_id)

  if (error) return json({ ok: false, error: error.message }, 500)
  return json({ ok: true })
})
