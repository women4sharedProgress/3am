import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, resolveSession, CORS } from '../_shared/auth-utils.ts'

const VALID_ROLES = ['local_official', 'state_official', 'national_official', 'broadcaster', 'verification_volunteer', 'student', 'poll_worker', 'amazing_american', 'voter']
const VALID_PARTIES = ['Democrat', 'Republican', 'Independent', 'Green', 'Libertarian', 'Other', '']

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const session = await resolveSession(req, supabase)
  if (!session) return json({ ok: false, error: 'Not signed in' }, 401)

  let body: {
    first_name?: string
    last_name?: string
    phone?: string
    library_card?: string
    party?: string
    personal_roles?: string[]
  }
  try { body = await req.json() } catch { return json({ ok: false, error: 'Invalid JSON' }, 400) }

  const roles = body.personal_roles ?? []
  if (!Array.isArray(roles) || roles.some(r => !VALID_ROLES.includes(r))) {
    return json({ ok: false, error: 'Invalid roles' }, 400)
  }
  if (body.party !== undefined && !VALID_PARTIES.includes(body.party ?? '')) {
    return json({ ok: false, error: 'Invalid party' }, 400)
  }

  const update: Record<string, unknown> = {}
  if (body.first_name   !== undefined) update.first_name   = body.first_name.trim().slice(0, 64)
  if (body.last_name    !== undefined) update.last_name    = body.last_name.trim().slice(0, 64)
  if (body.phone        !== undefined) update.phone        = body.phone.trim().slice(0, 32)
  if (body.library_card !== undefined) update.library_card = body.library_card.trim().slice(0, 64)
  if (body.party        !== undefined) update.party        = body.party
  if (body.personal_roles !== undefined) update.personal_roles = roles

  // Changing phone clears phone_verified
  if (update.phone !== undefined) update.phone_verified = false

  const { error } = await supabase
    .from('accounts')
    .update(update)
    .eq('id', session.id)

  if (error) return json({ ok: false, error: error.message }, 500)

  // Auto-upgrade to tier 4 if any verification is now complete
  const { data: acct } = await supabase
    .from('accounts')
    .select('phone_verified, email_verified, library_card, tier')
    .eq('id', session.id)
    .single()

  let tier_upgraded = false
  let new_tier      = acct?.tier ?? session.tier

  const anyVerified = acct && (
    acct.phone_verified ||
    acct.email_verified ||
    (acct.library_card && acct.library_card.trim())
  )
  if (anyVerified && acct && acct.tier < 4) {
    await supabase.from('accounts').update({ tier: 4 }).eq('id', session.id)
    tier_upgraded = true
    new_tier      = 4
  }

  return json({ ok: true, tier_upgraded, new_tier })
})
