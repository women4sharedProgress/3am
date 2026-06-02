/**
 * Seed Kansas bills into Supabase.
 * Usage:
 *   node --env-file=.env supabase/seed-ks.mjs
 *
 * IDs start at 101 to leave room for future MI/US bills (current max: 46).
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
)

const bills = [

{
  id:101, state:'KS', level:'state', municipality:null,
  amend:['due','14th'], urgency:'urgent', policy_bias:18, issues:['healthcare'], ratify_office:'governor',
  stage_dates:['2025-01','2025-01','2025-02','2025-02','2025-02-20'], stage:5,
  stage_note:'ENACTED via veto override February 20, 2025. Currently blocked by a temporary injunction issued May 16, 2026 by Douglas County District Court — families may still access care while litigation continues. AG Kobach has vowed to appeal.',
  name:'SB 63 — Help Not Harm Act (Gender-Affirming Care Ban)',
  bill_desc:"Kansas banned all gender-affirming medical care — including puberty blockers and hormone therapy — for anyone under 18. The Republican-controlled legislature overrode Governor Kelly's veto in February 2025. Providers who perform the care risk losing their medical licenses, and anyone who received care can sue their doctor. A state judge blocked the law in May 2026, finding it likely violates the Kansas Constitution — so families can still access care while the case is in court.",
  introduced:'Sen. Renee Erickson (R); Senate Committee on Public Health and Welfare',
  supporters:'Republican supermajority; Attorney General Kris Kobach (defending the law in court)',
  blockers:'Governor Laura Kelly (vetoed February 11, override February 18); ACLU of Kansas (filed suit); Douglas County District Court Judge Carl Folsom (issued temporary injunction May 16, 2026)',
  influence_window:'Active litigation — the temporary injunction must survive AG Kobach\'s appeal to remain in effect. The Kansas Supreme Court may ultimately decide whether the law violates the state constitution. Contact your state legislators about the appeal and what bills might follow.',
  decisions:[
    {label:'If the injunction survives appeal', text:'Transgender minors in Kansas can continue accessing hormone therapy and puberty blockers while the constitutional case is heard. Providers remain protected from prosecution and licensing consequences. The law stays on the books but unenforceable.'},
    {label:'If Kobach wins the appeal and the injunction is lifted', text:'The ban takes effect immediately. Families would have to travel out of state for care — often to Colorado, Illinois, or California. Kansas providers would face license revocation and civil lawsuits if they continue treating patients.'},
    {label:'If the Kansas Supreme Court strikes the law on constitutional grounds', text:'The law is invalidated permanently. Kansas would join a small group of states where courts found gender-affirming care bans unconstitutional under state law. The legislature would need to pass a constitutional amendment to reinstate any ban.'},
  ],
},

{
  id:102, state:'KS', level:'state', municipality:null,
  amend:['1st','4th'], urgency:'urgent', policy_bias:16, issues:['immigration','policing','speech'], ratify_office:'governor',
  stage_dates:['2026-01','2026-02','2026-03','2026-04','2026-04-10'], stage:5,
  stage_note:'ENACTED via veto override April 10, 2026. Original HB 2372 was gut-and-replaced by Senate with contents of SB 525. Kansas Press Association and First Amendment attorneys have flagged the 25-foot zone provision as unconstitutional. No court challenge filed as of May 2026.',
  name:'S Sub HB 2372 — ICE Cooperation & HALO Act (25-Foot Officer Zone)',
  bill_desc:"This law has two major parts. The first lets county sheriffs partner directly with federal immigration enforcement (ICE) and hold people in jail on civil immigration holds — without a court warrant. The second part, called the HALO Act, makes it a crime punishable by up to six months in jail to come within 25 feet of any officer, firefighter, or paramedic who has told you to back away, even if you are a journalist documenting police activity. Press freedom groups and civil liberties lawyers say the 25-foot rule unconstitutionally restricts public oversight of law enforcement.",
  introduced:'Rep. Tom Kessler (R-Wichita); Senate Committee on Federal and State Affairs; gut-and-replace of HB 2372',
  supporters:'Republican supermajority; ICE/DHS; law enforcement lobbies; Attorney General Kris Kobach',
  blockers:'Governor Laura Kelly (vetoed); ACLU of Kansas; Kansas Press Association; immigrant communities; First Amendment attorneys',
  influence_window:'No injunction yet. Journalists and civil liberties groups are evaluating a 1st Amendment challenge to the 25-foot provision. Community organizations in counties with large immigrant populations are monitoring whether sheriffs enter into ICE 287(g) agreements. Contact your county sheriff\'s office about local enforcement decisions.',
  decisions:[
    {label:'If a court strikes the 25-foot HALO provision', text:'Journalists and bystanders regain the legal right to film and observe police activity from any distance. The ICE-cooperation provisions of the law remain in effect even if the HALO section is severed.'},
    {label:'If the law stands unchallenged', text:'Kansas journalists documenting police face arrest for standing too close. County jails can detain people for ICE without a judge approving the hold — increasing risk of wrongful detention of U.S. citizens and legal residents who share names or characteristics with immigration suspects.'},
    {label:'If county sheriffs opt into 287(g) ICE partnerships', text:'Local jail beds are used for federal immigration enforcement. Undocumented immigrants who have minor local violations — traffic stops, petty offenses — can be turned over to ICE without the local government having a vote in the decision. Taxpayers bear the cost of housing federal detainees.'},
  ],
},

{
  id:103, state:'KS', level:'state', municipality:null,
  amend:['due'], urgency:'urgent', policy_bias:22, issues:['voting'], ratify_office:'governor',
  stage_dates:['2026-01','2026-02','2026-03','2026-04','2026-04-09'], stage:5,
  stage_note:'ENACTED via veto override April 9, 2026. ACLU has raised concerns about data-matching errors affecting naturalized citizens. No injunction filed as of May 2026. Bi-annual voter roll checks against the federal SAVE database begin immediately.',
  name:'HB 2437 — SAVE Kansas Act (Voter Roll Database Purges)',
  bill_desc:"Kansas will now check its voter rolls against a federal immigration database twice a year, looking for people who may not be citizens. Anyone flagged as a potential non-citizen will be notified and removed from the rolls if they don't send in proof of citizenship. A nearly identical Kansas program in the past wrongly identified nearly 1,000 legitimate voters as potential non-citizens because people had similar names. The law also adds new restrictions on community voter registration drives and requires all online voter registration to go through government-approved websites.",
  introduced:'Rep. Pat Proctor (R), House Elections Committee chair',
  supporters:'Republican supermajority; Kansas Secretary of State; DHS SAVE database administrators',
  blockers:'Governor Laura Kelly (vetoed April 8); ACLU of Kansas; League of Women Voters; voting rights organizations',
  influence_window:'The ACLU is evaluating a legal challenge based on inadequate due-process protections before voters are removed. Naturalized citizens and people with names matching non-citizen database entries are at highest risk. Contact the Kansas Secretary of State\'s office to verify your registration status if you have received a notice.',
  decisions:[
    {label:'If courts enjoin the law on due process grounds', text:'The bi-annual purge process is paused until adequate protections are in place. Voters who were already wrongly removed must be restored. The core data-matching approach may be allowed to continue with stronger notification requirements.'},
    {label:'If the law operates as enacted', text:'Naturalized citizens, people with common names shared with non-citizens, and low-income voters who interact with federal benefit systems face elevated risk of being wrongly removed. A voter purged in error may not discover it until they show up to vote.'},
    {label:'If restrictions on registration drives survive', text:'Community-based voter registration organizations — which primarily register voters in low-income and minority communities — face new compliance burdens that reduce their ability to operate. Registration rates in underserved areas may fall.'},
  ],
},

{
  id:104, state:'KS', level:'state', municipality:null,
  amend:[], urgency:'stalled', policy_bias:20, issues:['immigration','education'], ratify_office:'governor',
  stage_dates:['2026-01','2026-01','2026-03','2026-03',null], stage:3,
  stage_note:'VETOED by Governor Kelly April 6, 2026. Override failed — House reached 78 votes (needed 84), Senate reached 22 votes (needed 27). The 2004 Kansas Dream Act remains in effect. Sponsors have indicated they will try again in the 2027 session.',
  name:'SB 254 — Repeal In-State Tuition for Immigrant Students',
  bill_desc:"This bill would have ended a 2004 Kansas law that lets students who graduated from Kansas high schools pay in-state college tuition regardless of their immigration status. It also would have cut off undocumented immigrants from all state and local public benefits. Governor Kelly vetoed it, and the legislature\'s override fell short — by six votes in the Senate. About 600 to 800 students who grew up in Kansas can still attend state colleges at resident tuition rates for now, but the bill\'s supporters say they will try again in 2027.",
  introduced:'Senate leadership; Senate Committee on Federal and State Affairs; AG Kris Kobach (claimed existing law violated federal statute)',
  supporters:'Republican majority; Attorney General Kobach; immigration-restriction advocacy groups',
  blockers:'Governor Laura Kelly (vetoed); Kansas Board of Regents; colleges and universities; student organizations; ACLU; immigrant advocacy groups',
  influence_window:'Dead for the 2026 session. Sponsors plan to reintroduce in 2027. If Republicans gain seats in the November 2026 elections that push them past a two-thirds supermajority, a future override becomes more likely. Advocacy and testimony from Kansas students who benefited from the 2004 law moved votes in the 2026 session.',
  decisions:[
    {label:'If a future legislature passes the bill with a larger majority', text:'Students who grew up entirely in Kansas would face out-of-state tuition rates three to four times higher — effectively ending college access for most. Kansas colleges and universities anticipate significant enrollment drops in western Kansas communities where immigrant students make up a larger share.'},
    {label:'If the 2004 law survives through multiple future sessions', text:'Kansas continues to offer one of only a handful of state-level college access policies for undocumented students. Graduates of Kansas high schools can attend state colleges and become part of the Kansas workforce regardless of federal immigration status.'},
    {label:'If Attorney General Kobach pursues enforcement without legislation', text:'Legal uncertainty for both students and university admissions offices. Kansas higher education institutions would likely challenge Kobach in court, and the 2004 law was passed precisely to comply with a federal statutory framework — making an AG enforcement theory legally difficult.'},
  ],
},

{
  id:105, state:'KS', level:'state', municipality:null,
  amend:[], urgency:'urgent', policy_bias:28, issues:['healthcare','labor'], ratify_office:'governor',
  stage_dates:['2026-01','2026-02','2026-03','2026-04','2026-04-09'], stage:5,
  stage_note:'ENACTED via veto override April 2026. Takes effect July 1, 2026. KDHE must begin cross-checking Medicaid and SNAP rolls against death, wage, incarceration, and gambling-winnings databases. Governor cited $4M added cost and risk of wrongful terminations in her veto message.',
  name:'HB 2731 — Medicaid and SNAP Benefits Verification Act',
  bill_desc:"Starting July 1, 2026, Kansas will cross-check every Medicaid and food assistance application against state databases covering deaths, wages, incarceration, and gambling winnings. Governor Kelly vetoed the bill, warning it would cost $4 million extra to administer and would wrongly cut off eligible families when data records have errors. The legislature overrode her veto. The law also raises the work requirement age for food stamps from 49 to 64. One positive piece: it directs the state to seek a federal waiver to provide continuous Medicaid coverage for Kansans with permanent intellectual and developmental disabilities.",
  introduced:'Senate Committee on Welfare Reform; House Committee on Welfare Reform; core content from SB 363',
  supporters:'Republican supermajority; conservative policy organizations; work-requirement advocates',
  blockers:'Governor Laura Kelly; Kansas Action for Children; Kansas Health Institute; disability advocates',
  influence_window:'Takes effect July 1, 2026. Kansas health advocacy organizations are monitoring for wrongful Medicaid terminations beginning in summer 2026. If you receive a Medicaid or SNAP termination notice after July 1, you have the right to appeal and request a fair hearing before benefits end.',
  decisions:[
    {label:'If database mismatches cause wrongful terminations', text:'Eligible low-income families, seniors, and people with disabilities lose health coverage or food assistance due to data errors. Health advocates expect a surge in wrongful termination appeals beginning late 2026. The state bears legal exposure if terminated individuals experience preventable health crises.'},
    {label:'If the IDD continuous-coverage waiver is approved by CMS', text:'Kansans with permanent intellectual and developmental disabilities no longer fall off Medicaid during periodic renewals — one of the most disruptive outcomes of the current system. This is the most clearly positive provision in the bill.'},
    {label:'If the work-requirement age raise and database checks reduce enrollment as intended', text:'Kansas reduces its Medicaid and SNAP rolls by an estimated several thousand recipients. State savings depend on whether removed recipients were genuinely ineligible — if they were eligible but wrongly removed, the state faces federal audit risk and legal challenges.'},
  ],
},

{
  id:106, state:'KS', level:'state', municipality:null,
  amend:['1st'], urgency:'urgent', policy_bias:16, issues:['speech','education'], ratify_office:'governor',
  stage_dates:['2026-03','2026-03','2026-03','2026-04','2026-04-11'], stage:5,
  stage_note:'ENACTED via veto override April 11, 2026. Embedded in the state budget (SB 315). The provision was explicitly motivated by students walking out over ICE deportations. School districts now face fines equal to one day of superintendent salary per walkout day if they fail to suppress or document the protest.',
  name:'SB 315 (Budget) — Student Protest Penalty',
  bill_desc:"Buried inside the Kansas state budget, this provision punishes school districts whenever students walk out. Schools must get written parent permission for any student who leaves, apply full attendance and discipline rules, and ensure no school staff encourages or helps organize the protest. If a district fails, it is fined one full day of the superintendent\'s salary for every day the walkout continues. The fines go to the state. Republican lawmakers were directly responding to student protests against ICE immigration raids. First Amendment lawyers say students have a constitutional right to protest political issues under a 1969 Supreme Court decision.",
  introduced:'Sen. Mike Murphy (R-Sylvia); passed Senate 21-18; inserted into state budget',
  supporters:'Republican majority; groups opposed to student anti-ICE walkouts',
  blockers:'Governor Laura Kelly (vetoed); First Amendment attorneys; teachers unions; student groups; Kansas Reflector; ACLU',
  influence_window:'Law is in effect. School administrators now face strong financial pressure to suppress student protests. ACLU and First Amendment advocates are evaluating a legal challenge based on Tinker v. Des Moines (1969), which held that students retain free speech rights on matters of public concern. If your district receives a fine or disciplines students for protest, contact the ACLU of Kansas.',
  decisions:[
    {label:'If the provision is successfully challenged under Tinker v. Des Moines', text:'The student protest penalty is struck as an unconstitutional content-based restriction on political speech. The fact that it was explicitly motivated by anti-ICE protests — a specific political viewpoint — makes it especially vulnerable to a First Amendment challenge.'},
    {label:'If the law stands unchallenged', text:'School administrators across Kansas face strong financial incentive to prevent and punish any student political protest. Students who participate in walkouts face discipline records that could affect college applications. The legislature has used the budget process to target a specific political viewpoint.'},
    {label:'If future walkouts trigger the fine mechanism', text:'School districts must weigh the cost of fines against the First Amendment rights of their students. Districts that do not aggressively suppress walkouts could owe the state thousands of dollars per day of superintendent salary, creating an incentive structure that schools cannot easily resist.'},
  ],
},

{
  id:107, state:'KS', level:'state', municipality:null,
  amend:[], urgency:'months', policy_bias:52, issues:['education','technology'], ratify_office:'governor',
  stage_dates:['2026-01','2026-02','2026-02','2026-03','2026-03-19'], stage:5,
  stage_note:'SIGNED by Governor Kelly March 19, 2026. Takes effect fall 2026. Kansas joins 32+ states with school phone bans. Passed with overwhelming bipartisan support — House 84-39, Senate 32-4.',
  name:'Sub HB 2299 — Bell-to-Bell Cell Phone Ban in Schools',
  bill_desc:"Starting fall 2026, all Kansas public and accredited private school students must turn off their phones and keep them put away from the first bell to the last bell — including lunch and passing periods. Students with disabilities who need their phones for medical or learning reasons are exempt. Teachers and school employees also cannot use social media to communicate with students or require students to create social media accounts for class assignments or extracurricular activities. The law passed with overwhelming bipartisan support — 84-39 in the House and 32-4 in the Senate — and was signed by Governor Kelly.",
  introduced:'House (bipartisan); Senate companion',
  supporters:'Governor Kelly; Republican and Democratic majorities; parent groups; mental health advocates',
  blockers:'Some civil liberties advocates (student autonomy concerns); some parent groups; disability advocates (resolved via IEP/504 exception)',
  influence_window:'Takes effect fall 2026. Districts are developing storage solutions and updating student handbooks. Schools with tight budgets may face costs for compliant phone storage. Families should check with their school districts about implementation plans before the school year begins.',
  decisions:[
    {label:'If implemented consistently and equitably', text:'Research from states and countries with phone bans shows reduced student anxiety, improved focus, and fewer discipline incidents. Equity concerns remain if wealthier districts invest in better storage solutions than under-resourced schools.'},
    {label:'If students or parents challenge on free expression or privacy grounds', text:'Legal challenge is unlikely to succeed — courts have consistently held that schools have broad authority over student conduct during school hours. The law\'s disability exceptions also address the strongest procedural objections.'},
    {label:'If enforcement is inconsistent across districts', text:'Urban and suburban districts with more resources may comply fully, while rural districts with fewer staff members struggle. Students in under-resourced districts may experience more confiscations and discipline while wealthy districts provide compliant storage.'},
  ],
},

{
  id:108, state:'KS', level:'state', municipality:null,
  amend:['due'], urgency:'urgent', policy_bias:15, issues:['healthcare'], ratify_office:'governor',
  stage_dates:['2026-01','2026-02','2026-03','2026-04','2026-04-09'], stage:5,
  stage_note:'ENACTED via veto override April 9, 2026. HB 2729 requires state-mandated informed consent forms including the scientifically disputed "abortion pill reversal" claim. HB 2727 creates a low-cost litigation pathway for suing abortion providers — capped at $5,000 plus attorney fees to bypass the medical malpractice review board.',
  name:'HB 2729 / HB 2727 — Abortion Informed Consent & Provider Liability',
  bill_desc:"Kansas enacted two abortion laws through veto overrides in April 2026. The first requires abortion providers to give patients a state-issued consent form that includes the unproven claim that medication abortions can be reversed — a claim rejected by the American College of Obstetricians and Gynecologists and other major medical organizations. The second creates a fast-track legal process for suing abortion providers that is cheaper and easier than a standard malpractice claim. Abortion-rights advocates say the combination is designed to drown clinics in low-cost lawsuits that are difficult to defend against even when the claims have no merit.",
  introduced:'Republican House leadership; Senate Committee on Public Health and Welfare',
  supporters:'Republican supermajority; anti-abortion organizations; Attorney General Kobach',
  blockers:'Governor Laura Kelly (vetoed both April 7-8); abortion providers; American College of OB/GYN; ACLU; Planned Parenthood',
  influence_window:'Both laws are in effect. Abortion providers must now include the "abortion pill reversal" language in state-mandated forms or face liability. Legal challenges are expected. Kansas voters rejected a constitutional amendment to restrict abortion rights in 2022 — advocates say that same constitutional protection may be used to challenge these laws.',
  decisions:[
    {label:'If providers challenge the false-information requirement under the Kansas Constitution', text:'Courts in other states have struck similar "abortion reversal" mandates as requiring providers to deliver scientifically false information in violation of medical ethics and patient rights. Kansas\'s 2022 referendum result affirming abortion rights as a state constitutional protection strengthens this challenge.'},
    {label:'If HB 2727\'s low-cost litigation pathway is used aggressively by opponents', text:'Clinics face repeated $5,000 lawsuits that individually are too small to defend cost-effectively but collectively threaten viability. Even one or two Kansas abortion clinics closing would leave large areas of the state without in-state access to services.'},
    {label:'If both laws survive court challenges', text:'Kansas abortion providers must use state-approved forms with disputed medical claims. Any provider who deviates faces malpractice-style lawsuits under a lower evidentiary standard. This dynamic has led to clinic closures in other states with similar laws.'},
  ],
},

{
  id:109, state:'KS', level:'state', municipality:null,
  amend:[], urgency:'stalled', policy_bias:78, issues:['labor'], ratify_office:'committee',
  stage_dates:['2025-01-29',null,null,null,null], stage:1,
  stage_note:'Referred to House Committee on Commerce, Labor and Economic Development January 29, 2025. Never received a hearing. Legislature adjourned sine die April 2026. Companion bill SB 471 ($16/hour) also died in committee. Likely to be reintroduced in 2027.',
  name:'HB 2151 — Minimum Wage Increase to $15/Hour',
  bill_desc:"Kansas pays workers the federal minimum wage of $7.25 per hour — the lowest legal rate and one of the lowest effective wages among U.S. states. This bill would have raised that floor to $15 per hour. Democrats introduced it in January 2025 with 22 co-sponsors, but the Republican-controlled House committee never scheduled a hearing, and the bill died when the legislature adjourned in April 2026. Workers across the state line in Kansas City, Missouri earn a higher minimum wage than Kansas law requires.",
  introduced:'22 Democratic House members led by minority caucus; companion SB 471 by Sen. Cindy Holscher (D)',
  supporters:'Labor unions; progressive advocacy groups; low-wage workers; service industry employees',
  blockers:'Republican committee leadership (never scheduled a hearing); Kansas Chamber of Commerce; small business lobbies',
  influence_window:'Dead for the 2026 session. Will likely be reintroduced in 2027. With Republicans holding an 88-37 House majority, no path to passage exists without bipartisan support or a significant change in the legislature\'s composition. Federal minimum wage legislation would automatically raise Kansas workers\' pay without requiring state action.',
  decisions:[
    {label:'If a federal minimum wage increase passes Congress', text:'Kansas workers are automatically lifted to the federal floor without needing state legislation. This is currently the only realistic near-term path to a wage increase for most Kansas minimum-wage workers.'},
    {label:'If the bill is reintroduced and eventually passes', text:'Approximately 200,000 Kansas workers receive a raise. Economic research is mixed on employment effects — most studies find minimal job loss at moderate increases, but Kansas\'s rural economy has characteristics that could produce different outcomes than the national average.'},
    {label:'If wages remain at $7.25 indefinitely', text:'Kansas continues to lose workers to neighboring states with higher wages. The wage gap between Kansas City, Missouri and Kansas City, Kansas — two cities separated by a state line — will continue to grow, affecting where employers recruit and where workers choose to live.'},
  ],
},

{
  id:110, state:'KS', level:'state', municipality:null,
  amend:[], urgency:'year', policy_bias:52, issues:['environment'], ratify_office:'governor',
  stage_dates:['2025-01','2025-05','2025-06','2025-07','2025-07-12'], stage:5,
  stage_note:'SIGNED by Governor Kelly July 12, 2025. Preliminary report submitted January 31, 2026. Final funding recommendations due to legislature January 31, 2027. Task force meets quarterly; work groups are active.',
  name:'HB 2172 — Kansas Water Program Task Force',
  bill_desc:"Kansas faces a slow-moving water crisis: the Ogallala Aquifer that supplies farms and cities across western Kansas has been dropping by about a foot per year for decades and could run critically low within a generation. This bipartisan law creates a 13-person task force to design a long-term dedicated funding program for Kansas water infrastructure — similar to how the state funds roads and highways. The task force includes farmers, water utilities, conservationists, and local government officials. Its funding recommendations are due to the legislature by January 31, 2027.",
  introduced:'Bipartisan; co-chaired by Sen. Kenny Titus (R) and Rep. Jim Minnix (R); signed at bipartisan ceremony',
  supporters:'Governor Laura Kelly; bipartisan legislative leadership; agriculture; water utilities; environmental conservation groups; municipal water systems',
  blockers:'No significant organized opposition during 2025 session',
  influence_window:'Task force final recommendations are due January 31, 2027. The 2027 legislative session will decide whether to fund the recommendations. This is the key moment — the legislature has a history of creating task forces and then not funding their recommendations. Public pressure before the 2027 session is the highest-leverage action.',
  decisions:[
    {label:'If the legislature funds the task force recommendations in 2027', text:'Kansas establishes a stable, dedicated revenue stream for water infrastructure — the first time the state has treated water like roads and invested in it systematically. Western Kansas agricultural communities get a realistic roadmap for Ogallala management over the next 50 years.'},
    {label:'If the legislature rejects or ignores the funding recommendations', text:'Kansas continues to address water challenges one crisis at a time. Ogallala depletion continues at roughly one foot per year. Western Kansas farming communities face an uncertain future without a funded conservation and infrastructure plan.'},
    {label:'If federal infrastructure funding is available to leverage state investment', text:'Federal dollars from infrastructure bills or USDA programs could be matched with state water funds, potentially doubling the impact of whatever amount the legislature appropriates. This leverage argument may be the strongest case for action in the 2027 session.'},
  ],
},

]

const { error } = await supabase
  .from('bills')
  .upsert(bills, { onConflict: 'id' })

if (error) {
  console.error('Seed error:', error)
  process.exit(1)
} else {
  console.log(`Seeded ${bills.length} Kansas bills successfully.`)
}
