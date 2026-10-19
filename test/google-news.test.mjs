import test from 'node:test';
import assert from 'node:assert/strict';
import {googleId,navigationParams,navigationBody,loadGoogleProof} from '../src/google-news.mjs';
import {runArticles} from '../src/articles.mjs';
const id='CBMiModernOpaqueArticle12345',url='https://news.google.com/rss/articles/'+id;
const html=`<div data-n-a-id="${id}" data-n-a-ts="1792404663" data-n-a-sg="AbIaSL-mO7VGd5Ylva4NLuWrVH8D"></div>`;
test('Google HTTP navigation stays fixed-origin, binds params to one ID and forwards no app secrets',async()=>{
  let calls=0;
  const request=async(u,init)=>{
    calls++;assert.equal(init.headers.authorization,undefined);assert.equal(init.headers.cookie,undefined);assert.equal(init.headers['x-europe-collector-secret'],undefined);assert.equal(init.redirect,'manual');
    if(calls===1)return new Response(html);
    assert.equal(u,'https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je');assert.equal(init.method,'POST');
    const p=JSON.parse(new URLSearchParams(init.body).get('f.req'));assert.equal(JSON.parse(p[0][0][1])[2],id);
    return new Response('bounded rpc response');
  };
  const proof=await loadGoogleProof({url},{request});assert.equal(proof.googleHtml,html);assert.equal(proof.googleRpc,'bounded rpc response');
  assert.equal(googleId(url),id);assert.throws(()=>googleId('https://evil.example/rss/articles/'+id));
  assert.throws(()=>navigationParams(html,'CBMiDifferentId'));
  assert.throws(()=>navigationParams('x'.repeat(900001),id));
  assert.match(navigationBody(id,navigationParams(html,id)),/^f.req=/);
});
test('Google rate limits, consent and unsafe redirects do not become originals or browser bypass attempts',async()=>{
  await assert.rejects(loadGoogleProof({url},{request:async()=>new Response(null,{status:429})}),/google_rate_limited/);
  await assert.rejects(loadGoogleProof({url},{request:async()=>new Response(null,{status:503})}),/google_unavailable/);
  for(const location of ['https://consent.google.com/m','http://127.0.0.1/a','https://news.google.com/search?q=x'])await assert.rejects(loadGoogleProof({url},{request:async()=>new Response(null,{status:302,headers:{location}})}));
});
test('collector requires private issuer approval before any resolved publisher request',async()=>{
  let phase=0,approved=false,finished=false;
  const api=async body=>{
    if(body.action==='next'){assert.equal(body.protocol,2);if(finished)return {more:false,job:null};return {more:true,job:{id:'one',token:'lease',kind:'google',url,allowedHosts:['news.google.com']}};}
    if(body.action==='resolve'){assert.equal(body.googleHtml,html);approved=true;return {status:'authorized',job:{id:'one',token:'lease',url:'https://publisher.example.com/story',allowedHosts:['publisher.example.com']}};}
    assert.equal(body.action,'finish');assert.equal(body.url,'https://publisher.example.com/story');assert.equal(body.html,'visible article');finished=true;return {status:'succeeded'};
  };
  const request=async u=>{
    phase++;
    if(u.startsWith('https://news.google.com/'))return new Response(phase===1?html:'rpc');
    assert.equal(approved,true);return u.endsWith('robots.txt')?new Response('',{status:404}):new Response('visible article',{headers:{'content-type':'text/html'}});
  };
  const result=await runArticles(api,{deadline:500000,now:()=>0,request});assert.equal(result.stored,1);assert.equal(result.pending,false);
});
