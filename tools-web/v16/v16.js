/* ================= Resora v16: мастер настройки, пункт управления, док ================= */
const SA_REGIONS=[['Россия','Russia'],['Нидерланды','Netherlands'],['США','United States'],['Япония','Japan'],['Германия','Germany'],['Франция','France'],['Казахстан','Kazakhstan']];
const SA_KEYB=[['Русская','Russian'],['Английская (США)','English (US)'],['Русская + Английская','Russian + English']];
const SA_NETS=[['Home Wi-Fi',4,true],['Resora-5G',3,true],['Coffee Guest',2,false],['AndroidAP',1,true]];
const SA_GREET=['Здравствуйте','Hello','Hola','Bonjour','Hallo','こんにちは','Ciao','你好','Olá'];
const SA_STR={
ru:{next:'Продолжить',back:'Назад',finish:'Начать работу',
 s0s:'Выберите язык, и мы приступим.',region:'Страна или регион',keyboard:'Раскладка клавиатуры',
 s1t:'Подключитесь к Wi-Fi',s1s:'Так вы будете получать обновления и прогноз погоды. Этот шаг можно пропустить.',netHdr:'Сети поблизости',netPass:'Пароль сети',connect:'Подключиться',connected:'Подключено',needPass:'Введите пароль сети.',skipWifi:'Продолжить без Wi-Fi',scanning:'Поиск сетей…',noNets:'Сети не найдены',rescan:'Обновить список',
 s2t:'Создайте учётную запись',s2s:'Это ваш профиль на этом компьютере.',fName:'Как вас зовут?',phName:'Например, Алексей',fUser:'Имя пользователя',userHint:'Латиница и цифры. Подставляется автоматически, но его можно изменить.',fPass:'Пароль',fConfirm:'Повторите пароль',phPass:'Не менее 4 символов',phConfirm:'Ещё раз',
 eName:'Введите ваше имя.',eUser:'Имя пользователя: 2–24 символа — латиница, цифры, точка, дефис или подчёркивание.',ePass:'Пароль должен содержать не менее 4 символов.',eConfirm:'Пароли не совпадают.',strength:['Слабый пароль','Средний пароль','Надёжный пароль'],show:'Показать пароль',
 s3t:'Вы решаете, чем делиться',s3s:'Всё это можно изменить позже в настройках.',pLoc:'Службы геолокации',pLocD:'Приложения смогут узнавать, где вы находитесь, например, для прогноза погоды.',pDiag:'Помогать улучшать Resora',pDiagD:'Отправлять анонимные сведения о работе системы.',pUpd:'Напоминать об обновлениях',pUpdD:'Сообщать, когда доступна новая версия.',
 s4t:'Выберите оформление',s4s:'Светлое, тёмное или как в системе. Остальное — по вкусу.',tLight:'Светлое',tDark:'Тёмное',tAuto:'Авто',accent:'Акцентный цвет',glass:'Прозрачность Liquid Glass',gTint:'Плотное',gClear:'Прозрачное',
 s5t:n=>'Всё готово'+(n?', '+n:''),s5s:'Resora настроена. Осталось войти в систему.',sumLang:'Язык и регион',sumUser:'Учётная запись',sumTheme:'Оформление',sumNet:'Wi-Fi',netNone:'Не подключено',themeNames:{light:'Светлое',dark:'Тёмное',auto:'Автоматическое'}},
en:{next:'Continue',back:'Back',finish:'Get Started',
 s0s:'Choose your language and we’ll get going.',region:'Country or region',keyboard:'Keyboard layout',
 s1t:'Connect to Wi-Fi',s1s:'You’ll get updates and weather forecasts. You can skip this step.',netHdr:'Nearby networks',netPass:'Network password',connect:'Connect',connected:'Connected',needPass:'Enter the network password.',skipWifi:'Continue without Wi-Fi',scanning:'Searching for networks…',noNets:'No networks found',rescan:'Refresh',
 s2t:'Create your account',s2s:'This is your profile on this computer.',fName:'What’s your name?',phName:'For example, Alex',fUser:'Username',userHint:'Letters and digits only. Filled in automatically, but you can change it.',fPass:'Password',fConfirm:'Verify password',phPass:'At least 4 characters',phConfirm:'Once more',
 eName:'Please enter your name.',eUser:'Username: 2–24 characters — Latin letters, digits, dot, dash or underscore.',ePass:'The password must be at least 4 characters.',eConfirm:'The passwords don’t match.',strength:['Weak password','Fair password','Strong password'],show:'Show password',
 s3t:'You decide what to share',s3s:'You can change all of this later in Settings.',pLoc:'Location Services',pLocD:'Apps can find out where you are, for example to show the weather.',pDiag:'Help improve Resora',pDiagD:'Send anonymous information about how the system runs.',pUpd:'Remind me about updates',pUpdD:'Let me know when a new version is available.',
 s4t:'Choose your look',s4s:'Light, dark or match the system. The rest is up to you.',tLight:'Light',tDark:'Dark',tAuto:'Auto',accent:'Accent color',glass:'Liquid Glass transparency',gTint:'Tinted',gClear:'Clear',
 s5t:n=>'You’re all set'+(n?', '+n:''),s5s:'Resora is ready. All that’s left is to sign in.',sumLang:'Language & region',sumUser:'Account',sumTheme:'Appearance',sumNet:'Wi-Fi',netNone:'Not connected',themeNames:{light:'Light',dark:'Dark',auto:'Automatic'}}
};
const SA_ICON={
 wifi:'<path d="M2.5 8.8a14.5 14.5 0 0 1 19 0M5.8 12.3a9.5 9.5 0 0 1 12.4 0M9.2 15.8a4.4 4.4 0 0 1 5.6 0"/><circle cx="12" cy="19.2" r="1.2" fill="currentColor" stroke="none"/>',
 user:'<circle cx="12" cy="8" r="3.8"/><path d="M4.500 20c.8-4.400 3.700-6.600 7.500-6.600s6.700 2.200 7.500 6.600"/>',
 shield:'<path d="M12 3 5 6v5.500c0 4.400 2.800 8 7 9.500 4.200-1.500 7-5.100 7-9.500V6Z"/><path d="m9 12 2.200 2.200L15.500 10"/>',
 theme:'<circle cx="12" cy="12" r="8.500"/><path d="M12 3.500a8.500 8.500 0 0 0 0 17Z" fill="currentColor"/>',
 check:'<path d="m5 12.500 4.500 4.500L19 7.500"/>',
 pin:'<path d="M12 21s6.500-5.500 6.500-11A6.500 6.500 0 0 0 5.500 10c0 5.500 6.500 11 6.500 11Z"/><circle cx="12" cy="10" r="2.300"/>',
 chart:'<path d="M4 19V9M10 19V5M16 19v-7M21 19H3"/>',
 refresh:'<path d="M20 11a8 8 0 0 0-14.500-3.500M4 5v3.500h3.500M4 13a8 8 0 0 0 14.500 3.500M20 19v-3.500h-3.500"/>',
 lock:'<rect x="5" y="10.500" width="14" height="9.500" rx="2.500"/><path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500"/>',
 eye:'<path d="M2.500 12s3.200-6 9.500-6 9.500 6 9.500 6-3.200 6-9.500 6-9.500-6-9.500-6Z"/><circle cx="12" cy="12" r="2.700"/>'
};
const SA_BADGE={1:['wifi','#4cc2ff,#0a63e6'],3:['shield','#4fd28b,#139a58'],4:['theme','#b693ff,#6a4ee0'],5:['check','#59e08a,#16a34a']};
let saNetOpen=null,saNetBusy=null,saUserEdited=false,saShowPass=false;

function saLang(){return setupModel.language==='English'?'en':'ru'}
function saT(k,...a){const v=(SA_STR[saLang()][k]!==undefined?SA_STR[saLang()][k]:SA_STR.ru[k]);return typeof v==='function'?v(...a):v}
function saSvg(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${SA_ICON[name]}</svg>`}
function saSlug(name){const map={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
 const first=(name||'').trim().split(/\s+/)[0]||'';return first.toLowerCase().split('').map(c=>map[c]!==undefined?map[c]:c).join('').replace(/[^a-z0-9._-]/g,'').slice(0,24)}
function saInitial(){const n=(setupModel.name||'').trim();return n?n[0].toUpperCase():''}
function saStrength(p){if(p.length<4)return 0;let s=1;if(p.length>=8)s++;if(/[A-ZА-Я]/.test(p)&&/[a-zа-я]/.test(p)||/\d/.test(p)&&/\D/.test(p)||/[^\w\s]/.test(p))s++;return Math.min(s,3)}
function saOpt(sel,onclick,inner){return `<button class="sa-opt ${sel?'sel':''}" onclick="${onclick}">${inner}<span class="sa-check">${sel?'✓':''}</span></button>`}

function saCapture(){const g=id=>document.getElementById(id);
 if(g('saRegion'))setupModel.region=g('saRegion').value;if(g('saKeyboard'))setupModel.keyboard=g('saKeyboard').value;
 if(g('saName'))setupModel.name=g('saName').value;if(g('saUser'))setupModel.username=g('saUser').value;
 if(g('saPass'))setupModel.password=g('saPass').value;if(g('saConfirm'))setupModel.confirm=g('saConfirm').value}
function captureSetupFields(){saCapture()}

function renderSetupStep(){
 const i=setupModel.step,last=setupSteps.length-1,card=$('#saCard');
 const hero=$('#saHero'),title=$('#setupTitle'),sub=$('#setupSubtitle'),page=$('#setupPage');
 title.onanimationiteration=null;
 title.classList.toggle('greet',i===0);
 if(i===0){
  hero.innerHTML='<img src="assets/resora-mark-concept-dark.png" alt="">';
  let g=0;title.textContent=SA_GREET[0];
  title.onanimationiteration=()=>{g=(g+1)%SA_GREET.length;title.textContent=SA_GREET[g]};
  sub.textContent=saT('s0s');
 }else{
  if(i===2){hero.innerHTML=`<div class="sa-badge avatar" id="saAvatar" style="background:linear-gradient(145deg,#aab6cb,#6a768e)">${saInitial()||saSvg('user')}</div>`}
  else{const b=SA_BADGE[i];hero.innerHTML=`<div class="sa-badge" style="background:linear-gradient(145deg,${b[1]})">${saSvg(b[0])}</div>`}
  title.textContent=i===5?saT('s5t',(setupModel.name||'').trim()):saT('s'+i+'t');
  sub.textContent=saT('s'+i+'s');
 }
 let html='';
 if(i===0){
  const lang=[['Русский','Russian'],['English','English']];
  html=`<div class="sa-lang">${lang.map(([n,s])=>saOpt(setupModel.language===n,`saLangPick('${n}')`,`<span class="grow"><b>${n}</b><small>${s}</small></span>`)).join('')}</div>
  <div class="sa-two" style="margin-top:16px"><div class="sa-field"><label for="saRegion">${saT('region')}</label><select id="saRegion" class="sa-select">${SA_REGIONS.map(([ru,en])=>`<option value="${ru}" ${setupModel.region===ru?'selected':''}>${saLang()==='en'?en:ru}</option>`).join('')}</select></div>
  <div class="sa-field"><label for="saKeyboard">${saT('keyboard')}</label><select id="saKeyboard" class="sa-select">${SA_KEYB.map(([ru,en])=>`<option value="${ru}" ${setupModel.keyboard===ru?'selected':''}>${saLang()==='en'?en:ru}</option>`).join('')}</select></div></div>`;
 }
 if(i===1){
  const nets=SA_NETS.map(([ssid,sig,sec])=>{
   const connected=setupModel.ssid===ssid,busy=saNetBusy===ssid;
   const sigHtml=`<span class="sa-sig">${[1,2,3,4].map(n=>`<i class="${n<=sig?'on':''}"></i>`).join('')}</span>`;
   const tail=busy?'<span class="sa-spin"></span>':connected?'<span class="sa-check">✓</span>':(sec?`<svg class="sa-lock" viewBox="0 0 24 24">${SA_ICON.lock}</svg>`:'');
   const row=`<button class="sa-opt ${connected?'sel':''}" onclick="saNetClick('${ssid}')">${sigHtml}<span class="grow"><b>${esc(ssid)}</b>${connected?`<small>${saT('connected')}</small>`:''}</span>${tail}</button>`;
   const pass=saNetOpen===ssid?`<div class="sa-netpass"><input class="sa-input" id="saNetPass" type="password" placeholder="${saT('netPass')}" onkeydown="if(event.key==='Enter'){event.stopPropagation();saConnectFrom('${ssid}')}"><button onclick="saConnectFrom('${ssid}')">${saT('connect')}</button></div>`:'';
   return row+pass}).join('');
  const listHtml=nets||`<div class="sa-hint" style="text-align:center;padding:16px 0">${window.saNetsLoading?saT('scanning'):saT('noNets')}</div>`;
  html=`<div class="sa-sec" style="margin-top:0">${saT('netHdr')}</div><div class="sa-netlist">${listHtml}</div><div class="sa-error" id="saNetErr"></div>${window.ResoraNative?`<button class="sa-skip" style="margin-top:2px" onclick="saRescan()">${saT('rescan')}</button>`:''}<button class="sa-skip" onclick="saSkipWifi()">${saT('skipWifi')}</button>`;
 }
 if(i===2){
  const st=saStrength(setupModel.password||'');
  html=`<div class="sa-field"><label for="saName">${saT('fName')}</label><input class="sa-input" id="saName" maxlength="32" placeholder="${saT('phName')}" value="${esc(setupModel.name)}" oninput="saOnName(this)" autocomplete="name"></div>
  <div class="sa-field"><label for="saUser">${saT('fUser')}</label><input class="sa-input" id="saUser" maxlength="24" value="${esc(setupModel.username)}" oninput="saOnUser(this)" autocomplete="username" spellcheck="false"><div class="sa-hint">${saT('userHint')}</div></div>
  <div class="sa-two"><div class="sa-field"><label for="saPass">${saT('fPass')}</label><div class="sa-pass"><input class="sa-input" id="saPass" type="${saShowPass?'text':'password'}" placeholder="${saT('phPass')}" value="${esc(setupModel.password)}" oninput="saOnPass(this)" autocomplete="new-password"><button class="sa-eye" type="button" title="${saT('show')}" onclick="saTogglePass()">${saSvg('eye')}</button></div>
  <div class="sa-meter" id="saMeter">${[1,2,3].map(n=>`<i class="${n<=st?'on'+st:''}"></i>`).join('')}</div></div>
  <div class="sa-field"><label for="saConfirm">${saT('fConfirm')}</label><input class="sa-input" id="saConfirm" type="${saShowPass?'text':'password'}" placeholder="${saT('phConfirm')}" value="${esc(setupModel.confirm)}" autocomplete="new-password"></div></div>
  <div class="sa-error" id="saErr"></div>`;
 }
 if(i===3){
  const rows=[['location','pin','#4cc2ff,#0a63e6','pLoc','pLocD'],['analytics','chart','#a9b3c7,#6b7790','pDiag','pDiagD'],['updates','refresh','#4fd28b,#139a58','pUpd','pUpdD']];
  html=`<div>${rows.map(([k,ic,col,t,d])=>`<div class="sa-switch"><span class="sa-mini" style="background:linear-gradient(145deg,${col})">${saSvg(ic)}</span><span class="grow"><b>${saT(t)}</b><small>${saT(d)}</small></span><button class="switch ${setupModel[k]?'on':''}" role="switch" aria-checked="${!!setupModel[k]}" onclick="saToggle('${k}')" aria-label="${saT(t)}"></button></div>`).join('')}</div>`;
 }
 if(i===4){
  const themes=[['light',saT('tLight')],['dark',saT('tDark')],['auto',saT('tAuto')]];
  html=`<div class="sa-themes">${themes.map(([k,n])=>`<button class="sa-theme ${setupModel.theme===k?'sel':''}" onclick="saTheme('${k}')"><span class="sa-shot ${k}"></span><span>${n}</span></button>`).join('')}</div>
  <div class="sa-sec">${saT('accent')}</div><div class="sa-swatches">${setupAccents.map(c=>`<button class="sa-sw ${setupModel.accent.toLowerCase()===c.toLowerCase()?'sel':''}" style="background:${c};color:${c}" aria-label="${c}" onclick="saAccent('${c}')"></button>`).join('')}</div>
  <div class="sa-sec">${saT('glass')}</div><div class="sa-glass"><span>${saT('gTint')}</span><input type="range" min="0" max="1" step=".01" value="${glassValue}" oninput="saGlass(this.value)" aria-label="${saT('glass')}"><span>${saT('gClear')}</span></div>`;
 }
 if(i===5){
  const regionName=(SA_REGIONS.find(r=>r[0]===setupModel.region)||[setupModel.region,setupModel.region])[saLang()==='en'?1:0];
  const net=setupModel.wifi&&setupModel.ssid?setupModel.ssid:saT('netNone');
  html=`<div class="sa-summary"><div class="sa-sumrow"><span>${saT('sumLang')}</span><b>${esc(setupModel.language)} · ${esc(regionName)}</b></div><div class="sa-sumrow"><span>${saT('sumUser')}</span><b>${esc((setupModel.name||'').trim())} (${esc(setupModel.username||'user')})</b></div><div class="sa-sumrow"><span>${saT('sumTheme')}</span><b>${saT('themeNames')[setupModel.theme]}</b></div><div class="sa-sumrow"><span>${saT('sumNet')}</span><b>${esc(net)}</b></div></div>`;
 }
 page.innerHTML=html;
 $('#setupBack').textContent=saT('back');$('#setupBack').style.visibility=i===0?'hidden':'visible';
 $('#setupNext').textContent=saT(i===last?'finish':'next');
 $('#setupDots').innerHTML=setupSteps.map((_,n)=>`<i class="${n===i?'on':''}"></i>`).join('');
 card.classList.remove('sa-in');void card.offsetWidth;card.classList.add('sa-in');
}
function goSetupStep(n){if(n<0||n>=setupSteps.length)return;saCapture();setupModel.step=n;renderSetupStep()}
function saLangPick(v){saCapture();setupModel.language=v;prefs.setItem('resora-language',v);renderSetupStep()}
function saToggle(k){saCapture();setupModel[k]=!setupModel[k];renderSetupStep()}
function saTogglePass(){saCapture();saShowPass=!saShowPass;renderSetupStep();$('#saPass')?.focus()}
function saOnName(el){setupModel.name=el.value;if(!saUserEdited){setupModel.username=saSlug(el.value);const u=$('#saUser');if(u)u.value=setupModel.username}const a=$('#saAvatar');if(a)a.innerHTML=saInitial()||saSvg('user');el.classList.remove('bad')}
function saOnUser(el){saUserEdited=true;setupModel.username=el.value;el.classList.remove('bad')}
function saOnPass(el){setupModel.password=el.value;const m=$('#saMeter');if(m){const st=saStrength(el.value);m.innerHTML=[1,2,3].map(n=>`<i class="${n<=st?'on'+st:''}"></i>`).join('')}el.classList.remove('bad')}
function saNetClick(ssid){if(saNetBusy||setupModel.ssid===ssid)return;const n=SA_NETS.find(x=>x[0]===ssid);if(!n[2]){saConnect(ssid)}else{saNetOpen=saNetOpen===ssid?null:ssid;renderSetupStep();setTimeout(()=>$('#saNetPass')?.focus(),40)}}
function saConnectFrom(ssid){const pw=$('#saNetPass')?.value||'';if(!pw){$('#saNetPass')?.classList.add('bad');$('#saNetErr').textContent=saT('needPass');return}saConnect(ssid)}
function saConnect(ssid){saNetBusy=ssid;saNetOpen=null;renderSetupStep();setTimeout(()=>{setupModel.ssid=ssid;setupModel.network=ssid;setupModel.wifi=true;saNetBusy=null;if(setupModel.step===1)renderSetupStep()},1000)}
function saSkipWifi(){setupModel.wifi=false;setupModel.ssid='';setupModel.network='skip';setupModel.step++;renderSetupStep()}
function saResolveTheme(k){return k==='auto'?(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):k}
function saTheme(k){saCapture();setupModel.theme=k;selectedTheme=saResolveTheme(k);applyTheme();renderSetupStep()}
function saAccent(c){saCapture();setupModel.accent=c;const m=Object.entries(accents).find(([k,v])=>v.toLowerCase()===c.toLowerCase());selectedAccent=m?m[0]:'blue';applyTheme();renderSetupStep()}
function saGlass(v){glassValue=Number(v);applyTheme()}
function saValidateAccount(){
 const fail=(id,msg)=>{const e=document.getElementById(id);if(e){e.classList.add('bad');e.focus()}$('#saErr').textContent=msg;return false};
 if(!setupModel.name.trim())return fail('saName',saT('eName'));
 if(!/^[a-zA-Z0-9._-]{2,24}$/.test(setupModel.username.trim()))return fail('saUser',saT('eUser'));
 if(setupModel.password.length<4)return fail('saPass',saT('ePass'));
 if(setupModel.password!==setupModel.confirm)return fail('saConfirm',saT('eConfirm'));
 return true}
function setupBack(){saCapture();if(setupModel.step>0){setupModel.step--;renderSetupStep()}}
function setupNext(){saCapture();if(setupModel.step===2&&!saValidateAccount())return;
 if(setupModel.step<setupSteps.length-1){setupModel.step++;renderSetupStep()}
 else{if(setupModel.theme==='auto')setupModel.theme=saResolveTheme('auto');finishSetup()}}
function showSetupScreen(reset=false){if(reset){setupModel.step=0;saUserEdited=false;$('#resoraMenuPopover')?.classList.remove('open')}
 $('#loginOverlay').hidden=true;$('#setupOverlay').hidden=false;$('#controlPopover')?.classList.remove('open');$('#spotlightPopover')?.classList.remove('open');renderSetupStep();updateSetupClock();if(!window.setupClockTimer)window.setupClockTimer=setInterval(updateSetupClock,15000)}
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||$('#setupOverlay').hidden)return;const t=e.target;if(t&&(t.tagName==='BUTTON'||t.tagName==='SELECT'))return;e.preventDefault();setupNext()});
/* Начальные значения мастера: без заготовленных данных */
setupModel.name='';setupModel.username='';setupModel.wifi=false;setupModel.network='';setupModel.ssid='';

/* ---------- Экран входа: язык и сообщения ---------- */
const SA_LOGIN={
 ru:{ph:'Введите пароль',btn:'Войти',setup:'Параметры настройки',forgot:'Забыли пароль?',sleep:'Сон',restart:'Перезагрузка',off:'Выключение',enter:'Введите пароль.',wrong:'Неверный пароль. Попробуйте ещё раз.',welcome:n=>'С возвращением'+(n?', '+n:'')},
 en:{ph:'Enter password',btn:'Log In',setup:'Setup options',forgot:'Forgot password?',sleep:'Sleep',restart:'Restart',off:'Shut Down',enter:'Enter your password.',wrong:'Wrong password. Please try again.',welcome:n=>'Welcome back'+(n?', '+n:'')}
};
function saLoginLang(){return SA_LOGIN[prefs.getItem('resora-language')==='English'?'en':'ru']}
function saApplyLoginLang(){const L=saLoginLang();const p=$('#loginPassword');if(p)p.placeholder=L.ph;
 const b=$('.login-submit');if(b)b.innerHTML=L.btn+' <span aria-hidden="true">↗</span>';
 const ln=$$('.login-links button');if(ln[0])ln[0].textContent=L.setup;if(ln[1])ln[1].textContent=L.forgot;
 const pw=$$('.login-power button span');if(pw[0])pw[0].textContent=L.sleep;if(pw[1])pw[1].textContent=L.restart;if(pw[2])pw[2].textContent=L.off}
async function saHandleLogin(e){e.preventDefault();const L=saLoginLang();const input=$('#loginPassword').value;const expected=prefs.getItem('resora-password-hash');$('#loginError').textContent='';
 if(!input){$('#loginError').textContent=L.enter;return}
 if(expected){const hash=await setupHash(input);if(hash!==expected){$('#loginError').textContent=L.wrong;$('#loginPassword').select();return}}
 else if(!prefs.getItem('resora-setup-complete')){showSetupScreen(true);return}
 hideLoginScreen();toast(L.welcome(prefs.getItem('resora-user-name')||''))}
{const f=$('#loginForm');if(f){const nf=f.cloneNode(true);f.replaceWith(nf);nf.addEventListener('submit',saHandleLogin)}}
{const orig=showLoginScreen;showLoginScreen=function(){orig.apply(this,arguments);saApplyLoginLang()}}

/* ---------- Пункт управления ---------- */
function toggleCC2(el){
 if(el.classList.contains('cc2-row')){const c=el.querySelector('.cc2-circle');const on=!c.classList.contains('on');c.classList.toggle('on',on);const s=el.querySelector('small');if(s)s.textContent=on?el.dataset.onText:el.dataset.offText}
 else{const on=el.classList.toggle('on');const s=el.querySelector('small');if(s)s.hidden=!on}}

/* ---------- Spotlight: настоящие иконки приложений ---------- */
function renderSpotlight(q=''){const query=q.trim().toLocaleLowerCase();
 const apps=[['files','Finder','finder'],['settings','Системные настройки','settings'],['weather','Погода','weather'],['terminal','Терминал','terminal'],['notes','Заметки','notes'],['calculator','Калькулятор','calculator']];
 const found=apps.filter(([id,name,ic])=>$('#win-'+id)&&(!query||name.toLocaleLowerCase().includes(query)||ic.includes(query)));
 $('#spotlightResults').innerHTML=found.length?found.map(([id,name,ic])=>`<button onclick="launchSpotlight('${id}')"><img src="assets/icons/${ic}.svg" alt="" width="28" height="28" style="width:28px;height:28px;flex:0 0 28px"><span>${name}</span><kbd>↵</kbd></button>`).join(''):'<div class="spotlight-empty">Ничего не найдено</div>'}

/* ---------- Док: плавное увеличение иконок ---------- */
(function(){const dock=document.querySelector('.dock');if(!dock)return;const items=[...dock.querySelectorAll('.dock-item')];
 dock.addEventListener('mousemove',e=>{for(const it of items){const r=it.getBoundingClientRect();const d=Math.abs(e.clientX-(r.left+r.width/2));const m=Math.max(0,1-d/115);it.style.setProperty('--mag',(m*m*(3-2*m)).toFixed(3))}});
 dock.addEventListener('mouseleave',()=>items.forEach(it=>it.style.setProperty('--mag',0)))})();

/* Перерисовать то, что уже показано старым скриптом */
if(!$('#setupOverlay').hidden)renderSetupStep();else if(!$('#loginOverlay').hidden)saApplyLoginLang();

/* ---------- Пункт управления (сетка macOS 26/27) ---------- */
function toggleCC3(el){const c=el.querySelector('.cc2-circle');const on=!c.classList.contains('on');c.classList.toggle('on',on);const s=el.querySelector('small');if(s&&el.dataset.onText)s.textContent=on?el.dataset.onText:el.dataset.offText}
function saCCDark(el){selectedTheme=document.body.classList.contains('dark-theme')?'light':'dark';applyTheme();el.querySelector('.cc2-circle').classList.toggle('on',selectedTheme==='dark')}
{const orig=toggleResoraPopover;toggleResoraPopover=function(){orig.apply(this,arguments);const c=document.querySelector('.cc3-dark .cc2-circle');if(c)c.classList.toggle('on',document.body.classList.contains('dark-theme'))}}
