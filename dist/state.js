export const eventTypes = {
  sos: { title: 'Yêu cầu hỗ trợ SOS', description: 'Bà Minh đã nhấn nút SOS trong kịch bản mô phỏng.', icon: 'sos' },
  fall: { title: 'Dấu hiệu nghi ngờ ngã', description: 'Sự kiện mô phỏng cần người thân xác minh. Chưa có kết luận đã xảy ra ngã.', icon: 'activity' },
  inactive: { title: 'Không ghi nhận chuyển động', description: 'Kịch bản bất thường mẫu, chưa có ngưỡng phát hiện. Không suy ra tình trạng sức khỏe.', icon: 'clock' }
};
export const locations = {home:'Nhà mẫu · Khu dân cư mô phỏng',park:'Công viên mẫu · Khu dân cư mô phỏng'};
export const outcomes = {reached:'Đã liên hệ, không cần hỗ trợ thêm',helped:'Đã có người hỗ trợ',falseAlarm:'Cảnh báo nhầm'};
export function createState(now = new Date().toISOString()) {
  return {connected:true, location:{key:'home',name:locations.home,recordedAt:now}, updatedAt:now, events:[], history:[], emergencyContacts:[]};
}
function log(state, eventId, text, now, note='') {state.history.unshift({id:crypto.randomUUID(),eventId,text,at:now,note});}
function findEvent(state,id) {const event=state.events.find(e=>e.id===id);if(!event)throw new Error('Không tìm thấy cảnh báo trong phiên hiện tại.');return event;}
export function addEvent(state, type, now = new Date().toISOString()) {
  if(!Object.hasOwn(eventTypes,type))throw new Error('Loại sự kiện không hợp lệ.');
  const event={id:crypto.randomUUID(),type,at:now,deadline:new Date(Date.parse(now)+60000).toISOString(),confirmedAt:null,escalation:null,location:state.location?{...state.location}:null,connected:state.connected,status:'new',contact:null,outcome:null,note:''};
  state.events.unshift(event);
  log(state,event.id,`Hiển thị cảnh báo: ${eventTypes[type].title}`,now);
  return event;
}
export function setEmergencyContacts(state, contacts) {
  if(!Array.isArray(contacts)||contacts.length>10||contacts.some(c=>!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>80||typeof c.phone!=='string'||!/^\+?[0-9]{8,15}$/.test(c.phone)))throw new Error('Nhập tối đa 10 liên hệ: tên và số điện thoại gồm 8–15 chữ số.');
  if(new Set(contacts.map(c=>c.phone)).size!==contacts.length)throw new Error('Số điện thoại liên hệ bị trùng.');
  state.emergencyContacts=contacts.map(c=>({name:c.name.trim(),phone:c.phone}));
}
export function confirmSafety(state,id,now=new Date().toISOString()) {
  const event=findEvent(state,id);
  if(event.confirmedAt||event.escalation||Date.parse(now)>=Date.parse(event.deadline))return false;
  event.confirmedAt=now;
  log(state,id,'Người đeo xác nhận an toàn — dừng đếm ngược',now);return true;
}
// shortcut: escalation records are simulations; add verified device, call and SMS services before real use.
export function escalateDue(state,now=new Date().toISOString()) {
  const escalated=[];
  for(const event of state.events){
    if(event.confirmedAt||event.escalation||event.status==='done'||Date.parse(now)<Date.parse(event.deadline))continue;
    const location=event.location?`${event.location.name} (ghi nhận ${event.location.recordedAt}; ${event.connected?'kết nối khi phát sinh':'dữ liệu gần nhất, thiết bị mất kết nối'})`:'Chưa có dữ liệu vị trí';
    const message=`KHẨN CẤP — Bà Minh: ${eventTypes[event.type].title}. Không xác nhận sau 60 giây. Vị trí: ${location}.`;
    event.escalation={at:now,hotline:'115',message,contacts:state.emergencyContacts.map(c=>({...c})),simulated:true};
    log(state,event.id,`Mô phỏng gọi 115 và gửi vị trí: ${location}`,now);
    for(const c of event.escalation.contacts)log(state,event.id,`Mô phỏng SMS đến ${c.name} (${c.phone})`,now,message);
    if(!event.escalation.contacts.length)log(state,event.id,'Không có liên hệ khẩn cấp được cấu hình — chưa mô phỏng SMS',now);
    escalated.push(event);
  }
  return escalated;
}
export function acknowledge(state,id,now=new Date().toISOString()) {
  const event=findEvent(state,id);
  if(event.status!=='new')return false;
  event.status='active'; log(state,id,'Gia đình đã tiếp nhận cảnh báo',now);return true;
}
export function contact(state,id,result,now=new Date().toISOString()) {
  const event=findEvent(state,id);
  if(event.status!=='active')throw new Error('Hãy tiếp nhận cảnh báo trước khi liên hệ.');
  if(!['reached','unreachable'].includes(result))throw new Error('Kết quả liên hệ không hợp lệ.');
  event.contact=result;
  log(state,id,result==='reached'?'Đã liên hệ được — mô phỏng':'Chưa liên hệ được — tiếp tục xử lý',now);
}
export function conclude(state,id,outcome,note='',now=new Date().toISOString()) {
  const event=findEvent(state,id);
  if(event.status==='done')return false;
  if(event.status!=='active'||event.contact!=='reached')throw new Error('Cần liên hệ và xác minh trước khi kết thúc.');
  if(!Object.hasOwn(outcomes,outcome))throw new Error('Vui lòng chọn kết quả xử lý.');
  if(typeof note!=='string'||note.length>500)throw new Error('Ghi chú tối đa 500 ký tự.');
  event.status='done';event.outcome=outcome;event.note=note.trim();
  log(state,id,`Kết thúc: ${outcomes[outcome]}`,now,event.note);return true;
}
export function setLocation(state,key,now=new Date().toISOString()) {
  if(!state.connected)throw new Error('Kết nối lại thiết bị mô phỏng trước khi cập nhật vị trí.');
  if(key!=='none'&&!Object.hasOwn(locations,key))throw new Error('Vị trí mẫu không hợp lệ.');
  state.location=key==='none'?null:{key,name:locations[key],recordedAt:now};state.updatedAt=now;
}
export function toggleConnection(state,now=new Date().toISOString()) {
  state.connected=!state.connected;
  if(state.connected){state.updatedAt=now;if(state.location)state.location={...state.location,recordedAt:now};}
  log(state,null,state.connected?'Thiết bị mô phỏng đã kết nối lại':'Thiết bị mô phỏng mất kết nối; giữ dữ liệu gần nhất',now);
}
