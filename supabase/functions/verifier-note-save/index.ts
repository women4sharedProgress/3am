import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateSession, corsHeaders, errorResponse } from '../_shared/auth-utils.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const session = await validateSession(req)
  if (!session.valid) return errorResponse(401, 'Not authenticated')
  if ((session.tier ?? 0) < 3)  return errorResponse(403, 'Tier 3 or higher required')

  let body: { bill_id: number; note: string }
  try { body = await req.json() } catch { return errorResponse(400, 'Invalid JSON') }

  const { bill_id, note } = body
  if (!bill_id || typeof bill_id !== 'number') return errorResponse(400, 'bill_id required')
  if (typeof note !== 'string')                return errorResponse(400, 'note required')

  const trimmed = note.trim()
  if (trimmed.length > 2000) return errorResponse(400, 'Note exceeds 2000 character limit')

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  if (trimmed === '') {
    // Empty note → delete it
    await supa.from('bill_verifier_notes').delete()
      .eq('bill_id', bill_id).eq('username', session.username!)
    return new Response(JSON.stringify({ ok: true, deleted: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data, error } = await supa
    .from('bill_verifier_notes')
    .upsert(
      { bill_id, username: session.username!, note: trimmed, updated_at: new Date().toISOString() },
      { onConflict: 'bill_id,username' },
    )
    .select('id, updated_at')
    .single()

  if (error) return errorResponse(500, error.message)
  return new Response(JSON.stringify({ ok: true, id: data.id, updated_at: data.updated_at }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
