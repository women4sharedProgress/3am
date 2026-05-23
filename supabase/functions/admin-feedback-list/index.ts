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

  const { data, error } = await supabase
    .from('feedback_submissions')
    .select('id, timestamp, page_route, account_tier, user_role, feedback_text, browser, os, screen_size, active_filters, bills_shown, app_version')
    .order('timestamp', { ascending: false })
    .limit(200)

  if (error) return json({ ok: false, error: error.message }, 500)
  return json({ ok: true, feedback: data ?? [] })
})
