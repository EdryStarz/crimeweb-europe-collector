import { XMLParser } from 'fast-xml-parser';

export function publicUrl(value){
  const u=new URL(value),host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!host.includes('.')||/^[\d.]+$/.test(host)||host.includes(':')||/(^|\.)(localhost|local|internal|test|invalid)$/.test(host))throw new Error('A public HTTPS hostname is required');
  return u;
}
const string=value=>typeof value==='string'||typeof value==='number'?String(value):value&&typeof value==='object'?string(value['#text']??value['@_href']??value.href):'';
const plain=value=>string(value).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const array=value=>Array.isArray(value)?value:value&&typeof value==='object'?[value]:[];

export function parseFeed(xml,feedUrl,now=Date.now()){
  if(Buffer.byteLength(xml)>2_000_000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Unsafe or oversized XML');
  const root=new XMLParser({ignoreAttributes:false,processEntities:false}).parse(xml);
  const rss=root.rss?.channel,atom=root.feed;
  if(!rss&&!atom)throw new Error('Not an RSS or Atom feed');
  const google=publicUrl(feedUrl).hostname==='news.google.com';
  const result=[],seen=new Set();
  for(const row of array(rss?rss.item:atom.entry).slice(0,50)){
    const link=string(Array.isArray(row.link)?row.link.find(l=>l['@_rel']==='alternate')??row.link[0]:row.link);
    let url;try{url=publicUrl(link).href;}catch{continue;}
    const publishedAt=new Date(string(row.pubDate??row.published??row.updated));
    if(!Number.isFinite(publishedAt.getTime())||publishedAt.getTime()>now+3600000)continue;
    let title=plain(row.title);const publisher=plain(row.source);
    if(google&&publisher&&title.endsWith(' - '+publisher))title=title.slice(0,-publisher.length-3);
    const externalId=string(row.guid??row.id)||url;
    if(!title||seen.has(externalId)||externalId.length>12000||url.length>12000)continue;
    seen.add(externalId);title=title.slice(0,2000);
    result.push({externalId,url,title,text:google?title:plain(title+' '+string(row['content:encoded']??row.content??row.description??row.summary)).slice(0,100000),publishedAt:publishedAt.toISOString()});
  }
  return result;
}

export async function loadFeed(value){
  let url=publicUrl(value);
  for(let attempt=0;attempt<4;attempt++){
    const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30000),headers:{accept:'application/rss+xml, application/atom+xml, application/xml, text/xml','user-agent':'EuropeRSSCollector/1.0'}});
    if(response.status>=300&&response.status<400){url=publicUrl(new URL(response.headers.get('location')||'',url).href);continue;}
    if(!response.ok)throw new Error('RSS HTTP '+response.status);
    const reader=response.body?.getReader();if(!reader)throw new Error('Empty RSS response');
    const parts=[];let size=0;
    try{for(;;){const {done,value:chunk}=await reader.read();if(done)break;size+=chunk.length;if(size>2_000_000)throw new Error('RSS exceeds size limit');parts.push(chunk);}}finally{await reader.cancel();}
    return parseFeed(Buffer.concat(parts).toString('utf8'),url.href);
  }
  throw new Error('RSS redirect limit');
}
