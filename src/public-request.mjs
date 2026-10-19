import {lookup} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {Readable} from 'node:stream';
import {createGunzip,createInflate,createBrotliDecompress} from 'node:zlib';
import {publicUrl} from './feed.mjs';

// Publisher discovery must not turn redirects or DNS rebinding into access to
// runner metadata, private networks or special-purpose address ranges.
export function publicIpv4(value){
  if(!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value))return false;
  const n=value.split('.').map(Number);if(n.some(x=>x>255))return false;
  const [a,b,c]=n;
  return !(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===88&&c===99)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
}
export async function publicAddress(host,resolve=async h=>(await lookup(h,{all:true,family:4})).map(x=>x.address)){
  const addresses=await resolve(host);
  if(!addresses.length||addresses.some(x=>!publicIpv4(x)))throw new Error('redirect_blocked');
  return addresses[0];
}
/** HTTPS with a validated, pinned public A record. Keep the URL hostname for
 * certificate verification and SNI. No proxy, authentication or cookie jar. */
export async function publicRequest(value,init={}){
  const u=publicUrl(value),signal=init.signal??AbortSignal.timeout(20000);signal.throwIfAborted();
  let abort;
  const address=await Promise.race([publicAddress(u.hostname),new Promise((_,reject)=>{abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});})]).finally(()=>signal.removeEventListener('abort',abort));
  signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const req=httpsRequest(u,{method:'GET',signal,headers:{...init.headers,'accept-encoding':'identity'},lookup:(_host,options,callback)=>{
      if(options.all)callback(null,[{address,family:4}]);else callback(null,address,4);
    }},res=>{
      const status=res.statusCode??502,headers=new Headers();
      for(const [key,v] of Object.entries(res.headers))if(v!==undefined&&!['set-cookie','connection','transfer-encoding'].includes(key))headers.set(key,Array.isArray(v)?v.join(', '):v);
      let stream=res;const encoding=headers.get('content-encoding');
      const decoder=encoding==='gzip'?createGunzip():encoding==='deflate'?createInflate():encoding==='br'?createBrotliDecompress():null;
      if(decoder){res.on('error',e=>decoder.destroy(e));stream=res.pipe(decoder);headers.delete('content-length');headers.delete('content-encoding');}
      const empty=[204,205,304].includes(status);
      if(empty)res.resume();
      resolve(new Response(empty?null:Readable.toWeb(stream),{status,headers}));
    });
    req.on('error',reject);req.end();
  });
}
