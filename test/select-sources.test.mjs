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
void test('source selection rejects malformed registries and input rather than evaluating it',()=>{
  for(const value of ['https://other.example.com','../','x; echo token','x'.repeat(81),'LOCAL'])assert.throws(()=>selectSources([],value));
  for(const input of [null,{},Array(201).fill({id:'x'}),[null],[{url:'https://example.com'}]])assert.throws(()=>selectSources(input));
});
