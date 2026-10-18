import assert from 'node:assert/strict';
const scenario=process.env.TEST_SCENARIO,token='test-only-collector-secret';let batches=0,stored;
globalThis.fetch=async(value,options={})=>{
  const url=new URL(value),headers=new Headers(options.headers);
  assert.equal(url.href.includes(token),false);
  if(url.hostname==='news.google.com'){
    assert.notEqual(scenario,'maintenance-only','Historical maintenance must not download RSS');
    assert.equal(headers.has('x-europe-collector-secret'),false);
    return new Response('<rss><channel><item><guid>one</guid><title>Example report</title><link>https://publisher.example.com/article</link><pubDate>Sat, 17 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>');
  }
  assert.equal(url.origin,'https://collector.example.com');assert.equal(options.redirect,'error');assert.equal(headers.get('x-europe-collector-secret'),token);
  if(scenario==='unauthorized')return new Response(null,{status:401});
  if(url.pathname==='/api/ingest/locations'){
    assert.deepEqual(JSON.parse(options.body),{});
    return Response.json({updated:0,more:false});
  }
  if(url.searchParams.has('jobId'))return Response.json({job:{...stored,created:scenario==='bad-readback'?999:stored.created,completedAt:Date.now()}});
  if(!options.body)return Response.json({sources:[{id:'example-rss',url:scenario==='private-source'?'https://127.0.0.1/feed':'https://news.google.com/rss'}]});
  const body=JSON.parse(options.body);
  assert.notEqual(scenario,'maintenance-only','Historical maintenance must not create or complete feed jobs');
  if(body.action==='begin')return Response.json({jobId:'41365848-9dd8-4a56-97c9-b64ee01003fb'});
  if(body.action==='items'){batches++;return Response.json({results:body.items.map(()=>({status:batches===1?'retry':'created'}))});}
  assert.equal(body.action,'finish');stored=body;return Response.json({completed:true});
};
