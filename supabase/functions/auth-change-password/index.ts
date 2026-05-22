import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CORS, json, resolveSession, verifyCredential, hashCredential } from '../_shared/auth-utils.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const user = await resolveSession(req, supabase)
  if (!user) return json({ ok: false, error: 'not authenticated' }, 401)

  const body = await req.json().catch(() => null)
  if (!body?.current_password || !body?.new_password) {
    return json({ ok: false, error: 'current_password and new_password are required' }, 400)
  }

  const { data: account, error } = await supabase
    .from('accounts')
    .select('id, password_hash')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !account) return json({ ok: false, error: 'account not found' }, 404)

  const valid = await verifyCredential(body.current_password, account.password_hash)
  if (!valid) return json({ ok: false, error: 'current password is incorrect' }, 401)

  const new_hash = await hashCredential(body.new_password)
  const { error: updateErr } = await supabase
    .from('accounts')
    .update({ password_hash: new_hash })
    .eq('id', user.id)

  if (updateErr) return json({ ok: false, error: 'failed to update password' }, 500)

  return json({ ok: true })
})
