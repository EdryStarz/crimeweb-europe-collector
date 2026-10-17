// An optional manual probe narrows the server-authorized due registry. It can
// never add a URL, force a poll or expand the credential's region/permissions.
export function selectSources(sources,prefix=''){
  if(!/^[a-z0-9-]{0,80}$/.test(prefix))throw new Error('Invalid source prefix');
  if(!Array.isArray(sources)||sources.length>200||sources.some(source=>!source||typeof source.id!=='string'))throw new Error('Invalid source registry');
  return prefix?sources.filter(source=>source.id.startsWith(prefix)):sources;
}
