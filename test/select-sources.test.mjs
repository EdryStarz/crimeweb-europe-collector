import assert from 'node:assert/strict';
import test from 'node:test';
import {selectSources} from '../src/select-sources.mjs';

void test('manual source selection narrows the due registry and preserves order within a region',()=>{
  const input=[{id:'example-a'},{id:'local-one'},{id:'example-b'},{id:'local-two'}];
  assert.deepEqual(selectSources(input),input);
  assert.deepEqual(selectSources(input,'local-'),[input[1],input[3]]);
  assert.deepEqual(selectSources(input,'unknown-'),[]);
  assert.equal(input.length,4);
});
void test('due feeds are interleaved so every configured continent gets an early collection slot',()=>{
  const europe={id:'europe-city-fr-paris',country:'France'};
  const northAmerica={id:'americas-city-us-atlanta',country:'United States'};
  const southAmerica={id:'americas-city-br-brasilia',country:'Brazil'};
  const asia={id:'world-city-tokyo',country:'Japan'};
  const africa={id:'world-city-cairo',country:'Egypt'};
  const oceania={id:'oceania-city-au-sydney',country:'Australia'};
  const input=[northAmerica,southAmerica,asia,africa,oceania,europe];
  assert.deepEqual(selectSources(input),[europe,northAmerica,southAmerica,asia,africa,oceania]);
});
void test('limited run budget gives extra source slots to underserved Asia, Africa and Oceania',()=>{
  const countries=['France','United States','Brazil','Japan','Egypt','Australia'];
  const input=countries.flatMap((country,index)=>Array.from({length:10},(_,n)=>({
    id:'source-'+index+'-'+n,country
  })));
  const firstRun=selectSources(input).slice(0,19);
  const count=(country)=>firstRun.filter(source=>source.country===country).length;
  assert.deepEqual(countries.map(count),[2,2,2,5,4,4]);
  assert.equal(new Set(selectSources(input).map(source=>source.id)).size,input.length);
});
void test('country-capital feeds route by ISO code even when country labels are unfamiliar',()=>{
  const input=[
    {id:'country-capital-nz',country:'New Zealand'},
    {id:'country-capital-ke',country:'Kenya'},
    {id:'country-capital-jp',country:'Japan'},
    {id:'country-capital-br',country:'Brazil'},
    {id:'country-capital-us',country:'United States'},
    {id:'country-capital-va',country:'Holy See'},
  ];
  assert.deepEqual(selectSources(input).map(source=>source.id),[
    'country-capital-va','country-capital-us','country-capital-br',
    'country-capital-jp','country-capital-ke','country-capital-nz',
  ]);
});
void test('worldwide registries over the old 200-source limit are accepted but remain bounded',()=>{
  const input=Array.from({length:284},(_,index)=>({id:'world-city-'+index,country:'Japan'}));
  assert.equal(selectSources(input).length,284);
  assert.throws(()=>selectSources(Array(1001).fill({id:'x'})));
});
void test('source selection rejects malformed registries and input rather than evaluating it',()=>{
  for(const value of ['https://other.example.com','../','x; echo token','x'.repeat(81),'LOCAL'])assert.throws(()=>selectSources([],value));
  for(const input of [null,{},[null],[{url:'https://example.com'}]])assert.throws(()=>selectSources(input));
});
