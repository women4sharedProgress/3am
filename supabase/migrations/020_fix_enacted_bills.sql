-- Fix bill 22 (Anti-SLAPP / MI HB 4045): already signed as PA 52 of 2025, set stage = 5
update bills set
  stage       = 5,
  stage_note  = 'ENACTED — Gov. Whitmer signed December 2025. Michigan is now the 39th state with Anti-SLAPP protection (Public Act 52 of 2025).',
  urgency     = 'stalled'
where id = 22;

-- Fix bill 19 (Universal Free School Meals / MI SB 401): signed April 2026.
-- Name was overwritten by LegiScan because MI SB 401 in the current session is a different bill
-- (naloxone co-prescribing). Restore correct name, set stage = 5, mark verified so the
-- automated pull cannot revert the enacted status.
update bills set
  name        = 'MI SB 401 — Universal Free School Meals Permanent Fund',
  stage       = 5,
  stage_dates = ARRAY['2023-10','2024-01','2024-06','2025-01','2026-04'],
  stage_note  = 'ENACTED — Gov. Whitmer signed April 2026. Michigan is the 18th state to permanently enshrine universal free school meals in statute. All 1.4 million Michigan public school students receive free breakfast and lunch.',
  urgency     = 'stalled',
  verified    = true,
  verified_by = 'W4SP',
  verified_at = now()
where id = 19;
