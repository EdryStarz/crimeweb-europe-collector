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

function regionOf(source) {
  const id=source.id.toLowerCase();
  if(id.startsWith('oceania-city-'))return 'oceania';
  if(id.startsWith('americas-city-')){
    const iso=id.split('-')[2]?.toUpperCase();
    return southAmerica.has(iso)?'south-america':'north-america';
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
  const regions=['europe','north-america','south-america','asia','africa','oceania'];
  const queues=new Map(regions.map(region=>[region,[]]));
  for(const source of sources)queues.get(regionOf(source)).push(source);
  const ordered=[];
  while(ordered.length<sources.length){
    for(const region of regions){
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
