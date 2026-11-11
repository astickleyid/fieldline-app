import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_VERSION, AuthError, requestCode, verifyCode, normalizeEmail, parseSignup, isVerifiedSession, secret, digestCode } from '../lib/auth-core.ts';

const key = 'test-only-session-secret-not-production-123456789';
function setup({exists=true, failSend=false}={}) {
  const items = new Map(), limits = new Map(), sent=[];
  let time = 1000;
  const store = {
    async put(id,c) { items.set(id, structuredClone(c)); },
    async remove(id) { items.delete(id); },
    async limit(k,maximum) { const n=(limits.get(k)||0)+1;limits.set(k,n);return n<=maximum; },
    async consume(id,digest,now) {
      const c=items.get(id);if(!c) return null;
      if(c.expiresAt<=now || c.attempts>=5) {items.delete(id);return null;}
      if(c.digest!==digest) {if(++c.attempts>=5)items.delete(id);return null;}
      items.delete(id);return c;
    }
  };
  return {items,sent,limits,setTime:v=>time=v,deps:{store,key,userExists:async()=>exists,
    send:async(email,code)=>{if(failSend)throw Error('secret-provider-error');sent.push({email,code});},now:()=>time}};
}
const input={email:'owner@example.com',ip:'192.0.2.1'};
test('email canonicalization and validation',()=>{
  assert.equal(normalizeEmail(' Owner@Example.COM '),'owner@example.com');
  for(const e of [null,{},'', 'foo','a@b','a\n@b.com','x'.repeat(255)+'@a.com'])assert.throws(()=>normalizeEmail(e),AuthError);
});
test('signup fields are bounded and whitelisted',()=>{
  assert.deepEqual(parseSignup({businessName:' Example ',trade:'lawn'}),{businessName:'Example',trade:'lawn',phone:undefined});
  for(const data of [{businessName:'',trade:'lawn'},{businessName:'a',trade:'admin'},{businessName:'a',trade:'lawn',phone:{}}])assert.throws(()=>parseSignup(data),AuthError);
});
test('request sends random code but never authenticates or returns code',async()=>{
  const s=setup();const id=await requestCode(input,s.deps);
  assert.match(id,/^[a-f0-9]{64}$/);assert.match(s.sent[0].code,/^\d{8}$/);
  assert.equal(s.items.get(id).email,input.email);assert.notEqual(s.items.get(id).digest,s.sent[0].code);
  assert.equal('userId' in s.items.get(id),false);
});
test('unknown login returns same-shaped response without sending or challenge',async()=>{
  const s=setup({exists:false});const id=await requestCode(input,s.deps);
  assert.match(id,/^[a-f0-9]{64}$/);assert.equal(s.sent.length,0);assert.equal(s.items.size,0);
});
test('signup is pending verification, existing accounts do not accept signup fields',async()=>{
  const signup={businessName:'Test',trade:'hvac'};
  const s=setup({exists:false});const id=await requestCode({...input,signup},s.deps);assert.deepEqual(s.items.get(id).signup,signup);
  const e=setup();const eid=await requestCode({...input,signup},e.deps);assert.equal(e.items.get(eid).signup,undefined);
});
test('valid proof is consumed once; replay rejected',async()=>{
  const s=setup();const id=await requestCode(input,s.deps);const proof=await verifyCode(id,s.sent[0].code,s.deps);
  assert.equal(proof.email,input.email);await assert.rejects(()=>verifyCode(id,s.sent[0].code,s.deps),AuthError);
});
test('concurrent proof submissions have a single winner',async()=>{
  const s=setup();const id=await requestCode(input,s.deps);
  const results=await Promise.allSettled([verifyCode(id,s.sent[0].code,s.deps),verifyCode(id,s.sent[0].code,s.deps)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
});
test('expiry rejects proof',async()=>{
  const s=setup();const id=await requestCode(input,s.deps);s.setTime(601000);
  await assert.rejects(()=>verifyCode(id,s.sent[0].code,s.deps),AuthError);
});
test('five incorrect attempts exhaust challenge',async()=>{
  const s=setup();const id=await requestCode(input,s.deps);const wrong=s.sent[0].code==='00000000'?'00000001':'00000000';
  for(let i=0;i<5;i++)await assert.rejects(()=>verifyCode(id,wrong,s.deps),AuthError);
  await assert.rejects(()=>verifyCode(id,s.sent[0].code,s.deps),AuthError);
});
test('proof is bound to its exact challenge',async()=>{
  const s=setup();const id=await requestCode(input,s.deps);assert.notEqual(digestCode(key,id,s.sent[0].code),digestCode(key,'a'.repeat(64),s.sent[0].code));
  await assert.rejects(()=>verifyCode('a'.repeat(64),s.sent[0].code,s.deps),AuthError);
});
test('malformed challenge and code rejected',async()=>{
  const s=setup();for(const [id,code]of[[null,'12345678'],['a'.repeat(64),12345678],['a'.repeat(64),'1234']])await assert.rejects(()=>verifyCode(id,code,s.deps),AuthError);
});
test('per-email and per-IP rate limits',async()=>{
  const s=setup();for(let i=0;i<5;i++)await requestCode(input,s.deps);
  await assert.rejects(()=>requestCode(input,s.deps),e=>e.status===429);
  const t=setup();for(let i=0;i<20;i++)await requestCode({...input,email:`user${i}@example.com`},t.deps);
  await assert.rejects(()=>requestCode({...input,email:'next@example.com'},t.deps),e=>e.status===429);
});
test('failed delivery removes challenge and preserves generic response',async()=>{
  const s=setup({failSend:true});assert.match(await requestCode(input,s.deps), /^[a-f0-9]{64}$/);
  assert.equal(s.items.size,0);
});
test('legacy email-only sessions are rejected',()=>{
  assert.equal(isVerifiedSession({userId:'usr_x'}),false);
  assert.equal(isVerifiedSession({userId:'usr_x',authVersion:1}),false);
  assert.equal(isVerifiedSession({userId:'usr_x',authVersion:AUTH_VERSION}),true);
});
test('missing/default session secret fails closed',()=>{
  const old=process.env.SESSION_PASSWORD;
  try { for(const v of ['', 'short','fieldline-dev-secret-key-change-in-production-32chars']) {process.env.SESSION_PASSWORD=v;assert.throws(secret);}
    process.env.SESSION_PASSWORD=key;assert.equal(secret(),key);
  } finally {if(old===undefined)delete process.env.SESSION_PASSWORD;else process.env.SESSION_PASSWORD=old;}
});
