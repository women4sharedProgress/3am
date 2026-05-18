/**
 * profile-save — persist the user's profile/district data to their account row.
 *
 * POST { profile: object }   (full ProfileData JSON from the frontend)
 * Requires: wsp_session cookie
 *
 * Stores the entire profile object in the district_info JSONB column so it can
 * be returned by auth-validate and auth-signin to restore state on any device.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CORS, json, resolveSession } from '../_shared/auth-utils.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const user = await resolveSession(req, supabase)
  if (!user) return json({ ok: false, reason: 'unauthorized' }, 401)

  const body = await req.json().catch(() => null)
  if (!body?.profile || typeof body.profile !== 'object') {
    return json({ ok: false, reason: 'profile object required' }, 400)
  }

  const { error } = await supabase
    .from('accounts')
    .update({ district_info: body.profile })
    .eq('id', user.id)

  if (error) return json({ ok: false, reason: error.message }, 500)
  return json({ ok: true })
})
