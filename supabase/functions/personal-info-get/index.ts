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

  const { data, error } = await supabase
    .from('accounts')
    .select('first_name, last_name, phone, phone_verified, email, email_verified, library_card, party, personal_roles')
    .eq('id', session.id)
    .single()

  if (error) return json({ ok: false, error: error.message }, 500)

  return json({
    ok: true,
    first_name:     data.first_name    ?? '',
    last_name:      data.last_name     ?? '',
    phone:          data.phone         ?? '',
    phone_verified: data.phone_verified ?? false,
    email:          data.email         ?? '',
    email_verified: data.email_verified ?? false,
    library_card:   data.library_card  ?? '',
    party:          data.party         ?? '',
    personal_roles: data.personal_roles ?? [],
  })
})
