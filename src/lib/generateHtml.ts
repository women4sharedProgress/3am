import type { Bill } from '../types/bill'
import { FEDERAL_STAGES, MICHIGAN_STAGES, LOCAL_STAGES, OFFICE_META } from './constants'

// Converts a DB bill row back to the JS object shape the original HTML template expects
function toJsBill(b: Bill) {
  return {
    id:           b.id,
    level:        b.level,
    municipality: b.municipality ?? undefined,
    amend:        b.amend,
    urgency:      b.urgency,
    policyBias:   b.policy_bias,
    issues:       b.issues,
    ratifyOffice: b.ratify_office,
    stageDates:   b.stage_dates,
    stage:        b.stage,
    stageNote:    b.stage_note,
    name:         b.name,
    desc:         b.bill_desc,
    introduced:   b.introduced,
    supporters:   b.supporters,
    blockers:     b.blockers,
    window:       b.influence_window,
    decisions:    b.decisions,
  }
}

export function generateHtml(bills: Bill[], stateName: string, dateStr: string): string {
  const jsBills = bills.map(toJsBill)
  const billsJson = JSON.stringify(jsBills, null, 2)

  const STAGES_JS = `
const FEDERAL_STAGES  = ${JSON.stringify(FEDERAL_STAGES)};
const MICHIGAN_STAGES = ${JSON.stringify(MICHIGAN_STAGES)};
const LOCAL_STAGES    = ${JSON.stringify(LOCAL_STAGES)};
const OFFICE_META     = ${JSON.stringify(OFFICE_META)};`

  return `<!DOCTYPE html>
<!--
W4SP_REFRESH_INSTRUCTIONS

When asked to refresh this file, update the following fields for EVERY bill using
current information from official government sources (congress.gov for federal bills,
legislature.mi.gov for Michigan bills, city/county sites for local ordinances) and
reliable news reporting. Cross-check all facts before writing them.

Fields to update on every bill:
  name         — current official bill number and short title
  stage        — current stage index (0-based integer; stage === stages.length means enacted/signed)
  stage_dates  — array of date strings for each completed stage (military format: 14 Jan 25)
  stage_note   — one-sentence plain-English description of current status
  bill_desc    — updated plain-language summary of what the bill does
  decisions    — updated list of {label, text} objects describing what is being decided
  supporters   — current named key supporters (sponsors, advocacy groups, officials)
  blockers     — current named key blockers (opponents, advocacy groups, officials)
  window       — updated public influence window (when and how citizens can still act)
  policy_bias  — updated 0–100 integer (0 = most conservative, 100 = most liberal, 50 = center)
  urgency      — one of: "urgent" | "months" | "year" | "stalled"

DO NOT change:
  id           — unique bill identifier (never reassign or renumber)
  level        — "federal" | "state" | "local"

After refreshing all bills, update the page <title> and subtitle date to today,
and save the file with today's date in the filename:
  Michigan_National_Tracker_DD_Mon_YY.html   (e.g. Michigan_National_Tracker_16_May_26.html)
-->
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${stateName} Legislation Tracker — ${dateStr}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --color-bg-primary:#ffffff;--color-bg-secondary:#f5f5f3;--color-bg-info:#e6f1fb;--color-bg-success:#eaf3de;--color-bg-danger:#fcebeb;--color-bg-warning:#faeeda;--color-bg-neutral:#f1efe8;
    --color-text-primary:#1a1a18;--color-text-secondary:#5f5e5a;--color-text-tertiary:#888780;--color-text-info:#0c447c;--color-text-success:#27500a;--color-text-danger:#791f1f;--color-text-warning:#633806;--color-text-neutral:#444441;
    --color-border-light:rgba(0,0,0,0.1);--color-border-medium:rgba(0,0,0,0.18);
    --federal-bg:#1b2d56;--federal-text:#c8dff5;--michigan-bg:#0073cf;--michigan-text:#ffffff;--local-bg:#2a6b3a;--local-text:#dff0e4;
    --stalled-bg:#e8e6e0;--stalled-text:#888780;--pipe-done:#378add;--pipe-curr:#185fa5;--pipe-future:#c8c7c0;
    --bar-con:#B81616;--bar-lib:#1A3E9C;--bar-ctr:#5C14B8;
    --font-calibri:Calibri,'Gill Sans MT','Trebuchet MS',sans-serif;--radius-md:8px;--radius-lg:12px;--radius-pill:20px;--font-sans:system-ui,-apple-system,sans-serif;
    --office-gov:#1e6b1e;--office-mi-s:#0073cf;--office-mi-h:#3a8fd9;--office-com:#888780;--office-us-s:#1b2d56;--office-pres:#7a1515;--office-mayor:#8b4500;--office-council:#006666;--office-county:#5a3d1a;
  }
  @media(prefers-color-scheme:dark){:root{--color-bg-primary:#1e1e1c;--color-bg-secondary:#272725;--color-bg-info:#042c53;--color-bg-success:#173404;--color-bg-danger:#501313;--color-bg-warning:#412402;--color-bg-neutral:#2c2c2a;--color-text-primary:#f0ede6;--color-text-secondary:#b4b2a9;--color-text-tertiary:#888780;--color-text-info:#b5d4f4;--color-text-success:#c0dd97;--color-text-danger:#f7c1c1;--color-text-warning:#fac775;--color-text-neutral:#d3d1c7;--color-border-light:rgba(255,255,255,0.1);--color-border-medium:rgba(255,255,255,0.18);--federal-bg:#0c2044;--federal-text:#b5d4f4;--michigan-bg:#004f8f;--michigan-text:#d4eaff;--local-bg:#1a4a26;--local-text:#a0d8b0;--stalled-bg:#2c2c2a;--stalled-text:#888780;--pipe-done:#85b7eb;--pipe-curr:#b5d4f4;--pipe-future:#444441;--bar-con:#C84040;--bar-lib:#3060C0;--bar-ctr:#7228CC;--office-gov:#3aa83a;--office-mi-s:#4a90d9;--office-mi-h:#6aaae0;--office-com:#aaa9a2;--office-us-s:#6a8fc0;--office-pres:#c05050;--office-mayor:#cc7722;--office-council:#009999;--office-county:#a07040;}}
  body{font-family:var(--font-sans);background:var(--color-bg-secondary);color:var(--color-text-primary);padding:1.5rem 1rem;max-width:920px;margin:0 auto;font-size:15px;line-height:1.6;}
  .page-header{margin-bottom:1.25rem;}.page-header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}.page-title{font-size:20px;font-weight:500;margin-bottom:3px;}.page-subtitle{font-size:13px;color:var(--color-text-tertiary);}
  .search-wrap{flex-shrink:0;padding-top:2px;}.search-input{font-family:var(--font-sans);font-size:13px;padding:5px 12px 5px 30px;border-radius:var(--radius-pill);border:1px solid var(--color-border-medium);background:var(--color-bg-primary) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%23888780' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E") no-repeat 10px center;color:var(--color-text-primary);outline:none;width:190px;transition:border-color .15s,width .2s;}.search-input:focus{border-color:var(--michigan-bg);width:230px;}.search-input::placeholder{color:var(--color-text-tertiary);}
  .filter-group-city{margin-top:-3px;}.fg-indent{padding-left:12px;color:var(--color-text-tertiary);font-size:10px;}.filter-groups{margin-bottom:1rem;}.filter-group{margin-bottom:7px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}.fg-label{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-tertiary);white-space:nowrap;min-width:120px;font-weight:500;padding-top:3px;}.chips{display:flex;flex-wrap:wrap;gap:5px;}
  .chip{font-size:13px;padding:4px 13px;border-radius:var(--radius-pill);border:1px solid var(--color-border-medium);cursor:pointer;background:var(--color-bg-primary);color:var(--color-text-primary);transition:background .1s,color .1s,border-color .1s;font-family:var(--font-calibri);font-weight:600;display:inline-flex;align-items:center;gap:5px;}.chip:hover{background:var(--color-bg-neutral);border-color:var(--color-text-tertiary);}.chip.active{background:var(--color-text-primary);color:var(--color-bg-primary);border-color:transparent;}.chip.active:hover{filter:brightness(1.15);}
  .chip-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}.chip.active .chip-dot{opacity:.7;}.chip[data-f="liberal"] .chip-dot{background:var(--bar-lib);border-radius:2px;}.chip[data-f="center"] .chip-dot{background:var(--bar-ctr);border-radius:2px;}.chip[data-f="conservative"] .chip-dot{background:var(--bar-con);border-radius:2px;}.chip[data-f="governor"] .chip-dot{background:var(--office-gov);}.chip[data-f="mi-senate"] .chip-dot{background:var(--office-mi-s);}.chip[data-f="mi-house"] .chip-dot{background:var(--office-mi-h);}.chip[data-f="committee"] .chip-dot{background:var(--office-com);}.chip[data-f="us-senate"] .chip-dot{background:var(--office-us-s);}.chip[data-f="mayor"] .chip-dot{background:var(--office-mayor);}.chip[data-f="city-council"] .chip-dot{background:var(--office-council);}.chip[data-f="county-board"] .chip-dot{background:var(--office-county);}
  .count{font-size:12px;color:var(--color-text-tertiary);margin-bottom:.6rem;}
  .bill{position:relative;overflow:hidden;border:.5px solid var(--color-border-light);border-radius:var(--radius-lg);padding:calc(40px + .65rem) 1.25rem 1rem 1.25rem;margin-bottom:10px;background:var(--color-bg-primary);}
  .policy-bar{position:absolute;top:0;left:0;right:0;height:40px;}.policy-bar-label{position:absolute;bottom:5px;left:12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:rgba(255,255,255,.85);font-weight:bold;font-family:var(--font-calibri);pointer-events:none;white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,.7),0 0 8px rgba(0,0,0,.4);}
  .copy-btn{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.18);border:none;cursor:pointer;color:rgba(255,255,255,.7);padding:4px 5px;border-radius:4px;display:flex;align-items:center;z-index:2;transition:all .15s;line-height:1;box-shadow:0 1px 4px rgba(0,0,0,.5);}.copy-btn:hover{background:rgba(255,255,255,.38);color:#fff;}.copy-btn.copied{color:#33CC33;background:rgba(255,255,255,.25);}
  .card-top-tags{position:absolute;top:9px;right:46px;display:flex;gap:6px;align-items:center;z-index:1;flex-wrap:nowrap;}
  .tag{font-size:13px;padding:3px 10px;border-radius:var(--radius-pill);white-space:nowrap;line-height:1.55;font-weight:400;box-shadow:0 1px 4px rgba(0,0,0,.45),0 0 0 .5px rgba(0,0,0,.12);}.tag-fed{background:var(--federal-bg);color:var(--federal-text);}.tag-mi{background:var(--michigan-bg);color:var(--michigan-text);}.tag-local{background:var(--local-bg);color:var(--local-text);}.tag-now{background:var(--color-bg-danger);color:var(--color-text-danger);}.tag-months{background:var(--color-bg-warning);color:var(--color-text-warning);}.tag-year{background:var(--color-bg-neutral);color:var(--color-text-neutral);}.tag-stalled{background:rgba(51,204,51,.12);color:#33CC33;}
  .amend-tag{font-size:11px;padding:1px 6px;border-radius:8px;background:var(--color-bg-secondary);color:var(--color-text-secondary);margin-left:3px;border:.5px solid var(--color-border-light);display:inline-block;vertical-align:middle;}
  .bill-name{font-size:14px;font-weight:500;color:var(--color-text-primary);line-height:1.4;margin-bottom:.5rem;}.bill-desc{font-size:13px;color:var(--color-text-secondary);line-height:1.65;margin-bottom:.7rem;}
  .office-badge{display:flex;align-items:center;gap:4px;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-tertiary);font-family:var(--font-calibri);font-weight:600;margin-top:.5rem;}.office-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}.od-gov{background:var(--office-gov);}.od-mis{background:var(--office-mi-s);}.od-mih{background:var(--office-mi-h);}.od-com{background:var(--office-com);}.od-uss{background:var(--office-us-s);}.od-pres{background:var(--office-pres);}.od-mayor{background:var(--office-mayor);}.od-council{background:var(--office-council);}.od-county{background:var(--office-county);}
  .pipeline-section{margin-bottom:.75rem;}.pipeline-head{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-tertiary);margin-bottom:7px;font-weight:500;}.pipeline{display:flex;align-items:flex-start;overflow-x:auto;padding-bottom:2px;}.pipe-step{display:flex;flex-direction:column;align-items:center;flex:1;min-width:56px;position:relative;}.pipe-step:not(:last-child)::after{content:'';position:absolute;top:4px;left:calc(50% + 6px);right:calc(-50% + 6px);height:1.5px;background:var(--pipe-future);z-index:0;}.pipe-step.done:not(:last-child)::after{background:var(--pipe-done);}.pipe-dot{width:10px;height:10px;border-radius:50%;border:1.5px solid var(--pipe-future);background:var(--color-bg-primary);z-index:1;position:relative;flex-shrink:0;margin-bottom:5px;}.pipe-step.done .pipe-dot{background:var(--pipe-done);border-color:var(--pipe-done);}.pipe-step.curr .pipe-dot{background:var(--pipe-curr);border-color:var(--pipe-curr);box-shadow:0 0 0 3px rgba(24,95,165,.18);}.pipe-step.stalled .pipe-dot{background:var(--stalled-text);border-color:var(--stalled-text);}.pipe-label{font-size:9px;text-align:center;line-height:1.3;color:var(--pipe-future);max-width:62px;word-break:break-word;}.pipe-step.done .pipe-label{color:var(--color-text-tertiary);}.pipe-step.curr .pipe-label{color:var(--pipe-curr);font-weight:600;font-size:10px;}.pipe-step.stalled .pipe-label{color:var(--stalled-text);font-weight:600;font-size:10px;}.pipe-date{font-size:8px;margin-top:2px;font-weight:700;color:var(--pipe-done);text-align:center;white-space:nowrap;}.pipe-step.curr .pipe-date{color:var(--pipe-curr);}.pipe-step.future .pipe-date{color:var(--pipe-future);}.stage-note{font-size:11px;color:var(--color-text-tertiary);margin-top:5px;font-style:italic;}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:12px;margin-bottom:.75rem;}.meta-grid .lbl{color:var(--color-text-tertiary);font-size:11px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;}.meta-grid .val{color:var(--color-text-secondary);line-height:1.5;}.full-width{grid-column:1/-1;}
  .deciding-divider{display:flex;align-items:center;gap:8px;margin:.85rem 0 .55rem;}.deciding-divider::before,.deciding-divider::after{content:'';flex:1;height:.5px;background:var(--color-border-light);}.deciding-divider span{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-tertiary);white-space:nowrap;font-weight:500;}
  .decision-item{padding:5px 0 5px 14px;font-size:12px;color:var(--color-text-secondary);position:relative;line-height:1.55;border-bottom:.5px solid var(--color-border-light);}.decision-item:last-child{border-bottom:none;}.decision-item::before{content:'\\2192';position:absolute;left:0;color:var(--color-text-tertiary);font-size:11px;top:6px;}.decision-label{font-weight:500;color:var(--color-text-primary);}
  .empty{font-size:13px;color:var(--color-text-tertiary);padding:1.5rem 0;text-align:center;}
</style>
</head>
<body>
<div class="page-header">
  <div class="page-header-row">
    <div>
      <div class="page-title">${stateName} Legislation Tracker</div>
      <div class="page-subtitle">Federal, ${stateName} state &amp; local ordinances &middot; Downloaded ${dateStr}</div>
    </div>
    <div class="search-wrap">
      <input type="search" id="searchInput" class="search-input" placeholder="Search bills…" autocomplete="off" />
    </div>
  </div>
</div>
<div class="filter-groups" id="filterGroups">
  <div class="filter-group"><span class="fg-label">Level</span><div class="chips"><button class="chip active" data-group="level" data-f="all">All</button><button class="chip" data-group="level" data-f="federal">🇺🇸 Federal</button><button class="chip" data-group="level" data-f="state">${stateName} State</button><button class="chip" data-group="level" data-f="local">📍 Local</button></div></div>
  <div class="filter-group filter-group-city"><span class="fg-label fg-indent">↳ City</span><div class="chips"><button class="chip active" data-group="city" data-f="all">All cities</button><button class="chip" data-group="city" data-f="Detroit">Detroit</button><button class="chip" data-group="city" data-f="Ann Arbor">Ann Arbor</button><button class="chip" data-group="city" data-f="Grand Rapids">Grand Rapids</button><button class="chip" data-group="city" data-f="Lansing">Lansing</button><button class="chip" data-group="city" data-f="Flint">Flint</button><button class="chip" data-group="city" data-f="Kalamazoo">Kalamazoo</button><button class="chip" data-group="city" data-f="Kent County">Kent County</button></div></div>
  <div class="filter-group"><span class="fg-label">Timing</span><div class="chips"><button class="chip active" data-group="timing" data-f="all">All</button><button class="chip" data-group="timing" data-f="urgent">Act now</button><button class="chip" data-group="timing" data-f="months">Months</button><button class="chip" data-group="timing" data-f="session">Session</button><button class="chip" data-group="timing" data-f="stalled">Stalled</button></div></div>
  <div class="filter-group"><span class="fg-label">Constitutional impact</span><div class="chips"><button class="chip active" data-group="impact" data-f="all">All</button><button class="chip" data-group="impact" data-f="4th">4th Amendment</button><button class="chip" data-group="impact" data-f="1st">1st Amendment</button><button class="chip" data-group="impact" data-f="due">Due process / 14th</button></div></div>
  <div class="filter-group"><span class="fg-label">Main issue</span><div class="chips"><button class="chip active" data-group="issue" data-f="all">All</button><button class="chip" data-group="issue" data-f="surveillance">Surveillance &amp; privacy</button><button class="chip" data-group="issue" data-f="voting">Voting rights</button><button class="chip" data-group="issue" data-f="immigration">Immigration</button><button class="chip" data-group="issue" data-f="technology">Technology &amp; AI</button><button class="chip" data-group="issue" data-f="policing">Policing &amp; justice</button><button class="chip" data-group="issue" data-f="speech">Press &amp; speech</button><button class="chip" data-group="issue" data-f="education">Education</button><button class="chip" data-group="issue" data-f="environment">Environment</button><button class="chip" data-group="issue" data-f="labor">Labor &amp; wages</button><button class="chip" data-group="issue" data-f="healthcare">Healthcare</button><button class="chip" data-group="issue" data-f="housing">Housing</button></div></div>
  <div class="filter-group"><span class="fg-label">Policy direction</span><div class="chips"><button class="chip active" data-group="policy" data-f="all">All</button><button class="chip" data-group="policy" data-f="liberal"><span class="chip-dot"></span>Liberal</button><button class="chip" data-group="policy" data-f="center"><span class="chip-dot"></span>Center / mixed</button><button class="chip" data-group="policy" data-f="conservative"><span class="chip-dot"></span>Conservative</button></div></div>
  <div class="filter-group"><span class="fg-label">Currently with</span><div class="chips"><button class="chip active" data-group="office" data-f="all">All</button><button class="chip" data-group="office" data-f="governor"><span class="chip-dot"></span>Governor Whitmer</button><button class="chip" data-group="office" data-f="mi-senate"><span class="chip-dot"></span>Michigan Senate</button><button class="chip" data-group="office" data-f="mi-house"><span class="chip-dot"></span>Michigan House</button><button class="chip" data-group="office" data-f="committee"><span class="chip-dot"></span>In Committee</button><button class="chip" data-group="office" data-f="us-senate"><span class="chip-dot"></span>U.S. Senate</button><button class="chip" data-group="office" data-f="mayor"><span class="chip-dot"></span>With Mayor / Exec</button><button class="chip" data-group="office" data-f="city-council"><span class="chip-dot"></span>City Council</button><button class="chip" data-group="office" data-f="county-board"><span class="chip-dot"></span>County Board</button></div></div>
</div>
<div class="count" id="count"></div>
<div id="bills"></div>
<script>
${STAGES_JS}
const bills = ${billsJson};
const active = {level:'all',timing:'all',impact:'all',issue:'all',policy:'all',office:'all',city:'all',search:''};
function policyBarStyle(b){if(b>=38&&b<=62)return'background:#6600CC';return'background:linear-gradient(to right,var(--bar-lib) '+b+'%,var(--bar-con) '+b+'%)';}
function policyCategory(b){if(b>=63)return'liberal';if(b<=37)return'conservative';return'center';}
function renderPipeline(bill){var stages=bill.level==='federal'?FEDERAL_STAGES:bill.level==='local'?LOCAL_STAGES:MICHIGAN_STAGES;var isStalled=bill.urgency==='stalled';var dates=bill.stageDates||[];var dots=stages.map(function(label,i){var cls='pipe-step';if(i<bill.stage)cls+=' done';if(i===bill.stage&&!isStalled)cls+=' curr';if(i===bill.stage&&isStalled)cls+=' stalled';var dateHtml=dates[i]?'<div class="pipe-date">'+dates[i]+'</div>':'';return'<div class="'+cls+'"><div class="pipe-dot"></div><div class="pipe-label">'+label+dateHtml+'</div></div>';}).join('');return'<div class="pipeline-section"><div class="pipeline-head">Legislative path</div><div class="pipeline">'+dots+'</div><div class="stage-note">'+bill.stageNote+'</div></div>';}
function matches(b){if(active.search){var q=active.search.toLowerCase();var hay=(b.name+' '+b.desc+' '+(b.municipality||'')).toLowerCase();if(hay.indexOf(q)===-1)return false;}if(active.level!=='all'&&b.level!==active.level)return false;if(active.city!=='all'&&b.level==='local'&&b.municipality!==active.city)return false;var timingVal=active.timing==='session'?'year':active.timing;if(active.timing!=='all'&&b.urgency!==timingVal)return false;if(active.impact!=='all'){var f=active.impact;if(f==='4th'&&b.amend.indexOf('4th')===-1)return false;if(f==='1st'&&b.amend.indexOf('1st')===-1)return false;if(f==='due'&&b.amend.indexOf('due')===-1&&b.amend.indexOf('14th')===-1)return false;}if(active.issue!=='all'&&b.issues.indexOf(active.issue)===-1)return false;if(active.policy!=='all'&&policyCategory(b.policyBias)!==active.policy)return false;if(active.office!=='all'&&b.ratifyOffice!==active.office)return false;return true;}
async function copyCard(id,btn){var b=bills.find(function(x){return x.id===id;});if(!b)return;var divider='—'.repeat(55);var offMeta=OFFICE_META[b.ratifyOffice]||{label:b.ratifyOffice};var lines=[b.name,divider,b.desc,'','LEGISLATIVE STATUS',b.stageNote,'','PUBLIC INFLUENCE WINDOW',b.window,'','INTRODUCED BY',b.introduced,'','KEY SUPPORTERS',b.supporters,'','KEY BLOCKERS',b.blockers,'','WHAT IS BEING DECIDED'].concat(b.decisions.map(function(d){return'  → '+d.label+' — '+d.text;})).concat(['',divider,'Level: '+b.level+(b.municipality?' ('+b.municipality+')':'')+'  | Timing: '+b.urgency+' | Currently with: '+offMeta.label]);try{await navigator.clipboard.writeText(lines.join('\\n'));btn.classList.add('copied');btn.title='Copied!';setTimeout(function(){btn.classList.remove('copied');btn.title='Copy card to clipboard';},1400);}catch(e){btn.title='Copy failed';}}
var container=document.getElementById('bills');var countEl=document.getElementById('count');
function render(){var filtered=bills.filter(matches);countEl.textContent=filtered.length+' item'+(filtered.length!==1?'s':'')+' shown';if(!filtered.length){container.innerHTML='<div class="empty">No bills match these filters.</div>';return;}container.innerHTML=filtered.map(function(b){var lvlTag=b.level==='federal'?'<span class="tag tag-fed">🇺🇸 Federal</span>':b.level==='local'?'<span class="tag tag-local">📍 '+b.municipality+'</span>':'<span class="tag tag-mi">${stateName}</span>';var urgTag=b.urgency==='urgent'?'<span class="tag tag-now">Act now</span>':b.urgency==='months'?'<span class="tag tag-months">Months</span>':b.urgency==='stalled'?'<span class="tag tag-stalled">Stalled</span>':'<span class="tag tag-year">Session</span>';var amendBadges=b.amend.map(function(a){return'<span class="amend-tag">'+a+'</span>';}).join('');var decisionsHtml=b.decisions.map(function(d){return'<div class="decision-item"><span class="decision-label">'+d.label+'</span> — '+d.text+'</div>';}).join('');var offMeta=OFFICE_META[b.ratifyOffice]||{label:b.ratifyOffice,dotCls:'od-com'};return'<div class="bill"><div class="policy-bar" style="'+policyBarStyle(b.policyBias)+'"><span class="policy-bar-label">Policy direction</span></div><div class="card-top-tags">'+lvlTag+urgTag+'</div><button class="copy-btn" onclick="copyCard('+b.id+',this)" title="Copy card to clipboard"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button><div class="bill-name">'+b.name+amendBadges+'</div><div class="bill-desc">'+b.desc+'</div>'+renderPipeline(b)+'<div class="meta-grid"><div><div class="lbl">Public influence window</div><div class="val">'+b.window+'</div></div><div><div class="lbl">Introduced by</div><div class="val">'+b.introduced+'</div></div><div><div class="lbl">Key supporters</div><div class="val">'+b.supporters+'</div></div><div class="full-width"><div class="lbl">Key blockers</div><div class="val">'+b.blockers+'</div></div></div><div class="deciding-divider"><span>What is being decided</span></div><div class="decisions">'+decisionsHtml+'</div><div class="office-badge"><div class="office-dot '+offMeta.dotCls+'"></div>'+offMeta.label+'</div></div>';}).join('');}
document.getElementById('searchInput').addEventListener('input',function(){active.search=this.value.trim();render();});
document.getElementById('filterGroups').addEventListener('click',function(e){var chip=e.target.closest('[data-group]');if(!chip)return;var group=chip.dataset.group;var val=chip.dataset.f;active[group]=val;document.querySelectorAll('[data-group="'+group+'"]').forEach(function(c){c.classList.toggle('active',c.dataset.f===val);});render();});
render();
</script>
</body>
</html>`
}
