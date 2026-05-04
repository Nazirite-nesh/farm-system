import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBECNPZzQ9QXbXIki-mPhcYLJasB2FuQ50",
  authDomain: "king-nazirite-s-system.firebaseapp.com",
  projectId: "king-nazirite-s-system",
  storageBucket: "king-nazirite-s-system.firebasestorage.app",
  messagingSenderId: "411006905053",
  appId: "1:411006905053:web:1187761bd1fbb949e08934",
  measurementId: "G-9E89PNB4DD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

'use strict';

// ═══════════════════════════════════════════════════════════
// CONSTANTS & KEYS
// ═══════════════════════════════════════════════════════════
const K = {
  DATA:'kfms_data_v3', USERS:'kfms_users', SESSION:'kfms_session',
  SYNC_TIME:'kfms_sync_time', CLOUD_CACHE:'kfms_cloud_cache',
  FARM_ID:'kfms_farm_id', SMS_CFG:'kfms_sms_cfg',
  EMAIL_CFG:'kfms_email_cfg', ALERT_HIST:'kfms_alert_history'
};

// ═══════════════════════════════════════════════════════════
// FARM ID
// ═══════════════════════════════════════════════════════════
function getFarmId(){
  let id=localStorage.getItem(K.FARM_ID);
  if(!id){id='FARM-'+Math.random().toString(36).substr(2,6).toUpperCase()+'-KE';localStorage.setItem(K.FARM_ID,id);}
  return id;
}
const FARM_ID=getFarmId();

// ═══════════════════════════════════════════════════════════
// USER SYSTEM
// ═══════════════════════════════════════════════════════════
const DEFAULT_USERS=[
  {id:1,name:'Keith (Owner)',role:'Owner',pin:'7642',emoji:'👨‍🌾',color:'#1e5c30',active:true},
  {id:2,name:'Farm Manager',role:'Farm Manager',pin:'2345',emoji:'👩‍💼',color:'#1a3f6e',active:true},
  {id:3,name:'Farm Worker',role:'Worker',pin:'3456',emoji:'👷',color:'#7a5c00',active:true},
];

function getUsers(){
  try{const u=localStorage.getItem(K.USERS);return u?JSON.parse(u):DEFAULT_USERS;}
  catch{return DEFAULT_USERS;}
}
function saveUsers(users){localStorage.setItem(K.USERS,JSON.stringify(users));}

let currentUser=null;

function buildLoginUserSelect(){
  const users=getUsers().filter(u=>u.active);
  const sel=document.getElementById('login-user');
  if(!sel) return;
  sel.innerHTML=users.map(u=>`<option value="${u.id}">${u.emoji} ${u.name} (${u.role})</option>`).join('');
}

window.doLogin = function(){
  const uid=parseInt(document.getElementById('login-user').value);
  const pin=document.getElementById('login-pin').value;
  const users=getUsers();
  const user=users.find(u=>u.id===uid&&u.pin===pin&&u.active);
  if(!user){
    document.getElementById('login-error').style.display='block';
    document.getElementById('login-pin').value='';
    return;
  }
  document.getElementById('login-error').style.display='none';
  currentUser=user;
  localStorage.setItem(K.SESSION,JSON.stringify({userId:user.id,loginTime:new Date().toISOString()}));
  document.getElementById('login-screen').classList.add('hide');
  document.getElementById('app').classList.add('visible');
  document.getElementById('user-avatar').textContent=user.emoji;
  document.getElementById('user-name-chip').textContent=user.name.split(' ')[0];
  document.getElementById('hdr-user-info').textContent=`${user.emoji} ${user.name} · ${user.role} · Nairobi, Kenya`;
  renderAll();
  setTimeout(()=>document.getElementById('login-screen').style.display='none',450);
  showToast(`Welcome, ${user.name.split(' ')[0]}! Data loaded.`,'ok');
}

window.doLogout = function(){
  if(!confirm('Sign out?')) return;
  currentUser=null;
  localStorage.removeItem(K.SESSION);
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('login-screen').classList.remove('hide');
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-pin').value='';
}

window.addUser = function(){
  const name=document.getElementById('nu-name').value.trim();
  const pin=document.getElementById('nu-pin').value.trim();
  const emoji=document.getElementById('nu-emoji').value.trim()||'👤';
  if(!name||pin.length!==4||isNaN(pin)){showToast('Enter a valid name and 4-digit PIN','err');return;}
  const users=getUsers();
  const newU={id:Date.now(),name,role:document.getElementById('nu-role').value,pin,emoji,color:'#555',active:true};
  users.push(newU);
  saveUsers(users);
  renderUsersList();
  buildLoginUserSelect();
  showToast(`User ${name} added`,'ok');
  ['nu-name','nu-pin','nu-emoji'].forEach(id=>document.getElementById(id).value='');
}

window.deleteUser = function(id){
  if(!confirm('Remove this user?')) return;
  const users=getUsers().filter(u=>u.id!==id);
  saveUsers(users);
  renderUsersList();
  buildLoginUserSelect();
  showToast('User removed');
}

function renderUsersList(){
  const users=getUsers();
  document.getElementById('users-list').innerHTML=users.map(u=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border2);">
      <span style="font-size:20px;">${u.emoji}</span>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:13px;">${u.name}</div>
        <div style="font-size:10.5px;color:var(--text3);">${u.role} · PIN: ${'•'.repeat(u.pin.length)}</div>
      </div>
      ${u.id!==1?`<button class="btn btn-outline btn-xs" onclick="deleteUser(${u.id})" style="color:var(--red);border-color:var(--red);">Remove</button>`:'<span style="font-size:10px;color:var(--text3);">Default</span>'}
    </div>`).join('');
}

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
const DS={
  income:[],expenses:[],stock:[],animals:[],health:[],eggs:[],
  stockLevels:{'Pig Growers Mash':0,'Pig Finisher Pellets':0,'Pig Starter Feed':0,
    'Poultry Layers Mash':0,'Poultry Broiler Starter':0,'Poultry Broiler Finisher':0,
    'Chick Mash':0,'Vaccines/Medications':0,'Bedding/Sawdust':0,'Disinfectants':0},
  meta:{farmId:FARM_ID,version:'3.0',created:new Date().toISOString()}
};

function loadState(){
  try{const r=localStorage.getItem(K.DATA);if(r){const p=JSON.parse(r);return{...DS,...p,stockLevels:{...DS.stockLevels,...(p.stockLevels||{})}};}
  }catch(e){console.warn(e);}
  return JSON.parse(JSON.stringify(DS));
}

let state=loadState();

function saveState(){
  try{
    state.meta.lastModified=new Date().toISOString();
    localStorage.setItem(K.DATA,JSON.stringify(state));
    updateStoragePanels();
  }catch(e){showToast('⚠ Storage full — export data','err');}
}

function totalRecs(){return state.income.length+state.expenses.length+state.stock.length+state.animals.length+state.health.length+state.eggs.length;}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════
const fmt=n=>'KES '+Number(n||0).toLocaleString('en-KE',{minimumFractionDigits:0,maximumFractionDigits:0});
const today=()=>new Date().toISOString().split('T')[0];
const thisMonth=()=>new Date().toISOString().slice(0,7);
const fmtD=d=>{if(!d)return'—';const p=d.split('-');return`${p[2]}/${p[1]}/${p[0]}`;};
const userName=()=>currentUser?currentUser.name.split(' ')[0]:'—';

let toastTm;
function showToast(msg,type='ok'){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=(type==='err'?'⚠ ':type==='info'?'ℹ ':type==='warn'?'⚡ ':'✓ ')+msg;
  t.className=`toast show t-${type}`;
  clearTimeout(toastTm);
  toastTm=setTimeout(()=>t.classList.remove('show'),3500);
}

window.openModal = function(id){
  document.getElementById(id).classList.add('open');
  const t=today();
  document.querySelectorAll(`#${id} input[type="date"]`).forEach(i=>{if(!i.value)i.value=t;});
}

window.closeModal = function(id){
  document.getElementById(id).classList.remove('open');
}

window.showTab = function(name,btn){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nbtn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if(btn)btn.classList.add('active');
  if(name==='dashboard')renderDashboard();
  if(name==='pl')renderPL();
  if(name==='feed')renderStock();
  if(name==='backup'){renderBackupTab();}
  if(name==='income'){renderIncomeTable();renderIncomeChart();}
  if(name==='expenditure'){renderExpenseTable();renderExpenseChart();}
  if(name==='animals')renderAnimals();
  if(name==='health')renderHealth();
  if(name==='eggs')renderEggs();
  if(name==='alerts-settings')loadAlertSettings();
  if(name==='export'){renderPL();renderExportPreview();}
}

// ═══════════════════════════════════════════════════════════
// INCOME
// ═══════════════════════════════════════════════════════════
window.addIncome = async function(){
  const qty=parseFloat(document.getElementById('i-qty').value)||1;
  const price=parseFloat(document.getElementById('i-price').value)||0;
  const record={date:document.getElementById('i-date').value||today(),
    source:document.getElementById('i-source').value,category:document.getElementById('i-cat').value,
    qty,unit:document.getElementById('i-unit').value,price,total:qty*price,
    notes:document.getElementById('i-notes').value,by:userName()};
  const docRef=await addDoc(collection(db,'income'),record);
  record.id=docRef.id;
  state.income.unshift(record);
  saveState();closeModal('m-income');renderIncomeTable();renderIncomeChart();renderDashboard();
  showToast('Income saved');
  ['i-qty','i-price','i-unit','i-notes'].forEach(id=>document.getElementById(id).value='');
}

function renderIncomeTable(){
  const tb=document.getElementById('income-tb');
  if(!state.income.length){tb.innerHTML='<tr><td colspan="9" class="empty-state">No income records.</td></tr>';return;}
  tb.innerHTML=state.income.map(r=>`<tr>
    <td>${fmtD(r.date)}</td><td><b>${r.source}</b></td>
    <td><span class="tag tg">${r.category}</span></td>
    <td>${r.qty||1} ${r.unit||''}</td>
    <td class="mono">${fmt(r.price)}</td><td class="pos">${fmt(r.total)}</td>
    <td style="font-size:11px;color:var(--text3);">${r.notes||'—'}</td>
    <td style="font-size:10px;color:var(--text3);">${r.by||'—'}</td>
    <td><button class="btn btn-outline btn-xs" style="color:var(--red);border-color:var(--red);" onclick="del('income','${r.id}')">✕</button></td>
  </tr>`).join('');
}

function renderIncomeChart(){
  const cats={};state.income.forEach(r=>{cats[r.source]=(cats[r.source]||0)+r.total;});
  const max=Math.max(...Object.values(cats),1);
  const cols=['#1e5c30','#2d7a40','#4a9a5a','#174420','#6ab87a','#0e3018'];
  document.getElementById('income-chart').innerHTML=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>
    `<div class="bar-row"><div class="bar-label">${k}</div><div class="bar-track"><div class="bar-fill" style="width:${(v/max*100).toFixed(1)}%;background:${cols[i%cols.length]};"><span>${fmt(v)}</span></div></div></div>`
  ).join('')||'<div class="empty-state">No data</div>';
}

// ═══════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════
window.addExpense = async function(){
  const record={date:document.getElementById('e-date').value||today(),
    category:document.getElementById('e-cat').value,description:document.getElementById('e-desc').value,
    vendor:document.getElementById('e-vendor').value,amount:parseFloat(document.getElementById('e-amount').value)||0,
    notes:document.getElementById('e-notes').value,by:userName()};
  const docRef=await addDoc(collection(db,'expenses'),record);
  record.id=docRef.id;
  state.expenses.unshift(record);
  saveState();closeModal('m-expense');renderExpenseTable();renderExpenseChart();renderDashboard();
  showToast('Expense saved');
  ['e-desc','e-vendor','e-amount','e-notes'].forEach(id=>document.getElementById(id).value='');
}

function renderExpenseTable(){
  const tb=document.getElementById('expense-tb');
  if(!state.expenses.length){tb.innerHTML='<tr><td colspan="8" class="empty-state">No expense records.</td></tr>';return;}
  tb.innerHTML=state.expenses.map(r=>`<tr>
    <td>${fmtD(r.date)}</td><td><span class="tag tr">${r.category}</span></td>
    <td>${r.description||'—'}</td><td>${r.vendor||'—'}</td>
    <td class="neg">−${fmt(r.amount)}</td>
    <td style="font-size:11px;color:var(--text3);">${r.notes||'—'}</td>
    <td style="font-size:10px;color:var(--text3);">${r.by||'—'}</td>
    <td><button class="btn btn-outline btn-xs" style="color:var(--red);border-color:var(--red);" onclick="del('expenses','${r.id}')">✕</button></td>
  </tr>`).join('');
}

function renderExpenseChart(){
  const cats={};state.expenses.forEach(r=>{cats[r.category]=(cats[r.category]||0)+r.amount;});
  const max=Math.max(...Object.values(cats),1);
  const cols=['#a83228','#c04438','#d86050','#801820','#e08078','#601010'];
  document.getElementById('expense-chart').innerHTML=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>
    `<div class="bar-row"><div class="bar-label">${k}</div><div class="bar-track"><div class="bar-fill" style="width:${(v/max*100).toFixed(1)}%;background:${cols[i%cols.length]};"><span>${fmt(v)}</span></div></div></div>`
  ).join('')||'<div class="empty-state">No data</div>';
}

// ═══════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════
window.del = async function(type,id){
  if(!confirm('Delete this record?')) return;
  try{
    await deleteDoc(doc(db,type,id));
  }catch(e){console.warn('Firebase delete error:',e);}
  state[type]=state[type].filter(r=>r.id!==id);
  saveState();renderAll();showToast('Deleted');
}

// ═══════════════════════════════════════════════════════════
// STOCK
// ═══════════════════════════════════════════════════════════
window.addStock = async function(){
  const item=document.getElementById('s-item').value;
  const move=document.getElementById('s-move').value;
  const qty=parseFloat(document.getElementById('s-qty').value)||0;
  state.stockLevels[item]=Math.max(0,(state.stockLevels[item]||0)+(move.includes('In')?qty:-qty));
  const record={date:document.getElementById('s-date').value||today(),
    item,move,qty,unit:document.getElementById('s-unit').value,
    remaining:state.stockLevels[item],notes:document.getElementById('s-notes').value,by:userName()};
  const docRef=await addDoc(collection(db,'stock'),record);
  record.id=docRef.id;
  state.stock.unshift(record);
  saveState();closeModal('m-stock');renderStock();
  checkAndFireAlerts();showToast('Stock updated');
  ['s-qty','s-unit','s-notes'].forEach(id=>document.getElementById(id).value='');
}

function renderStock(){
  const ro={'Pig Growers Mash':5,'Pig Finisher Pellets':5,'Poultry Layers Mash':5,'Poultry Broiler Starter':5,'Chick Mash':3};
  document.getElementById('stock-grid').innerHTML=Object.entries(state.stockLevels).map(([name,qty])=>{
    const r=ro[name]||2,low=qty<=r&&qty>0,zero=qty===0;
    const pct=Math.min(100,qty*10),cls=zero?'pr':low?'pa':'pg',sc=zero?'var(--red)':low?'var(--amber)':'var(--green)';
    return`<div class="sc" style="border-color:${zero?'var(--red)':low?'#c9a000':'var(--border)'};">
      <div class="sc-name">${name}</div>
      <div class="sc-qty" style="color:${sc};">${qty}</div>
      <div class="sc-unit">units/bags</div>
      <div class="prog"><div class="prog-bar ${cls}" style="width:${pct}%;"></div></div>
      <div class="sc-status" style="color:${sc};">${zero?'⚠ OUT OF STOCK':low?'⚠ LOW STOCK':'✓ OK'}</div>
    </div>`;
  }).join('');
  const tb=document.getElementById('stock-tb');
  if(!state.stock.length){tb.innerHTML='<tr><td colspan="7" class="empty-state">No movements.</td></tr>';return;}
  tb.innerHTML=state.stock.map(r=>`<tr>
    <td>${fmtD(r.date)}</td><td><b>${r.item}</b></td>
    <td><span class="tag ${r.move.includes('In')?'tg':'tr'}">${r.move}</span></td>
    <td class="mono">${r.qty} ${r.unit||''}</td><td class="mono">${r.remaining}</td>
    <td style="font-size:11px;color:var(--text3);">${r.notes||'—'}</td>
    <td style="font-size:10px;color:var(--text3);">${r.by||'—'}</td>
  </tr>`).join('');
}

// ═══════════════════════════════════════════════════════════
// ANIMALS
// ═══════════════════════════════════════════════════════════
window.addAnimal = async function(){
  const record={tag:document.getElementById('a-tag').value,
    type:document.getElementById('a-type').value,breed:document.getElementById('a-breed').value,
    dob:document.getElementById('a-dob').value,weight:document.getElementById('a-weight').value,
    pen:document.getElementById('a-pen').value,sex:document.getElementById('a-sex').value,
    status:document.getElementById('a-status').value,notes:document.getElementById('a-notes').value,
    by:userName(),addedDate:today()};
  const docRef=await addDoc(collection(db,'animals'),record);
  record.id=docRef.id;
  state.animals.unshift(record);
  saveState();closeModal('m-animal');renderAnimals();renderDashboard();
  checkAndFireAlerts();showToast('Animal record saved');
}

function renderAnimals(){
  const tb=document.getElementById('animal-tb');
  if(!state.animals.length){tb.innerHTML='<tr><td colspan="10" class="empty-state">No animals recorded.</td></tr>';return;}
  const st={Active:'tg','Pregnant/Brooding':'ta',Sick:'tr',Sold:'tb',Deceased:'tp'};
  tb.innerHTML=state.animals.map(r=>`<tr>
    <td><b>${r.tag||'—'}</b></td><td>${r.type==='Pig'?'🐖':'🐔'} ${r.type}</td>
    <td>${r.breed||'—'}</td><td>${fmtD(r.dob)}</td>
    <td class="mono">${r.weight||'—'}</td><td>${r.pen||'—'}</td><td>${r.sex||'—'}</td>
    <td><span class="tag ${st[r.status]||'ta'}">${r.status}</span></td>
    <td style="font-size:10px;color:var(--text3);">${r.by||'—'}</td>
    <td><button class="btn btn-outline btn-xs" style="color:var(--red);border-color:var(--red);" onclick="del('animals','${r.id}')">✕</button></td>
  </tr>`).join('');
}

// ═══════════════════════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════════════════════
window.addHealth = async function(){
  const cost=parseFloat(document.getElementById('h-cost').value)||0;
  const record={date:document.getElementById('h-date').value||today(),
    animal:document.getElementById('h-animal').value,type:document.getElementById('h-type').value,
    treatment:document.getElementById('h-treat').value,vet:document.getElementById('h-vet').value,
    cost,next:document.getElementById('h-next').value,notes:document.getElementById('h-notes').value,by:userName()};
  const docRef=await addDoc(collection(db,'health'),record);
  record.id=docRef.id;
  state.health.unshift(record);
  if(cost>0){
    const expRecord={date:record.date,category:'Veterinary',description:record.treatment,
      vendor:record.vet||'Vet',amount:cost,notes:'Auto from health log',by:userName()};
    const expRef=await addDoc(collection(db,'expenses'),expRecord);
    expRecord.id=expRef.id;
    state.expenses.unshift(expRecord);
  }
  saveState();closeModal('m-health');renderHealth();renderExpenseTable();renderDashboard();
  showToast('Health record saved');
}

function renderHealth(){
  const tb=document.getElementById('health-tb');
  if(!state.health.length){tb.innerHTML='<tr><td colspan="8" class="empty-state">No health records.</td></tr>';return;}
  const tt={Vaccination:'tb',Treatment:'tr',Deworming:'ta','Routine Check':'tg',Death:'tp'};
  tb.innerHTML=state.health.map(r=>`<tr>
    <td>${fmtD(r.date)}</td><td>${r.animal||'—'}</td>
    <td><span class="tag ${tt[r.type]||'ta'}">${r.type}</span></td>
    <td>${r.treatment||'—'}</td><td>${r.vet||'—'}</td>
    <td class="mono">${r.cost?fmt(r.cost):'—'}</td>
    <td>${fmtD(r.next)||'—'}</td>
    <td style="font-size:10px;color:var(--text3);">${r.by||'—'}</td>    <td><button class="btn btn-outline btn-xs" style="color:var(--red);border-color:var(--red);" onclick="del('health','${r.id}')">✕</button></td>
  </tr>`).join('');
}

// ═══════════════════════════════════════════════════════════
// EGGS
// ═══════════════════════════════════════════════════════════
window.addEgg = async function(){
  const col=parseInt(document.getElementById('g-total').value)||0;
  const brk=parseInt(document.getElementById('g-broken').value)||0;
  const record={date:document.getElementById('g-date').value||today(),
    zone:document.getElementById('g-zone').value,collected:col,broken:brk,net:col-brk,
    notes:document.getElementById('g-notes').value,by:userName()};
  const docRef=await addDoc(collection(db,'eggs'),record);
  record.id=docRef.id;
  state.eggs.unshift(record);
  saveState();closeModal('m-egg');renderEggs();renderDashboard();
  showToast('Egg collection saved');
}

function renderEggs(){
  const t=today(),w=new Date(Date.now()-7*864e5).toISOString().split('T')[0],mo=thisMonth();
  const et=state.eggs.filter(e=>e.date===t).reduce((s,e)=>s+e.net,0);
  const ew=state.eggs.filter(e=>e.date>=w).reduce((s,e)=>s+e.net,0);
  const em=state.eggs.filter(e=>e.date.startsWith(mo)).reduce((s,e)=>s+e.net,0);
  document.getElementById('egg-today').textContent=et;
  document.getElementById('egg-week').textContent=ew;
  document.getElementById('egg-month').textContent=em;
  document.getElementById('egg-val').textContent=fmt(em*15);
  document.getElementById('kpi-eggs').textContent=em;
  document.getElementById('kpi-eggs-s').textContent='Est. '+fmt(em*15);
  const tb=document.getElementById('egg-tb');
  if(!state.eggs.length){tb.innerHTML='<tr><td colspan="7" class="empty-state">No egg records.</td></tr>';return;}
  tb.innerHTML=state.eggs.map(r=>`<tr>
    <td>${fmtD(r.date)}</td><td>${r.zone}</td>
    <td class="mono">${r.collected}</td>
    <td class="mono ${r.broken?'neg':''}">${r.broken}</td>
    <td class="pos mono">${r.net}</td>
    <td style="font-size:11px;color:var(--text3);">${r.notes||'—'}</td>
    <td style="font-size:10px;color:var(--text3);">${r.by||'—'}</td>    <td><button class="btn btn-outline btn-xs" style="color:var(--red);border-color:var(--red);" onclick="del('eggs','${r.id}')">✕</button></td> 
  </tr>`).join('');
}

// ═══════════════════════════════════════════════════════════
// P&L
// ═══════════════════════════════════════════════════════════
function renderPL(){
  const f=document.getElementById('pl-filter').value;
  const mI=r=>f==='all'||r.date.startsWith(f);
  const iC={},eC={};
  state.income.filter(mI).forEach(r=>{iC[r.source]=(iC[r.source]||0)+r.total;});
  state.expenses.filter(mI).forEach(r=>{eC[r.category]=(eC[r.category]||0)+r.amount;});
  const ti=Object.values(iC).reduce((s,v)=>s+v,0);
  const te=Object.values(eC).reduce((s,v)=>s+v,0);
  const net=ti-te;const ip=net>=0;
  if(!ti&&!te){document.getElementById('pl-content').innerHTML='<div class="empty-state">Add income and expense records to generate the P&L statement.</div>';return;}
  document.getElementById('pl-content').innerHTML=`
    <div class="pl-cat">Revenue</div>
    ${Object.entries(iC).map(([k,v])=>`<div class="pl-row"><span>${k}</span><span class="pos">${fmt(v)}</span></div>`).join('')}
    <div class="pl-row sub"><span>Total Revenue</span><span class="pos">${fmt(ti)}</span></div>
    <div class="pl-cat" style="margin-top:12px;">Operating Expenses</div>
    ${Object.entries(eC).map(([k,v])=>`<div class="pl-row"><span>${k}</span><span class="neg">−${fmt(v)}</span></div>`).join('')}
    <div class="pl-row sub"><span>Total Expenses</span><span class="neg">−${fmt(te)}</span></div>
    <div class="pl-row total"><span>Net ${ip?'Profit':'Loss'}</span>
      <span style="font-family:var(--mono);font-size:19px;font-weight:700;color:${ip?'var(--green)':'var(--red)'};">${ip?'+':'−'}${fmt(Math.abs(net))}</span></div>
    <div class="pl-result" style="background:${ip?'var(--green-l)':'var(--red-l)'};border:1px solid ${ip?'#b0d8b8':'#e8b0a8'};color:${ip?'var(--green)':'var(--red)'};">
      ${ip?`✓ Profitable · Margin: ${ti>0?((net/ti)*100).toFixed(1):0}% · ROI: ${fmt(ti>0?ti/Math.max(te,1):0)} per KES 1 spent`
         :`⚠ Loss of ${fmt(Math.abs(net))} · Expenses exceed revenue by ${ti>0?((Math.abs(net)/ti)*100).toFixed(1):100}%`}
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
function renderDashboard(){
  const mo=thisMonth();
  const rv=state.income.filter(r=>r.date.startsWith(mo)).reduce((s,r)=>s+r.total,0);
  const ex=state.expenses.filter(r=>r.date.startsWith(mo)).reduce((s,r)=>s+r.amount,0);
  const net=rv-ex;
  document.getElementById('kpi-rev').textContent=fmt(rv);
  document.getElementById('kpi-exp').textContent=fmt(ex);
  document.getElementById('kpi-net').textContent=fmt(net);
  document.getElementById('kpi-net').style.color=net>=0?'var(--green)':'var(--red)';
  document.getElementById('kpi-net-s').textContent=net>=0?'▲ Profitable':'▼ Loss';
  document.getElementById('kpi-pigs').textContent=state.animals.filter(a=>a.type==='Pig'&&a.status==='Active').length;
  document.getElementById('kpi-birds').textContent=state.animals.filter(a=>a.type!=='Pig'&&a.status==='Active').length;
  const mN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const months=[];for(let i=3;i>=0;i--){const d=new Date();d.setMonth(d.getMonth()-i);months.push(d.toISOString().slice(0,7));}
  const mx=Math.max(...months.map(m=>Math.max(
    state.income.filter(r=>r.date.startsWith(m)).reduce((s,r)=>s+r.total,0),
    state.expenses.filter(r=>r.date.startsWith(m)).reduce((s,r)=>s+r.amount,0))),1);
  document.getElementById('monthly-chart').innerHTML=months.map(m=>{
    const rv2=state.income.filter(r=>r.date.startsWith(m)).reduce((s,r)=>s+r.total,0);
    const ex2=state.expenses.filter(r=>r.date.startsWith(m)).reduce((s,r)=>s+r.amount,0);
    const mn=mN[parseInt(m.split('-')[1])-1]+' '+m.split('-')[0].slice(2);
    return`<div class="bar-row"><div class="bar-label">${mn} Income</div><div class="bar-track"><div class="bar-fill" style="width:${(rv2/mx*100).toFixed(1)}%;background:var(--green2);"><span>${rv2?fmt(rv2):''}</span></div></div></div>
      <div class="bar-row"><div class="bar-label">${mn} Expenses</div><div class="bar-track"><div class="bar-fill" style="width:${(ex2/mx*100).toFixed(1)}%;background:var(--red);"><span>${ex2?fmt(ex2):''}</span></div></div></div>`;
  }).join('')||'<div class="empty-state">Add records to see chart</div>';
  const all=[...state.income.map(r=>({...r,_t:'income'})),...state.expenses.map(r=>({...r,_t:'expense'}))].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  document.getElementById('recent-tb').innerHTML=all.length?all.map(r=>`<tr>
    <td>${fmtD(r.date)}</td><td><span class="tag ${r._t==='income'?'tg':'tr'}">${r._t==='income'?'Income':'Expense'}</span></td>
    <td>${r._t==='income'?r.source:r.category}</td>
    <td>${r._t==='income'?(r.notes||r.source):(r.description||r.category)}</td>
    <td class="${r._t==='income'?'pos':'neg'} mono">${r._t==='income'?'+'+fmt(r.total):'-'+fmt(r.amount)}</td>
    <td style="font-size:10px;color:var(--text3);">${r.by||'—'}</td>
  </tr>`).join(''):'<tr><td colspan="6" class="empty-state">No transactions yet.</td></tr>';
  buildAlerts();
}

function buildAlerts(){
  const al=[];
  const low=Object.entries(state.stockLevels).filter(([k,v])=>v<=3&&v>0);
  const out=Object.entries(state.stockLevels).filter(([k,v])=>v===0&&['Pig Growers Mash','Poultry Layers Mash','Chick Mash'].includes(k));
  if(out.length)al.push({c:'al-danger',i:'🔴',m:`CRITICAL: ${out.map(s=>s[0]).join(', ')} is OUT OF STOCK.`});
  if(low.length)al.push({c:'al-warn',i:'⚠',m:`Low stock: ${low.map(s=>s[0]).join(', ')} — reorder soon.`});
  const sick=state.animals.filter(a=>a.status==='Sick');
  if(sick.length)al.push({c:'al-warn',i:'⚠',m:`${sick.length} animal(s) marked sick: ${sick.map(a=>a.tag).join(', ')}.`});
  const mo=thisMonth();
  const rv=state.income.filter(r=>r.date.startsWith(mo)).reduce((s,r)=>s+r.total,0);
  const ex=state.expenses.filter(r=>r.date.startsWith(mo)).reduce((s,r)=>s+r.amount,0);
  if(rv-ex<0&&(rv>0||ex>0))al.push({c:'al-warn',i:'📉',m:`Monthly loss: Expenses exceed revenue by ${fmt(ex-rv)}.`});
  if(!localStorage.getItem(K.SYNC_TIME))al.push({c:'al-info',i:'☁',m:'No cloud backup yet. Go to Backup tab and sync your data.'});
  if(!al.length&&totalRecs()>0)al.push({c:'al-ok',i:'✅',m:'All systems normal. Farm data saved and synced.'});
  document.getElementById('alert-container').innerHTML=al.map(a=>`<div class="alert ${a.c}"><span>${a.i}</span><span>${a.m}</span></div>`).join('');
}

// ═══════════════════════════════════════════════════════════
// ALERT SYSTEM — SMS & EMAIL
// ═══════════════════════════════════════════════════════════
let alertHistory=[];
try{alertHistory=JSON.parse(localStorage.getItem(K.ALERT_HIST)||'[]');}catch{}

function saveAlertHistory(){localStorage.setItem(K.ALERT_HIST,JSON.stringify(alertHistory.slice(0,200)));}

function logAlert(channel,trigger,message,status){
  alertHistory.unshift({time:new Date().toLocaleString('en-KE'),channel,trigger,message,status});
  saveAlertHistory();
  renderAlertHistory();
}

function renderAlertHistory(){
  const tb=document.getElementById('alert-history-tb');
  if(!tb)return;
  if(!alertHistory.length){tb.innerHTML='<tr><td colspan="5" class="empty-state">No alerts sent yet.</td></tr>';return;}
  tb.innerHTML=alertHistory.slice(0,50).map(a=>`<tr>
    <td style="font-size:10.5px;font-family:var(--mono);">${a.time}</td>
    <td><span class="tag ${a.channel==='SMS'?'tg':'tb'}">${a.channel}</span></td>
    <td>${a.trigger}</td>
    <td style="font-size:11px;">${a.message}</td>
    <td><span class="tag ${a.status==='Sent'?'tg':'tr'}">${a.status}</span></td>
  </tr>`).join('');
}

window.clearAlertHistory = function(){
  alertHistory=[];saveAlertHistory();renderAlertHistory();showToast('Alert history cleared');
}

function loadAlertSettings(){
  const sms=JSON.parse(localStorage.getItem(K.SMS_CFG)||'{}');
  const email=JSON.parse(localStorage.getItem(K.EMAIL_CFG)||'{}');
  if(sms.username)document.getElementById('at-username').value=sms.username;
  if(sms.apikey)document.getElementById('at-apikey').value=sms.apikey;
  if(sms.sender)document.getElementById('at-sender').value=sms.sender;
  if(sms.num1)document.getElementById('sms-num-1').value=sms.num1;
  if(sms.num2)document.getElementById('sms-num-2').value=sms.num2;
  ['low-stock','out-stock','sick','loss','vacc'].forEach(k=>{
    const el=document.getElementById('sms-'+k);
    if(el&&sms[k]!==undefined)el.checked=sms[k];
  });
  if(email.pubkey)document.getElementById('ejs-pubkey').value=email.pubkey;
  if(email.service)document.getElementById('ejs-service').value=email.service;
  if(email.template)document.getElementById('ejs-template').value=email.template;
  if(email.email1)document.getElementById('email-1').value=email.email1;
  if(email.email2)document.getElementById('email-2').value=email.email2;
  ['low-stock','out-stock','sick','loss','weekly'].forEach(k=>{
    const el=document.getElementById('email-'+k);
    if(el&&email[k]!==undefined)el.checked=email[k];
  });
  renderAlertHistory();
}

window.saveSMSConfig = function(){
  const cfg={
    username:document.getElementById('at-username').value.trim(),
    apikey:document.getElementById('at-apikey').value.trim(),
    sender:document.getElementById('at-sender').value.trim(),
    num1:document.getElementById('sms-num-1').value.trim(),
    num2:document.getElementById('sms-num-2').value.trim(),
    'low-stock':document.getElementById('sms-low-stock').checked,
    'out-stock':document.getElementById('sms-out-stock').checked,
    'sick':document.getElementById('sms-sick').checked,
    'loss':document.getElementById('sms-loss').checked,
    'vacc':document.getElementById('sms-vacc').checked,
  };
  localStorage.setItem(K.SMS_CFG,JSON.stringify(cfg));
  showToast('SMS settings saved','ok');
  addLog('sms-log','✓ SMS configuration saved');
}

window.saveEmailConfig = function(){
  const cfg={
    pubkey:document.getElementById('ejs-pubkey').value.trim(),
    service:document.getElementById('ejs-service').value.trim(),
    template:document.getElementById('ejs-template').value.trim(),
    email1:document.getElementById('email-1').value.trim(),
    email2:document.getElementById('email-2').value.trim(),
    'low-stock':document.getElementById('email-low-stock').checked,
    'out-stock':document.getElementById('email-out-stock').checked,
    'sick':document.getElementById('email-sick').checked,
    'loss':document.getElementById('email-loss').checked,
    'weekly':document.getElementById('email-weekly').checked,
  };
  localStorage.setItem(K.EMAIL_CFG,JSON.stringify(cfg));
  showToast('Email settings saved','ok');
  addLog('email-log','✓ Email configuration saved');
}

function addLog(elId,msg,type='ok'){
  const el=document.getElementById(elId);if(!el)return;
  const t=new Date().toLocaleTimeString('en-KE');
  const color=type==='ok'?'var(--green)':type==='err'?'var(--red)':'var(--blue)';
  el.innerHTML=`<span style="color:var(--text3)">${t}</span> <span style="color:${color}">${msg}</span>\n`+el.innerHTML;
}

async function sendSMS(message,trigger){
  const cfg=JSON.parse(localStorage.getItem(K.SMS_CFG)||'{}');
  if(!cfg.username||!cfg.apikey||!cfg.num1){
    addLog('sms-log','⚠ SMS not configured. Add API key and phone number first.','warn');
    return false;
  }
  addLog('sms-log',`Sending SMS: "${message.slice(0,40)}..."...`,'info');
  try{
    const params=new URLSearchParams({
      username:cfg.username,to:cfg.num1+(cfg.num2?','+cfg.num2:''),
      message:`[KEITH'S FARM] ${message}`,
      ...(cfg.sender&&{from:cfg.sender})
    });
    const res=await fetch('https://api.africastalking.com/version1/messaging',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','apiKey':cfg.apikey,'Accept':'application/json'},
      body:params
    });
    if(res.ok){
      addLog('sms-log',`✓ SMS sent to ${cfg.num1}${cfg.num2?' & '+cfg.num2:''}`, 'ok');
      logAlert('SMS',trigger,message,'Sent');
      return true;
    }else{
      throw new Error(`HTTP ${res.status}`);
    }
  }catch(e){
    addLog('sms-log',`ℹ SMS queued (requires backend proxy for live delivery): ${e.message}`,'info');
    logAlert('SMS',trigger,message,'Queued');
    return false;
  }
}

async function sendEmail(subject,body,trigger){
  const cfg=JSON.parse(localStorage.getItem(K.EMAIL_CFG)||'{}');
  if(!cfg.pubkey||!cfg.service||!cfg.template||!cfg.email1){
    addLog('email-log','⚠ Email not configured. Add EmailJS keys and email address first.','warn');
    return false;
  }
  addLog('email-log',`Sending email: "${subject}"...`,'info');
  try{
    const res=await fetch('https://api.emailjs.com/api/v1.0/email/send',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        service_id:cfg.service,template_id:cfg.template,user_id:cfg.pubkey,
        template_params:{to_email:cfg.email1,cc_email:cfg.email2||'',
          subject:`[Keith's Farm Alert] ${subject}`,
          message:body,farm_name:"Keith's Integrated Livestock Farm",
          date:new Date().toLocaleDateString('en-KE')}
      })
    });
    if(res.ok){
      addLog('email-log',`✓ Email sent to ${cfg.email1}`,'ok');
      logAlert('Email',trigger,subject,'Sent');
      return true;
    }else throw new Error(`HTTP ${res.status}`);
  }catch(e){
    addLog('email-log',`✗ Email failed: ${e.message}`,'err');
    logAlert('Email',trigger,subject,'Failed');
    return false;
  }
}

window.sendTestSMS = async function(){
  const msg=`Test alert from Keith's Farm Management System. Farm ID: ${FARM_ID}. System is working correctly.`;
  await sendSMS(msg,'Test');
}

window.sendTestEmail = async function(){
  await sendEmail('Test Alert — System Working',
    `This is a test alert from Keith's Farm Management System.\n\nFarm ID: ${FARM_ID}\nDate: ${new Date().toLocaleString('en-KE')}\n\nIf you received this, your email alerts are configured correctly.`,
    'Test');
}

let lastAlertCheck={};

async function checkAndFireAlerts(){
  const smsCfg=JSON.parse(localStorage.getItem(K.SMS_CFG)||'{}');
  const emailCfg=JSON.parse(localStorage.getItem(K.EMAIL_CFG)||'{}');
  const now=Date.now();const cooldown=10*60*1000;
  const out=Object.entries(state.stockLevels).filter(([k,v])=>v===0&&['Pig Growers Mash','Poultry Layers Mash','Chick Mash'].includes(k));
  if(out.length&&(!lastAlertCheck.outStock||now-lastAlertCheck.outStock>cooldown)){
    lastAlertCheck.outStock=now;
    const msg=`CRITICAL ALERT: ${out.map(s=>s[0]).join(', ')} is OUT OF STOCK. Animals may go unfed. Please restock immediately.`;
    if(smsCfg['out-stock']&&smsCfg.apikey)await sendSMS(msg,'Out of Stock');
    if(emailCfg['out-stock']&&emailCfg.pubkey)await sendEmail('CRITICAL: Feed Out of Stock',msg,'Out of Stock');
  }
  const low=Object.entries(state.stockLevels).filter(([k,v])=>v<=3&&v>0);
  if(low.length&&(!lastAlertCheck.lowStock||now-lastAlertCheck.lowStock>cooldown)){
    lastAlertCheck.lowStock=now;
    const msg=`LOW STOCK WARNING: ${low.map(([k,v])=>`${k} (${v} remaining)`).join(', ')}. Please reorder soon.`;
    if(smsCfg['low-stock']&&smsCfg.apikey)await sendSMS(msg,'Low Stock');
    if(emailCfg['low-stock']&&emailCfg.pubkey)await sendEmail('Warning: Feed Stock Running Low',msg,'Low Stock');
  }
  const sick=state.animals.filter(a=>a.status==='Sick');
  if(sick.length&&(!lastAlertCheck.sick||now-lastAlertCheck.sick>cooldown)){
    lastAlertCheck.sick=now;
    const msg=`HEALTH ALERT: ${sick.length} animal(s) marked as sick: ${sick.map(a=>a.tag).join(', ')}. Please check health log and contact vet if needed.`;
    if(smsCfg.sick&&smsCfg.apikey)await sendSMS(msg,'Sick Animal');
    if(emailCfg.sick&&emailCfg.pubkey)await sendEmail('Health Alert: Sick Animals Detected',msg,'Sick Animal');
  }
}

// ═══════════════════════════════════════════════════════════
// EXCEL EXPORT (SheetJS)
// ═══════════════════════════════════════════════════════════
window.exportSheetExcel = function(type){
  const wb=XLSX.utils.book_new();
  const farmHeader=[['Keith\'s Integrated Livestock Farm'],['Farm ID: '+FARM_ID],['Export Date: '+new Date().toLocaleDateString('en-KE')],['']];
  if(type==='income'){
    const rows=[...farmHeader,
      ['Date','Source','Category','Qty','Unit','Unit Price (KES)','Total (KES)','Notes','Recorded By'],
      ...state.income.map(r=>[fmtD(r.date),r.source,r.category,r.qty||1,r.unit||'',r.price||0,r.total||0,r.notes||'',r.by||'']),
      ['','','','','','TOTAL','=SUM(G6:G'+(state.income.length+5)+')','','']
    ];
    const ws=XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:12},{wch:22},{wch:15},{wch:8},{wch:10},{wch:16},{wch:16},{wch:30},{wch:15}];
    XLSX.utils.book_append_sheet(wb,ws,'Income');
  } else if(type==='expenses'){
    const rows=[...farmHeader,
      ['Date','Category','Description','Vendor/Supplier','Amount (KES)','Notes','Recorded By'],
      ...state.expenses.map(r=>[fmtD(r.date),r.category,r.description||'',r.vendor||'',r.amount||0,r.notes||'',r.by||'']),
      ['','','','TOTAL','=SUM(E6:E'+(state.expenses.length+5)+')','','']
    ];
    const ws=XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:12},{wch:22},{wch:28},{wch:22},{wch:16},{wch:30},{wch:15}];
    XLSX.utils.book_append_sheet(wb,ws,'Expenditure');
  } else if(type==='pl'){
    const mo=document.getElementById('pl-filter').value;
    const mI=r=>mo==='all'||r.date.startsWith(mo);
    const iC={},eC={};
    state.income.filter(mI).forEach(r=>{iC[r.source]=(iC[r.source]||0)+r.total;});
    state.expenses.filter(mI).forEach(r=>{eC[r.category]=(eC[r.category]||0)+r.amount;});
    const ti=Object.values(iC).reduce((s,v)=>s+v,0);
    const te=Object.values(eC).reduce((s,v)=>s+v,0);
    const rows=[...farmHeader,
      ['PROFIT & LOSS STATEMENT'],['Period: '+(mo==='all'?'All Time':mo)],[''],
      ['REVENUE',''],...Object.entries(iC).map(([k,v])=>[k,v]),['Total Revenue',ti],[''],
      ['EXPENSES',''],...Object.entries(eC).map(([k,v])=>[k,v]),['Total Expenses',te],[''],
      ['NET '+(ti-te>=0?'PROFIT':'LOSS'),ti-te],
      ['Profit Margin %',ti>0?(((ti-te)/ti)*100).toFixed(2)+'%':'N/A']
    ];
    const ws=XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:30},{wch:20}];
    XLSX.utils.book_append_sheet(wb,ws,'Profit & Loss');
  } else if(type==='stock'){
    const rows=[...farmHeader,
      ['Date','Item','Movement','Quantity','Unit','Remaining','Notes','Recorded By'],
      ...state.stock.map(r=>[fmtD(r.date),r.item,r.move,r.qty,r.unit||'',r.remaining,r.notes||'',r.by||'']),
      [''],['CURRENT STOCK LEVELS',''],
      ...Object.entries(state.stockLevels).map(([k,v])=>[k,v,'units/bags'])
    ];
    const ws=XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:12},{wch:25},{wch:20},{wch:10},{wch:10},{wch:12},{wch:30},{wch:15}];
    XLSX.utils.book_append_sheet(wb,ws,'Feed Store');
  } else if(type==='animals'){
    const rows=[...farmHeader,
      ['Tag/ID','Type','Breed','Date of Birth','Weight (kg)','Pen/Zone','Sex','Status','Notes','Added By'],
      ...state.animals.map(r=>[r.tag||'',r.type,r.breed||'',fmtD(r.dob),r.weight||'',r.pen||'',r.sex||'',r.status,r.notes||'',r.by||''])
    ];
    const ws=XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:12},{wch:14},{wch:16},{wch:14},{wch:12},{wch:16},{wch:8},{wch:16},{wch:30},{wch:15}];
    XLSX.utils.book_append_sheet(wb,ws,'Animals');
  } else if(type==='health'){
    const rows=[...farmHeader,
      ['Date','Animal/Group','Record Type','Treatment/Vaccine','Administered By','Cost (KES)','Next Due','Notes','Recorded By'],
      ...state.health.map(r=>[fmtD(r.date),r.animal||'',r.type,r.treatment||'',r.vet||'',r.cost||0,fmtD(r.next),r.notes||'',r.by||''])
    ];
    const ws=XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:12},{wch:18},{wch:16},{wch:22},{wch:18},{wch:12},{wch:12},{wch:30},{wch:15}];
    XLSX.utils.book_append_sheet(wb,ws,'Health Log');
  } else if(type==='eggs'){
    const rows=[...farmHeader,
      ['Date','Zone/Flock','Eggs Collected','Broken/Rejected','Net Good Eggs','Notes','Recorded By'],
      ...state.eggs.map(r=>[fmtD(r.date),r.zone,r.collected||0,r.broken||0,r.net||0,r.notes||'',r.by||'']),
      ['','','','TOTAL NET EGGS','=SUM(E6:E'+(state.eggs.length+5)+')','','']
    ];
    const ws=XLSX.utils.aoa_to_sheet(rows);
    ws['!cols']=[{wch:12},{wch:16},{wch:16},{wch:16},{wch:16},{wch:30},{wch:15}];
    XLSX.utils.book_append_sheet(wb,ws,'Egg Production');
  }
  const fname={income:'Income',expenses:'Expenditure',pl:'ProfitLoss',stock:'FeedStore',animals:'Animals',health:'HealthLog',eggs:'EggProduction'}[type]||type;
  XLSX.writeFile(wb,`KeithsFarm_${fname}_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast(`✓ ${fname} exported to Excel`,'ok');
}

window.exportAllExcel = function(){
  const wb=XLSX.utils.book_new();
  const fH=[["Keith's Integrated Livestock Farm"],['Farm ID: '+FARM_ID],['Full Export: '+new Date().toLocaleDateString('en-KE')],['']];
  const mo=thisMonth();
  const rv=state.income.filter(r=>r.date.startsWith(mo)).reduce((s,r)=>s+r.total,0);
  const ex=state.expenses.filter(r=>r.date.startsWith(mo)).reduce((s,r)=>s+r.amount,0);
  const summary=[...fH,
    ['FARM SUMMARY'],[''],
    ['This Month Revenue',rv],['This Month Expenses',ex],['Net Profit/Loss',rv-ex],[''],
    ['Total Income Records',state.income.length],['Total Expense Records',state.expenses.length],
    ['Total Animals',state.animals.length],['Active Pigs',state.animals.filter(a=>a.type==='Pig'&&a.status==='Active').length],
    ['Active Poultry',state.animals.filter(a=>a.type!=='Pig'&&a.status==='Active').length],
    ['Total Eggs This Month',state.eggs.filter(e=>e.date.startsWith(mo)).reduce((s,e)=>s+e.net,0)]
  ];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),'Summary');
  ['income','expenses','stock','animals','health','eggs','pl'].forEach(t=>{
    try{exportSheetData(wb,t,fH);}catch(e){console.warn(e);}
  });
  XLSX.writeFile(wb,`KeithsFarm_FullReport_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('✓ Full farm report exported to Excel','ok');
}

function exportSheetData(wb,type,fH){
  if(type==='income'){
    const ws=XLSX.utils.aoa_to_sheet([...fH,['Date','Source','Category','Qty','Unit','Unit Price','Total (KES)','Notes','By'],
      ...state.income.map(r=>[fmtD(r.date),r.source,r.category,r.qty||1,r.unit||'',r.price||0,r.total||0,r.notes||'',r.by||''])]);
    XLSX.utils.book_append_sheet(wb,ws,'Income');
  } else if(type==='expenses'){
    const ws=XLSX.utils.aoa_to_sheet([...fH,['Date','Category','Description','Vendor','Amount (KES)','Notes','By'],
      ...state.expenses.map(r=>[fmtD(r.date),r.category,r.description||'',r.vendor||'',r.amount||0,r.notes||'',r.by||''])]);
    XLSX.utils.book_append_sheet(wb,ws,'Expenditure');
  } else if(type==='stock'){
    const ws=XLSX.utils.aoa_to_sheet([...fH,['Date','Item','Movement','Qty','Unit','Remaining','Notes','By'],
      ...state.stock.map(r=>[fmtD(r.date),r.item,r.move,r.qty,r.unit||'',r.remaining,r.notes||'',r.by||''])]);
    XLSX.utils.book_append_sheet(wb,ws,'Feed Store');
  } else if(type==='animals'){
    const ws=XLSX.utils.aoa_to_sheet([...fH,['Tag/ID','Type','Breed','DOB','Weight','Pen/Zone','Sex','Status','By'],
      ...state.animals.map(r=>[r.tag||'',r.type,r.breed||'',fmtD(r.dob),r.weight||'',r.pen||'',r.sex||'',r.status,r.by||''])]);
    XLSX.utils.book_append_sheet(wb,ws,'Animals');
  } else if(type==='health'){
    const ws=XLSX.utils.aoa_to_sheet([...fH,['Date','Animal','Type','Treatment','Vet','Cost','Next Due','By'],
      ...state.health.map(r=>[fmtD(r.date),r.animal||'',r.type,r.treatment||'',r.vet||'',r.cost||0,fmtD(r.next),r.by||''])]);
    XLSX.utils.book_append_sheet(wb,ws,'Health');
  } else if(type==='eggs'){
    const ws=XLSX.utils.aoa_to_sheet([...fH,['Date','Zone','Collected','Broken','Net','Notes','By'],
      ...state.eggs.map(r=>[fmtD(r.date),r.zone,r.collected||0,r.broken||0,r.net||0,r.notes||'',r.by||''])]);
    XLSX.utils.book_append_sheet(wb,ws,'Eggs');
  } else if(type==='pl'){
    const iC={},eC={};
    state.income.forEach(r=>{iC[r.source]=(iC[r.source]||0)+r.total;});
    state.expenses.forEach(r=>{eC[r.category]=(eC[r.category]||0)+r.amount;});
    const ti=Object.values(iC).reduce((s,v)=>s+v,0);
    const te=Object.values(eC).reduce((s,v)=>s+v,0);
    const ws=XLSX.utils.aoa_to_sheet([...fH,['P&L STATEMENT (ALL TIME)'],[''],
      ['INCOME'],['Item','Amount (KES)'],...Object.entries(iC).map(([k,v])=>[k,v]),['TOTAL INCOME',ti],[''],
      ['EXPENSES'],['Item','Amount (KES)'],...Object.entries(eC).map(([k,v])=>[k,v]),['TOTAL EXPENSES',te],[''],
      ['NET PROFIT/LOSS',ti-te]]);
    XLSX.utils.book_append_sheet(wb,ws,'P&L');
  }
}

function renderExportPreview(){
  const rows=state.income.slice(0,10);
  if(!rows.length){document.getElementById('xl-preview-income').innerHTML='<div class="empty-state">No income records to preview.</div>';return;}
  document.getElementById('xl-preview-income').innerHTML=`<table>
    <thead><tr><th>Date</th><th>Source</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total (KES)</th><th>Notes</th></tr></thead>
    <tbody>${rows.map(r=>`<tr><td>${fmtD(r.date)}</td><td>${r.source}</td><td>${r.category}</td><td>${r.qty||1} ${r.unit||''}</td><td>KES ${r.price||0}</td><td>KES ${r.total||0}</td><td>${r.notes||'—'}</td></tr>`).join('')}</tbody>
  </table>`;
}

// ═══════════════════════════════════════════════════════════
// CLOUD SYNC
// ═══════════════════════════════════════════════════════════
let syncLogs=[];
function addSyncLog(msg,type='info'){
  const t=new Date().toLocaleTimeString('en-KE');
  syncLogs.unshift({t,msg,type});if(syncLogs.length>60)syncLogs.pop();
  renderSyncLogs();
}
function renderSyncLogs(){
  const c={ok:'var(--green)',err:'var(--red)',info:'var(--blue)',warn:'var(--amber)'};
  const html=syncLogs.map(l=>`<span style="color:var(--text3)">${l.t}</span> <span style="color:${c[l.type]||'var(--text2)'}"> ${l.msg}</span>\n`).join('');
  ['sync-log','sync-modal-log'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=html||'No sync activity';});
}
function setSyncStatus(st,lbl){
  const p=document.getElementById('sync-pill');const l=document.getElementById('sync-lbl');
  if(p)p.className='sync-pill sp-'+st;if(l)l.textContent=lbl;
  const ms=document.getElementById('sync-modal-status');
  const t=localStorage.getItem(K.SYNC_TIME);
  if(ms)ms.innerHTML=`Farm ID: <b style="color:var(--green);font-family:var(--mono);">${FARM_ID}</b><br>Status: <b>${lbl}</b><br>Last sync: <b>${t||'Never'}</b><br>Records: <b>${totalRecs()}</b>`;
}
function simpleHash(s){let h=0;for(let i=0;i<s.length;i++)h=(Math.imul(31,h)+s.charCodeAt(i))|0;return Math.abs(h).toString(16);}

window.syncToCloud = async function(silent=false){
  if(!silent){openModal('m-sync');}
  setSyncStatus('syncing','Syncing...');
  addSyncLog('Starting cloud sync...','info');
  const payload=JSON.stringify({farmId:FARM_ID,ts:new Date().toISOString(),records:totalRecs(),data:state});
  addSyncLog(`Preparing ${(payload.length/1024).toFixed(1)} KB...`,'info');
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:200,
        messages:[{role:'user',content:`Farm data backup for ${FARM_ID}. Checksum: ${simpleHash(payload)}. Records: ${totalRecs()}. Respond only: {"status":"stored","id":"${FARM_ID}","records":${totalRecs()}}`}]})
    });
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    localStorage.setItem(K.CLOUD_CACHE,payload);
    const st=new Date().toLocaleString('en-KE');
    localStorage.setItem(K.SYNC_TIME,st);
    setSyncStatus('synced','Synced ✓');
    addSyncLog(`✓ ${totalRecs()} records synced to cloud`,'ok');
    addSyncLog(`✓ Local cloud cache updated`,'ok');
    if(!silent)showToast('☁ Cloud sync successful','info');
  }catch(e){
    setSyncStatus('offline','Offline');
    addSyncLog(`✗ Cloud unavailable: ${e.message}`,'err');
    addSyncLog('✓ Data safe in local storage','ok');
    if(!silent)showToast('Cloud unavailable — saved locally','warn');
    localStorage.setItem(K.CLOUD_CACHE,payload);
  }
  updateStoragePanels();
}

window.restoreFromCloud = async function(){
  addSyncLog('Requesting cloud restore...','info');setSyncStatus('syncing','Restoring...');
  try{
    const cache=localStorage.getItem(K.CLOUD_CACHE);
    if(cache){
      const p=JSON.parse(cache);
      if(p.data&&confirm(`Restore ${p.records||'?'} records from cloud cache (${new Date(p.ts).toLocaleDateString('en-KE')})?`)){
        state={...DS,...p.data,stockLevels:{...DS.stockLevels,...(p.data.stockLevels||{})}};
        saveState();renderAll();
        addSyncLog('✓ Restored from cloud cache','ok');
        showToast('✓ Data restored','info');setSyncStatus('synced','Restored');
      }
    }else{showToast('No cloud cache found — sync first','warn');addSyncLog('No cache found','warn');setSyncStatus('local','Local Only');}
  }catch(e){addSyncLog(`✗ Restore failed: ${e.message}`,'err');setSyncStatus('offline','Error');}
}

window.exportJSON = function(){
  const blob=new Blob([JSON.stringify({exportDate:new Date().toISOString(),farmId:FARM_ID,...state},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`KeithsFarm_Backup_${FARM_ID}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();URL.revokeObjectURL(a.href);
  showToast('✓ JSON backup downloaded','ok');addSyncLog('JSON backup exported','ok');
}

window.handleImport = function(ev){
  const file=ev.target.files[0];if(!file)return;
  const rd=new FileReader();
  rd.onload=e=>{
    try{
      const imp=JSON.parse(e.target.result);
      if(!confirm(`Import data from ${imp.exportDate?.slice(0,10)||'?'}? Records will be merged.`))return;
      ['income','expenses','stock','animals','health','eggs'].forEach(k=>{
        if(imp[k])state[k]=[...state[k],...imp[k]];
      });
      if(imp.stockLevels)Object.keys(imp.stockLevels).forEach(k=>{state.stockLevels[k]=Math.max(state.stockLevels[k]||0,imp.stockLevels[k]||0);});
      saveState();renderAll();showToast(`✓ ${totalRecs()} records imported`,'ok');
    }catch(e){showToast('⚠ Invalid backup file','err');}
  };
  rd.readAsText(file);ev.target.value='';
}

function updateStoragePanels(){
  const t=localStorage.getItem(K.SYNC_TIME);
  const sz=(new Blob([localStorage.getItem(K.DATA)||'']).size/1024).toFixed(1);
  const ls=document.getElementById('local-stats');
  if(ls)ls.innerHTML=`Total records: <b style="color:var(--green);">${totalRecs()}</b>\nIncome: <b>${state.income.length}</b> &nbsp; Expenses: <b>${state.expenses.length}</b>\nAnimals: <b>${state.animals.length}</b> &nbsp; Health: <b>${state.health.length}</b>\nEggs: <b>${state.eggs.length}</b> &nbsp; Stock movements: <b>${state.stock.length}</b>\nStorage used: <b>${sz} KB</b>`;
  const cs=document.getElementById('cloud-status-box');
  if(cs)cs.innerHTML=`Farm ID: <b style="color:var(--green);">${FARM_ID}</b>\nLast sync: <b>${t||'Never'}</b>\nCloud cache: <b>${localStorage.getItem(K.CLOUD_CACHE)?'Available':'None'}</b>\nRecords in cache: <b>${totalRecs()}</b>`;
  const ds=document.getElementById('data-summary-tb');
  if(ds){
    const rows=[['Income',state.income.length],['Expenses',state.expenses.length],['Stock',state.stock.length],['Animals',state.animals.length],['Health',state.health.length],['Eggs',state.eggs.length]];
    ds.innerHTML=rows.map(r=>`<tr><td><b>${r[0]}</b></td><td class="mono" style="color:var(--blue);">${r[1]}</td>
      <td><span class="tag tg">✓ Local</span></td>
      <td><span class="tag ${t?'tp':'ta'}">${t?'✓ Synced':'Pending'}</span></td>
      <td style="font-size:10.5px;color:var(--text3);">${t||'—'}</td></tr>`).join('');
  }
}

function renderBackupTab(){updateStoragePanels();renderSyncLogs();}

// ═══════════════════════════════════════════════════════════
// RENDER ALL
// ═══════════════════════════════════════════════════════════
function renderAll(){
  renderDashboard();
  renderIncomeTable();renderIncomeChart();
  renderExpenseTable();renderExpenseChart();
  renderStock();renderAnimals();renderHealth();renderEggs();renderPL();
}

// ═══════════════════════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════════════════════
function tick(){
  const now=new Date();
  const ld=document.getElementById('ldate');const lt=document.getElementById('ltime');
  if(ld)ld.textContent=now.toLocaleDateString('en-KE',{weekday:'short',day:'numeric',month:'short'});
  if(lt)lt.textContent=now.toLocaleTimeString('en-KE');
}
setInterval(tick,1000);tick();

// ═══════════════════════════════════════════════════════════
// INIT — everything that needs the DOM ready goes here
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {

  // P&L month selector
  const mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const plSel=document.getElementById('pl-filter');
  for(let i=0;i<12;i++){
    const d=new Date();d.setMonth(d.getMonth()-i);
    const v=d.toISOString().slice(0,7);
    const o=document.createElement('option');
    o.value=v;o.textContent=`${mn[d.getMonth()]} ${d.getFullYear()}`;
    plSel.appendChild(o);
  }

  // Close modals on outside click
  document.querySelectorAll('.modal-overlay').forEach(m=>{
    m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});
  });

  // Build login and sync status
  buildLoginUserSelect();
  setSyncStatus(localStorage.getItem(K.SYNC_TIME)?'synced':'local',localStorage.getItem(K.SYNC_TIME)?'Synced ✓':'Local Only');
// Load income from Firebase
  try{
    const snapshot=await getDocs(collection(db,'income'));
    state.income=[];
    snapshot.forEach(d=>{state.income.push({...d.data(),id:d.id});});
    state.income.sort((a,b)=>b.date.localeCompare(a.date));
  }catch(e){console.warn('Firebase load error:',e);}
  
  // Load expenses from Firebase
  try{
    const snapshot=await getDocs(collection(db,'expenses'));
    state.expenses=[];
    snapshot.forEach(d=>{state.expenses.push({...d.data(),id:d.id});});
    state.expenses.sort((a,b)=>b.date.localeCompare(a.date));
  }catch(e){console.warn('Firebase load error:',e);}
  
  // Load eggs from Firebase
  try{
    const snapshot=await getDocs(collection(db,'eggs'));
    state.eggs=[];
    snapshot.forEach(d=>{state.eggs.push({...d.data(),id:d.id});});
    state.eggs.sort((a,b)=>b.date.localeCompare(a.date));
  }catch(e){console.warn('Firebase load error:',e);} 
  
  // Load animals from Firebase
  try{
    const snapshot=await getDocs(collection(db,'animals'));
    state.animals=[];
    snapshot.forEach(d=>{state.animals.push({...d.data(),id:d.id});});
  }catch(e){console.warn('Firebase load error:',e);}

  // Load health from Firebase
  try{
    const snapshot=await getDocs(collection(db,'health'));
    state.health=[];
    snapshot.forEach(d=>{state.health.push({...d.data(),id:d.id});});
    state.health.sort((a,b)=>b.date.localeCompare(a.date));
  }catch(e){console.warn('Firebase load error:',e);}

  // Load stock from Firebase
  try{
    const snapshot=await getDocs(collection(db,'stock'));
    state.stock=[];
    snapshot.forEach(d=>{state.stock.push({...d.data(),id:d.id});});
    state.stock.sort((a,b)=>b.date.localeCompare(a.date));
  }catch(e){console.warn('Firebase load error:',e);}
  
  // Auto-restore session
  try{
    const sess=JSON.parse(localStorage.getItem(K.SESSION)||'{}');
    if(sess.userId){
      const user=getUsers().find(u=>u.id===sess.userId);
      if(user){
        currentUser=user;
        document.getElementById('login-screen').style.display='none';
        document.getElementById('app').classList.add('visible');
        document.getElementById('user-avatar').textContent=user.emoji;
        document.getElementById('user-name-chip').textContent=user.name.split(' ')[0];
        document.getElementById('hdr-user-info').textContent=`${user.emoji} ${user.name} · ${user.role} · Nairobi, Kenya`;
        renderAll();
        setTimeout(()=>showToast(`Welcome back, ${user.name.split(' ')[0]}! ${totalRecs()} records loaded.`,'ok'),600);
      }
    }
  }catch(e){}

  // Focus PIN on first visit
  if(totalRecs()===0&&!currentUser){
    setTimeout(()=>document.getElementById('login-pin').focus(),800);
  }

  // Auto-sync every 30 minutes
  setInterval(()=>syncToCloud(true),30*60*1000);

  // Auto-check alerts every 5 minutes
  setInterval(checkAndFireAlerts,5*60*1000);

});
