import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,addEvent,acknowledge,contact,conclude,setLocation,toggleConnection,setEmergencyContacts,confirmSafety,escalateDue} from '../dist/state.js';
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

test('all emergency types escalate once at 60 seconds, hotline before contact texts',()=>{
 for(const type of ['sos','fall','inactive']){
  const s=createState(before);setEmergencyContacts(s,[{name:'Family',phone:'+84912345678'}]);
  const e=addEvent(s,type,before);acknowledge(s,e.id,before);
  assert.equal(escalateDue(s,'2026-10-09T03:00:59.999Z').length,0);
  assert.equal(escalateDue(s,after).length,1);
  assert.equal(e.escalation.hotline,'115');assert.equal(e.escalation.simulated,true);
  assert.match(e.escalation.message,/Nhà mẫu/);assert.equal(e.escalation.contacts.length,1);
  const logs=s.history.slice().reverse();assert.ok(logs.findIndex(x=>x.text.includes('gọi 115'))<logs.findIndex(x=>x.text.includes('SMS đến')));
  assert.equal(escalateDue(s,after).length,0);assert.equal(confirmSafety(s,e.id,after),false);
 }
});
test('wearer confirmation cancels timer; family acceptance does not; late callbacks escalate',()=>{
 const s=createState(before),safe=addEvent(s,'sos',before),due=addEvent(s,'fall',before);
 assert.equal(confirmSafety(s,safe.id,'2026-10-09T03:00:59.000Z'),true);
 assert.equal(confirmSafety(s,safe.id,before),false);acknowledge(s,due.id,before);
 assert.equal(confirmSafety(s,due.id,after),false);
 assert.deepEqual(escalateDue(s,'2026-10-09T03:05:00.000Z').map(e=>e.id),[due.id]);
 assert.equal(safe.escalation,null);
});
test('missing location, offline device, contacts validation and escalation snapshots',()=>{
 const s=createState(before);setLocation(s,'none',before);toggleConnection(s,before);
 const e=addEvent(s,'inactive',before);escalateDue(s,after);
 assert.match(e.escalation.message,/Chưa có dữ liệu vị trí/);assert.deepEqual(e.escalation.contacts,[]);
 assert.ok(s.history.some(x=>x.text.includes('Không có liên hệ')));
 for(const contacts of [[{name:'X',phone:'bad'}],[{name:'',phone:'0912345678'}],[{name:'X',phone:'0912345678'},{name:'Y',phone:'0912345678'}]])assert.throws(()=>setEmergencyContacts(s,contacts));
 assert.deepEqual(s.emergencyContacts,[]);
 setEmergencyContacts(s,[{name:'Family',phone:'0912345678'}]);
 const next=addEvent(s,'sos',before);escalateDue(s,after);setEmergencyContacts(s,[]);
 assert.equal(next.escalation.contacts.length,1);assert.equal(escalateDue(createState(before),after).length,0);
});
