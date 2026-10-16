'use strict';
const $=id=>document.getElementById(id), canvas=$('game'),ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const W=480,H=270,buffer=document.createElement('canvas');buffer.width=W;buffer.height=H;const g=buffer.getContext('2d');g.imageSmoothingEnabled=false;
const requiredBattleArt=['spiderZero','bugWasp','bugDragonfly','bugSpider','bugCentipede','insectBomb','insectBlast','webSilk','swordEdge','swordWide','swordLong','wing'];function battleArtReady(){return typeof animationSheets!=='undefined'&&requiredBattleArt.every(key=>animationSheets[key])}
const bg=new Image(),akariImage=new Image();
const REQUIRED_ASSETS=20;
let loadedAssets=0,loadedCoreAssets=0,assetFailed=false,startReady=false,runtimeReady=false;
function syncLoadingGauge(){
 const artwork=typeof animationSheets==='undefined'?0:requiredBattleArt.filter(key=>animationSheets[key]).length;
 const total=requiredBattleArt.length+3,done=artwork+Math.min(2,loadedCoreAssets)+Number(runtimeReady);
 startReady=loadedCoreAssets>=2&&artwork===requiredBattleArt.length;
 const ready=startReady&&runtimeReady&&!assetFailed,percent=Math.min(100,Math.floor(done/total*100));
 $('loadfill').style.width=percent+'%';
 $('zeroload').setAttribute('aria-valuenow',String(percent));
 $('zeroload').setAttribute('aria-valuetext',ready?'準備完了':percent+'%');
 $('zeroload').classList.toggle('is-ready',ready);$('zeroload').classList.toggle('is-error',assetFailed);
 $('begin').disabled=!ready;$('begin').classList.toggle('hidden',!ready);
 $('loadstate').classList.toggle('hidden',!assetFailed);
 if(!assetFailed)$('loadstate').textContent='';
}
function assetReady(core=false){
 loadedAssets++;if(core)loadedCoreAssets++;syncLoadingGauge();
 if(startReady&&!assetFailed&&typeof startWhenReady==='function')startWhenReady();
}
function assetError(){
 if(this instanceof Image&&!this._retried){this._retried=true;const original=this.src;this.src=original+(original.includes('?')?'&':'?')+'retry='+Date.now();return}
 if(this instanceof Image&&!this._requiredAsset){loadedAssets++;syncLoadingGauge();return}
 assetFailed=true;syncLoadingGauge();$('loadstate').textContent='読み込めませんでした。再読み込みしてください。';$('reload').classList.remove('hidden');
}
 bg._requiredAsset=akariImage._requiredAsset=true;bg.onload=()=>assetReady(true);bg.onerror=akariImage.onerror=assetError;bg.src='assets/background.webp';
akariImage.onload=()=>{$('akari').src=akariImage.src;assetReady(true)};akariImage.src='assets/akari-portrait.png';
const MAX_HP=200;
let hurtTime=0;
let state='start',beforePause='battle',time=0,last=0,hp=MAX_HP,row=1,col=1,layer=0,invuln=0,charge=0,holding=false,shotcd=0,moveCd=0,pose='idle',poseTime=0,area=2,bugs=[],bullets=[],effects=[],floaters=[],elapsed=0,sound=true,audio=null,screenShake=0;
let energy=100,flight=0,flightPermanent=false,wingSpeed=1,shield=0,shieldTime=0,reflect=0,boost=0,regen=0,cooldowns={},equipped=files.guns[0],selectedFile='wing',selectedNumber=3,moveAnim=null,music=true,musicClock=0,musicStep=0;
const keys=new Set();
let hitstop=0,flash=0,damageFlash=0,actionLock=0,pendingMove=null,pendingShot=null,chargeReady=false,resultDelay=0,totalDamage=0,totalTaken=0,usedFiles=0,hudClock=0,simTime=0,showRange=false;
// One commitment spans file deployment, execution, and the recovery animation.
let techniqueLock=null;
let quickFiles={sword:files.sword[1],wing:files.wing[2],guns:files.guns[0],shield:files.shield[0]};
let sfxVolume=.8,musicVolume=.55;try{const p=JSON.parse(localStorage.getItem('zero-audio')||'{}');sfxVolume=typeof p.sfx==='number'?Math.max(0,Math.min(1,p.sfx)):.8;musicVolume=typeof p.music==='number'?Math.max(0,Math.min(1,p.music)):.55}catch{}
const hudCache={};function setText(id,value){const el=$(id);if(!el)return;value=String(value);if(hudCache[id]!==value){el.textContent=value;hudCache[id]=value}}
function saveAudio(){try{localStorage.setItem('zero-audio',JSON.stringify({sfx:sfxVolume,music:musicVolume}))}catch{}}
// Four dedicated SFX voices. The score plays on its own audio clock.
const voices=[null,null,null,null];
let audioResumePending=null,audioResumeSerial=0,audioResumeStartedAt=0,lastAudioResumeAt=-Infinity;
function configureAudioOutput(){
 // Ambient respects the iPhone silent switch and can remain silent after
 // dictation. Keep playback configured; OS interruptions are not overridable.
 const session=globalThis.navigator?.audioSession;
 if(!session)return;
 try{if(session.type!=='playback')session.type='playback'}catch{}
}
function audioInterruptedBySystem(){return document.hidden||globalThis.navigator?.audioSession?.state==='interrupted'}
function unlockAudio(fromGesture=false){
 if(!sound)return;
 try{
  configureAudioOutput();
  if(!audio||audio.state==='closed'){
   const previous=audio;
   if(previous){if(typeof stopCommandSound==='function')stopCommandSound();for(const track of audioScoreTracks()){track.offset=track.currentTime;track.stopSource();track.gain=null}}
   audio=new (window.AudioContext||window.webkitAudioContext)();audioResumePending=null;lastAudioResumeAt=-Infinity;
   const context=audio;
   context.addEventListener?.('statechange',()=>{
    if(context!==audio)return;
    if(context.state==='running'){
     for(const track of audioScoreTracks())if(!track.paused&&!track.source)track.startSource();
     if(typeof syncBattleMusic==='function')syncBattleMusic();
    }else if(['suspended','interrupted'].includes(context.state)&&!audioInterruptedBySystem())unlockAudio();
   });
   // Prime the output during the initiating tap, before delayed image/score work.
   const prime=context.createBufferSource();prime.buffer=context.createBuffer(1,1,context.sampleRate);prime.connect(context.destination);prime.onended=()=>prime.disconnect();prime.start(0);
  }
  const canResume=!audioInterruptedBySystem();
  const now=Date.now(),staleResume=audioResumePending&&now-audioResumeStartedAt>=1500;
  if(['suspended','interrupted'].includes(audio.state)&&(fromGesture||!audioResumePending||staleResume)&&(fromGesture||now-lastAudioResumeAt>=500)&&canResume){
   const context=audio,request=++audioResumeSerial;
   audioResumeStartedAt=lastAudioResumeAt=now;
   audioResumePending=Promise.resolve(context.resume()).catch(()=>{}).finally(()=>{if(request===audioResumeSerial)audioResumePending=null});
  }
  if(audio.state==='running')for(const track of audioScoreTracks())if(!track.paused&&!track.source)track.startSource();
 }catch{}
}
function audioScoreTracks(){return [typeof battleMusic==='undefined'?null:battleMusic,typeof homeMusic==='undefined'?null:homeMusic,typeof prologueScore==='undefined'?null:prologueScore,typeof prologueEffects==='undefined'?null:prologueEffects].filter(Boolean)}
function recoverGameAudio(event){
 // A finger/pen touching down is not an activation event. Resume during
 // touch completion/click as well, while mobile Safari permits output.
 if(event?.type==='pointerdown'&&event.pointerType&&event.pointerType!=='mouse')return;
 if(document.hidden)return;
 unlockAudio(true);
 if(audio?.state==='running'&&typeof syncBattleMusic==='function')syncBattleMusic();
}
document.addEventListener('focusin',()=>{configureAudioOutput();recoverGameAudio()});
document.addEventListener('focusout',()=>setTimeout(()=>{configureAudioOutput();recoverGameAudio()},0));
for(const name of ['pointerdown','pointerup','touchend','click','keydown'])document.addEventListener(name,recoverGameAudio,{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)recoverGameAudio()});
window.addEventListener('focus',recoverGameAudio);window.addEventListener('pageshow',recoverGameAudio);
globalThis.navigator?.audioSession?.addEventListener?.('statechange',()=>{if(!audioInterruptedBySystem()){audioResumeSerial++;audioResumePending=null;lastAudioResumeAt=-Infinity;unlockAudio()}});
function voice(channel,notes,len,vol=.04,priority=true){if(!sound)return;unlockAudio();if(!audio)return;try{const old=voices[channel];if(!priority&&old?.priority&&old.until>audio.currentTime)return;if(old){try{old.source.stop()}catch{}old.gain.disconnect()}
const gain=audio.createGain(),start=audio.currentTime;let source;if(channel===3){const data=audio.createBuffer(1,Math.ceil(audio.sampleRate*len),audio.sampleRate),out=data.getChannelData(0);let value=0;for(let i=0;i<out.length;i++){if(i%8===0)value=Math.random()>.5?1:-1;out[i]=value}source=audio.createBufferSource();source.buffer=data}else{source=audio.createOscillator();source.type=channel===2?'triangle':'square';notes.forEach((hz,i)=>source.frequency.setValueAtTime(hz,start+i*len/notes.length))}
vol*=(priority?sfxVolume:musicVolume);gain.gain.setValueAtTime(vol,start);gain.gain.setValueAtTime(vol*.65,start+len*.45);gain.gain.linearRampToValueAtTime(0,start+len);source.connect(gain);gain.connect(audio.destination);const v={source,gain,priority,until:start+len};voices[channel]=v;source.onended=()=>{source.disconnect();gain.disconnect();if(voices[channel]===v)voices[channel]=null};source.start(start);source.stop(start+len+.005)}catch{}}
function tone(freq=440,len=.08,type='square',vol=.035){voice(type==='triangle'?2:1,[freq,freq*.75,freq*.5],len,vol)}
function sfx(kind){switch(kind){case 'boot':voice(2,[160,105,58,38],.62,.18);voice(3,[],.4,.08);break;case 'debug':voice(0,[220,880,440,1320],.17,.075);voice(3,[],.07,.035);break;case 'select':voice(1,[740,990],.045,.025);break;case 'ready':voice(1,[784,1046,1568],.13,.035);break;case 'victory':voice(0,[523,659,784,1046,1318,1568],.7,.045);voice(2,[130,164,196,261],.7,.05);break;case 'defeat':voice(0,[330,294,220,110],.7,.035);break;case 'block':voice(1,[1800,900,1600],.13,.04);break;case 'move':voice(2,[980,660,440],.045,.085);break;case 'shot':voice(0,[1400,900,520,240],.065,.045);break;case 'charge':voice(0,[320,640,1280,480,160],.2,.07);voice(3,[],.12,.025);break;case 'sword':case 'wide':case 'long':voice(3,[],.12,.055);voice(0,[1800,1300,700,260],.1,.035);break;case 'cannon':voice(0,[700,380,170,85],.16,.075);voice(3,[],.1,.045);break;case 'wave':voice(0,[170,340,680,340,170],.23,.055);break;case 'heal':voice(2,[523,659,784,1046],.3,.09);break;case 'area':voice(0,[330,440,660,880],.2,.045);voice(2,[165,220,330,440],.2,.05);break;case 'hit':voice(1,[190,95,50],.075,.04);break;case 'explode':voice(3,[],.22,.045);voice(1,[140,90,45],.19,.05);break;case 'hurt':voice(1,[220,110,180,70],.18,.045);voice(3,[],.1,.025);break;case 'start':voice(0,[392,523,659,784],.25,.045);break}}

function msg(t){$('message').textContent=t}
function pos(c,r,l=0){return{x:50+c*76,y:146+r*38-l*84}}
function stopVoices(){for(const v of voices){try{v?.source.stop()}catch{}}}
function reset(){unlockAudio();voiceFile=null;sfx('boot');hp=MAX_HP;energy=100;resetField();row=1;col=1;layer=0;flight=0;flightPermanent=false;wingSpeed=1;shield=shieldTime=reflect=boost=regen=0;cooldowns={};invuln=0;hurtTime=0;elapsed=0;charge=0;holding=false;shotcd=moveCd=0;pose='idle';poseTime=0;moveAnim=null;screenShake=0;bullets=[];effects=[];floaters=[];keys.clear();musicClock=musicStep=0;restartBattleMusic();hitstop=flash=damageFlash=actionLock=resultDelay=totalDamage=totalTaken=usedFiles=simTime=0;pendingMove=pendingShot=null;chargeReady=false;quickFiles={sword:files.sword[1],wing:files.wing[2],guns:files.guns[0],shield:files.shield[0]};equipped=files.guns[0];selectedFile='wing';selectedNumber=3;bugs=[{type:'bee',r:0,c:3,layer:1,hp:20,max:20,cd:2.6,tell:0,hit:0,stun:0},{type:'fly',r:1,c:5,layer:1,hp:30,max:30,cd:4,tell:0,hit:0,stun:0},{type:'spider',r:2,c:3,layer:0,hp:40,max:40,cd:3.4,tell:0,hit:0,stun:0}];for(const id of ['start','result'])$(id).classList.add('hidden');setGameMenu(null);menuFocusReturn=null;state='battle';msg('接続完了');updateHud()}
function unavailable(c){if(typeof techniqueUsesLeft==='function'&&techniqueUsesLeft(c)<=0)return 'この技は3回使い切ったよ';if((hurtTime>0||zeroBound()))return 'のけぞり中';const fieldBlock=tacticalBlock(c);if(fieldBlock)return fieldBlock;if(energy<c.cost)return `充電不足（必要${c.cost}%）`;if((cooldowns[c.id]||0)>0)return `あと${cooldowns[c.id].toFixed(1)}秒`;if((c.requireAir||c.target==='down')&&!layer)return '空中専用';if((c.requireGround||c.target==='up')&&layer)return '地上専用';return ''}
function updateHud(){
 setText('hp',Math.ceil(hp));$('hpfill').style.width=(hp/MAX_HP*100)+'%';$('hpbox').classList.toggle('danger',hp<=MAX_HP*.25);
 $('gauge').style.width=energy+'%';setText('customlabel',`BATTERY ${Math.floor(energy)}%`);$('batterybox').classList.toggle('danger',energy<=20);
 $('altbox').classList.toggle('hidden',!layer);
 $('flightfill').style.width=layer?(flightPermanent?100:Math.min(100,flight/18*100))+'%':'0%';setText('flighttime',layer?(flightPermanent?'WING ACTIVE':flight.toFixed(1)+'s'):'');
}
function beginMove(c,r,l=layer){if(typeof spiderBind!=='undefined'&&spiderBind&&spiderBind.releaseAge===null)return false;if(techniqueLock&&!(techniqueLock.card.file==='wing'&&techniqueLock.stage==='executing'&&l!==layer))return false;moveAnim={from:pos(col,row,layer),to:pos(c,r,l),sourceC:col,sourceR:row,age:0,duration:.13};col=c;row=r;layer=l;sfx('move');return true}
function attackPoseActive(){return poseTime>0&&['sword','shoot','basic','gravity','wing','transfer'].includes(pose)}
function move(dx,dy,bufferInput=true){if(phaseTransition||state!=='battle'||(hurtTime>0||zeroBound())||groundTrapped()||snared>0)return;if(techniqueLock||moveCd>0||actionLock>0||attackPoseActive()||transformation){if(bufferInput&&!techniqueLock)pendingMove={dx,dy,life:.14};return}const c=col+dx,r=row+dy;if(!canUsePanel('zero',c,r,layer))return;pendingMove=null;if(beginMove(c,r))moveCd=layer?.16/wingSpeed:.16;}
function land(){if(phaseTransition||!['battle','target','lock'].includes(state)||(hurtTime>0||zeroBound())||!layer||techniqueLock||actionLock>0||attackPoseActive()||transformation||moveAnim)return false;if(!beginMove(col,row,0))return false;moveAnim.landing=true;flight=0;flightPermanent=false;wingSpeed=1;wingRequested=false;loadout.wing=null;appearance.wing=0;if(groundTrapped())checkGroundTrap();else msg('地上へ帰還。通常攻撃は地上の敵に届くよ。');return true}
function fire(target=selectedBug()){if(phaseTransition||state!=='battle'||(hurtTime>0||zeroBound())||groundTrapped()||shotcd>0||actionLock>0||attackPoseActive()||transformation)return false;if(target)zeroFacing=Math.sign(target.c-col)||zeroFacing;const charged=charge>=.8;pendingShot=null;chargeReady=false;const p=zeroVisualPosition();effects.push({kind:'muzzle',r:row,layer,x:p.x+27*ZERO_SCALE*zeroFacing,y:p.y-22*ZERO_SCALE,life:.13,max:.13,charged});bullets.push({c:col+.18*zeroFacing,dir:zeroFacing,r:row,layer,speed:charged?14:12,damage:consumeAttackPower(charged?5:1),enemy:false,charged});appearance.body='base';loadout.weapon=null;pose='basic';poseTime=.24;shotcd=charged?.42:.24;sfx(charged?'charge':'shot');charge=0;return true}
function canActivate(c){const reason=unavailable(c);if(!reason)return true;msg(reason.startsWith('充電不足')?`${reason}。戦闘中は充電が戻らないよ。`:reason==='空中専用'?'この技は空中専用。ウィングで飛んでから使ってね。':reason==='地上専用'?'この技は地上専用。「着地」で戻ってね。':reason);return false}
function useChip(){activate(equipped)}
function activate(c,options={}){if(state!=='battle'||techniqueUsesLeft(c)<=0||(!options.committed&&!canActivate(c)))return false;energy=Math.max(0,energy-c.cost);if(!c.basic){equipmentUses[c.id]=(equipmentUses[c.id]||0)+1;lastEquipmentUse=c.id;}cooldowns[c.id]=c.cool;usedFiles++;effects.push({kind:'cast',r:row,layer,...pos(col,row,layer),life:.4,max:.4,color:c.file==='sword'?'#ffcf78':'#84ffec'});actionLock=c.file==='sword'?.3:.18;if(!options.automatic)msg(`${fileMeta[c.file].label} ${String(c.num).padStart(3,'0')} — ${c.name}！`);sfx(c.file==='sword'?'sword':c.heal?'heal':c.file==='guns'?'cannon':'area');if(c.file==='wing'){flight=1;flightPermanent=true;wingSpeed=c.speed||1;if(!layer)beginMove(col,row,1)}else if(c.flight){flight=c.flight;wingSpeed=c.speed||1;if(!layer)beginMove(col,row,1)}if(c.heal){hp=Math.min(MAX_HP,hp+c.heal);effects.push({kind:'heal',r:row,layer,...pos(col,row,layer),life:.7,max:.7})}if(c.shield){shield=c.shield;shieldTime=c.duration;reflect=c.reflect||0}if(c.phase)invuln=c.phase;if(c.regen)regen=c.regen;if(c.boost)boost=c.boost;
if(c.file==='area'){applyArea(c);pose='transfer';poseTime=.35;updateHud();return true}
if(c.drop){startGravity(c);updateHud();return true}
const damage=c.damage?consumeAttackPower(c.damage):0;
const layers=c.target==='both'?[0,1]:[c.target==='up'||c.target==='air'?1:c.target==='down'?0:layer];
if(c.file==='sword'&&c.damage){pose='sword';poseTime=SWORD_MOTION.duration;swordStrike={card:c,damage,layers,c:col,r:row,dir:zeroFacing,age:0,struck:false};updateHud();return true}
if(c.damage){pose=c.file==='sword'?'sword':c.file==='wing'?'wing':'shoot';poseTime=c.file==='sword'?.5:.3;for(const l of layers){if(c.projectile){for(let r=0;r<3;r++)if(c.wide||r===row)bullets.push({c:col+.18*zeroFacing,dir:zeroFacing,r,layer:l,sourceLayer:layer,speed:c.pierce?8:12,damage,enemy:false,charged:true,pierce:c.pierce,hit:new Set(),stun:c.stun||0})}else{effects.push({kind:'slash',c:col,dir:zeroFacing,r:row,layer:l,wide:c.wide,range:c.range,life:.3,max:.3});for(const b of bugs)if(b.hp>0){const cells=typeof enemyHitCells==='function'?enemyHitCells(b,l):b.layer===l?bugCells(b):[];const chosen=cells.filter(p=>Math.abs(p.c-col)<=c.range&&(p.c-col)*zeroFacing>0&&(c.wide||p.r===row));if(chosen.length){strikeEnemy(b,damage,chosen.some(p=>p.part==='head')?'head':'body');b.stun=Math.max(b.stun||0,c.stun||0);if(c.drain)hp=Math.min(MAX_HP,hp+c.drain)}}}}}
if(c.land&&c.file!=='wing')land();updateHud();checkEnd();return true}
function tickSwordStrike(dt){
 const s=swordStrike;if(!s||state!=='battle'||phaseTransition)return;
 s.age+=dt;
 if(!s.struck&&s.age>=SWORD_MOTION.hitAt){
  s.struck=true;sfx(s.card.num===2?'wide':s.card.num===3?'long':'sword');
  for(const l of s.layers){
   effects.push({kind:'slash',c:s.c,dir:s.dir,r:s.r,layer:l,wide:s.card.wide,range:s.card.range,life:.27,max:.27});
   for(const b of bugs)if(b.hp>0){const cells=enemyHitCells(b,l),chosen=cells.filter(p=>(p.c-s.c)*s.dir>0&&Math.abs(p.c-s.c)<=s.card.range&&(s.card.wide||p.r===s.r));
    if(chosen.length){strikeEnemy(b,s.damage,chosen.some(p=>p.part==='head')?'head':'body');b.stun=Math.max(b.stun||0,s.card.stun||0)}
   }
  }
  checkEnd();
 }
 if(s.age>=SWORD_MOTION.duration)swordStrike=null;
}
function hit(b,d){totalDamage+=Math.min(b.hp,d);b.hp=Math.max(0,b.hp-d);b.hit=.16;hitstop=Math.max(hitstop,d>=65?.045:.018);flash=d>=100?.12:flash;const p=b.attackMotion&&['bee','fly','spider','beetle'].includes(b.type)?bugPosition(b):pos(b.c,b.r,b.layer);floaters.push({...p,text:String(d),color:'#fff4b9',life:.6});effects.push({kind:'spark',r:b.r,layer:b.layer,depth:actorGroundAnchor(b).y+.4,...p,life:.24,max:.24});screenShake=3;sfx('hit');if(!b.hp){effects.push({kind:'explode',r:b.r,layer:b.layer,depth:actorGroundAnchor(b).y+.4,...p,life:.65,max:.65});sfx('explode')}}
function hurt(d=25,sourceC=col+zeroFacing){if(zeroBound())return;if(invuln>0)return;if(shield>0&&shieldTime>0){const blocked=Math.min(shield,d);shield-=blocked;d-=blocked;sfx('block');effects.push({kind:'guard',r:row,layer,...pos(col,row,layer),life:.3,max:.3});if(reflect)bullets.push({c:col+.3,r:row,layer,speed:12,damage:reflect,enemy:false,charged:true});if(!d)return}totalTaken+=Math.min(hp,d);hp=Math.max(0,hp-d);invuln=.22;hurtTime=.5;damageFlash=.25;hitstop=.065;pose='hurt';poseTime=.5;
 holding=false;charge=0;chargeReady=false;pendingMove=pendingShot=null;
 techniqueLock=null;swordStrike=null;
 if(transformation){transformation=null;if(activeOrder)activeOrder.phase='queued'}
 appearance.body='base';loadout.weapon=null;
 zeroFacing=Math.sign(sourceC-col)||zeroFacing;const back=col-zeroFacing;if(canUsePanel('zero',back,row,layer)){beginMove(back,row);moveAnim.duration=.22}
 actionLock=Math.max(actionLock,hurtTime);screenShake=5;sfx('hurt');floaters.push({...pos(col,row,layer),text:String(d),color:'#ff8f83',life:.6});checkEnd()}
function checkEnd(){if(state!=='battle')return;if(hp>0&&bugs.some(b=>b.hp>0))return;state=hp?'win':'lose';phaseTransition=null;holding=false;keys.clear();$('resultlabel').textContent=hp?'AREA CLEAR':'CONNECTION LOST';$('resulttitle').textContent=hp?'BUG DELETED':'ZERO DOWN';resultDelay=hp?.9:1.4;if(!hp&&typeof beginZeroDefeat==='function')beginZeroDefeat();stopVoices();sfx(hp?'victory':'defeat');$('resultrank').textContent=hp?(totalTaken===0?'S':totalTaken<80?'A':totalTaken<180?'B':'C'):'—';$('resultstats').innerHTML=`<div>戦闘時間<b>${elapsed.toFixed(1)}<small>秒</small></b></div><div>被ダメージ<b>${totalTaken}</b></div><div>ファイル使用<b>${usedFiles}</b></div>`;}
let menuFocusReturn=null;
function setGameMenu(panel){
 for(const id of ['pausepanel','settingspanel'])$(id).classList.toggle('hidden',id!==panel);
 for(const id of ['battlehud','screen','tapcontrols','comms','techniques'])$(id).inert=!!panel;
 $('pause').setAttribute('aria-expanded',String(panel==='pausepanel'));
 $('settings').setAttribute('aria-expanded',String(panel==='settingspanel'));
}
function openGameMenu(panel){
 if(state!=='paused'){
  menuFocusReturn=document.activeElement;beforePause=state;state='paused';
  stopVoices();if(typeof stopCommandSound==='function')stopCommandSound();
  holding=false;pendingMove=pendingShot=null;keys.clear();
 }
 setGameMenu(panel);
 if(typeof syncBattleMusic==='function')syncBattleMusic();
 updateHud();$(panel==='settingspanel'?'settingsresume':'resume').focus();
}
function resumeBattle(){
 if(state!=='paused')return;
 state=beforePause;setGameMenu(null);unlockAudio(true);
 if(typeof musicFailed!=='undefined'&&musicFailed){musicFailed=false;musicFailures=0}
 if(typeof syncBattleMusic==='function')syncBattleMusic();
 updateHud();menuFocusReturn?.focus?.();menuFocusReturn=null;
 if(typeof resumeHomeIntroSound==='function')resumeHomeIntroSound();
 if(state==='start'&&typeof startWhenReady==='function')startWhenReady();
}
function pause(){
 if(state==='paused')resumeBattle();
 else if(['battle','target','lock','intro'].includes(state))openGameMenu('pausepanel');
}
function trapGameMenuFocus(e){
 if(state!=='paused'||e.key!=='Tab')return;
 const panel=$($('settingspanel').classList.contains('hidden')?'pausepanel':'settingspanel');
 const items=Array.from(panel.querySelectorAll?.('button:not([disabled]),input,summary,a[href]')||[]).filter(el=>el.getClientRects().length);
 if(!items.length)return;
 const first=items[0],last=items[items.length-1],active=document.activeElement;
 if(e.shiftKey&&(active===first||!items.includes(active))){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&(active===last||!items.includes(active))){e.preventDefault();first.focus()}
}
function tick(dt){time+=dt;if(state==='paused'||state==='custom'||state==='start')return;for(const a of [effects,floaters])for(let i=a.length-1;i>=0;i--){a[i].life-=dt;if(a[i].life<=0)a.splice(i,1)}screenShake=Math.max(0,screenShake-dt*30);flash=Math.max(0,flash-dt);damageFlash=Math.max(0,damageFlash-dt);if(state==='win'||state==='lose'){resultDelay=Math.max(0,resultDelay-dt);if(!resultDelay)$('result').classList.remove('hidden');return}if(hitstop>0){const frozen=Math.min(dt,hitstop);hitstop-=frozen;dt-=frozen;if(dt<=0)return}simTime+=dt;hurtTime=Math.max(0,hurtTime-dt);actionLock=Math.max(0,actionLock-dt);if(pendingMove){pendingMove.life-=dt;if(pendingMove.life<=0)pendingMove=null}if(pendingShot){pendingShot.life-=dt;if(pendingShot.life<=0)pendingShot=null}elapsed+=dt;tickField(dt);for(const id of Object.keys(cooldowns))cooldowns[id]=Math.max(0,cooldowns[id]-dt);invuln=Math.max(0,invuln-dt);shotcd-=dt;moveCd-=dt;poseTime-=dt;if(poseTime<=0)pose='idle';if(moveAnim){moveAnim.age+=dt;if(moveAnim.age>=moveAnim.duration)moveAnim=null}if(flight>0&&!flightPermanent){flight=Math.max(0,flight-dt);if(flight===0&&layer)land()}shieldTime=Math.max(0,shieldTime-dt);if(!shieldTime)shield=reflect=0;boost=Math.max(0,boost-dt);if(regen>0){hp=Math.min(MAX_HP,hp+8*Math.min(dt,regen));regen=Math.max(0,regen-dt)}screenShake=Math.max(0,screenShake-dt*20);if(holding){charge+=dt;if(charge>=.8&&!chargeReady){chargeReady=true;sfx('ready')}}if(pendingShot&&shotcd<=0&&actionLock<=0){charge=pendingShot.charge;fire()}if(pendingMove&&moveCd<=0&&actionLock<=0){const {dx,dy}=pendingMove;pendingMove=null;move(dx,dy)}if(keys.has('ArrowUp')||keys.has('w'))move(0,-1,false);else if(keys.has('ArrowDown')||keys.has('s'))move(0,1,false);else if(keys.has('ArrowLeft')||keys.has('a'))move(-1,0,false);else if(keys.has('ArrowRight')||keys.has('d'))move(1,0,false);
tickBugs(dt);
for(let i=bullets.length-1;i>=0;i--){const p=bullets[i],old=p.c;p.originC??=p.c;p.c+=dt*p.speed*(p.dir??(p.enemy?-1:1));let remove=false;if(p.enemy){if(p.layer===layer&&p.r===row&&Math.min(old,p.c)<=col+.28&&Math.max(old,p.c)>=col-.28){const before=hp;hurt(p.damage,p.originC);if(hp<before&&p.kind==='web')snared=.65;remove=true}}else for(const b of bugs){if(b.hp<=0||p.hit?.has(b))continue;const cells=typeof enemyHitCells==='function'?enemyHitCells(b,p.layer):b.layer===p.layer?bugCells(b):[];const touched=cells.filter(q=>q.r===p.r&&Math.min(old,p.c)<=q.c+.28&&Math.max(old,p.c)>=q.c-.28);if(touched.length){strikeEnemy(b,p.damage,touched.some(q=>q.part==='head')?'head':'body');b.stun=Math.max(b.stun||0,p.stun||0);p.hit?.add(b);if(!p.pierce){remove=true;break}}}if(remove||p.c>6||p.c<-.5)bullets.splice(i,1)}checkEnd();hudClock-=dt;if(hudClock<=0){hudClock=.08;updateHud()}}

function poly(points,fill,stroke){g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=1;g.stroke()}}
let accumulator=0,lastDraw=-Infinity;
function frame(t){
 // Always schedule another frame, even if a single update/render fails.
 // Keep the error visible in the console without permanently losing the loop.
 try{
  const dt=Math.min(Math.max(0,(t-last)/1000),.1);last=t;accumulator+=dt;
  const started=globalThis.performance?.now?.()??Date.now(),now=()=>globalThis.performance?.now?.()??Date.now();
  // Yield the main thread to microphone events before catching up more ticks.
  while(accumulator>=1/60){accumulator-=1/60;tick(1/60);if(voiceWanted&&now()-started>=4){accumulator=Math.min(accumulator,1/60);break}}
  if((!voiceWanted||now()-started<6)&&(!voiceWanted||t-lastDraw>=1000/30)){draw();lastDraw=t}
 }finally{requestAnimationFrame(frame)}
}
$('pause').onclick=()=>pause();$('resume').onclick=resumeBattle;
$('settings').onclick=()=>openGameMenu('settingspanel');$('settingsresume').onclick=resumeBattle;
window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(state==='target')cancelTarget();else pause();return}trapGameMenuFocus(e)});
window.addEventListener('blur',()=>{keys.clear();holding=false});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&['battle','target','lock','intro'].includes(state))pause()});
$('sfxvolume').value=sfxVolume*100;$('bgmvolume').value=musicVolume*100;
$('sfxvolume').oninput=e=>{sfxVolume=Number(e.target.value)/100;saveAudio();if(typeof syncCommandSoundVolume==='function')syncCommandSoundVolume()};
$('bgmvolume').oninput=e=>{musicVolume=Number(e.target.value)/100;saveAudio();if(typeof syncBattleMusic==='function')syncBattleMusic()};
$('reload').onclick=()=>location.reload();
function readState(){return{state,hp,row,col,layer:layer?'air':'ground',energy,battery:energy,flight,flightPermanent,shield,trapped:groundTrapped(),nextAttackPower,panels:panelOwners.map((owner,i)=>({col:i%6,row:Math.floor(i/6),owner,holeSeconds:panelHoles.get(i)||0,captureSeconds:capturedPanels.get(i)??null})),equipped:{file:equipped.file,num:equipped.num},enemies:bugs.map(b=>({number:b.id,type:b.type,canFly:bugCanFly(b),hp:b.hp,row:b.r,col:b.c,layer:b.layer?'air':'ground'}))}}
window.zeroBattle={readState,reset,move,activate,files};
if(document.modelContext?.registerTool){for(const tool of [{name:'read_battle_state',description:'Read battle state, altitude, flight timer and equipped file.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>readState()},{name:'restart_battle',description:'Restart the autonomous battle.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:()=>{reset();return readState()}}]){try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{})}catch{}}}
bugs=[{type:'bee',r:0,c:3,layer:1,hp:20,tell:0},{type:'fly',r:1,c:5,layer:1,hp:30,tell:0},{type:'spider',r:2,c:3,layer:0,hp:40,tell:0}];
