
/* ================= Resora: функции настоящей системы (работают только в оболочке ISO) ================= */
(function(){
const N=window.ResoraNative; if(!N) return;
document.documentElement.classList.add('is-native');
const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
const fail=(m)=>e=>toast(m+(e&&e.message?': '+e.message:''));

/* ---- питание ---- */
let pwTimer=null,pwAction='';
window.showLoginPower=function(action){
 const map={'Сон':'suspend','Перезагрузка':'reboot','Выключение':'poweroff'};const a=map[action]||'poweroff';
 if(a==='suspend'){N.call('power',{action:a}).catch(fail('Не удалось уснуть'));return}
 if(pwAction===a&&pwTimer){clearTimeout(pwTimer);pwTimer=null;pwAction='';toast(a==='reboot'?'Перезагрузка…':'Выключение…');N.call('power',{action:a}).catch(fail('Не удалось'));return}
 pwAction=a;toast(a==='reboot'?'Нажмите ещё раз, чтобы перезагрузить компьютер':'Нажмите ещё раз, чтобы выключить компьютер');
 pwTimer=setTimeout(()=>{pwTimer=null;pwAction=''},4000)};

/* ---- Wi-Fi в мастере настройки ---- */
SA_NETS.length=0;
async function saLoadNets(){
 try{const list=await N.call('wifi.scan');SA_NETS.length=0;
  list.forEach(n=>SA_NETS.push([n.ssid,Math.max(1,Math.min(4,Math.ceil(n.signal/25))),n.secure]));
  const act=list.find(n=>n.active);if(act){setupModel.ssid=act.ssid;setupModel.network=act.ssid;setupModel.wifi=true}
 }catch(e){SA_NETS.length=0}
 window.saNetsLoaded=true}
window.saRescan=function(){window.saNetsLoading=true;renderSetupStep();return saLoadNets().finally(()=>{window.saNetsLoading=false;if(setupModel.step===1)renderSetupStep()})};
{const orig=renderSetupStep;renderSetupStep=function(){orig();
 if(setupModel.step===1&&!window.saNetsLoaded&&!window.saNetsLoading){window.saNetsLoading=true;orig();saLoadNets().finally(()=>{window.saNetsLoading=false;if(setupModel.step===1)renderSetupStep()})}}}
saConnect=async function(ssid,pw){
 saNetBusy=ssid;saNetOpen=null;renderSetupStep();
 try{await N.call('wifi.connect',{ssid,password:pw||''});setupModel.ssid=ssid;setupModel.network=ssid;setupModel.wifi=true}
 catch(e){setupModel.wifi=false;setupModel.ssid='';toast('Не удалось подключиться: '+(e.message||e))}
 saNetBusy=null;if(setupModel.step===1)renderSetupStep()};
saConnectFrom=function(ssid){const pw=$('#saNetPass')?.value||'';if(!pw){$('#saNetPass')?.classList.add('bad');$('#saNetErr').textContent=saT('needPass');return}saConnect(ssid,pw)};

/* ---- Пункт управления: яркость, громкость, Wi-Fi ---- */
const ranges=qa('.cc2-range');
const bind=(range,get,set,hideMsg)=>{
 if(!range)return;const tile=range.closest('.cc2-slider');let t=null;
 get().then(v=>{range.value=v;range.parentNode.style.setProperty('--p',v/100)}).catch(()=>{tile.style.opacity='.5';tile.title=hideMsg;range.disabled=true});
 range.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>set(+range.value).catch(()=>{}),70)})};
bind(ranges[0],()=>N.call('brightness.get'),v=>N.call('brightness.set',{value:v}),'Подсветка экрана недоступна на этом устройстве');
bind(ranges[1],()=>N.call('audio.get').then(r=>r.value),v=>N.call('audio.set',{value:v}),'Звуковая подсистема недоступна');
const wifiTile=q('.cc3-m');
if(wifiTile){
 const circle=wifiTile.querySelector('.cc2-circle'),sub=wifiTile.querySelector('small');
 wifiTile.removeAttribute('onclick');
 wifiTile.addEventListener('click',async()=>{const on=!circle.classList.contains('on');
  try{await N.call('wifi.radio',{on});circle.classList.toggle('on',on);sub.textContent=on?'Включён':'Выкл.';setTimeout(updStatus,2500)}catch(e){toast('Wi-Fi: '+(e.message||e))}})}

/* ---- Строка меню: батарея и Wi-Fi ---- */
const stBtns=qa('.menu-right .status-btn');
async function updStatus(){
 try{const b=await N.call('battery');
  if(!b){if(stBtns[0])stBtns[0].style.display='none'}
  else if(stBtns[0]){stBtns[0].style.display='';stBtns[0].title=`Заряд: ${b.percent}%${b.charging?' · заряжается':''}`;
   const p=stBtns[0].querySelector('path[fill="currentColor"]');if(p){const w=Math.max(0.5,8*b.percent/100).toFixed(1);p.setAttribute('d',`M5.5 9.5h${w}v5h-${w}z`)}}
 }catch(e){}
 try{const w=await N.call('wifi.status');
  if(stBtns[1]){stBtns[1].title=w.connected?`Wi-Fi: ${w.ssid}`:'Wi-Fi: не подключено';stBtns[1].style.opacity=w.connected?'':'.45'}
  if(wifiTile){const c=wifiTile.querySelector('.cc2-circle'),s=wifiTile.querySelector('small');c.classList.toggle('on',w.connected);s.textContent=w.connected?w.ssid:'Не подключено';wifiTile.dataset.onText=w.ssid||'Включён'}
 }catch(e){}}
updStatus();setInterval(updStatus,20000);

/* ---- Док: настоящий браузер и терминал ---- */
const launchNative=(app,name)=>N.call('app.launch',{app}).then(()=>toast(name+' запущен. Закройте его окно, чтобы вернуться в Resora')).catch(fail('Не удалось запустить '+name));
const safari=q('[data-launch=safari]'),term=q('[data-launch=terminal]');
if(safari){safari.title='Браузер (Epiphany)';safari.onclick=()=>launchNative('browser','Браузер')}
if(term)term.onclick=()=>launchNative('terminal','Терминал');

/* ---- Finder: настоящая файловая система ---- */
const nf={path:null,hist:[],idx:-1,home:'/home/resora'};
N.call('sys.info').then(i=>{nf.home=i.home||nf.home}).catch(()=>{});
const nfMap={'Рабочий стол':'/Desktop','Документы':'/Documents','Загрузки':'/Downloads','Изображения':'/Pictures','Недавние':''};
async function nfLoad(path,push){
 try{const r=await N.call('fs.list',{path});nf.path=r.path;
  if(push){nf.hist=nf.hist.slice(0,nf.idx+1);nf.hist.push(r.path);nf.idx=nf.hist.length-1}
  window.nfData=r;nfRender()}catch(e){toast('Не удалось открыть папку: '+(e.message||e))}}
function nfRender(){
 const r=window.nfData;if(!r)return;const s=($('#finderSearch').value||'').toLowerCase();
 const arr=r.items.filter(x=>x.name.toLowerCase().includes(s)).map(x=>({name:x.name,type:x.dir?'folder':extType(x.name),path:r.path.replace(/\/$/,'')+'/'+x.name}));
 window.visibleFiles=arr;
 $('#fileGrid').innerHTML=arr.length?arr.map((f,i)=>`<button class="file-tile" title="${esc(f.name)}" ondblclick="openFileTile(${i})" onclick="selectTile(this)">${fileIcon(f.type)}<span>${esc(f.name)}</span></button>`).join(''):'<div class="files-empty">Папка пуста или совпадений нет.</div>';
 $('#fileCount').textContent=`${arr.length} ${arr.length===1?'объект':arr.length>1&&arr.length<5?'объекта':'объектов'}`;
 $('#filePath').textContent=r.path.replace(nf.home,'~');
 $('#finderTitle').textContent=r.path==='/'?'Компьютер':(r.path===nf.home?'Домашняя папка':r.path.split('/').pop())}
renderFiles=function(){if(!nf.path)nfLoad(nf.home+'/Desktop',true);else nfRender()};
finderNavigate=function(where){
 qa('.sidebar-link').forEach(b=>b.classList.toggle('active',b.textContent.trim()===where));
 $('#finderSearch').value='';
 nfLoad(where==='Компьютер'?'/':nf.home+(nfMap[where]||''),true)};
finderBack=function(){if(nf.idx>0){nf.idx--;nfLoad(nf.hist[nf.idx],false)}};
finderForward=function(){if(nf.idx<nf.hist.length-1){nf.idx++;nfLoad(nf.hist[nf.idx],false)}else toast('Нет следующей папки в истории')};
function nfPreview(f){
 const box=document.createElement('div');
 box.style.cssText='position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(10,14,28,.55);backdrop-filter:blur(10px)';
 box.onclick=()=>box.remove();
 const inner=document.createElement('div');inner.style.cssText='max-width:82vw;max-height:80vh;overflow:auto;border-radius:16px;background:rgba(255,255,255,.96);color:#1b1e26;box-shadow:0 30px 80px rgba(0,0,0,.4);padding:0';
 inner.onclick=e=>e.stopPropagation();
 if(f.type==='image'){const im=document.createElement('img');im.src='file://'+f.path;im.style.cssText='display:block;max-width:80vw;max-height:78vh;border-radius:16px';inner.appendChild(im);box.appendChild(inner);document.body.appendChild(box);return}
 N.call('fs.read',{path:f.path}).then(r=>{const pre=document.createElement('pre');pre.style.cssText='margin:0;padding:20px 24px;font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap;word-break:break-word;min-width:360px';pre.textContent=r.text+(r.truncated?'\n\n… файл показан не полностью':'');inner.appendChild(pre);box.appendChild(inner);document.body.appendChild(box)}).catch(e=>toast('Не удалось открыть: '+(e.message||e)))}
openFileTile=function(i){
 const f=window.visibleFiles?.[i];if(!f)return;
 if(f.type==='folder'){nfLoad(f.path,true);return}
 if(f.type==='image'||f.type==='txt'||/\.(md|log|conf|json|xml|csv|py|js|sh|html|css)$/i.test(f.name)){nfPreview(f);return}
 N.call('app.open',{path:f.path}).catch(()=>toast('Для этого типа файлов нет подходящего приложения'))};
qa('.files-sidebar .sidebar-link').forEach(b=>{if(/Открыть папку/.test(b.textContent))b.style.display='none'});
qa('.toolbar .tool-btn[title="Открыть папку"]').forEach(b=>b.style.display='none');


/* ---- Настройки: «Обновления ПО» и «Об этой системе» с настоящими данными ---- */
(function(){
const fmtDate=t=>t?new Date(t*1000).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}):'ещё не выполнялась';
const plural=(n,a,b,c)=>{const m=n%10,k=n%100;return k>10&&k<15?c:m===1?a:m>1&&m<5?b:c};
let up={info:null,check:null,busy:false,installing:false,timer:null,auto:null,total:0};
const $$s=s=>document.querySelector(s);

async function loadInfo(){try{up.info=await N.call('sys.info')}catch(e){up.info={os:'Resora OS',kernel:'',shell_version:'',live:false}}}

function upRender(){
 const box=$$s('#upBody');if(!box)return;const i=up.info||{},c=up.check;
 let title='Проверка не выполнялась',sub='Нажмите «Проверить», чтобы узнать о новых версиях.',btn='<button class="pill-button" id="upBtn" onclick="nativeUpCheck()">Проверить</button>',extra='';
 if(up.busy){title='Проверка…';sub='Связываемся с сервером обновлений.';btn='<button class="pill-button secondary" disabled>Подождите…</button>'}
 else if(up.installing){title='Установка обновлений…';sub=up.line||'Подготовка';btn='<button class="pill-button secondary" disabled>Идёт установка</button>';
  const pct=up.total?Math.min(96,Math.round(up.steps/up.total*100)):null;
  extra=`<div style="padding:4px 16px 14px"><div style="height:6px;border-radius:3px;background:rgba(127,127,127,.25);overflow:hidden"><div style="height:100%;width:${pct===null?35:pct}%;background:var(--accent,#0878ff);border-radius:3px;${pct===null?'animation:saSpin 1.2s linear infinite alternate':''}"></div></div></div>`}
 else if(c){
  if(up.error){title='Не удалось проверить';sub=up.error}
  else if(c.count===0){title='Система обновлена';sub='Последняя проверка: '+fmtDate(c.checked)}
  else{title=`Доступно ${c.count} ${plural(c.count,'обновление','обновления','обновлений')}`;sub=(c.security?`Из них безопасности: ${c.security}. `:'')+'Последняя проверка: '+fmtDate(c.checked);
   btn='<button class="pill-button" id="upBtn" onclick="nativeUpInstall()">Обновить</button>';
   const rows=c.packages.slice(0,8).map(p=>`<div class="setting-row"><div class="setting-label"><b>${esc(p.name)}</b><div class="setting-sub">${esc(p.current)} → ${esc(p.candidate)}${p.security?' · безопасность':''}${p.resora?' · Resora':''}</div></div></div>`).join('');
   extra=rows+(c.count>8?`<div class="setting-row"><div class="setting-label setting-sub">и ещё ${c.count-8}</div></div>`:'')}
  if(up.done&&!up.error){title=up.ok?'Обновления установлены':'Установка завершилась с ошибкой';sub=up.ok?(c.reboot_required||up.reboot?'Для завершения нужна перезагрузка.':'Перезагрузка не требуется.'):(up.line||'Подробности смотрите в журнале /tmp/resora-update.log')}
 }
 const reboot=(up.reboot||(c&&c.reboot_required))&&!up.installing?`<div class="setting-row"><div class="setting-label"><b>Нужна перезагрузка</b><div class="setting-sub">Некоторые обновления вступят в силу после неё.</div></div><button class="pill-button" onclick="showLoginPower('Перезагрузка')">Перезагрузить</button></div>`:'';
 const autoOn=!!(up.auto&&up.auto.enabled);
 box.innerHTML=`<div class="settings-overline">Система</div>
 <section class="setting-card"><div class="setting-row"><div class="setting-label"><b>${esc(i.os||'Resora OS')}</b><div class="setting-sub">Оболочка Resora ${esc(i.shell_version||'')} · ядро ${esc(i.kernel||'')}</div></div><span class="settings-state-pill">${i.live?'Живая сессия':'Установлена'}</span></div></section>
 <div class="settings-overline" style="margin-top:18px">Обновления</div>
 <section class="setting-card"><div class="setting-row"><div class="setting-label"><b>${title}</b><div class="setting-sub">${esc(sub)}</div></div>${btn}</div>${extra}${reboot}</section>
 <section class="setting-card" style="margin-top:14px"><div class="setting-row"><div class="setting-label"><b>Автоматические обновления</b><div class="setting-sub">Проверять раз в сутки и устанавливать обновления безопасности в фоне. Перезагрузка сама не выполняется.</div></div><button class="switch ${autoOn?'on':''}" role="switch" aria-checked="${autoOn}" onclick="nativeUpAuto()" aria-label="Автоматические обновления"></button></div></section>
 ${i.live?'<div class="settings-info">Вы работаете в живой сессии: обновления ставятся в оперативную память и пропадут после выключения. Установите Resora на диск, чтобы обновления сохранялись.</div>':'<div class="settings-info">Обновления берутся из репозиториев Ubuntu и (если настроен) репозитория Resora.</div>'}`}

window.nativeUpCheck=async function(){up.busy=true;up.error='';up.done=false;upRender();
 try{up.check=await N.call('update.check');up.reboot=up.check.reboot_required;up.total=up.check.count}catch(e){up.error=e.message||String(e);up.check=up.check||{count:0,packages:[]}}
 up.busy=false;upRender()};
window.nativeUpInstall=async function(){
 try{await N.call('update.install')}catch(e){toast('Не удалось начать установку: '+(e.message||e));return}
 up.installing=true;up.done=false;up.steps=0;upRender();clearInterval(up.timer);
 up.timer=setInterval(async()=>{try{const s=await N.call('update.status');up.line=(s.lines||[]).slice(-1)[0]||'';up.steps=s.steps;up.reboot=s.reboot_required;
   if(s.done){clearInterval(up.timer);up.installing=false;up.done=true;up.ok=s.ok;if(s.ok){try{up.check=await N.call('update.check');up.check.reboot_required=s.reboot_required}catch(e){}}}
   upRender()}catch(e){}},1500)};
window.nativeUpAuto=async function(){const on=!(up.auto&&up.auto.enabled);
 try{up.auto=await N.call('update.auto.set',{on})}catch(e){toast('Не удалось изменить настройку: '+(e.message||e));return}upRender()};

async function nativeUpdatesPage(){
 const sc=$$s('.settings-page-scroll');if(!sc)return;sc.innerHTML='<div id="upBody"></div>';
 await loadInfo();try{up.auto=await N.call('update.auto.get')}catch(e){up.auto={enabled:false}}upRender();
 if(!up.check&&!up.busy)nativeUpCheck()}

async function nativeAboutPage(){
 const sc=$$s('.settings-page-scroll');if(!sc)return;await loadInfo();const i=up.info||{};
 let wifi='';try{const w=await N.call('wifi.status');wifi=w.connected?w.ssid:'не подключён'}catch(e){}
 sc.innerHTML=`<div class="settings-overline">Сведения</div><section class="setting-card"><div class="setting-row"><div class="setting-label"><b>${esc(i.os||'Resora OS')}</b><div class="setting-sub">Оболочка Resora ${esc(i.shell_version||'')}</div></div><img src="assets/resora-mark.png" alt="Resora" style="width:52px;height:52px;object-fit:contain"></div>
 <div class="setting-row"><div class="setting-label">Имя компьютера</div><span>${esc(i.hostname||'—')}</span></div>
 <div class="setting-row"><div class="setting-label">Процессор</div><span>${esc(i.cpu||'—')}</span></div>
 <div class="setting-row"><div class="setting-label">Память</div><span>${i.memory_gb?i.memory_gb+' ГБ':'—'}</span></div>
 <div class="setting-row"><div class="setting-label">Ядро</div><span>${esc(i.kernel||'—')}</span></div>
 ${wifi?`<div class="setting-row"><div class="setting-label">Wi-Fi</div><span>${esc(wifi)}</span></div>`:''}</section>
 <div class="settings-info">${i.live?'Живая сессия: изменения не сохраняются после выключения.':'Resora OS установлена на этот компьютер.'}</div>`}

{const orig=settingsPage;settingsPage=function(page,btn,record){orig.apply(this,arguments);if(page==='updates')nativeUpdatesPage();else if(page==='about')nativeAboutPage()}}
})();

})();
