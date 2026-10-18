import test from 'node:test';
import assert from 'node:assert/strict';
import {loadArticle,robotsAllowed,runArticles} from '../src/articles.mjs';
test('robots rules use the specific agent, longest path and allow ties',()=>{
  assert.equal(robotsAllowed('User-agent: *\nDisallow: /private\nAllow: /private/public','/private/story'),false);
  assert.equal(robotsAllowed('User-agent: *\nDisallow: /private\nAllow: /private/public','/private/public/story'),true);
  assert.equal(robotsAllowed('User-agent: *\nDisallow: /\nUser-agent: CrimeWeb\nAllow: /','/story'),true);
});
test('article transport validates every redirect and never sends application credentials to publishers',async()=>{
  const job={url:'https://news.example.com/story',allowedHosts:['news.example.com']};let count=0;
  const request=async(url,init)=>{count++;assert.equal(init.headers['x-europe-collector-secret'],undefined);return String(url).endsWith('robots.txt')?new Response('User-agent: *\nAllow: /'):new Response('',{status:302,headers:{location:'http://127.0.0.1/secret'}});};
  await assert.rejects(loadArticle(job,{request}));assert.equal(count,2);
  await assert.rejects(loadArticle(job,{request:async()=>new Response('User-agent: *\nDisallow: /')}),/robots_denied/);
  await assert.rejects(loadArticle(job,{request:async(url)=>String(url).endsWith('robots.txt')?new Response('',{status:404}):new Response('x',{headers:{'content-type':'application/json'}})}),/unsupported_type/);
});
test('an empty queue ends without fetching a publisher; malformed responses fail closed',async()=>{
  assert.deepEqual(await runArticles(async()=>({more:false,job:null}),{deadline:500000,now:()=>0}),{steps:1,stored:0,unavailable:0,pending:false});
  await assert.rejects(runArticles(async()=>({}),{deadline:500000,now:()=>0}));
});
