import test from 'node:test';
import assert from 'node:assert/strict';
import {guestSession,GUEST_COOKIE} from '../lib/guest.ts';
const request=cookie=>new Request('https://example.test/api/project',{headers:cookie?{cookie}:{}});
test('anonymous visitors receive distinct high-entropy server-issued sessions',async()=>{const a=await guestSession(request(),true),b=await guestSession(request(),true);assert.notEqual(a.owner,b.owner);assert.match(a.owner,/^guest:[a-f0-9]{64}$/);assert.match(a.cookie,/HttpOnly; Secure; SameSite=Lax/);assert.match(a.cookie,/^__Host-sitesync-demo=[a-f0-9]{64}; Path=\//)});
test('same guest cookie selects same demo without exposing database key',async()=>{const a=await guestSession(request(),true);const b=await guestSession(request(a.cookie.split(';')[0]),false);assert.equal(a.owner,b.owner);assert.equal(b.cookie,null);assert.notEqual(a.owner.slice(6),a.cookie.split(';')[0].split('=')[1]);});
test('missing or malformed guest credentials cannot authorize writes',async()=>{assert.equal(await guestSession(request(),false),null);assert.equal(await guestSession(request(GUEST_COOKIE+'=someone-elses-account'),false),null);});
test('a preview cookie is ignored by production session handling',async()=>{const preview=await guestSession(request(),true,false);assert.ok(!preview.cookie.includes('Secure;'));assert.equal(await guestSession(request(preview.cookie),false),null);assert.equal((await guestSession(request(preview.cookie),false,false)).owner,preview.owner);});
