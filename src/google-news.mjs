import {publicUrl} from './feed.mjs';
import {publicRequest} from './public-request.mjs';

// Bounded public link navigation, not crawling a Google article body.
// Protocol reference: https://github.com/SSujitX/google-news-url-decoder
// No cookies, proxies, login, CAPTCHA handling or rate-limit circumvention.
export function googleId(value){
  const u=publicUrl(value),m=u.pathname.match(/^\/(?:rss\/articles|articles|read)\/([A-Za-z0-9_-]{10,4096})$/);
  if(u.hostname!=='news.google.com'||!m)throw new Error('google_unresolved');return m[1];
}
export function navigationParams(html,id){
  if(Buffer.byteLength(html)>900000)throw new Error('oversized');
  for(const tag of html.matchAll(/<div\b[^>]*>/gi)){
    const a=Object.fromEntries([...tag[0].matchAll(/\b(data-n-a-(?:id|sg|ts))\s*=\s*["']([^"']*)["']/gi)].map(m=>[m[1].toLowerCase(),m[2]]));
    if(a['data-n-a-id']!==id)continue;
    if(/^[A-Za-z0-9_-]{10,256}$/.test(a['data-n-a-sg']??'')&&/^\d{9,12}$/.test(a['data-n-a-ts']??''))return {signature:a['data-n-a-sg'],timestamp:Number(a['data-n-a-ts'])};
  }
  throw new Error('google_unresolved');
}
export function navigationBody(id,params){
  const context=[['X','X',['X','X'],null,null,1,1,'US:en',null,1,null,null,null,null,null,0,1],'X','X',1,[1,1,1],1,1,null,0,0,null,0];
  return new URLSearchParams({'f.req':JSON.stringify([[['Fbv4je',JSON.stringify(['garturlreq',context,id,params.timestamp,params.signature])]]])}).toString();
}
async function text(response,max){
  if(!response.ok)throw new Error(response.status===429?'google_rate_limited':'google_unavailable');
  if(Number(response.headers.get('content-length'))>max)throw new Error('oversized');
  const reader=response.body?.getReader();if(!reader)throw new Error('empty_body');const parts=[];let n=0;
  try{for(;;){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>max)throw new Error('oversized');parts.push(r.value);}}finally{await reader.cancel();}
  return Buffer.concat(parts).toString('utf8');
}
export async function loadGoogleProof(job,{request=publicRequest}={}){
  const id=googleId(job.url);let u=new URL('https://news.google.com/rss/articles/'+id+'?hl=en-US&gl=US&ceid=US:en');
  let googleHtml='';
  for(let hop=0;hop<3;hop++){
    const r=await request(u.href,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{accept:'text/html','user-agent':'CrimeWebLinkResolver/1.0'}});
    if(r.status>=300&&r.status<400){
      await r.body?.cancel();const next=publicUrl(new URL(r.headers.get('location')??'',u).href);
      if(next.hostname!=='news.google.com'){
        if(/(^|\.)(google\.com|gstatic\.com|googleusercontent\.com)$/.test(next.hostname))throw new Error('google_unavailable');
        return {googleRedirect:next.href};
      }
      if(googleId(next.href)!==id)throw new Error('google_unresolved');u=next;continue;
    }
    googleHtml=await text(r,900000);break;
  }
  const params=navigationParams(googleHtml,id);
  // POST is permitted only at this fixed Google endpoint, never to publishers.
  // It receives no application headers and follows no redirects.
  const r=await request('https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8','user-agent':'CrimeWebLinkResolver/1.0'},body:navigationBody(id,params)});
  return {googleHtml,googleRpc:await text(r,100000)};
}
