import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
function run(scenario){
  return spawnSync(process.execPath,['--import','./test/mock-transport.mjs','src/collect.mjs'],{encoding:'utf8',env:{...process.env,INGESTION_API_URL:'https://collector.example.com',EUROPE_COLLECTOR_SECRET:'test-only-collector-secret',TEST_SCENARIO:scenario,SOURCE_ID_PREFIX:'',MAINTENANCE_ONLY:scenario==='maintenance-only'?'true':'false',GITHUB_OUTPUT:'',GITHUB_STEP_SUMMARY:''},timeout:20000});
}
void test('source credentials stay off RSS requests; transient items retry and persisted jobs are read back',()=>{
  const result=run('success');assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/"created":1/);assert.match(result.stdout,/"persisted":true/);assert.doesNotMatch(result.stdout+result.stderr,/test-only-collector-secret/);
});
void test('a false write acknowledgement cannot be reported as a successful persisted run',()=>{
  const result=run('bad-readback');assert.equal(result.status,1);assert.match(result.stderr,/Persisted job verification failed/);
});
void test('authentication errors fail visibly without revealing the credential',()=>{
  const result=run('unauthorized');assert.equal(result.status,1);assert.match(result.stderr,/Application HTTP 401/);assert.doesNotMatch(result.stdout+result.stderr,/test-only-collector-secret/);
});
void test('a private source URL fails safely and remains an explicit job error',()=>{
  const result=run('private-source');assert.equal(result.status,1,result.stderr);assert.match(result.stdout,/"failed":1/);
});
void test('maintenance-only mode never fetches RSS or creates feed jobs',()=>{
  const result=run('maintenance-only');assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/"maintenanceOnly":true/);assert.match(result.stdout,/"event":"maintenance"/);assert.match(result.stdout,/"feeds":0/);
  assert.doesNotMatch(result.stdout,/"event":"completed"/);
});
