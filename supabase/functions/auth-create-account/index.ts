/**
 * auth-create-account — create a new account with hashed credentials.
 * Protected by the ADMIN_SECRET env variable — not exposed to users.
 *
 * POST { admin_secret: string, username: string, password: string,
 *         passcode?: string, email?: string, role?: string, tier?: number,
 *         address?: string, district_info?: object }
 *
 * Success: { ok: true,  id: string }
 * Failure: { ok: false, error: string }
 *
 * Deploy secret: supabase secrets set ADMIN_SECRET=<your-secret>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CORS, json, hashCredential } from '../_shared/auth-utils.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const body = await req.json().catch(() => null)

  const adminSecret = Deno.env.get('ADMIN_SECRET')
  if (!adminSecret || body?.admin_secret !== adminSecret) {
    return json({ ok: false, error: 'unauthorized' }, 403)
  }

  const { username, password, passcode, email, role, tier, address, district_info } = body

  if (!username || !password) {
    return json({ ok: false, error: 'username and password are required' }, 400)
  }

  const validRoles = ['user', 'verifier', 'admin']
  if (role && !validRoles.includes(role)) {
    return json({ ok: false, error: `role must be one of: ${validRoles.join(', ')}` }, 400)
  }

  const password_hash = await hashCredential(password)
  const passcode_hash = passcode ? await hashCredential(passcode) : null

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      username,
      password_hash,
      passcode_hash,
      email:          email         ?? null,
      role:           role          ?? 'user',
      tier:           tier          ?? 2,
      address:        address       ?? null,
      district_info:  district_info ?? null,
    })
    .select('id')
    .single()

  if (error) {
    const duplicate = error.code === '23505'
    return json({ ok: false, error: duplicate ? 'username or email already exists' : error.message }, 400)
  }

  return json({ ok: true, id: data.id })
})
