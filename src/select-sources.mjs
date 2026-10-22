// An optional manual probe narrows the server-authorized due registry. It can
// never add a URL, force a poll or expand the credential's region/permissions.
// Interleave regional queues so a large alphabetically-first region cannot
// consume every run's time budget before Asia, Africa or Oceania are reached.
const southAmerica = new Set(['AR','BO','BR','CL','CO','EC','GF','GY','PE','PY','SR','UY','VE']);
const northAmerica = new Set(['AG','BB','BS','BZ','CA','CR','CU','DM','DO','GD','GT','HN','HT','JM','KN','LC','MX','NI','PA','PR','SV','TT','US','VC']);
const africa = new Set(['Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cabo Verde','Cameroon','Central African Republic','Chad','Comoros','Congo','DR Congo','Egypt','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Ivory Coast','Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi','Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda','Senegal','Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe']);
const asia = new Set(['Afghanistan','Armenia','Azerbaijan','Bahrain','Bangladesh','Bhutan','Brunei','Cambodia','China','Cyprus','Georgia','Hong Kong','India','Indonesia','Iran','Iraq','Israel','Japan','Jordan','Kazakhstan','Kuwait','Kyrgyzstan','Laos','Lebanon','Malaysia','Maldives','Mongolia','Myanmar','Nepal','North Korea','Oman','Pakistan','Palestine','Philippines','Qatar','Saudi Arabia','Singapore','South Korea','Sri Lanka','Syria','Taiwan','Tajikistan','Thailand','Timor-Leste','Turkey','Turkmenistan','United Arab Emirates','Uzbekistan','Vietnam','Yemen']);
const oceania = new Set(['Australia','Fiji','Kiribati','Marshall Islands','Micronesia','Nauru','New Zealand','Palau','Papua New Guinea','Samoa','Solomon Islands','Tonga','Tuvalu','Vanuatu']);
const southCountries = new Set(['Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','French Guiana','Guyana','Paraguay','Peru','Suriname','Uruguay','Venezuela']);
const northCountries = new Set(['Antigua and Barbuda','Bahamas','Barbados','Belize','Canada','Costa Rica','Cuba','Dominica','Dominican Republic','El Salvador','Grenada','Guatemala','Haiti','Honduras','Jamaica','Mexico','Nicaragua','Panama','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Trinidad and Tobago','United States','United States of America']);

const countryCapitalRegionByIso=new Map([["AF","asia"],["AO","africa"],["AL","europe"],["AD","europe"],["AE","asia"],["AR","south-america"],["AM","asia"],["AG","north-america"],["AU","australia"],["AT","europe"],["AZ","asia"],["BI","africa"],["BE","europe"],["BJ","africa"],["BF","africa"],["BD","asia"],["BG","europe"],["BH","asia"],["BS","north-america"],["BA","europe"],["BY","europe"],["BZ","north-america"],["BO","south-america"],["BR","south-america"],["BB","north-america"],["BN","asia"],["BT","asia"],["BW","africa"],["CF","africa"],["CA","north-america"],["CH","europe"],["CL","south-america"],["CN","asia"],["CI","africa"],["CM","africa"],["CD","africa"],["CG","africa"],["CO","south-america"],["KM","africa"],["CV","africa"],["CR","north-america"],["CU","north-america"],["CY","europe"],["CZ","europe"],["DE","europe"],["DJ","africa"],["DM","north-america"],["DK","europe"],["DO","north-america"],["DZ","africa"],["EC","south-america"],["EG","africa"],["ER","africa"],["ES","europe"],["EE","europe"],["ET","africa"],["FI","europe"],["FJ","australia"],["FR","europe"],["FM","australia"],["GA","africa"],["GB","europe"],["GE","asia"],["GH","africa"],["GN","africa"],["GM","africa"],["GW","africa"],["GQ","africa"],["GR","europe"],["GD","north-america"],["GT","north-america"],["GY","south-america"],["HN","north-america"],["HR","europe"],["HT","north-america"],["HU","europe"],["ID","asia"],["IN","asia"],["IE","europe"],["IR","asia"],["IQ","asia"],["IS","europe"],["IL","asia"],["IT","europe"],["JM","north-america"],["JO","asia"],["JP","asia"],["KZ","asia"],["KE","africa"],["KG","asia"],["KH","asia"],["KI","australia"],["KN","north-america"],["KR","asia"],["KW","asia"],["LA","asia"],["LB","asia"],["LR","africa"],["LY","africa"],["LC","north-america"],["LI","europe"],["LK","asia"],["LS","africa"],["LT","europe"],["LU","europe"],["LV","europe"],["MA","africa"],["MC","europe"],["MD","europe"],["MG","africa"],["MV","asia"],["MX","north-america"],["MH","australia"],["MK","europe"],["ML","africa"],["MT","europe"],["MM","asia"],["ME","europe"],["MN","asia"],["MZ","africa"],["MR","africa"],["MU","africa"],["MW","africa"],["MY","asia"],["NA","africa"],["NE","africa"],["NG","africa"],["NI","north-america"],["NL","europe"],["NO","europe"],["NP","asia"],["NR","australia"],["NZ","australia"],["OM","asia"],["PK","asia"],["PA","north-america"],["PE","south-america"],["PH","asia"],["PW","australia"],["PG","australia"],["PL","europe"],["KP","asia"],["PT","europe"],["PY","south-america"],["PS","asia"],["QA","asia"],["RO","europe"],["RU","europe"],["RW","africa"],["SA","asia"],["SD","africa"],["SN","africa"],["SG","asia"],["SB","australia"],["SL","africa"],["SV","north-america"],["SM","europe"],["SO","africa"],["RS","europe"],["SS","africa"],["ST","africa"],["SR","south-america"],["SK","europe"],["SI","europe"],["SE","europe"],["SZ","africa"],["SC","africa"],["SY","asia"],["TD","africa"],["TG","africa"],["TH","asia"],["TJ","asia"],["TM","asia"],["TL","asia"],["TO","australia"],["TT","north-america"],["TN","africa"],["TR","asia"],["TV","australia"],["TZ","africa"],["UG","africa"],["UA","europe"],["UY","south-america"],["US","north-america"],["UZ","asia"],["VA","europe"],["VC","north-america"],["VE","south-america"],["VN","asia"],["VU","australia"],["WS","australia"],["YE","asia"],["ZA","africa"],["ZM","africa"],["ZW","africa"]]);

function regionOf(source) {
  const id=source.id.toLowerCase();
  if(id.startsWith('oceania-city-'))return 'oceania';
  if(id.startsWith('americas-city-')){
    const iso=id.split('-')[2]?.toUpperCase();
    return southAmerica.has(iso)?'south-america':'north-america';
  }
  if(id.startsWith('country-capital-')){
    const iso=id.slice('country-capital-'.length).toUpperCase();
    const region=countryCapitalRegionByIso.get(iso);
    if(region==='australia')return 'oceania';
    if(region)return region;
  }
  const country=typeof source.country==='string'?source.country.trim():'';
  if(africa.has(country))return 'africa';
  if(asia.has(country))return 'asia';
  if(oceania.has(country))return 'oceania';
  if(southAmerica.has(country)||southCountries.has(country))return 'south-america';
  if(northAmerica.has(country)||northCountries.has(country))return 'north-america';
  return 'europe';
}

function interleaveByRegion(sources) {
  // Reserve more slots for Asia, Africa and Oceania until their coverage
  // catches up. Europe and both Americas still receive guaranteed early slots.
  const schedule=['europe','north-america','south-america','asia','africa','oceania','asia','africa','oceania','asia','africa','oceania'];
  const queues=new Map([...new Set(schedule)].map(region=>[region,[]]));
  for(const source of sources)queues.get(regionOf(source)).push(source);
  const ordered=[];
  while(ordered.length<sources.length){
    for(const region of schedule){
      const source=queues.get(region).shift();
      if(source)ordered.push(source);
    }
  }
  return ordered;
}

export function selectSources(sources,prefix=''){
  if(!/^[a-z0-9-]{0,80}$/.test(prefix))throw new Error('Invalid source prefix');
  // The API may return several hundred city feeds now that worldwide regions
  // are enabled. Keep a generous bound against malformed responses without
  // rejecting the valid global registry.
  if(!Array.isArray(sources)||sources.length>1000||sources.some(source=>!source||typeof source.id!=='string'))throw new Error('Invalid source registry');
  const selected=prefix?sources.filter(source=>source.id.startsWith(prefix)):sources;
  return interleaveByRegion(selected);
}
