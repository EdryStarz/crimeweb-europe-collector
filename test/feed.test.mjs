import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFeed,publicUrl } from '../src/feed.mjs';
const date='Sat, 17 Oct 2026 12:00:00 GMT',now=Date.parse(date);
const xml=`<rss><channel><item><title>Fire in Berlin - Paris Daily</title><link>https://news.example.com/a</link><guid>one</guid><source>Paris Daily</source><pubDate>${date}</pubDate><description>Unrelated publisher description</description></item></channel></rss>`;
void test('Google RSS preserves dates and stable identity, strips publisher attribution, never invents article text',()=>{
  const [item]=parseFeed(xml,'https://news.google.com/rss/search',now);
  assert.equal(item.title,'Fire in Berlin');assert.equal(item.text,item.title);assert.equal(item.externalId,'one');assert.equal(item.publishedAt,new Date(now).toISOString());
});
void test('invalid links, missing dates, future dates and duplicate IDs cannot become fresh reports',()=>{
  for(const text of [xml.replace('<pubDate>'+date+'</pubDate>',''),xml.replace(date,'Sat, 17 Oct 2037 12:00:00 GMT'),xml.replace('https://news.example.com/a','http://localhost/a')])assert.equal(parseFeed(text,'https://news.google.com/rss',now).length,0);
  assert.equal(parseFeed(xml.replace('</channel>',xml.match(/<item>[\s\S]*<\/item>/)[0]+'</channel>'),'https://news.google.com/rss',now).length,1);
});
void test('private hosts, credentials, unsafe XML and nonfeeds are rejected',()=>{
  for(const u of ['http://localhost/','https://127.0.0.1/','https://u:p@example.com/','https://host.internal/'])assert.throws(()=>publicUrl(u));
  assert.throws(()=>parseFeed('<!DOCTYPE rss>'+xml,'https://news.google.com/rss',now));
  assert.throws(()=>parseFeed('<html>Unavailable</html>','https://news.google.com/rss',now));
});
void test('Atom entries preserve public alternate links',()=>{
  const atom='<feed><entry><id>atom1</id><title>Example</title><link href="https://news.example.com/a" rel="alternate"/><updated>2026-10-17T12:00:00.000Z</updated><summary>Body</summary></entry></feed>';
  assert.equal(parseFeed(atom,'https://news.example.com/feed',now)[0].externalId,'atom1');
});
