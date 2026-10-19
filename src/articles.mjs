import {publicUrl} from './feed.mjs';
import {publicRequest} from './public-request.mjs';
import {loadGoogleProof} from './google-news.mjs';
const agent='CrimeWebArticleCollector/1.0';
export function robotsAllowed(text,path){
  const groups=[];let agents=[],rules=[],started=false;
  for(const line of text.split(/\r?\n/)){
    const m=line.replace(/#.*/,'').match(/^\s*(user-agent|allow|disallow)\s*:\s*(.*?)\s*$/i);if(!m)continue;
    if(m[1].toLowerCase()==='user-agent'){if(started){groups.push({agents,rules});agents=[];rules=[];started=false;}agents.push(m[2].toLowerCase());}
    else if(agents.length){started=true;if(m[2])rules.push({allow:m[1].toLowerCase()==='allow',path:m[2]});}
  }
  groups.push({agents,rules});
  const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&agent.toLowerCase().includes(a)));
  const selected=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
  const matched=selected.flatMap(g=>g.rules).filter(r=>{const pattern=r.path.split('*').map(s=>s.replace(/[.+?^{}()|[\]\\]/g,'\\$&')).join('.*');return new RegExp('^'+pattern).test(path);}).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
  return matched[0]?.allow??true;
}
async function bounded(response,max){
  if(Number(response.headers.get('content-length'))>max)throw new Error('oversized');
  const reader=response.body?.getReader();if(!reader)throw new Error('empty_body');
  const parts=[];let n=0;
  try{for(;;){const r=await reader.read();if(r.done)break;n+=r.value.length;if(n>max)throw new Error('oversized');parts.push(r.value);}}finally{await reader.cancel();}
  return Buffer.concat(parts).toString('utf8');
}
export async function loadArticle(job,{request=publicRequest,robotsCache=new Map()}={}){
  const check=value=>{const u=publicUrl(value);if(!job.allowedHosts.includes(u.hostname))throw new Error('redirect_blocked');return u;};
  let url=check(job.url);
  for(let hop=0;hop<4;hop++){
    let robots=robotsCache.get(url.origin);
    if(robots===undefined){
      let robotUrl=check(url.origin+'/robots.txt');
      for(let hop=0;hop<4;hop++){
        const r=await request(robotUrl.href,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'user-agent':agent}});
        if(r.status>=300&&r.status<400){await r.body?.cancel();robotUrl=check(new URL(r.headers.get('location')||'',robotUrl).href);continue;}
        if(r.status===404)robots='';
        else if(r.ok)robots=await bounded(r,300000);
        else if(r.status===429||r.status>=500)throw new Error('http_'+r.status);
        else throw new Error('robots_denied');
        break;
      }
      if(robots===undefined)throw new Error('redirect_limit');
      robotsCache.set(url.origin,robots);
    }
    if(!robotsAllowed(robots,url.pathname+url.search))throw new Error('robots_denied');
    const r=await request(url.href,{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'user-agent':agent,accept:'text/html'}});
    if(r.status>=300&&r.status<400){await r.body?.cancel();url=check(new URL(r.headers.get('location')||'',url).href);continue;}
    if(!r.ok)throw new Error('http_'+r.status);
    if(!/text\/html|application\/xhtml\+xml/i.test(r.headers.get('content-type')??''))throw new Error('unsupported_type');
    return {url:url.href,html:await bounded(r,1_000_000)};
  }
  throw new Error('redirect_limit');
}
/** Only transport: jobs and allowed origins come from the authenticated app.
 * Classification, extraction and raw article storage stay in its private code. */
export async function runArticles(api,{deadline,now=Date.now,maxSteps=150,request}={}){
  let steps=0,stored=0,unavailable=0,pending=true;const robotsCache=new Map();
  while(steps<maxSteps&&now()<deadline-120000){
    const result=await api({action:'next',protocol:2});steps++;
    if(typeof result?.more!=='boolean')throw new Error('Invalid article queue acknowledgement');
    pending=result.more;
    if(!result.job){if(!pending)break;continue;}
    let job=result.job;
    if(typeof job.id!=='string'||typeof job.token!=='string'||!Array.isArray(job.allowedHosts)||job.allowedHosts.length>100)throw new Error('Invalid article job');
    let delivery;
    try{
      if(job.kind==='google'){
        const proof=await loadGoogleProof(job,{request});
        const resolved=await api({action:'resolve',id:job.id,token:job.token,...proof});
        if(resolved.status==='stale'){unavailable++;continue;}
        if(resolved.status!=='authorized'||resolved.job?.id!==job.id||resolved.job?.token!==job.token||!Array.isArray(resolved.job?.allowedHosts)||resolved.job.allowedHosts.length>100)throw new Error('Invalid article origin acknowledgement');
        job=resolved.job;
      }
      delivery=await loadArticle(job,{robotsCache,request});
    }
    catch(e){const code=/^(?:http_(?:401|403|404|429|500|502|503|504)|robots_denied|unsupported_type|oversized|redirect_blocked|redirect_limit|empty_body|google_unresolved|google_rate_limited|google_unavailable)$/.test(e.message)?e.message:'network';delivery={error:code};}
    const saved=await api({action:'finish',id:job.id,token:job.token,...delivery});
    if(saved.status==='succeeded')stored++;
    else if(['unavailable','stale'].includes(saved.status))unavailable++;
    else throw new Error('Invalid article storage acknowledgement');
  }
  return {steps,stored,unavailable,pending};
}
