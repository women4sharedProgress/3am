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
  if (session.role !== 'admin') return json({ ok: false, error: 'Admin only' }, 403)

  let body: { id?: number; completed?: boolean }
  try { body = await req.json() } catch { return json({ ok: false, error: 'Invalid JSON' }, 400) }

  const { id, completed = true } = body
  if (!id || typeof id !== 'number') return json({ ok: false, error: 'id is required' }, 400)

  const { error } = await supabase
    .from('feedback_submissions')
    .update({ completed })
    .eq('id', id)

  if (error) return json({ ok: false, error: error.message }, 500)
  return json({ ok: true })
})
