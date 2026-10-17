import assert from 'node:assert/strict';
import test from 'node:test';
import {selectSources} from '../src/select-sources.mjs';

void test('manual source selection only narrows the due registry and keeps its order',()=>{
  const input=[{id:'example-a'},{id:'local-one'},{id:'example-b'},{id:'local-two'}];
  assert.deepEqual(selectSources(input),input);
  assert.deepEqual(selectSources(input,'local-'),[input[1],input[3]]);
  assert.deepEqual(selectSources(input,'unknown-'),[]);
  assert.equal(input.length,4);
});
void test('source selection rejects malformed registries and input rather than evaluating it',()=>{
  for(const value of ['https://other.example.com','../','x; echo token','x'.repeat(81),'LOCAL'])assert.throws(()=>selectSources([],value));
  for(const input of [null,{},Array(201).fill({id:'x'}),[null],[{url:'https://example.com'}]])assert.throws(()=>selectSources(input));
});
