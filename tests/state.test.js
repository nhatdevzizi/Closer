import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,addEvent,acknowledge,contact,conclude,setLocation,toggleConnection} from '../dist/state.js';
const before='2026-10-09T03:00:00.000Z',after='2026-10-09T03:01:00.000Z';
test('SOS lifecycle requires confirmation; duplicate actions are harmless',()=>{
 const s=createState(before),e=addEvent(s,'sos',before);
 assert.throws(()=>contact(s,e.id,'reached'));
 assert.equal(acknowledge(s,e.id,before),true);
 assert.equal(acknowledge(s,e.id,before),false);
 contact(s,e.id,'unreachable',before);
 assert.throws(()=>conclude(s,e.id,'helped'));
 assert.equal(e.status,'active');
 contact(s,e.id,'reached',after);
 assert.throws(()=>conclude(s,e.id,'unknown'));
 assert.throws(()=>conclude(s,e.id,'helped','x'.repeat(501)));
 assert.equal(conclude(s,e.id,'helped','  Người thân đã hỗ trợ. ',after),true);
 assert.equal(conclude(s,e.id,'helped'),false);
 assert.equal(e.status,'done');assert.equal(e.note,'Người thân đã hỗ trợ.');
 assert.equal(s.history.filter(x=>x.text.includes('tiếp nhận')).length,1);
 assert.equal(s.history.filter(x=>x.text.startsWith('Kết thúc')).length,1);
});
test('event location snapshot survives updates and reconnect; missing location is valid',()=>{
 const s=createState(before),e=addEvent(s,'fall',before);
 setLocation(s,'park',after);assert.equal(e.location.key,'home');assert.equal(e.location.recordedAt,before);
 toggleConnection(s,after);const stale=s.updatedAt;
 assert.throws(()=>setLocation(s,'home'));
 const offline=addEvent(s,'sos',after);assert.equal(offline.connected,false);assert.equal(offline.location.key,'park');
 assert.equal(s.updatedAt,stale);toggleConnection(s,after);assert.equal(e.location.recordedAt,before);
 setLocation(s,'none',after);const noLocation=addEvent(s,'inactive',after);assert.equal(noLocation.location,null);
 assert.equal(new Set(s.events.map(x=>x.id)).size,3);
});
test('invalid input preserves state and a reset restores all defaults',()=>{
 const s=createState(before),snapshot=structuredClone(s);
 assert.throws(()=>addEvent(s,'__proto__'));assert.throws(()=>setLocation(s,'not-a-location'));assert.throws(()=>acknowledge(s,'missing'));
 assert.deepEqual(s,snapshot);addEvent(s,'sos');toggleConnection(s);
 const reset=createState(before);assert.deepEqual(reset,snapshot);
});
