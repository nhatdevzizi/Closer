const paths={heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',history:'M3 11a9 9 0 1 1 3 8 M3 4v7h7 M12 7v5l3 2',play:'m9 5 10 7-10 7V5Z',watch:'M8 3V1h8v2 M8 21v2h8v-2 M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z M12 7v5l2 2',wifi:'M2 8a16 16 0 0 1 20 0 M5 12a11 11 0 0 1 14 0 M8 16a6 6 0 0 1 8 0 M12 20h.01',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 11v6 M12 7h.01','map-pin':'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z m-4 9 3 3 5-5',sliders:'M4 3v8 M4 15v6 M12 3v2 M12 9v12 M20 3v12 M20 19v2 M1 11h6 M9 5h6 M17 15h6',refresh:'M20 7a9 9 0 1 0 1 9 M20 2v5h-5',sos:'M12 3 2 21h20L12 3Z M12 9v5 M12 17h.01',activity:'M2 12h5l3-9 4 18 3-9h5','wifi-off':'M2 2l20 20 M2 8a16 16 0 0 1 3-2 M10 4a16 16 0 0 1 12 4 M5 12a11 11 0 0 1 4-2 M15 10a11 11 0 0 1 4 2 M8 16a6 6 0 0 1 8 0 M12 20h.01',x:'M6 6l12 12 M18 6 6 18',flask:'M9 3h6 M10 3v6L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3 M8 14h8',phone:'M5 3h4l2 5-3 2a13 13 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2C9 21 3 15 3 5a2 2 0 0 1 2-2Z',check:'m5 12 4 4L19 6'};
function icons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[el.dataset.icon]||paths.info}"/></svg>`)}
icons();
document.getElementById('today').textContent=new Intl.DateTimeFormat('vi-VN',{dateStyle:'full',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
const initialTime=new Intl.DateTimeFormat('vi-VN',{timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
document.getElementById('last-update').textContent=initialTime;
document.getElementById('location-time').textContent=`Ghi nhận lúc ${initialTime} · dữ liệu mẫu`;

import {createState,eventTypes,locations,outcomes,addEvent,acknowledge,contact,conclude,setLocation,toggleConnection} from './state.js';
let state=createState();
let selectedId=null;
let callOpen=false;
let toastTimer;
const $=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=value=>new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value));
const statusLabel={new:'Mới',active:'Đang xử lý',done:'Đã kết thúc'};
const icon=name=>`<span data-icon="${name}"></span>`;
const status=event=>`<span class="status-tag ${event.status}">${statusLabel[event.status]}</span>`;
function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
function empty(title,description,iconName='bell'){return `<div class="empty-state"><span class="empty-icon" data-icon="${iconName}"></span><h3>${title}</h3><p>${description}</p></div>`;}
function historyHtml(items){return `<ol class="timeline">${items.map(item=>`<li><strong>${escape(item.text)}</strong><time datetime="${item.at}">${time(item.at)} · phiên mô phỏng</time>${item.note?`<p class="note">${escape(item.note)}</p>`:''}${item.eventId?`<button class="button subtle history-open" data-alert="${item.eventId}">Xem cảnh báo</button>`:''}</li>`).join('')}</ol>`;}
function render(){
  const active=state.events.filter(event=>event.status!=='done');
  ['nav-count','active-count'].forEach(id=>{$(id).textContent=active.length;$(id).classList.toggle('has-alerts',active.length>0);});
  $('connection-label').textContent=state.connected?'Đang kết nối':'Mất kết nối';
  $('connection-label').classList.toggle('warning-text',!state.connected);
  $('last-update').textContent=time(state.updatedAt);
  $('connection-action').textContent=state.connected?'Mất kết nối':'Kết nối lại';
  $('connection-hint').textContent=state.connected?'Xem trạng thái khi mất tín hiệu':'Khôi phục cập nhật mô phỏng';
  $('location-select').disabled=!state.connected;
  $('location-select').value=state.location?.key||'none';
  $('location-hint').textContent=state.connected?'':'Kết nối lại để đổi vị trí.';
  $('map-pin').hidden=!state.location;
  $('map-unavailable').hidden=!!state.location;
  $('map-subtitle').textContent=state.connected?'Vị trí ghi nhận gần nhất':'Mất kết nối · đang hiển thị dữ liệu cũ';
  $('map-subtitle').classList.toggle('warning-text',!state.connected);
  if(state.location){$('map-pin').className=`map-pin ${state.location.key}`;$('map-location-name').textContent=state.location.key==='home'?'Nhà mẫu':'Công viên mẫu';}
  $('location-label').textContent=state.location?.name||'Chưa có dữ liệu vị trí';
  $('location-time').textContent=state.location?`Ghi nhận lúc ${time(state.location.recordedAt)} · dữ liệu mẫu`:'Không có vị trí để hiển thị.';
  $('recent-alerts').innerHTML=active.length?active.slice(0,3).map(event=>`<button class="recent-item" data-alert="${event.id}"><span class="recent-top">${status(event)}<small>${time(event.at)}</small></span><h3>${eventTypes[event.type].title}</h3><p>${event.location?escape(event.location.name.split(' · ')[0]):'Chưa có vị trí'}</p><span class="detail-link">Xem và xử lý</span></button>`).join(''):`<div class="empty-state"><span class="empty-icon" data-icon="shield"></span><h3>Chưa có cảnh báo mới</h3><p>${state.events.length?'Các cảnh báo trong phiên đã được xử lý. Bạn có thể xem lại trong lịch sử.':'Khi có sự kiện, thông tin sẽ xuất hiện tại đây để bạn tiếp nhận.'}</p><button class="button primary" data-simulate="sos">${icon('play')}Thử cảnh báo SOS</button></div>`;
  const events=[...active,...state.events.filter(event=>event.status==='done')];
  $('alert-list').innerHTML=events.length?events.map(event=>`<article class="alert-row"><span class="event-icon ${event.type}" data-icon="${eventTypes[event.type].icon}"></span><div>${status(event)}<h3>${eventTypes[event.type].title}</h3><p>Bà Minh · ${time(event.at)} · ${event.location?escape(event.location.name.split(' · ')[0]):'Chưa có vị trí'}</p></div><button class="button" data-alert="${event.id}">${event.status==='done'?'Xem kết quả':'Xem và xử lý'}</button></article>`).join(''):empty('Chưa có cảnh báo','Chọn một tình huống trong Điều khiển demo để bắt đầu.');
  $('history-list').innerHTML=state.history.length?historyHtml(state.history):empty('Chưa có lịch sử xử lý','Các sự kiện và thao tác của gia đình sẽ được ghi lại tại đây.','history');
  icons();
}
function navigate(){
  const requested=location.hash.slice(1);
  const view=['overview','alerts','history'].includes(requested)?requested:'overview';
  for(const key of ['overview','alerts','history'])$(key+'-view').hidden=key!==view;
  document.querySelectorAll('[data-view]').forEach(link=>{if(link.dataset.view===view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  $('page-title').textContent={overview:'Tổng quan chăm sóc',alerts:'Cảnh báo người thân',history:'Lịch sử đồng hành'}[view];
}
function simulate(type){const event=addEvent(state,type);render();notify(`${eventTypes[type].title} — mở Cảnh báo để tiếp nhận.${!state.connected?' Đây là sự kiện thử thủ công khi thiết bị mô phỏng mất kết nối.':''}`);return event;}
function openDetail(id){
  selectedId=id;callOpen=false;renderDetail();if(!$('detail-dialog').open)$('detail-dialog').showModal();
}
function renderDetail(focusId){
  const event=state.events.find(item=>item.id===selectedId);if(!event)return;
  const type=eventTypes[event.type];
  $('detail-content').innerHTML=`<div class="dialog-head"><div><p class="eyebrow">Bà Nguyễn Thị Minh · dữ liệu mô phỏng</p><h2 id="detail-title">${type.title}</h2></div><button class="icon-button" data-close aria-label="Đóng chi tiết">${icon('x')}</button></div><div class="dialog-body"><dl class="detail-meta"><div><dt>Phát sinh lúc</dt><dd>${time(event.at)}</dd></div><div><dt>Trạng thái xử lý</dt><dd>${status(event)}</dd></div><div class="full"><dt>Vị trí đi kèm sự kiện</dt><dd>${escape(event.location?.name||'Chưa có dữ liệu vị trí')}<small class="muted">${event.location?`<br>Ghi nhận lúc ${time(event.location.recordedAt)}`:''}</small></dd></div></dl><p class="info-box">${type.description}${!event.connected?' Sự kiện được tạo thủ công khi thiết bị mô phỏng mất kết nối; vị trí đi kèm là dữ liệu gần nhất nếu có.':''}</p>
    ${event.status==='active'?`<div class="call-box"><strong>Liên hệ với người thân</strong><p>${event.contact==='unreachable'?'Chưa liên hệ được. Cảnh báo vẫn đang xử lý. Hãy thử lại hoặc nhờ người ở gần hỗ trợ.':event.contact==='reached'?'Đã liên hệ được trong mô phỏng. Chọn kết quả đã xác minh bên dưới.':'Tiếp nhận chưa có nghĩa là người thân đã an toàn. Liên hệ để xác minh tình huống.'}</p>${callOpen?`<p><strong>Đang mô phỏng liên hệ</strong>Không có cuộc gọi hoặc tin nhắn thật được gửi.</p><button class="button primary" data-contact="reached">Đã liên hệ được</button><button class="button" data-contact="unreachable">Chưa liên hệ được</button>`:`<button class="button" id="contact-start">${icon('phone')}Liên hệ — mô phỏng</button>`}</div>`:''}
    ${event.status==='active'&&event.contact==='reached'?`<form class="resolution-form" id="resolution-form"><label for="outcome-select">Kết quả xử lý <span aria-hidden="true">*</span></label><select id="outcome-select" required><option value="">Chọn kết quả đã xác minh</option>${Object.entries(outcomes).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><label for="outcome-note">Ghi chú <span class="muted">(không bắt buộc)</span></label><textarea id="outcome-note" maxlength="500" placeholder="Ghi lại kết quả hỗ trợ, tối đa 500 ký tự"></textarea><p id="form-error" class="form-message" role="alert"></p></form>`:''}
    ${event.status==='done'?`<div class="info-box"><strong>${outcomes[event.outcome]}</strong>${event.note?`<p class="saved-note">${escape(event.note)}</p>`:''}</div>`:''}
    <h3 class="detail-history-title">Diễn biến sự kiện</h3>${historyHtml(state.history.filter(item=>item.eventId===event.id).slice().reverse()).replaceAll('class="button subtle history-open"','hidden class="button subtle history-open"')}</div>
    <div class="dialog-actions"><button class="button" data-close>Đóng</button>${event.status==='new'?'<button class="button primary" id="acknowledge">Tôi tiếp nhận</button>':''}${event.status==='active'&&event.contact==='reached'?'<button type="submit" form="resolution-form" class="button primary">Lưu kết quả và kết thúc</button>':''}</div>`;
  icons($('detail-content'));if(focusId)$(focusId)?.focus();
}
document.addEventListener('click',event=>{
  const target=event.target.closest('button,a');if(!target)return;
  try{
    if(target.matches('[data-close]')){target.closest('dialog').close();return;}
    if(target.dataset.simulate){simulate(target.dataset.simulate);return;}
    if(target.dataset.alert){openDetail(target.dataset.alert);return;}
    if(target.id==='open-guide')$('guide-dialog').showModal();
    if(target.id==='guide-start'){$('guide-dialog').close();const created=simulate('sos');openDetail(created.id);}
    if(target.id==='acknowledge'){acknowledge(state,selectedId);render();renderDetail('contact-start');notify('Đã tiếp nhận. Hãy liên hệ để xác minh tình huống.');}
    if(target.id==='contact-start'){callOpen=true;renderDetail();$('detail-content').querySelector('[data-contact]')?.focus();}
    if(target.dataset.contact){contact(state,selectedId,target.dataset.contact);callOpen=false;render();renderDetail(target.dataset.contact==='reached'?'outcome-select':'contact-start');}
    if(target.id==='toggle-connection'){toggleConnection(state);render();notify(state.connected?'Đã kết nối lại thiết bị mô phỏng.':'Thiết bị mô phỏng mất kết nối. Vị trí gần nhất được giữ nguyên.');}
    if(target.id==='reset-demo')$('reset-dialog').showModal();
    if(target.id==='confirm-reset'){state=createState();selectedId=null;callOpen=false;document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());location.hash='overview';render();navigate();notify('Đã bắt đầu phiên demo mới.');}
  }catch(error){notify(error.message);}
});
document.addEventListener('submit',event=>{
  if(event.target.id!=='resolution-form')return;event.preventDefault();
  try{conclude(state,selectedId,$('outcome-select').value,$('outcome-note').value);render();renderDetail();$('detail-dialog').querySelector('[data-close]').focus();notify('Đã lưu kết quả vào lịch sử xử lý.');}
  catch(error){$('form-error').textContent=error.message;}
});
$('location-select').addEventListener('change',event=>{try{setLocation(state,event.target.value);render();notify(state.location?'Đã cập nhật vị trí mẫu. Vị trí trong cảnh báo cũ được giữ nguyên.':'Đã chuyển sang tình huống chưa có dữ liệu vị trí.');}catch(error){notify(error.message);render();}});
window.addEventListener('hashchange',navigate);
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>{if(dialog.id==='detail-dialog'){const opener=Array.from(document.querySelectorAll(`[data-alert="${selectedId}"]`)).find(el=>el.checkVisibility());if(opener){opener.focus();return;}}if(!document.activeElement||document.activeElement===document.body){document.querySelector('[aria-current="page"]')?.focus();}}));
render();navigate();
// shortcut: session-only mock state; connect verified hardware and persistence when moving beyond the investor demo.
const modelContext=document.modelContext;
if(modelContext?.registerTool){
  const lifecycle=new AbortController();
  const register=tool=>{try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(error=>console.warn('WebMCP registration unavailable',error.message));}catch(error){console.warn('WebMCP registration unavailable',error.message);}};
  register({name:'read_care_demo',title:'Đọc trạng thái demo',description:'Read the current synthetic care demo state. No real patient data.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(input&&Object.keys(input).length)throw new Error('Không có tham số đầu vào.');return structuredClone(state);}});
  register({name:'simulate_care_alert',title:'Tạo cảnh báo mô phỏng',description:'Create one synthetic SOS, suspected fall, or inactivity alert in the current demo session. Sends no external messages.',inputSchema:{type:'object',properties:{type:{type:'string',enum:['sos','fall','inactive']}},required:['type'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Object.keys(input).some(key=>key!=='type')||!Object.hasOwn(eventTypes,input.type))throw new Error('Cần chọn loại sự kiện hợp lệ.');const event=simulate(input.type);return {id:event.id,type:event.type,status:event.status};}});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
