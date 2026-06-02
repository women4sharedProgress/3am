import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateSession, corsHeaders, errorResponse } from '../_shared/auth-utils.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const session = await validateSession(req)
  if (!session.valid) return errorResponse(401, 'Not authenticated')
  if ((session.tier ?? 0) < 3) return errorResponse(403, 'Tier 3 or higher required')

  const url     = new URL(req.url)
  const billId  = url.searchParams.get('bill_id')
  const mode    = url.searchParams.get('mode') // 'summary' for admin aggregate across all bills

  const isAdmin = session.role === 'admin' || session.role === 'verifier'

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Admin aggregate: all bills + notes summary (for admin dashboard)
  if (mode === 'summary' && isAdmin) {
    const { data, error } = await supa
      .from('bill_verifier_notes')
      .select('bill_id, username, note, updated_at')
      .order('bill_id')
      .order('updated_at', { ascending: false })
    if (error) return errorResponse(500, error.message)

    // Group by bill_id
    const grouped: Record<number, { username: string; note: string; updated_at: string }[]> = {}
    for (const row of data ?? []) {
      if (!grouped[row.bill_id]) grouped[row.bill_id] = []
      grouped[row.bill_id].push({ username: row.username, note: row.note, updated_at: row.updated_at })
    }
    return new Response(JSON.stringify({ ok: true, summary: grouped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!billId) return errorResponse(400, 'bill_id required')
  const bill_id = parseInt(billId, 10)
  if (isNaN(bill_id)) return errorResponse(400, 'Invalid bill_id')

  if (isAdmin) {
    // Admins get all notes for this bill
    const { data, error } = await supa
      .from('bill_verifier_notes')
      .select('username, note, updated_at')
      .eq('bill_id', bill_id)
      .order('updated_at', { ascending: false })
    if (error) return errorResponse(500, error.message)
    return new Response(JSON.stringify({ ok: true, notes: data ?? [], is_admin: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Non-admin tier 3+: only own note
  const { data, error } = await supa
    .from('bill_verifier_notes')
    .select('note, updated_at')
    .eq('bill_id', bill_id)
    .eq('username', session.username!)
    .maybeSingle()
  if (error) return errorResponse(500, error.message)
  return new Response(JSON.stringify({ ok: true, note: data?.note ?? '', updated_at: data?.updated_at ?? null, is_admin: false }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
