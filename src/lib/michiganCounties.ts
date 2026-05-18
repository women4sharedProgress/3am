// Michigan county civic data — all 83 counties
// Includes: circuit court (number + name), probate court, county seat
// Users should validate via https://mvic.sos.state.mi.us/Voter/Index

export interface MichiganCounty {
  name:         string  // Title Case county name (matches Census output)
  countySeat:   string
  circuit:      number  // judicial circuit number (1–57)
  circuitCourt: string  // e.g. "3rd Circuit Court"
  probateCourt: string  // e.g. "Wayne County Probate Court"
}

export const MICHIGAN_COUNTIES: MichiganCounty[] = [
  // ─── A ───────────────────────────────────────────────────────────────────────
  { name: 'Alcona',         countySeat: 'Harrisville',      circuit: 23, circuitCourt: '23rd Circuit Court', probateCourt: 'Alcona County Probate Court'         },
  { name: 'Alger',          countySeat: 'Munising',         circuit: 11, circuitCourt: '11th Circuit Court', probateCourt: 'Alger County Probate Court'           },
  { name: 'Allegan',        countySeat: 'Allegan',          circuit: 48, circuitCourt: '48th Circuit Court', probateCourt: 'Allegan County Probate Court'         },
  { name: 'Alpena',         countySeat: 'Alpena',           circuit: 26, circuitCourt: '26th Circuit Court', probateCourt: 'Alpena County Probate Court'          },
  { name: 'Antrim',         countySeat: 'Bellaire',         circuit: 13, circuitCourt: '13th Circuit Court', probateCourt: 'Antrim County Probate Court'          },
  { name: 'Arenac',         countySeat: 'Standish',         circuit: 23, circuitCourt: '23rd Circuit Court', probateCourt: 'Arenac County Probate Court'          },
  // ─── B ───────────────────────────────────────────────────────────────────────
  { name: 'Baraga',         countySeat: "L'Anse",           circuit: 12, circuitCourt: '12th Circuit Court', probateCourt: 'Baraga County Probate Court'          },
  { name: 'Barry',          countySeat: 'Hastings',         circuit:  5, circuitCourt: '5th Circuit Court',  probateCourt: 'Barry County Probate Court'           },
  { name: 'Bay',            countySeat: 'Bay City',         circuit: 18, circuitCourt: '18th Circuit Court', probateCourt: 'Bay County Probate Court'             },
  { name: 'Benzie',         countySeat: 'Beulah',           circuit: 19, circuitCourt: '19th Circuit Court', probateCourt: 'Benzie County Probate Court'          },
  { name: 'Berrien',        countySeat: 'St. Joseph',       circuit:  2, circuitCourt: '2nd Circuit Court',  probateCourt: 'Berrien County Probate Court'         },
  { name: 'Branch',         countySeat: 'Coldwater',        circuit: 15, circuitCourt: '15th Circuit Court', probateCourt: 'Branch County Probate Court'          },
  // ─── C ───────────────────────────────────────────────────────────────────────
  { name: 'Calhoun',        countySeat: 'Marshall',         circuit: 37, circuitCourt: '37th Circuit Court', probateCourt: 'Calhoun County Probate Court'         },
  { name: 'Cass',           countySeat: 'Cassopolis',       circuit: 43, circuitCourt: '43rd Circuit Court', probateCourt: 'Cass County Probate Court'            },
  { name: 'Charlevoix',     countySeat: 'Charlevoix',       circuit: 33, circuitCourt: '33rd Circuit Court', probateCourt: 'Charlevoix County Probate Court'      },
  { name: 'Cheboygan',      countySeat: 'Cheboygan',        circuit: 53, circuitCourt: '53rd Circuit Court', probateCourt: 'Cheboygan County Probate Court'       },
  { name: 'Chippewa',       countySeat: 'Sault Ste. Marie', circuit: 50, circuitCourt: '50th Circuit Court', probateCourt: 'Chippewa County Probate Court'        },
  { name: 'Clare',          countySeat: 'Harrison',         circuit: 55, circuitCourt: '55th Circuit Court', probateCourt: 'Clare County Probate Court'           },
  { name: 'Clinton',        countySeat: 'St. Johns',        circuit: 29, circuitCourt: '29th Circuit Court', probateCourt: 'Clinton County Probate Court'         },
  { name: 'Crawford',       countySeat: 'Grayling',         circuit: 46, circuitCourt: '46th Circuit Court', probateCourt: 'Crawford County Probate Court'        },
  // ─── D ───────────────────────────────────────────────────────────────────────
  { name: 'Delta',          countySeat: 'Escanaba',         circuit: 47, circuitCourt: '47th Circuit Court', probateCourt: 'Delta County Probate Court'           },
  { name: 'Dickinson',      countySeat: 'Iron Mountain',    circuit: 41, circuitCourt: '41st Circuit Court', probateCourt: 'Dickinson County Probate Court'       },
  // ─── E ───────────────────────────────────────────────────────────────────────
  { name: 'Eaton',          countySeat: 'Charlotte',        circuit: 56, circuitCourt: '56th Circuit Court', probateCourt: 'Eaton County Probate Court'           },
  { name: 'Emmet',          countySeat: 'Petoskey',         circuit: 33, circuitCourt: '33rd Circuit Court', probateCourt: 'Emmet County Probate Court'           },
  // ─── G ───────────────────────────────────────────────────────────────────────
  { name: 'Genesee',        countySeat: 'Flint',            circuit:  7, circuitCourt: '7th Circuit Court',  probateCourt: 'Genesee County Probate Court'         },
  { name: 'Gladwin',        countySeat: 'Gladwin',          circuit: 55, circuitCourt: '55th Circuit Court', probateCourt: 'Gladwin County Probate Court'         },
  { name: 'Gogebic',        countySeat: 'Bessemer',         circuit: 32, circuitCourt: '32nd Circuit Court', probateCourt: 'Gogebic County Probate Court'         },
  { name: 'Grand Traverse', countySeat: 'Traverse City',    circuit: 13, circuitCourt: '13th Circuit Court', probateCourt: 'Grand Traverse County Probate Court'  },
  { name: 'Gratiot',        countySeat: 'Ithaca',           circuit: 57, circuitCourt: '57th Circuit Court', probateCourt: 'Gratiot County Probate Court'         },
  // ─── H ───────────────────────────────────────────────────────────────────────
  { name: 'Hillsdale',      countySeat: 'Hillsdale',        circuit:  1, circuitCourt: '1st Circuit Court',  probateCourt: 'Hillsdale County Probate Court'       },
  { name: 'Houghton',       countySeat: 'Houghton',         circuit: 12, circuitCourt: '12th Circuit Court', probateCourt: 'Houghton County Probate Court'        },
  { name: 'Huron',          countySeat: 'Bad Axe',          circuit: 52, circuitCourt: '52nd Circuit Court', probateCourt: 'Huron County Probate Court'           },
  // ─── I ───────────────────────────────────────────────────────────────────────
  { name: 'Ingham',         countySeat: 'Mason',            circuit: 30, circuitCourt: '30th Circuit Court', probateCourt: 'Ingham County Probate Court'          },
  { name: 'Ionia',          countySeat: 'Ionia',            circuit:  8, circuitCourt: '8th Circuit Court',  probateCourt: 'Ionia County Probate Court'           },
  { name: 'Iosco',          countySeat: 'Tawas City',       circuit: 23, circuitCourt: '23rd Circuit Court', probateCourt: 'Iosco County Probate Court'           },
  { name: 'Iron',           countySeat: 'Crystal Falls',    circuit: 41, circuitCourt: '41st Circuit Court', probateCourt: 'Iron County Probate Court'            },
  { name: 'Isabella',       countySeat: 'Mount Pleasant',   circuit: 21, circuitCourt: '21st Circuit Court', probateCourt: 'Isabella County Probate Court'        },
  // ─── J ───────────────────────────────────────────────────────────────────────
  { name: 'Jackson',        countySeat: 'Jackson',          circuit:  4, circuitCourt: '4th Circuit Court',  probateCourt: 'Jackson County Probate Court'         },
  // ─── K ───────────────────────────────────────────────────────────────────────
  { name: 'Kalamazoo',      countySeat: 'Kalamazoo',        circuit:  9, circuitCourt: '9th Circuit Court',  probateCourt: 'Kalamazoo County Probate Court'       },
  { name: 'Kalkaska',       countySeat: 'Kalkaska',         circuit: 46, circuitCourt: '46th Circuit Court', probateCourt: 'Kalkaska County Probate Court'        },
  { name: 'Kent',           countySeat: 'Grand Rapids',     circuit: 17, circuitCourt: '17th Circuit Court', probateCourt: 'Kent County Probate Court'            },
  { name: 'Keweenaw',       countySeat: 'Eagle River',      circuit: 12, circuitCourt: '12th Circuit Court', probateCourt: 'Keweenaw County Probate Court'        },
  // ─── L ───────────────────────────────────────────────────────────────────────
  { name: 'Lake',           countySeat: 'Baldwin',          circuit: 51, circuitCourt: '51st Circuit Court', probateCourt: 'Lake County Probate Court'            },
  { name: 'Lapeer',         countySeat: 'Lapeer',           circuit: 40, circuitCourt: '40th Circuit Court', probateCourt: 'Lapeer County Probate Court'          },
  { name: 'Leelanau',       countySeat: 'Leland',           circuit: 13, circuitCourt: '13th Circuit Court', probateCourt: 'Leelanau County Probate Court'        },
  { name: 'Lenawee',        countySeat: 'Tecumseh',         circuit: 39, circuitCourt: '39th Circuit Court', probateCourt: 'Lenawee County Probate Court'         },
  { name: 'Livingston',     countySeat: 'Howell',           circuit: 44, circuitCourt: '44th Circuit Court', probateCourt: 'Livingston County Probate Court'      },
  { name: 'Luce',           countySeat: 'Newberry',         circuit: 11, circuitCourt: '11th Circuit Court', probateCourt: 'Luce County Probate Court'            },
  // ─── M ───────────────────────────────────────────────────────────────────────
  { name: 'Mackinac',       countySeat: 'St. Ignace',       circuit: 11, circuitCourt: '11th Circuit Court', probateCourt: 'Mackinac County Probate Court'        },
  { name: 'Macomb',         countySeat: 'Mount Clemens',    circuit: 16, circuitCourt: '16th Circuit Court', probateCourt: 'Macomb County Probate Court'          },
  { name: 'Manistee',       countySeat: 'Manistee',         circuit: 19, circuitCourt: '19th Circuit Court', probateCourt: 'Manistee County Probate Court'        },
  { name: 'Marquette',      countySeat: 'Marquette',        circuit: 25, circuitCourt: '25th Circuit Court', probateCourt: 'Marquette County Probate Court'       },
  { name: 'Mason',          countySeat: 'Ludington',        circuit: 51, circuitCourt: '51st Circuit Court', probateCourt: 'Mason County Probate Court'           },
  { name: 'Mecosta',        countySeat: 'Big Rapids',       circuit: 49, circuitCourt: '49th Circuit Court', probateCourt: 'Mecosta County Probate Court'         },
  { name: 'Menominee',      countySeat: 'Menominee',        circuit: 41, circuitCourt: '41st Circuit Court', probateCourt: 'Menominee County Probate Court'       },
  { name: 'Midland',        countySeat: 'Midland',          circuit: 42, circuitCourt: '42nd Circuit Court', probateCourt: 'Midland County Probate Court'         },
  { name: 'Missaukee',      countySeat: 'Lake City',        circuit: 28, circuitCourt: '28th Circuit Court', probateCourt: 'Missaukee County Probate Court'       },
  { name: 'Monroe',         countySeat: 'Monroe',           circuit: 38, circuitCourt: '38th Circuit Court', probateCourt: 'Monroe County Probate Court'          },
  { name: 'Montcalm',       countySeat: 'Stanton',          circuit:  8, circuitCourt: '8th Circuit Court',  probateCourt: 'Montcalm County Probate Court'        },
  { name: 'Montmorency',    countySeat: 'Atlanta',          circuit: 26, circuitCourt: '26th Circuit Court', probateCourt: 'Montmorency County Probate Court'     },
  { name: 'Muskegon',       countySeat: 'Muskegon',         circuit: 14, circuitCourt: '14th Circuit Court', probateCourt: 'Muskegon County Probate Court'        },
  // ─── N ───────────────────────────────────────────────────────────────────────
  { name: 'Newaygo',        countySeat: 'White Cloud',      circuit: 27, circuitCourt: '27th Circuit Court', probateCourt: 'Newaygo County Probate Court'         },
  // ─── O ───────────────────────────────────────────────────────────────────────
  { name: 'Oakland',        countySeat: 'Pontiac',          circuit:  6, circuitCourt: '6th Circuit Court',  probateCourt: 'Oakland County Probate Court'         },
  { name: 'Oceana',         countySeat: 'Hart',             circuit: 51, circuitCourt: '51st Circuit Court', probateCourt: 'Oceana County Probate Court'          },
  { name: 'Ogemaw',         countySeat: 'West Branch',      circuit: 34, circuitCourt: '34th Circuit Court', probateCourt: 'Ogemaw County Probate Court'          },
  { name: 'Ontonagon',      countySeat: 'Ontonagon',        circuit: 32, circuitCourt: '32nd Circuit Court', probateCourt: 'Ontonagon County Probate Court'       },
  { name: 'Osceola',        countySeat: 'Reed City',        circuit: 49, circuitCourt: '49th Circuit Court', probateCourt: 'Osceola County Probate Court'         },
  { name: 'Oscoda',         countySeat: 'Mio',              circuit: 23, circuitCourt: '23rd Circuit Court', probateCourt: 'Oscoda County Probate Court'          },
  { name: 'Otsego',         countySeat: 'Gaylord',          circuit: 46, circuitCourt: '46th Circuit Court', probateCourt: 'Otsego County Probate Court'          },
  { name: 'Ottawa',         countySeat: 'Grand Haven',      circuit: 20, circuitCourt: '20th Circuit Court', probateCourt: 'Ottawa County Probate Court'          },
  // ─── P ───────────────────────────────────────────────────────────────────────
  { name: 'Presque Isle',   countySeat: 'Rogers City',      circuit: 53, circuitCourt: '53rd Circuit Court', probateCourt: 'Presque Isle County Probate Court'    },
  // ─── R ───────────────────────────────────────────────────────────────────────
  { name: 'Roscommon',      countySeat: 'Roscommon',        circuit: 34, circuitCourt: '34th Circuit Court', probateCourt: 'Roscommon County Probate Court'       },
  // ─── S ───────────────────────────────────────────────────────────────────────
  { name: 'Saginaw',        countySeat: 'Saginaw',          circuit: 10, circuitCourt: '10th Circuit Court', probateCourt: 'Saginaw County Probate Court'         },
  { name: 'St. Clair',      countySeat: 'Port Huron',       circuit: 31, circuitCourt: '31st Circuit Court', probateCourt: 'St. Clair County Probate Court'       },
  { name: 'St. Joseph',     countySeat: 'Centreville',      circuit: 45, circuitCourt: '45th Circuit Court', probateCourt: 'St. Joseph County Probate Court'      },
  { name: 'Sanilac',        countySeat: 'Sandusky',         circuit: 24, circuitCourt: '24th Circuit Court', probateCourt: 'Sanilac County Probate Court'         },
  { name: 'Schoolcraft',    countySeat: 'Manistique',       circuit: 11, circuitCourt: '11th Circuit Court', probateCourt: 'Schoolcraft County Probate Court'     },
  { name: 'Shiawassee',     countySeat: 'Corunna',          circuit: 35, circuitCourt: '35th Circuit Court', probateCourt: 'Shiawassee County Probate Court'      },
  // ─── T ───────────────────────────────────────────────────────────────────────
  { name: 'Tuscola',        countySeat: 'Caro',             circuit: 54, circuitCourt: '54th Circuit Court', probateCourt: 'Tuscola County Probate Court'         },
  // ─── V ───────────────────────────────────────────────────────────────────────
  { name: 'Van Buren',      countySeat: 'Paw Paw',          circuit: 36, circuitCourt: '36th Circuit Court', probateCourt: 'Van Buren County Probate Court'       },
  // ─── W ───────────────────────────────────────────────────────────────────────
  { name: 'Washtenaw',      countySeat: 'Ann Arbor',        circuit: 22, circuitCourt: '22nd Circuit Court', probateCourt: 'Washtenaw County Probate Court'       },
  { name: 'Wayne',          countySeat: 'Detroit',          circuit:  3, circuitCourt: '3rd Circuit Court',  probateCourt: 'Wayne County Probate Court'           },
  { name: 'Wexford',        countySeat: 'Cadillac',         circuit: 28, circuitCourt: '28th Circuit Court', probateCourt: 'Wexford County Probate Court'         },
]

// Fast lookup by UPPERCASE county name (matches cleanCounty() output in Profile.tsx)
const _byCounty = new Map<string, MichiganCounty>()
for (const c of MICHIGAN_COUNTIES) _byCounty.set(c.name.toUpperCase(), c)

export function getMichiganCounty(county: string): MichiganCounty | undefined {
  return _byCounty.get(county.trim().toUpperCase())
}
