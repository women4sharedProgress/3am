-- Fix bill_desc reading level: target 8th-10th grade.
-- Removes unexplained jargon, simplifies legislative process language.

-- id=1 FISA: remove insider Congressional procedure jargon
update bills set bill_desc =
'The government collects foreign targets'' messages abroad — but those dragnets also scoop up thousands of Americans'' texts, emails, and calls each year. The FBI ran 7,413 warrantless searches of American data in 2025 alone, a 35% jump in one year. Congress extended the law twice with short-term patches after failing to agree on longer reforms — once for 10 days, then for 45 days. The fight over whether to add real privacy protections or simply renew the law as-is continues when Congress returns.'
where id = 1;

-- id=22 Anti-SLAPP: replace "automatically stays all discovery" and "special motion to dismiss"
update bills set bill_desc =
'SLAPP suits — Strategic Lawsuits Against Public Participation — are designed not to win in court, but to drain the money and time of critics until they give up. Michigan had no protection against them until December 2025. The new law (Public Act 52) lets defendants ask a judge to throw out a SLAPP suit within 60 days. While that request is pending, all evidence-gathering in the case is paused. The court must hold a hearing within 60 days, and if the SLAPP suit is dismissed, the person who filed it pays the other side''s attorney fees. The law covers speech on public issues — comments at government meetings, news reporting, consumer reviews, tenant complaints, and advocacy. Michigan is now the 39th state with this protection.'
where id = 22;

-- id=31 Ann Arbor All-Electric: replace "Payment in Lieu of Taxes arrangements"
update bills set bill_desc =
'Ann Arbor committed to carbon neutrality by 2030 under the A2ZERO plan. Buildings currently account for 52% of Ann Arbor''s greenhouse gas emissions. This ordinance bans natural gas hookups in all new residential and commercial construction after January 1, 2027, requiring all-electric heating, cooking, hot water, and dryers. It also requires all-electric systems in any major renovation (over $50,000) and establishes a city-funded rebate of up to $3,000 for households converting existing gas appliances to electric. State law currently prevents Ann Arbor from banning gas in existing buildings — this ordinance applies only to new construction and major renovations, which is within current city authority.'
where id = 31;

-- id=39 Grand Rapids IZ: replace "fee-in-lieu" and "80% of Area Median Income"
update bills set bill_desc =
'Grand Rapids has lost 6,200 affordable housing units since 2015, as market-rate development downtown converts or displaces affordable stock. The city''s housing waitlist has 4,800 families — a three-to-five-year wait for a voucher. This ordinance requires any new residential development of 10 or more units to set aside 15% of units as affordable for families earning 80% or less of the local median income. Developers who prefer not to build affordable units on-site must pay $12,000 per unit into the Grand Rapids Affordable Housing Fund. That money must be spent within 24 months in the same neighborhood where it was collected.'
where id = 39;

-- id=40 Dearborn CBA: replace "Tax Increment Financing, Payment in Lieu of Taxes arrangements"
update bills set bill_desc =
'Dearborn is going through its biggest building boom in decades — new development near the River Rouge site, the Ford expansion in Corktown, and the Dearborn Waterfront Project are all underway. Right now, developers can receive millions in city tax breaks or grants with no requirement to benefit local residents. This ordinance requires any project getting $1 million or more in city incentives — tax breaks, deferred taxes, or direct grants — to sign a Community Benefits Agreement with at least three local community groups. The agreement must guarantee that at least 40% of workers hired are Dearborn residents, include a plan to reduce environmental harm, and set aside at least 10% of units as affordable housing if the project includes homes.'
where id = 40;

-- id=42 Detroit Police Oversight: replace "independent subpoena power to compel witness testimony and document production"
update bills set bill_desc =
'Detroit''s Board of Police Commissioners (BOPC) has existed since 1974 but lacks the tools to operate as a genuinely independent oversight body. Currently, BOPC investigations are conducted by DPD''s own Internal Affairs unit — the department investigates itself. Disciplinary recommendations from BOPC are routinely ignored by the Police Chief with no required explanation. This ordinance gives BOPC the legal power to demand documents and compel witnesses to testify; authority to hire its own civilian investigators independent of DPD; and requires DPD to carry out BOPC disciplinary recommendations within 60 days or submit a written public explanation for departing from the recommendation.'
where id = 42;

-- id=43 Ingham County Broadband: replace "ARPA reserves" and "BEAD program"
update bills set bill_desc =
'4,200 Ingham County homes — mostly in Delhi, Stockbridge, Leslie, and Leroy townships — have no broadband fast enough to work from home, join a telehealth appointment, or attend school online. The federal standard for basic broadband service is 25 Mbps; these households fall below it. This ordinance creates the Ingham County Broadband Fund using $8.5 million in remaining federal pandemic relief money. The county and internet providers split the cost 50/50 to bring fiber internet directly to rural homes. Any provider receiving county money must offer a low-income plan for no more than $30/month. This also makes the county eligible for additional federal rural broadband grants that require a local match.'
where id = 43;

-- id=44 Pontiac: replace "Right of First Refusal" and "community land trust"
update bills set bill_desc =
'Pontiac is experiencing its first significant gentrification pressure in decades — driven by proximity to Auburn Hills employers, the Big Beaver commercial corridor, and new investment following the city''s exit from state financial oversight in 2023. Long-term residents — predominantly Black families with median tenure of 14 years — are being displaced by investor-purchased homes converted to short-term and higher-rent rentals. This ordinance requires 180-day notice before any rent increase above 5% or any owner move-in conversion; mandates relocation assistance equal to 3 months'' rent for any tenant displaced by conversion or major renovation; and gives the city the right to step in and purchase any property before it is sold to an out-of-county investor — then offer it to a community nonprofit land trust to keep it affordable long-term.'
where id = 44;

-- id=45 Ann Arbor Fair Chance Housing: replace "private right of action"
update bills set bill_desc =
'Approximately 1 in 4 Ann Arbor adults has an arrest or conviction record, including many University of Michigan students with minor marijuana convictions. Current rental practices allow landlords to automatically reject any applicant with a criminal record — regardless of offense type, age of record, or evidence of rehabilitation. This ordinance bans landlords from automatically disqualifying rental applicants based on criminal history; requires individualized review considering offense type, time elapsed, evidence of rehabilitation, and relevance to tenancy; prohibits criminal history questions until after a conditional offer is made ("ban the box" in housing); and gives applicants the right to sue landlords who violate these rules.'
where id = 45;

-- id=46 Kent County: replace "Title IV-E pass-through dollars"
update bills set bill_desc =
'Grand Rapids receives the second-largest number of refugees resettled in Michigan, and Kent County as a whole welcomes more than 1,200 immigrants each year. Research by the West Michigan Policy Forum found that newcomers who get support services in their first six months have employment rates 42% higher two years later than those who do not. This ordinance creates a $2.5 million Kent County Newcomer Integration Fund using county general funds and federal grants. The fund pays for English language classes at GRCC and Davenport University, help getting foreign professional licenses recognized in Michigan, and transit passes. The county must report outcomes annually to the Board of Commissioners.'
where id = 46;

-- id=26 EV Charging: replace "NEVI program" and "Level 2 charger"
update bills set bill_desc =
'Michigan is the heart of American auto manufacturing — but only 4.2% of vehicles registered in Michigan are electric, far below the national average of 8.7%. HBs 5600-5602 create a $200M revolving loan fund for public and private charging station installation, with grants for rural and low-income communities; require all new publicly funded parking structures to include EV-ready electrical wiring; and mandate that gas stations along Michigan interstate highways with 12 or more pumps install at least one standard EV charger by 2028. The federal EV charging program (NEVI) requires states to have a local matching fund — Michigan has a plan but no state fund, so federal dollars are currently going unclaimed.'
where id = 26;
