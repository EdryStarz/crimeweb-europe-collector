import { appendFileSync } from 'node:fs';
import { setTimeout as wait } from 'node:timers/promises';
import { publicUrl,loadFeed } from './feed.mjs';
import { selectSources } from './select-sources.mjs';
import {runMaintenance} from './maintenance.mjs';
import {runArticles} from './articles.mjs';

const origin=publicUrl(process.env.INGESTION_API_URL).origin,key=process.env.EUROPE_COLLECTOR_SECRET;
if(!key)throw new Error('Missing protected collector credential');
const deadline=Date.now()+11*60000,summary={feeds:0,fetched:0,created:0,review:0,failed:0};
const path='/api/ingest/feed';
async function api(body,query='',endpoint=path){
  for(let attempt=0;;attempt++){
    const response=await fetch(origin+endpoint+query,{redirect:'error',method:body?'POST':'GET',headers:{'content-type':'application/json','x-europe-collector-secret':key},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(90000)});
    if(response.ok)return response.json();
    if(attempt<3&&[429,502,503,504].includes(response.status)){await wait(1000*2**attempt);continue;}
    throw new Error('Application HTTP '+response.status);
  }
}
const maintenanceOnly=process.env.MAINTENANCE_ONLY==='true';
const data=await api(),selected=selectSources(data.sources,process.env.SOURCE_ID_PREFIX??''),sources=maintenanceOnly?[]:selected;
console.log(JSON.stringify({event:'started',due:sources.length,maintenanceOnly}));
for(const source of sources){
  if(Date.now()>deadline-180000)break;
  const start=await api({action:'begin',sourceId:source.id});if(!start.jobId)continue;
  const base={sourceId:source.id,jobId:start.jobId},counts={fetched:0,created:0,review:0,failed:0};let error;
  try{
    const items=await loadFeed(source.url);counts.fetched=items.length;
    for(let offset=0;offset<items.length;offset+=5){
      let pending=items.slice(offset,offset+5);
      for(let attempt=0;pending.length&&attempt<4;attempt++){
        const answer=await api({...base,action:'items',items:pending});
        if(!Array.isArray(answer.results)||answer.results.length!==pending.length)throw new Error('Invalid ingestion acknowledgement');
        const retry=[];
        answer.results.forEach((result,index)=>{
          if(result.status==='retry')retry.push(pending[index]);
          else if(result.status==='created')counts.created++;
          else if(result.status==='review')counts.review++;
          else if(!['merged','rejected','duplicate-source'].includes(result.status))throw new Error('Unknown ingestion result');
        });
        pending=retry;if(pending.length)await wait(1000*2**attempt);
      }
      counts.failed+=pending.length;
    }
  }catch{error='Feed transport or processing failed';counts.failed++;}
  await api({...base,action:'finish',...counts,...(error?{error}:{})});
  const readback=await api(undefined,'?jobId='+encodeURIComponent(start.jobId));
  if(readback.job?.fetched!==counts.fetched||readback.job?.created!==counts.created||!readback.job?.completedAt)throw new Error('Persisted job verification failed');
  console.log(JSON.stringify({event:'completed',sourceId:source.id,...counts,persisted:true}));
  summary.feeds++;for(const name of ['fetched','created','review','failed'])summary[name]+=counts[name];
}
// The private server chooses archived article jobs. Only bounded public HTML is
// transported; nothing is committed or printed, and no app algorithms are here.
const articles=await runArticles(body=>api(body,'','/api/ingest/articles'),{deadline});
console.log(JSON.stringify({event:'articles',...articles}));
const articleStates=await api({action:'stats'},'','/api/ingest/articles');
console.log(JSON.stringify({event:'article-states',...articleStates}));
// Server selects eligible reports and enforces European scope. No coordinates
// or incident IDs are supplied or printed by location maintenance.
const maintenance=await runMaintenance(()=>api({},'','/api/ingest/locations'),{deadline});
console.log(JSON.stringify({event:'maintenance',...maintenance}));
console.log(JSON.stringify({event:'summary',...summary}));
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Europe RSS collection\n\n'+Object.entries(summary).map(([name,count])=>'- '+name+': '+count).join('\n')+'\n\nSource reports are not independent verification.\n');
if(process.env.GITHUB_OUTPUT)for(const [name,count] of Object.entries(summary))appendFileSync(process.env.GITHUB_OUTPUT,name+'='+count+'\n');
if(summary.failed)process.exitCode=1;
