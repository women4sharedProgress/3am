// ZIP-to-county crosswalk derived from HUD USPS ZIP-to-County Crosswalk
// (residential-address allocation). County names are uppercase to match
// the stored-value convention used throughout Profile.tsx.
// Source: https://www.huduser.gov/portal/datasets/usps_crosswalk.html
//
// Single-element array  = ZIP falls entirely in one county → auto-fill if county is empty.
// Multi-element array   = ZIP straddles county lines       → show dropdown, user picks.
// ZIP absent from table = no data; leave county field alone.

export function lookupZipCounty(zip: string): string[] | null {
  const key = zip.replace(/\D/g, '').slice(0, 5)
  if (key.length < 5) return null
  return ZIP_COUNTY[key] ?? null
}

const ZIP_COUNTY: Record<string, string[]> = {

  // ── Michigan — Wayne County ────────────────────────────────────────────────
  // Detroit proper (all 482xx primary)
  '48201': ['WAYNE'], '48202': ['WAYNE'], '48203': ['WAYNE'], '48204': ['WAYNE'],
  '48205': ['WAYNE'], '48206': ['WAYNE'], '48207': ['WAYNE'], '48208': ['WAYNE'],
  '48209': ['WAYNE'], '48210': ['WAYNE'], '48211': ['WAYNE'], '48212': ['WAYNE'],
  '48213': ['WAYNE'], '48214': ['WAYNE'], '48215': ['WAYNE'], '48216': ['WAYNE'],
  '48217': ['WAYNE'], '48218': ['WAYNE'], '48219': ['WAYNE'],
  '48221': ['WAYNE'], '48222': ['WAYNE'], '48223': ['WAYNE'], '48224': ['WAYNE'],
  '48225': ['WAYNE'], '48226': ['WAYNE'], '48227': ['WAYNE'], '48228': ['WAYNE'],
  '48229': ['WAYNE'], '48230': ['WAYNE'], '48231': ['WAYNE'], '48232': ['WAYNE'],
  '48233': ['WAYNE'], '48234': ['WAYNE'], '48235': ['WAYNE'], '48236': ['WAYNE'],
  '48238': ['WAYNE'], '48239': ['WAYNE'], '48240': ['WAYNE'],
  '48242': ['WAYNE'], '48243': ['WAYNE'], '48244': ['WAYNE'],
  // Wayne suburbs
  '48101': ['WAYNE'], // Dearborn
  '48111': ['WAYNE'], // Belleville
  '48120': ['WAYNE'], '48121': ['WAYNE'], '48122': ['WAYNE'], '48123': ['WAYNE'],
  '48124': ['WAYNE'], '48125': ['WAYNE'], '48126': ['WAYNE'], '48127': ['WAYNE'],
  '48128': ['WAYNE'], // Dearborn / Dearborn Heights
  '48134': ['WAYNE'], // Flat Rock
  '48135': ['WAYNE'], // Garden City
  '48138': ['WAYNE'], // Grosse Ile
  '48141': ['WAYNE'], // Inkster
  '48146': ['WAYNE'], // Lincoln Park
  '48150': ['WAYNE'], '48151': ['WAYNE'], '48152': ['WAYNE'],
  '48153': ['WAYNE'], '48154': ['WAYNE'], // Livonia
  '48164': ['WAYNE'], // New Boston
  '48170': ['WAYNE'], // Plymouth
  '48173': ['WAYNE'], // Rockwood
  '48174': ['WAYNE'], // Romulus
  '48180': ['WAYNE'], // Taylor
  '48183': ['WAYNE'], // Trenton
  '48184': ['WAYNE'], // Wayne (city)
  '48185': ['WAYNE'], '48186': ['WAYNE'], // Westland
  '48187': ['WAYNE'], '48188': ['WAYNE'], // Canton Township
  '48192': ['WAYNE'], // Wyandotte
  '48193': ['WAYNE'], // Riverview
  '48195': ['WAYNE'], // Southgate

  // ── Michigan — Oakland County ──────────────────────────────────────────────
  '48009': ['OAKLAND'], // Birmingham
  '48017': ['OAKLAND'], // Clawson
  '48025': ['OAKLAND'], // Franklin
  '48030': ['OAKLAND'], // Hazel Park
  '48067': ['OAKLAND'], '48068': ['OAKLAND'], '48069': ['OAKLAND'], // Royal Oak / Pleasant Ridge
  '48070': ['OAKLAND'], // Huntington Woods
  '48071': ['OAKLAND'], // Madison Heights
  '48072': ['OAKLAND'], // Berkley
  '48073': ['OAKLAND'], // Royal Oak
  '48075': ['OAKLAND'], '48076': ['OAKLAND'], // Southfield
  '48083': ['OAKLAND'], '48084': ['OAKLAND'], '48085': ['OAKLAND'], // Troy
  '48098': ['OAKLAND'], '48099': ['OAKLAND'], // Troy
  '48220': ['OAKLAND'], // Ferndale
  '48237': ['OAKLAND'], // Oak Park
  '48301': ['OAKLAND'], '48302': ['OAKLAND'], '48303': ['OAKLAND'], '48304': ['OAKLAND'], // Bloomfield Hills
  '48306': ['OAKLAND'], '48307': ['OAKLAND'], '48308': ['OAKLAND'], '48309': ['OAKLAND'], // Rochester / Rochester Hills
  '48320': ['OAKLAND'], // Keego Harbor
  '48321': ['OAKLAND'], // Auburn Hills (NW)
  '48322': ['OAKLAND'], '48323': ['OAKLAND'], '48324': ['OAKLAND'], '48325': ['OAKLAND'], // West Bloomfield
  '48326': ['OAKLAND'], // Auburn Hills
  '48327': ['OAKLAND'], '48328': ['OAKLAND'], '48329': ['OAKLAND'], // Waterford
  '48331': ['OAKLAND'], '48333': ['OAKLAND'], '48334': ['OAKLAND'],
  '48335': ['OAKLAND'], '48336': ['OAKLAND'], // Farmington / Farmington Hills
  '48340': ['OAKLAND'], '48341': ['OAKLAND'], '48342': ['OAKLAND'], '48343': ['OAKLAND'], // Pontiac
  '48346': ['OAKLAND'], '48347': ['OAKLAND'], '48348': ['OAKLAND'], // Clarkston
  '48350': ['OAKLAND'], // Davisburg
  '48356': ['OAKLAND'], '48357': ['OAKLAND'], // Highland
  '48359': ['OAKLAND'], '48360': ['OAKLAND'], '48361': ['OAKLAND'], '48362': ['OAKLAND'], // Lake Orion
  '48363': ['OAKLAND'], '48364': ['OAKLAND'], // Oakland Township / Rochester Hills
  '48370': ['OAKLAND'], '48371': ['OAKLAND'], // Oxford
  '48374': ['OAKLAND'], '48375': ['OAKLAND'], '48376': ['OAKLAND'], '48377': ['OAKLAND'], // Northville / Novi
  '48380': ['OAKLAND'], '48381': ['OAKLAND'], // Milford
  '48382': ['OAKLAND'], // Commerce Township
  '48383': ['OAKLAND'], '48384': ['OAKLAND'], '48385': ['OAKLAND'], '48386': ['OAKLAND'], // White Lake
  '48387': ['OAKLAND'], // Union Lake
  '48390': ['OAKLAND'], '48391': ['OAKLAND'], // Walled Lake
  '48393': ['OAKLAND'], // Wixom

  // ── Michigan — Macomb County ───────────────────────────────────────────────
  '48021': ['MACOMB'], // Eastpointe
  '48035': ['MACOMB'], '48036': ['MACOMB'], '48038': ['MACOMB'], // Clinton Township
  '48042': ['MACOMB'], // Macomb Township
  '48043': ['MACOMB'], '48046': ['MACOMB'], // Mount Clemens
  '48044': ['MACOMB'], // Macomb
  '48045': ['MACOMB'], // Harrison Township
  '48047': ['MACOMB'], '48051': ['MACOMB'], // New Baltimore
  '48048': ['MACOMB'], '48050': ['MACOMB'], // New Haven
  '48062': ['MACOMB'], '48065': ['MACOMB'], // Romeo
  '48066': ['MACOMB'], // Roseville
  '48080': ['MACOMB'], '48081': ['MACOMB'], '48082': ['MACOMB'], // St. Clair Shores
  '48088': ['MACOMB'], '48089': ['MACOMB'], '48090': ['MACOMB'],
  '48091': ['MACOMB'], '48092': ['MACOMB'], '48093': ['MACOMB'], // Warren
  '48094': ['MACOMB'], '48095': ['MACOMB'], // Washington Township
  '48310': ['MACOMB'], '48311': ['MACOMB'], '48312': ['MACOMB'],
  '48313': ['MACOMB'], '48314': ['MACOMB'], // Sterling Heights
  '48315': ['MACOMB'], '48316': ['MACOMB'], '48317': ['MACOMB'], '48318': ['MACOMB'], // Utica / Sterling Heights

  // ── Michigan — Washtenaw County ────────────────────────────────────────────
  '48103': ['WASHTENAW'], '48104': ['WASHTENAW'], '48105': ['WASHTENAW'],
  '48106': ['WASHTENAW'], '48107': ['WASHTENAW'], '48108': ['WASHTENAW'], // Ann Arbor
  '48109': ['WASHTENAW'], // University of Michigan
  '48130': ['WASHTENAW'], // Dexter
  '48158': ['WASHTENAW'], // Manchester
  '48176': ['WASHTENAW'], // Saline
  '48189': ['WASHTENAW'], // Whitmore Lake (primary)
  '48197': ['WASHTENAW'], '48198': ['WASHTENAW'], // Ypsilanti

  // ── Michigan — Ingham County (Lansing metro) ───────────────────────────────
  '48823': ['INGHAM'], '48824': ['INGHAM'], '48825': ['INGHAM'], '48826': ['INGHAM'], // East Lansing
  '48840': ['INGHAM'], // Haslett
  '48854': ['INGHAM'], // Mason
  '48864': ['INGHAM'], // Okemos
  '48906': ['INGHAM'], '48908': ['INGHAM'], '48909': ['INGHAM'],
  '48910': ['INGHAM'], '48911': ['INGHAM'], '48912': ['INGHAM'],
  '48915': ['INGHAM'], '48917': ['INGHAM'], '48929': ['INGHAM'],
  '48930': ['INGHAM'], '48933': ['INGHAM'], // Lansing

  // ── Michigan — Genesee County (Flint metro) ────────────────────────────────
  '48420': ['GENESEE'], // Clio
  '48423': ['GENESEE'], '48429': ['GENESEE'], // Davison
  '48433': ['GENESEE'], // Flushing
  '48438': ['GENESEE'], // Goodrich
  '48451': ['GENESEE'], // Linden
  '48458': ['GENESEE'], // Mount Morris
  '48463': ['GENESEE'], // Otisville
  '48473': ['GENESEE'], // Swartz Creek
  '48501': ['GENESEE'], '48502': ['GENESEE'], '48503': ['GENESEE'], '48504': ['GENESEE'],
  '48505': ['GENESEE'], '48506': ['GENESEE'], '48507': ['GENESEE'], // Flint
  '48509': ['GENESEE'], '48519': ['GENESEE'], // Burton

  // ── Michigan — Saginaw County ──────────────────────────────────────────────
  '48601': ['SAGINAW'], '48602': ['SAGINAW'], '48603': ['SAGINAW'],
  '48604': ['SAGINAW'], '48605': ['SAGINAW'], '48606': ['SAGINAW'],
  '48607': ['SAGINAW'], '48608': ['SAGINAW'], '48609': ['SAGINAW'], // Saginaw
  '48638': ['SAGINAW'], // Saginaw Township North

  // ── Michigan — Bay County ──────────────────────────────────────────────────
  '48706': ['BAY'], '48707': ['BAY'], '48708': ['BAY'], // Bay City

  // ── Michigan — Midland County ──────────────────────────────────────────────
  '48640': ['MIDLAND'], '48641': ['MIDLAND'], '48642': ['MIDLAND'], // Midland

  // ── Michigan — Kent County (Grand Rapids metro) ────────────────────────────
  '49301': ['KENT'], // Ada
  '49302': ['KENT'], // Alto
  '49306': ['KENT'], // Belmont
  '49315': ['KENT'], // Byron Center
  '49316': ['KENT'], // Caledonia
  '49318': ['KENT'], // Comstock Park
  '49321': ['KENT'], // Comstock Park
  '49331': ['KENT'], // Lowell
  '49341': ['KENT'], // Rockford
  '49348': ['KENT'], // Wayland (primary Kent)
  '49501': ['KENT'], '49502': ['KENT'], '49503': ['KENT'], '49504': ['KENT'],
  '49505': ['KENT'], '49506': ['KENT'], '49507': ['KENT'], '49508': ['KENT'],
  '49509': ['KENT'], '49510': ['KENT'], '49512': ['KENT'], '49514': ['KENT'],
  '49518': ['KENT'], '49519': ['KENT'], '49525': ['KENT'], '49530': ['KENT'],
  '49534': ['KENT'], '49544': ['KENT'], '49546': ['KENT'], '49548': ['KENT'], // Grand Rapids

  // ── Michigan — Ottawa County ───────────────────────────────────────────────
  '49401': ['OTTAWA'], // Allendale
  '49417': ['OTTAWA'], // Grand Haven
  '49418': ['OTTAWA'], // Grandville
  '49423': ['OTTAWA'], '49424': ['OTTAWA'], // Holland
  '49426': ['OTTAWA'], // Hudsonville
  '49428': ['OTTAWA'], '49429': ['OTTAWA'], // Jenison / Byron Center area
  '49434': ['OTTAWA'], // Macatawa
  '49435': ['OTTAWA'], // Marne
  '49456': ['OTTAWA'], // Spring Lake
  '49460': ['OTTAWA'], // West Olive
  '49464': ['OTTAWA'], // Zeeland

  // ── Michigan — Muskegon County ─────────────────────────────────────────────
  '49440': ['MUSKEGON'], '49441': ['MUSKEGON'], '49442': ['MUSKEGON'],
  '49443': ['MUSKEGON'], '49444': ['MUSKEGON'], '49445': ['MUSKEGON'],
  '49451': ['MUSKEGON'], '49457': ['MUSKEGON'], '49461': ['MUSKEGON'], // Muskegon metro

  // ── Michigan — Kalamazoo County ────────────────────────────────────────────
  '49001': ['KALAMAZOO'], '49002': ['KALAMAZOO'], '49003': ['KALAMAZOO'],
  '49004': ['KALAMAZOO'], '49006': ['KALAMAZOO'], '49007': ['KALAMAZOO'],
  '49008': ['KALAMAZOO'], '49009': ['KALAMAZOO'], '49019': ['KALAMAZOO'],
  '49024': ['KALAMAZOO'], // Portage
  '49048': ['KALAMAZOO'],

  // ── Michigan — Calhoun County ──────────────────────────────────────────────
  '49014': ['CALHOUN'], '49015': ['CALHOUN'], '49016': ['CALHOUN'], '49017': ['CALHOUN'], // Battle Creek

  // ── Michigan — Jackson County ──────────────────────────────────────────────
  '49201': ['JACKSON'], '49202': ['JACKSON'], '49203': ['JACKSON'], '49204': ['JACKSON'], // Jackson

  // ── Michigan — Isabella County ─────────────────────────────────────────────
  '48858': ['ISABELLA'], '48859': ['ISABELLA'], // Mount Pleasant

  // ── Michigan — Eaton County ────────────────────────────────────────────────
  '48813': ['EATON'], // Charlotte
  '48821': ['EATON'], // Dimondale
  '48827': ['EATON'], // Eaton Rapids

  // ── Michigan — Clinton County ──────────────────────────────────────────────
  '48820': ['CLINTON'], // DeWitt
  '48879': ['CLINTON'], // St. Johns

  // ── Michigan — Livingston County ───────────────────────────────────────────
  '48114': ['LIVINGSTON'], '48116': ['LIVINGSTON'], // Brighton
  '48137': ['LIVINGSTON'], // Gregory
  '48139': ['LIVINGSTON'], // Hamburg
  '48169': ['LIVINGSTON'], // Pinckney
  '48843': ['LIVINGSTON'], '48844': ['LIVINGSTON'], // Howell
  '48855': ['LIVINGSTON'], // Howell area

  // ── Michigan — Monroe County ───────────────────────────────────────────────
  '48133': ['MONROE'], // Erie
  '48140': ['MONROE'], // Ida
  '48157': ['MONROE'], // Maybee
  '48159': ['MONROE'], // Maybee area
  '48161': ['MONROE'], '48162': ['MONROE'], // Monroe
  '48166': ['MONROE'], // Newport
  '48179': ['MONROE'], // South Rockwood
  '48182': ['MONROE'], // Temperance

  // ── Michigan — St. Clair County ────────────────────────────────────────────
  '48001': ['ST. CLAIR'], // Algonac
  '48022': ['ST. CLAIR'], // Emmett
  '48027': ['ST. CLAIR'], '48028': ['ST. CLAIR'], // Columbus / Harsens Island
  '48040': ['ST. CLAIR'], // Ira Township
  '48041': ['ST. CLAIR'], // Memphis
  '48054': ['ST. CLAIR'], // East China
  '48059': ['ST. CLAIR'], // Fort Gratiot
  '48060': ['ST. CLAIR'], '48061': ['ST. CLAIR'], // Port Huron
  '48063': ['ST. CLAIR'], '48064': ['ST. CLAIR'], // Columbus / Casco
  '48074': ['ST. CLAIR'], // Smiths Creek
  '48079': ['ST. CLAIR'], // St. Clair
  '48097': ['ST. CLAIR'], // Yale

  // ── Michigan — Lapeer County ───────────────────────────────────────────────
  '48003': ['LAPEER'], // Almont
  '48421': ['LAPEER'], // Columbiaville
  '48428': ['LAPEER'], // Dryden
  '48446': ['LAPEER'], '48447': ['LAPEER'], // Lapeer

  // ── Michigan — Lenawee County ──────────────────────────────────────────────
  '49221': ['LENAWEE'], // Adrian
  '49228': ['LENAWEE'], // Blissfield
  '49229': ['LENAWEE'], // Blissfield area

  // ── Michigan — Berrien County ──────────────────────────────────────────────
  '49022': ['BERRIEN'], '49023': ['BERRIEN'], // Benton Harbor
  '49101': ['BERRIEN'], // Berrien Springs
  '49103': ['BERRIEN'], // Berrien Center
  '49106': ['BERRIEN'], // Bridgman
  '49111': ['BERRIEN'], // Eau Claire
  '49115': ['BERRIEN'], '49116': ['BERRIEN'], // Harbert / Lakeside
  '49117': ['BERRIEN'], // New Buffalo
  '49120': ['BERRIEN'], '49121': ['BERRIEN'], // Niles
  '49125': ['BERRIEN'], '49126': ['BERRIEN'], '49127': ['BERRIEN'], // Sawyer/Sodus/Stevensville
  '49128': ['BERRIEN'], '49129': ['BERRIEN'], // Three Oaks / Union Pier

  // ── Michigan — Van Buren County ────────────────────────────────────────────
  '49091': ['VAN BUREN'], // Sturgis (main)
  '49098': ['VAN BUREN'], // Watervliet
  '49102': ['VAN BUREN'], // Berrien Springs / Eau Claire area
  '49107': ['VAN BUREN'], // Decatur area

  // ── Michigan — Allegan County ──────────────────────────────────────────────
  '49010': ['ALLEGAN'], // Allegan
  '49058': ['ALLEGAN'], // Hastings (Barry primary — but note Barry below)
  '49076': ['ALLEGAN'], // Moline area

  // ── Michigan — Barry County ────────────────────────────────────────────────
  '49021': ['BARRY'], // Bellevue
  '49060': ['BARRY'], // Hastings
  '49070': ['BARRY'], // Nashville

  // ── Michigan — Ionia County ────────────────────────────────────────────────
  '48846': ['IONIA'], // Ionia
  '48851': ['IONIA'], // Lyons

  // ── Michigan — Branch County ───────────────────────────────────────────────
  '49036': ['BRANCH'], // Coldwater

  // ── Michigan — Wexford County ──────────────────────────────────────────────
  '49601': ['WEXFORD'], // Cadillac

  // ── Michigan — Emmet County ────────────────────────────────────────────────
  '49770': ['EMMET'], // Petoskey

  // ── Michigan — Chippewa County ─────────────────────────────────────────────
  '49783': ['CHIPPEWA'], // Sault Ste. Marie

  // ── Michigan — Marquette County ────────────────────────────────────────────
  '49855': ['MARQUETTE'], // Marquette

  // ── Michigan — Luce County ────────────────────────────────────────────────
  '49883': ['LUCE'], // Newberry

  // ── Michigan — Houghton County ────────────────────────────────────────────
  '49931': ['HOUGHTON'], // Houghton

  // ── Michigan — Dickinson County ───────────────────────────────────────────
  '49935': ['DICKINSON'], // Iron Mountain

  // ── Michigan — Baraga County ───────────────────────────────────────────────
  '49946': ['BARAGA'], // L'Anse

  // ── Michigan — Antrim County ───────────────────────────────────────────────
  '49712': ['ANTRIM'], // Bellaire
  '49727': ['ANTRIM'], // Elk Rapids

  // ── Michigan — Charlevoix County ──────────────────────────────────────────
  '49720': ['CHARLEVOIX'], // Charlevoix

  // ── Michigan — Alpena County ───────────────────────────────────────────────
  '49707': ['ALPENA'], // Alpena

  // ── Michigan — Otsego County ───────────────────────────────────────────────
  '49735': ['OTSEGO'], // Gaylord

  // ── Michigan — Grand Traverse County ──────────────────────────────────────
  '49684': ['GRAND TRAVERSE'], '49685': ['GRAND TRAVERSE'], // Traverse City

  // ── Michigan — Leelanau County ─────────────────────────────────────────────
  '49650': ['LEELANAU'], // Maple City area
  '49676': ['LEELANAU'], // Suttons Bay

  // ── Michigan — Benzie County ───────────────────────────────────────────────
  '49628': ['BENZIE'], // Frankfort
  '49640': ['BENZIE'], // Honor

  // ── Michigan — Manistee County ─────────────────────────────────────────────
  '49660': ['MANISTEE'], // Manistee

  // ── Michigan — Mecosta County ──────────────────────────────────────────────
  '49307': ['MECOSTA'], // Big Rapids

  // ── Michigan — Newaygo County ──────────────────────────────────────────────
  '49337': ['NEWAYGO'], // Fremont
  '49349': ['NEWAYGO'], // White Cloud

  // ── Michigan — Mason County ────────────────────────────────────────────────
  '49431': ['MASON'], // Ludington

  // ── Michigan — Oceana County ───────────────────────────────────────────────
  '49436': ['OCEANA'], // Hart

  // ── Michigan — Lake County ────────────────────────────────────────────────
  '49304': ['LAKE'], // Baldwin

  // ── Michigan — Osceola County ─────────────────────────────────────────────
  '49338': ['OSCEOLA'], // Reed City

  // ── Michigan — Clare County ────────────────────────────────────────────────
  '48617': ['CLARE'], // Clare

  // ── Michigan — Missaukee County ────────────────────────────────────────────
  '49651': ['MISSAUKEE'], // Lake City

  // ── Michigan — Roscommon County ────────────────────────────────────────────
  '48629': ['ROSCOMMON'], // Houghton Lake
  '48653': ['ROSCOMMON'], // Roscommon

  // ── Michigan — Crawford County ─────────────────────────────────────────────
  '49738': ['CRAWFORD'], // Grayling

  // ── Michigan — Montmorency County ─────────────────────────────────────────
  '49709': ['MONTMORENCY'], // Atlanta

  // ── Michigan — Presque Isle County ────────────────────────────────────────
  '49779': ['PRESQUE ISLE'], // Rogers City

  // ── Michigan — Cheboygan County ───────────────────────────────────────────
  '49721': ['CHEBOYGAN'], // Cheboygan

  // ── Michigan — Tuscola County ──────────────────────────────────────────────
  '48723': ['TUSCOLA'], // Caro
  '48727': ['TUSCOLA'], // Cass City (primary)

  // ── Michigan — Huron County ────────────────────────────────────────────────
  '48467': ['HURON'], // Port Austin
  '48468': ['HURON'], // Port Hope

  // ── Michigan — Gratiot County ──────────────────────────────────────────────
  '48801': ['GRATIOT'], // Alma
  '48845': ['GRATIOT'], // Ithaca area

  // ── Michigan — Montcalm County ─────────────────────────────────────────────
  '48857': ['MONTCALM'], // Stanton

  // ── Michigan — Shiawassee County ───────────────────────────────────────────
  '48867': ['SHIAWASSEE'], // Owosso
  '48872': ['SHIAWASSEE'], // Perry

  // ── Michigan — Gogebic County ──────────────────────────────────────────────
  '49938': ['GOGEBIC'], // Ironwood

  // ── Michigan — Iron County ─────────────────────────────────────────────────
  '49949': ['IRON'], // Stambaugh

  // ── Michigan — Ontonagon County ────────────────────────────────────────────
  '49953': ['ONTONAGON'], // Ontonagon

  // ── Michigan — Menominee County ────────────────────────────────────────────
  '49858': ['MENOMINEE'], // Menominee

  // ── Michigan — Delta County ────────────────────────────────────────────────
  '49829': ['DELTA'], // Escanaba

  // ── Michigan — Schoolcraft County ─────────────────────────────────────────
  '49868': ['SCHOOLCRAFT'], // Manistique

  // ── Michigan — Mackinac County ─────────────────────────────────────────────
  '49781': ['MACKINAC'], // St. Ignace

  // ── Michigan — Alger County ───────────────────────────────────────────────
  '49862': ['ALGER'], // Munising

  // ── Michigan — Keweenaw County ─────────────────────────────────────────────
  '49950': ['KEWEENAW'], // Eagle River

  // ── Michigan — Sanilac County ──────────────────────────────────────────────
  '48401': ['SANILAC'], // Sandusky
  '48444': ['SANILAC'], // Imlay City area (primary Sanilac)

  // ── Michigan — Arenac County ───────────────────────────────────────────────
  '48703': ['ARENAC'], // Au Gres
  '48747': ['ARENAC'], // Omer

  // ── Michigan — Alcona County ───────────────────────────────────────────────
  '48720': ['ALCONA'], // Harrisville area
  '48740': ['ALCONA'], // Harrisville

  // ── Michigan — Iosco County ────────────────────────────────────────────────
  '48750': ['IOSCO'], // Tawas City
  '48763': ['IOSCO'], // Oscoda

  // ── Michigan — Ogemaw County ───────────────────────────────────────────────
  '48661': ['OGEMAW'], // West Branch

  // ── Michigan — multi-county ZIPs (user must choose) ───────────────────────
  '48160': ['MONROE', 'WASHTENAW'], // Milan — straddles county line
  '49240': ['JACKSON', 'WASHTENAW'], // Grass Lake
  '48415': ['SAGINAW', 'TUSCOLA'], // Birch Run
  '48610': ['ARENAC', 'GLADWIN'], // Alger (MI township)
  '48837': ['CLINTON', 'EATON'],   // Grand Ledge area

  // ── New Hampshire ──────────────────────────────────────────────────────────
  '03301': ['MERRIMACK'], // Concord
  '03060': ['HILLSBOROUGH'], // Nashua
  '03104': ['HILLSBOROUGH'], // Manchester

  // ── Vermont ────────────────────────────────────────────────────────────────
  '05401': ['CHITTENDEN'], // Burlington

  // ── New York ───────────────────────────────────────────────────────────────
  '10001': ['NEW YORK'], // Manhattan
  '11201': ['KINGS'], // Brooklyn
  '13326': ['OTSEGO'], // Cooperstown

  // ── Pennsylvania ───────────────────────────────────────────────────────────
  '17325': ['ADAMS'], // Gettysburg
  '17101': ['DAUPHIN'], // Harrisburg

  // ── West Virginia ──────────────────────────────────────────────────────────
  '25425': ['JEFFERSON'], // Harpers Ferry

  // ── Florida ────────────────────────────────────────────────────────────────
  '33040': ['MONROE'], // Key West
  '32801': ['ORANGE'], // Orlando
  '33101': ['MIAMI-DADE'], // Miami

  // ── Georgia ────────────────────────────────────────────────────────────────
  '30301': ['FULTON'], // Atlanta

  // ── Illinois ───────────────────────────────────────────────────────────────
  '60601': ['COOK'], // Chicago

  // ── Ohio ───────────────────────────────────────────────────────────────────
  '43201': ['FRANKLIN'], // Columbus
  '44101': ['CUYAHOGA'], // Cleveland

  // ── Colorado ───────────────────────────────────────────────────────────────
  '80202': ['DENVER'], // Denver
  '80517': ['LARIMER'], // Estes Park

  // ── Wyoming ────────────────────────────────────────────────────────────────
  '82001': ['LARAMIE'], // Cheyenne

  // ── South Dakota ───────────────────────────────────────────────────────────
  '57501': ['HUGHES'], // Pierre
  '57785': ['MEADE'], // Sturgis

  // ── North Dakota ───────────────────────────────────────────────────────────
  '58501': ['BURLEIGH'], // Bismarck

  // ── Montana ────────────────────────────────────────────────────────────────
  '59601': ['LEWIS AND CLARK'], // Helena

  // ── Alaska ─────────────────────────────────────────────────────────────────
  '99501': ['ANCHORAGE MUNICIPALITY'], // Anchorage
  '99901': ['KETCHIKAN GATEWAY BOROUGH'], // Ketchikan

  // ── California ─────────────────────────────────────────────────────────────
  '90210': ['LOS ANGELES'], // Beverly Hills
  '94102': ['SAN FRANCISCO'], // San Francisco

  // ── Texas ──────────────────────────────────────────────────────────────────
  '75201': ['DALLAS'], // Dallas
  '77001': ['HARRIS'], // Houston
  '78201': ['BEXAR'], // San Antonio
  '73301': ['TRAVIS'], // Austin

  // ── Washington ─────────────────────────────────────────────────────────────
  '98101': ['KING'], // Seattle

  // ── Oregon ─────────────────────────────────────────────────────────────────
  '97201': ['MULTNOMAH'], // Portland

  // ── Arizona ────────────────────────────────────────────────────────────────
  '85001': ['MARICOPA'], // Phoenix

  // ── Nevada ─────────────────────────────────────────────────────────────────
  '89101': ['CLARK'], // Las Vegas

  // ── Massachusetts ──────────────────────────────────────────────────────────
  '02101': ['SUFFOLK'], // Boston
}
