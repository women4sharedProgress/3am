-- supabase/migrations/026_wa_source.sql
-- Point Washington at its official web service (adapters/wa.ts).
-- Stays OFF until a dry run looks right. Then: update state_sources set active = true where state = 'WA';
update state_sources
   set adapter = 'wa',
       notes   = 'wslwebservices.leg.wa.gov LegislationService (official, no key)'
 where state = 'WA';
