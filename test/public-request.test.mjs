import test from 'node:test';
import assert from 'node:assert/strict';
import {publicIpv4,publicAddress} from '../src/public-request.mjs';
test('discovered publishers cannot resolve into private, metadata or reserved networks',async()=>{
  for(const address of ['127.0.0.1','10.1.2.3','172.31.0.4','192.168.1.1','169.254.169.254','100.100.100.200','0.0.0.0','192.0.0.9','198.18.0.1','198.51.100.1','203.0.113.1','224.0.0.1','255.255.255.255','::1','256.1.2.3'])assert.equal(publicIpv4(address),false,address);
  assert.equal(publicIpv4('8.8.8.8'),true);
  await assert.rejects(publicAddress('publisher.example',async()=>['8.8.8.8','10.0.0.1']),/redirect_blocked/);
  await assert.rejects(publicAddress('publisher.example',async()=>[]),/redirect_blocked/);
  assert.equal(await publicAddress('publisher.example',async()=>['8.8.8.8']),'8.8.8.8');
});
