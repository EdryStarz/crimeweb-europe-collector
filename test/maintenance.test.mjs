import test from 'node:test';
import assert from 'node:assert/strict';
import {runMaintenance} from '../src/maintenance.mjs';
test('bounded maintenance accumulates acknowledgements and stops when complete',async()=>{
  let calls=0;
  assert.deepEqual(await runMaintenance(async()=>({more:++calls<3,updated:calls===2?1:0}),{deadline:100000,now:()=>0}),{steps:3,updated:1,pending:false});
});
test('maintenance respects time and step budgets, backs off on busy/retry, and rejects invented counts',async()=>{
  const step=async()=>({more:true,updated:0});
  assert.equal((await runMaintenance(step,{deadline:100000,now:()=>0,maxSteps:2})).steps,2);
  assert.equal((await runMaintenance(step,{deadline:100000,now:()=>100000})).steps,0);
  assert.equal((await runMaintenance(async()=>({more:true,updated:0,busy:true}),{deadline:100000,now:()=>0})).steps,1);
  assert.equal((await runMaintenance(async()=>({more:false,updated:0,retry:true}),{deadline:100000,now:()=>0})).pending,true,'Provider backoff is pending work, not an empty queue');
  await assert.rejects(runMaintenance(async()=>({more:true,updated:100}),{deadline:100000,now:()=>0}));
});
