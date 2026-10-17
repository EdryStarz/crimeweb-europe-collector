import assert from 'node:assert/strict';
import test from 'node:test';
import {loadFeed} from '../src/feed.mjs';
const xml='<rss><channel><item><guid>a</guid><title>Example</title><link>https://example.com/a</link><pubDate>Sat, 17 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>';
void test('transient RSS HTTP and network failures retry without any application credential',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,options)=>{
    assert.equal(new Headers(options.headers).has('x-europe-collector-secret'),false);
    calls++;if(calls===1)return new Response(null,{status:503});if(calls===2)throw new TypeError('fetch failed');return new Response(xml);
  };
  try{assert.equal((await loadFeed('https://example.com/feed')).length,1);assert.equal(calls,3);}finally{globalThis.fetch=original;}
});
void test('access denials and invalid XML are not retried or bypassed',async()=>{
  const original=globalThis.fetch;
  try{
    for(const response of [()=>new Response(null,{status:403}),()=>new Response('<html>not a feed</html>')]){
      let calls=0;globalThis.fetch=async()=>{calls++;return response();};
      await assert.rejects(loadFeed('https://example.com/feed'));assert.equal(calls,1);
    }
  }finally{globalThis.fetch=original;}
});
