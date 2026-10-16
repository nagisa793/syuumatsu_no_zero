'use strict';
// ERROR: a two-layer, three-column boss. The head is a separate air hitbox;
// the long neck between head and thorax is deliberately intangible.
const errorKinds=['bee','fly','spider','beetle'];
bugTypes.error={name:'ERROR',aliases:['ERROR','エラー','大ボス'],flying:true,size:174,hp:500,kind:'error',damage:30};
bugNames.error='ERROR';
let errorEntryHP=MAX_HP,errorEntryBattery=100,errorPoison=new Set(),errorPoisonClock=0,errorProjectiles=[];
let errorIntro=false,errorIntroAge=0,errorSirenClock=0,errorRoared=false,errorAim=null,errorArtReady=false,errorArtPending=false;
function groundPoisonThreat(){return encounter==='error'&&bugs.some(b=>b.type==='error'&&b.hp>0&&b.phase===2)}
const errorSprites=[];
function prepareErrorSheet(im,index){
 if(index===7){return {frames:Array.from({length:36},(_,n)=>({image:im,sx:n%6*440,sy:Math.floor(n/6)*300,cellW:440,cellH:300,pad:0}))}}
 const cols=index===0?4:index===2||index===3?2:1,rows=cols>1?2:1,pad=8,frames=[];
 for(let n=0;n<cols*rows;n++){
  const sx=Math.floor(n%cols*im.naturalWidth/cols),sy=Math.floor(Math.floor(n/cols)*im.naturalHeight/rows),w=Math.floor((n%cols+1)*im.naturalWidth/cols)-sx,h=Math.floor((Math.floor(n/cols)+1)*im.naturalHeight/rows)-sy;
  const c=document.createElement('canvas');c.width=w+pad*2;c.height=h+pad*2;const t=c.getContext('2d');t.drawImage(im,sx-pad,sy-pad,c.width,c.height,0,0,c.width,c.height);
  const pixels=t.getImageData(0,0,c.width,c.height);pruneCelFragments(pixels,c.width,c.height);t.putImageData(pixels,0,0);frames.push({image:c,pad,cellW:w,cellH:h});
 }return {frames};
}
const errorAssets=['assets/animation/error-main-v2.png','assets/animation/error-bite-open-v3.png','assets/animation/error-flight-v2.png','assets/animation/error-walk-v2.png','assets/animation/error-bite-close-v3.png','assets/animation/error-bite-air-open-v3.png','assets/animation/error-bite-air-close-v3.png','assets/animation/error-neck-sweep-v1.png'];
const errorImages=errorAssets.map(()=>new Image());
errorImages.forEach((im,i)=>{im.onload=()=>{errorSprites[i]=prepareErrorSheet(im,i);if(errorImages.every(x=>x.complete&&x.naturalWidth)&&errorSprites.filter(Boolean).length===errorImages.length){errorArtReady=true;if(errorArtPending){errorArtPending=false;startErrorEncounter()}}};im.onerror=()=>{errorArtPending=false;$('nextEnemy').disabled=false;msg('敵の画像を読み込めませんでした。もう一度試してください。')};im.src=errorAssets[i]});
const ERROR_SWING=Object.freeze({strike:.6,retract:.22,duration:.82});
function errorSwingCells(b){return [0,1,2].flatMap(r=>[b.c-2,b.c-1].filter(c=>c>=0&&c<6).map(c=>({c,r,layer:1})))}
function errorSwingRow(b){return b.attack==='swingStrike'&&b.attackAge<ERROR_SWING.strike?Math.min(2,Math.floor(b.attackAge/(ERROR_SWING.strike/3))):null}
function createError(){
 return {id:1,type:'error',c:3,r:1,layer:0,hp:500,max:500,phase:1,hit:0,stun:0,motion:null,cd:2.3,stepWait:.8,attack:null,tell:0,attackAge:0,aimRow:1,targetLayer:0,summoned:0};
}
let errorCollisionRoster=null,errorStealClock=0;
function errorBody(b,c=b.c,r=b.r){return [{c:c+1,r,part:'body'},{c:c+2,r,part:'body'}].filter(p=>p.r>=0&&p.r<3)}
function enemyHitCells(b,l){
 if(b.offscreen)return [];
 if(b.attackMotion&&['bomb','drill','ram'].includes(b.attackMotion.kind))return l===(b.attackMotion.kind==='bomb'?1:b.layer)?Array.from({length:bugWidth(b)},(_,i)=>({c:insectWorldCol(b)+i,r:b.r,part:'body'})):[];
 if(b.type!=='error')return b.layer===l?bugCells(b).map(p=>({...p,part:'body'})):[];
 if(l!==b.layer&&!(b.phase===1&&l===1))return [];
 const body=errorBody(b).filter(p=>l===b.layer);
 return l===1?[...(errorAim==='body'?[]:[{c:b.c,r:b.r,part:'head'}]),...body]:body;
}
function strikeEnemy(b,d,part='body'){
 if(b.type==='error'){const head=part==='head';hit(b,head?Math.round(d*1.25):d);if(head){const p=pos(b.c,b.r,1);floaters.push({...p,text:'HEAD ×1.25',color:'#ff9b9b',life:.8})}}
 else hit(b,d);
}
const errorOldCells=bugCells,errorOldCanMove=bugCanMove,errorOldPosition=bugPosition;
bugCells=function(b,c=b.c,r=b.r){return b.type==='error'?errorBody(b,c,r):errorOldCells(b,c,r)};
function errorCollisionCells(b,c=b.c,r=b.r,l=b.layer){
 return b.type==='error'?[{c,r,layer:1},...errorBody(b,c,r).map(p=>({...p,layer:l}))]:bugCells(b,c,r).map(p=>({...p,layer:l}));
}
function errorOverlaps(b,c,r,l=b.layer){
 const cells=errorCollisionCells(b,c,r,l);
 return (errorCollisionRoster||bugs).some(o=>o!==b&&o.hp>0&&[
  ...errorCollisionCells(o),...(o.motion?errorCollisionCells(o,o.motion.c,o.motion.r,o.motion.layer??o.layer):[])
 ].some(q=>cells.some(p=>p.c===q.c&&p.r===q.r&&p.layer===q.layer)));
}
bugCanMove=function(b,c,r,l=b.layer){
 if(errorOverlaps(b,c,r,l))return false;
 if(b.type!=='error')return errorOldCanMove(b,c,r,l);
 if(c<(b.phase===2?2:3)||c>4||r<0||r>2)return false;
 return errorCollisionCells(b,c,r,l).filter(p=>p.c<6).every(p=>canUsePanel('bugs',p.c,p.r,p.layer));
};
function errorStealArea(){
 const boss=bugs.find(b=>b.type==='error'&&b.hp>0);let taken=0;
 for(let r=0;r<3;r++){
  const id=cellId(2,r);if(panelOwners[id]==='bugs')continue;
  panelOwners[id]='bugs';capturedPanels.delete(id);taken++;
  panelChanges.push({c:2,r,life:1.2+r*.09,max:1.2,delay:r*.09,owner:'bugs',capture:true,sourceC:Math.min(5,(boss?.c??4)+1),sourceR:boss?.r??1});
 }
 if(taken){pushZeroFromStolenArea();sfx('area')}
 return taken;
}
function separateErrorMinions(){
 for(const m of bugs.filter(b=>b.type!=='error'&&b.hp>0)){
  if(!errorOverlaps(m,m.c,m.r))continue;
  const spaces=[];for(let r=0;r<3;r++)for(let c=0;c<6;c++)if(bugCanMove(m,c,r))spaces.push({c,r});
  if(spaces.length){const p=spaces[Math.floor(Math.random()*spaces.length)];m.c=p.c;m.r=p.r;m.motion=null}
 }
}
bugPosition=function(b){
 if(b.type!=='error')return errorOldPosition(b);
 const p=pos(b.c+1.25,b.r,b.layer),y=p.y+(b.layer?78:12);
 if(!b.motion)return{x:p.x,y};
 const t=Math.min(1,b.motion.age/b.motion.duration),e=t*t*(3-2*t);
 return{x:b.motion.from.x+(p.x-b.motion.from.x)*e,y:b.motion.from.y+(y-b.motion.from.y)*e};
};
const errorOldLayerMatch=attackLayerMatches,errorOldReach=cardReaches;
attackLayerMatches=function(c,b){
 if(b?.type!=='error')return errorOldLayerMatch(c,b);
 if((c.requireAir||c.target==='down')&&!layer||(c.requireGround||c.target==='up')&&layer)return false;
 const attackLayer=c.target==='both'?layer:c.target==='up'||c.target==='air'?1:c.target==='down'?0:layer;
 return enemyHitCells(b,attackLayer).length>0;
};
cardReaches=function(c,b,fc=col,fr=row){
 if(b?.type!=='error')return errorOldReach(c,b,fc,fr);
 if(!attackLayerMatches(c,b))return false;
 const attackLayer=c.target==='both'?layer:c.target==='up'||c.target==='air'?1:c.target==='down'?0:layer;
 return enemyHitCells(b,attackLayer).some(p=>(c.wide||fr===p.r)&&(c.drop||c.projectile||p.c>fc&&p.c-fc<=c.range));
};
const errorOldHit=hit;
hit=function(b,d){
 errorOldHit(b,d);
 if(b.type!=='error')return;
 if(!b.hp){for(const m of bugs)if(m!==b)m.hp=0;errorPoison.clear();return}
 if(b.phase===1&&b.hp<250){
  b.phase=2;b.layer=1;b.attack=null;b.tell=0;b.cd=2.5;b.motion=null;b.stepWait=.7;
  b.summoned=0;b.poisonAll=true;errorPoison.clear();
  separateErrorMinions();errorStealClock=10;beginPhaseTransition('error',b);
  screenShake=7;flash=.22;voice(2,[54,76,49,98],.7,.16);voice(3,[],.55,.08);
  if(activeOrder?.card.damage&&!attackLayerMatches(activeOrder.card,b)){finishOrder('ERRORが飛行したため指示を終了');transformation=null;actionLock=0}
  msg('ERRORが飛行した！ 地上の全パネルが毒に侵された。');
  // The phase change itself tells Zero to take flight, even outside Auto Mode.
  // Preserve a currently active shield and use the last selected Wing if ready.
  if(!layer){
   const wing=[quickFiles.wing,...files.wing].find(c=>c?.file==='wing'&&energy>=c.cost&&techniqueSelectionsLeft(c)>0);
   if(wing)submitOrder(wing,{count:1,target:b.id,confirmed:true});
  }
 }
};
function errorScore(){
 const track=ensureBattleMusic();track.pause();track.source=null;track.buffer=null;track.decoding=null;track.url='assets/music/zero-error-horror-v89.mp3';track.bytes=track.loadBytes();track.offset=0;musicFailed=false;musicPlaying=false;musicPlayPending=false;
}
function normalScore(){
 const track=ensureBattleMusic();track.pause();track.source=null;track.buffer=null;track.decoding=null;track.url='assets/music/zero-debug-battle-v89.mp3';track.bytes=track.loadBytes();track.offset=0;musicFailed=false;musicPlaying=false;musicPlayPending=false;
}
function startErrorEncounter(){
 if(state!=='win'||encounter!=='boss')return false;
 if(!errorArtReady){errorArtPending=true;$('nextEnemy').disabled=true;$('nextEnemy').textContent='次の戦闘を準備中…';return false}
 errorEntryHP=hp;errorEntryBattery=energy;encounter='error';errorIntro=true;errorAim=null;
 errorScore();beginBattle();return true;
}
const errorOldReset=reset,errorOldEnd=checkEnd,errorOldTickBugs=tickBugs,errorOldTick=tick;
reset=function(withIntro=true){
 errorStealClock=0;errorCollisionRoster=null;errorPoison.clear();errorProjectiles=[];errorPoisonClock=0;errorIntroAge=errorSirenClock=0;errorRoared=false;errorAim=null;
 errorOldReset(withIntro);
 if(encounter==='error'){
  hp=errorEntryHP;energy=errorEntryBattery;bugs=[createError()];targetId=1;targetPinned=false;
  errorIntro=withIntro;if(withIntro){state='intro';introAge=0;scoreStarted=false;primeBattleScore()}
 }else errorIntro=false;
 $('nextEnemy').classList.add('hidden');$('nextEnemy').disabled=false;updateHud();
};
checkEnd=function(){
 const before=state;errorOldEnd();
 if(before==='battle'&&(state==='win'||state==='lose')&&encounter==='error'){
  errorPoison.clear();errorPoisonClock=0;
  $('nextEnemy').classList.add('hidden');
  $('restartAll').classList.remove('hidden');
  $('retry').classList.toggle('hidden',state==='lose');
  if(state==='win'){$('resultlabel').textContent='ERROR CLEARED';$('resulttitle').textContent='DEBUG COMPLETE'}
 }
 if(before==='battle'&&state==='win'&&encounter==='boss'){
  $('restartAll').classList.remove('hidden');$('nextEnemy').classList.remove('hidden');
  $('nextEnemy').textContent='次の敵と戦う';$('nextEnemy').disabled=false;
 }
};
$('nextEnemy').onclick=function(){return encounter==='boss'?startErrorEncounter():startNextEncounter()};
const errorOldBeginning=startFromBeginning;
startFromBeginning=function(){normalScore();errorOldBeginning()};
$('restartAll').onclick=startFromBeginning;
function chooseErrorAttack(b){
 const choices=b.phase===2?['poison','bite','swing']:['poison','bite'];
 if(!b.summoned){choices.push('summon','summon')}
 const kind=choices[Math.floor(Math.random()*choices.length)];
 b.attack=kind;b.attackAge=0;b.tell=kind==='bite'?1.05:kind==='summon'?1.1:kind==='swing'?1.0:.9;
 b.aimRow=row;b.aimCol=col;b.targetLayer=layer;b.cd=(b.phase===2?1.85:2.35)+Math.random()*.6;
 if(kind==='summon')b.summoned=1;
 if(kind==='bite')b.blink=0;
 tone(kind==='summon'?150:kind==='bite'?270:130,.18,'triangle',.075);
}
function summonErrorBugs(b){
 const available=2-bugs.filter(x=>x!==b&&x.hp>0).length;
 for(let i=0;i<Math.min(available,2);i++){
  const type=errorKinds[Math.floor(Math.random()*errorKinds.length)],l=bugTypes[type].flying?1:0;
  const candidate={type,layer:l},spaces=[];
  for(let r=0;r<3;r++)for(let c=0;c<6;c++)if(bugCanMove(candidate,c,r,l)&&!(c===col&&r===row&&l===layer))spaces.push({c,r});
  if(!spaces.length)continue;
  const p=spaces[Math.floor(Math.random()*spaces.length)];
  const id=Math.max(...bugs.map(x=>x.id))+1;
  bugs.push({id,type,c:p.c,r:p.r,layer:l,hp:bugTypes[type].hp,max:bugTypes[type].hp,cd:1.6+Math.random(),tell:0,hit:0,stun:0,motion:null,decision:.4,stepWait:.9,cycle:0,burst:0,evadeWait:0,aimRow:p.r,targetLayer:l,chargeAge:0,chargeTell:0});
  effects.push({kind:'cast',r:p.r,layer:l,...pos(p.c,p.r,l),life:.65,max:.65,color:'#fa74be'});
 }sfx('area');
}
function executeErrorAttack(b){
 const kind=b.attack;b.attackAge=0;
 if(kind==='summon'){summonErrorBugs(b);b.attack='recover';return}
 if(kind==='poison'){
  errorProjectiles.push({c:b.aimCol,r:b.aimRow,layer:b.targetLayer,from:pos(b.c,b.r,1),age:0,duration:.62,impact:false});
  voice(3,[],.4,.09);b.attack='recover';return;
 }
 if(kind==='bite'){
  b.attack='biteStrike';b.attackAge=0;b.biteHit=false;return;
 }
 if(kind==='swing'){
  b.attack='swingStrike';b.swingHit=false;b.swingRow=-1;sfx('wide');
 }
}
function tickError(b,dt){
 if(phaseTransition||b.hp<=0)return;b.hit=Math.max(0,b.hit-dt);
 if(b.motion){b.motion.age+=dt;if(b.motion.age>=b.motion.duration)b.motion=null}
 if(b.stun>0){b.stun=Math.max(0,b.stun-dt);return}
 if(!enemyAutomationEnabled)return;
 if(b.attack==='swingStrike'){
  const before=b.attackAge;b.attackAge+=dt;
  // Sweep two adjacent columns in each row as the painted head crosses it.
  // A long frame may cross a band; test its time interval rather than skip it.
  for(let n=0;n<6;n++){
   const r=Math.floor(n/2),c=b.c-2+n%2,begin=n*ERROR_SWING.strike/6,end=(n+1)*ERROR_SWING.strike/6;
   if(before<end&&b.attackAge>=begin){
    if(b.swingRow<r){b.swingRow=r;screenShake=Math.max(screenShake,2)}
    if(!b.swingHit&&layer===1&&row===r&&col===c){
     const oldHP=hp,oldShield=shield;hurt(30,b.c);b.swingHit=hp<oldHP||shield<oldShield;
    }
   }
  }
  if(b.attackAge>=ERROR_SWING.duration){b.attack='recover';b.attackAge=0}return;
 }
 if(b.attack==='biteStrike'){
  b.attackAge+=dt;
  if(!b.biteHit&&b.attackAge>=.28){b.biteHit=true;if(layer===b.targetLayer&&col===b.aimCol&&row===b.aimRow)hurt(25,b.c);sfx('sword');screenShake=5}
  if(b.attackAge>=.78){b.attack='recover';b.attackAge=0}return;
 }
 if(b.attack&&b.attack!=='recover'){
  const prev=b.tell;b.tell=Math.max(0,b.tell-dt);b.attackAge+=dt;
  if(b.attack==='bite'&&Math.floor(prev*5)!==Math.floor(b.tell*5))b.blink++;
  if(b.tell===0)executeErrorAttack(b);
  return;
 }
 if(b.attack==='recover'){b.attackAge+=dt;if(b.attackAge<.55)return;b.attack=null;b.attackAge=0}
 b.cd-=dt;b.stepWait-=dt;
 if(b.cd<=0&&!b.motion){chooseErrorAttack(b);return}
 if(b.stepWait>0||b.motion)return;
 const choices=[[b.c-1,b.r],[b.c+1,b.r],[b.c,b.r-1],[b.c,b.r+1]].filter(([c,r])=>bugCanMove(b,c,r));
 if(choices.length){const [c,r]=choices[Math.floor(Math.random()*choices.length)];b.motion={from:bugPosition(b),c:b.c,r:b.r,age:0,duration:b.phase===2?.43:.53};b.c=c;b.r=r}
 b.stepWait=.55+Math.random()*.65;
}
function tickErrorMinions(dt){
 const all=bugs,small=bugs.filter(b=>b.type!=='error'&&b.hp>0);
 for(const b of small){
  b.chargeAge=(b.chargeAge||0)+dt;
  if(b.chargeAge>=9.3-1e-8&&!b.chargeStarted){b.chargeStarted=true;b.chargeRow=row;b.chargeLayer=layer;b.tell=0;voice(1,[1200,740,480],.25,.065)}
  if(b.chargeStarted)b.chargeTell=Math.max(0,10-b.chargeAge);
  if(b.chargeAge>=10-1e-8){effects.push({kind:'slash',c:b.c-2,dir:1,r:b.chargeRow,layer:b.chargeLayer,wide:false,range:2,life:.45,max:.45});if(layer===b.chargeLayer&&row===b.chargeRow)hurt(20,b.c);b.hp=0;b.chargeTell=0;sfx('explode')}
 }
 errorCollisionRoster=all;
 bugs=small.filter(b=>b.hp>0&&b.chargeTell<=0);
 try{if(bugs.length)encounterTickBugs(dt)}finally{bugs=all;errorCollisionRoster=null}
}
tickBugs=function(dt){
 if(phaseTransition)return;
 if(encounter!=='error')return errorOldTickBugs(dt);
 const b=bugs.find(x=>x.type==='error');if(b)tickError(b,dt);
 tickErrorMinions(dt);
};
function tickErrorWorld(dt){
 if(phaseTransition)return;
 if(bugs.some(b=>b.type==='error'&&b.hp>0&&b.phase===2)){
  errorStealClock-=dt;while(errorStealClock<=1e-8){errorStealArea();errorStealClock+=10}
 }

 for(const shot of errorProjectiles){
  shot.age+=dt;
  if(!shot.impact&&shot.age>=shot.duration){
   shot.impact=true;errorPoison.add(cellId(shot.c,shot.r));
   if(layer===shot.layer&&col===shot.c&&row===shot.r)hurt(10,bugs.find(x=>x.type==='error')?.c??4);
   sfx('area');screenShake=Math.max(screenShake,2);
  }
 }
 errorProjectiles=errorProjectiles.filter(s=>s.age<s.duration+.58);
 errorPoisonClock+=dt;
 while(errorPoisonClock>=1/3){
  errorPoisonClock-=1/3;
  if(layer===0&&(bugs.some(b=>b.type==='error'&&b.hp>0&&b.phase===2)||errorPoison.has(cellId(col,row)))){
   hp=Math.max(0,hp-1);totalTaken++;floaters.push({...pos(col,row),text:'−1',color:'#cf8cf4',life:.6});updateHud();checkEnd();
  }
 }
}
tick=function(dt){
 if(encounter==='error'&&errorIntro&&state==='intro'){tickErrorIntro(dt);return}
 const before=simTime;errorOldTick(dt);const step=simTime-before;
 if(encounter==='error'&&step>0&&state==='battle')tickErrorWorld(step);
};
function errorSiren(){
 unlockAudio();if(!audio)return;
 const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain(),filter=audio.createBiquadFilter();
 osc.type='sawtooth';osc.frequency.setValueAtTime(230,now);osc.frequency.exponentialRampToValueAtTime(670,now+.48);osc.frequency.exponentialRampToValueAtTime(180,now+1.03);
 filter.type='lowpass';filter.frequency.value=950;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.12*sfxVolume,now+.08);gain.gain.exponentialRampToValueAtTime(.0001,now+1.08);
 osc.connect(filter);filter.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+1.1);osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect()};
}
function errorRoar(){
 unlockAudio();if(!audio)return;
 const now=audio.currentTime;
 for(const [freq,type,vol] of [[92,'sawtooth',.10],[117,'square',.04],[62,'triangle',.09]]){
  const o=audio.createOscillator(),gain=audio.createGain(),filter=audio.createBiquadFilter();
  o.type=type;o.frequency.setValueAtTime(freq,now);o.frequency.linearRampToValueAtTime(freq*.67,now+1.2);
  filter.type='lowpass';filter.frequency.setValueAtTime(950,now);filter.frequency.exponentialRampToValueAtTime(360,now+1.4);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(vol*sfxVolume,now+.12);gain.gain.exponentialRampToValueAtTime(.0001,now+1.52);
  o.connect(filter);filter.connect(gain);gain.connect(audio.destination);o.start(now);o.stop(now+1.55);o.onended=()=>{o.disconnect();filter.disconnect();gain.disconnect()};
 }
 voice(3,[],1.3,.045);screenShake=8;
}
function tickErrorIntro(dt){
 errorIntroAge+=dt;errorSirenClock-=dt;
 if(errorIntroAge<4.6&&errorSirenClock<=0){errorSiren();errorSirenClock=1.1}
 if(errorIntroAge>=2.2&&!scoreStarted){scoreStarted=true;startBattleScore()}
 if(errorIntroAge>=4.7&&!errorRoared){errorRoared=true;errorRoar()}
 if(errorIntroAge>=6.7){errorIntro=false;beginTarget();runIntroCommands()}
}
const errorOldPresent=presentBattleFrame;
presentBattleFrame=function(){
 if(encounter!=='error'||!errorIntro){errorOldPresent();return}
 ctx.imageSmoothingEnabled=false;const sx=canvas.width/W,sy=canvas.height/H,t=errorIntroAge;
 ctx.fillStyle='#080309';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.save();ctx.globalAlpha=Math.min(1,t/.9);
 for(let y=0;y<H;y+=3){const jitter=t<4.6?Math.sin(y*.8+t*49)*11+Math.sin(t*116+y*.17)*7:Math.sin(y*.3+t*19)*2;ctx.drawImage(buffer,0,y,W,3,jitter*sx,y*sy,W*sx,3*sy)}
 ctx.restore();
 if(t<4.7){
  const x=(t*225)%650-85;const light=ctx.createRadialGradient(x*sx,95*sy,5,x*sx,95*sy,120*sx);
  light.addColorStop(0,'#ff272aaa');light.addColorStop(1,'#ff101000');ctx.fillStyle=light;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.font='900 '+Math.round(18*sy)+'px monospace';ctx.textAlign='center';
  for(let n=0;n<15;n++){const xx=((n*137+Math.floor(t*9)*37)%490)*sx,yy=((n*61)%260)*sy;ctx.globalAlpha=Math.sin(t*30+n*2)>.05?.4:.06;ctx.fillStyle=n%3?'#ff5565':'#fff1f1';ctx.fillText('ERROR',xx,yy)}
  ctx.globalAlpha=1;
 }else{ctx.fillStyle='#3b071678';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font='900 '+Math.round(42*sy)+'px monospace';ctx.textAlign='center';ctx.fillStyle='#ffe2e6';ctx.fillText('ERROR',canvas.width/2,61*sy)}
};
function errorFrame(b){
 if(errorIntro&&errorIntroAge>=4.7)return[0,2];
 if(b.motion&&!b.layer)return[3,Math.min(3,Math.floor(b.motion.age/b.motion.duration*4))];
 if(b.attack==='summon')return b.phase===2?[2,1]:[0,2];
 if(b.attack==='bite'||b.attack==='biteStrike')return[0,2];
 if(b.attack==='poison')return b.phase===2?[2,1]:[0,2];
 if(b.attack==='swing'||b.attack==='swingStrike')return[7,b.r*12+errorSwingFrame(b)];
 return b.phase===2?[2,Math.floor(simTime*3)%2]:[0,Math.floor(simTime*3)%2];
}
const errorOldDraw=drawBugAnimated,errorOldTerrain=drawBossTerrain;
drawBugAnimated=function(b,x,y,size,white=false){
 if(b.type!=='error')return errorOldDraw(b,x,y,size,white);
 if(b.attack==='swing'||b.attack==='swingStrike'){drawErrorSwing(b,x,y);return}
 if(b.attack==='biteStrike'||b.attack==='bite')return; // The complete lunge passes in front of Zero.
 const [sheet,frame]=errorFrame(b),im=errorImages[sheet];if(!im.complete||!im.naturalWidth)return;
 const f=errorSprites[sheet]?.frames[frame];if(!f)return;const air=b.phase===2;
 const width=218,height=air?166:178,feet=y+(b.motion?Math.sin(Math.PI*b.motion.age/b.motion.duration*4)*1.3:Math.sin(simTime*(air?5:2.3))*1.7);
 g.save();g.globalAlpha=b.hit>0&&Math.floor(b.hit*36)%2?.65:1;
  const px=f.pad*width/f.cellW,py=f.pad*height/f.cellH;
  g.drawImage(f.image,Math.round(x-width*.71-px),Math.round(feet-height-py),Math.round(width+px*2),Math.round(height+py*2));
 g.restore();
};
drawBossTerrain=function(){
 errorOldTerrain();
 if(encounter!=='error')return;
 const b=bugs.find(x=>x.type==='error'&&x.hp>0);if(!b)return;
 for(let r=0;r<3;r++)for(let c=0;c<6;c++)if(b.phase===2||errorPoison.has(cellId(c,r))){
  const reveal=phasePoisonReveal(c,r);if(reveal<=0)continue;g.save();g.globalAlpha=reveal;const p=pos(c,r);panel(c,r,'#592d67a3','#ba65bc');
  g.fillStyle='#c879ed98';for(let i=0;i<4;i++){const y=p.y+15-(simTime*14+c*7+i*11)%27;g.fillRect(p.x-25+i*13,Math.round(y),2,3)}g.restore()
 }
 const head=pos(b.c,b.r,1);ring(head.x,head.y+8,23,'#fbabb7',.75);
 for(const p of errorBody(b).filter(p=>p.c<6)){const q=pos(p.c,p.r,b.layer);ring(q.x,q.y+9,18,'#d1a0e6',.5)}
 if(b.attack==='bite'&&Math.floor((1.05-b.tell)/.25)%2===0){const p=pos(b.aimCol,b.aimRow,b.targetLayer);ring(p.x,p.y+9,26,'#ff6969',.95);textPixel('!',p.x,p.y-9,'#ffe1e1',12,'center')}
 if(b.attack==='poison'){const p=pos(b.aimCol,b.aimRow,b.targetLayer);ring(p.x,p.y+9,22,'#dc85ff',.9)}
 if(b.attack==='swing')for(const cell of errorSwingCells(b)){const p=pos(cell.c,cell.r,1);ring(p.x,p.y+9,24,'#ffb5cd',.9)}
 for(const m of bugs)if(m!==b&&m.hp>0&&m.chargeTell>0){const p=pos(col,row,layer);ring(p.x,p.y+9,26,'#ff829b',.85)}
};
const errorOldFieldEffects=drawFieldEffects;
function drawErrorPoison(shot){
 const end=pos(shot.c,shot.r,shot.layer),t=Math.min(1,shot.age/shot.duration);
 if(!shot.impact){
  // Several separate drops follow the same arc, with a bright leading edge.
  for(let n=0;n<9;n++){
   const u=Math.max(0,t-n*.065),x=shot.from.x+(end.x-shot.from.x)*u;
   const y=shot.from.y-22+(end.y-shot.from.y+24)*u-35*Math.sin(Math.PI*u);
   const radius=(n?3:6)*(1-u*.32);
   g.fillStyle=n%3?'#9a3dba':'#e8a6ff';g.beginPath();g.ellipse(x,y,radius,radius*1.45,-.3,0,Math.PI*2);g.fill();
   g.fillStyle='#fff2ff';g.fillRect(x-1,y-2,2,3);
  }
 }else{
  const u=(shot.age-shot.duration)/.58,spread=7+u*34;
  g.globalAlpha=Math.max(0,1-u);
  for(let n=0;n<13;n++){
   const a=n*2.399+shot.c,rr=spread*(.48+(n%4)*.14);
   const x=end.x+Math.cos(a)*rr,y=end.y+4+Math.sin(a)*rr*.55-u*17;
   g.fillStyle=n%3?'#b249d0':'#f4b4ff';g.beginPath();g.ellipse(x,y,3+(n%3),5+(n%4),a,0,Math.PI*2);g.fill();
  }
  g.strokeStyle='#ed97ff';g.lineWidth=3*(1-u);g.beginPath();g.ellipse(end.x,end.y+9,spread,spread*.34,0,0,Math.PI*2);g.stroke();
  g.globalAlpha=1;
 }
}
// A continuous texture mesh bends the entire painted sprite. The head and abdomen
// stay rigid; deformation is confined to the neck, without separate face cutouts.
function errorBiteGeometry(b,x,feet){
 const striking=b.attack==='biteStrike',t=striking?b.attackAge:0;
 const reach=striking?(t<.27?t/.27:t<.43?1:Math.max(0,1-(t-.43)/.35)):0;
 const e=reach*reach*(3-2*reach),closed=striking&&t>=.27&&t<.43;
 const air=b.phase===2,width=280,height=air?192.5:140,left=x+25-width*.80,top=feet-height*(air?.975:.94);
 const anchor=air?(closed?{x:.17,y:.50}:{x:.17,y:.64}):(closed?{x:.16,y:.30}:{x:.17,y:.35});
 const rest=pos(b.c,b.r,1),target=pos(b.aimCol,b.aimRow,b.targetLayer);
 const desired={x:rest.x+(target.x-rest.x)*e,y:rest.y-20+(target.y-rest.y)*e};
 const dx=desired.x-(left+width*anchor.x),dy=desired.y-(top+height*anchor.y);
 return {closed,air,width,height,left,top,dx,dy,desired,reach};
}
function errorSwingFrame(b){
 if(b.attack==='swing')return Math.min(3,Math.floor(Math.max(0,1-b.tell)*4));
 const t=b.attackAge;
 return t<ERROR_SWING.strike?4+Math.min(5,Math.floor(t/(ERROR_SWING.strike/6))):t<ERROR_SWING.strike+ERROR_SWING.retract/2?10:11;
}
function drawErrorSwing(b,x,feet){
 const frame=b.r*12+errorSwingFrame(b),f=errorSprites[7]?.frames[frame];if(!f)return;
 // Complete pre-rendered painted cels: no live mesh, static torso/face pieces,
 // procedural tube or old slash overlay. One image draw keeps voice responsive.
 const dx=x-373,dy=feet-(152+38*b.r);
 g.save();g.globalAlpha=b.hit>0&&Math.floor(b.hit*36)%2?.65:1;
 g.drawImage(f.image,f.sx,f.sy,440,300,Math.round(40+dx),Math.round(-60+dy),440,300);g.restore();
}
function drawErrorTriangle(im,source,dest){
 const [a,b,c]=source,[p,q,r]=dest;
 const det=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);if(Math.abs(det)<.0001)return;
 const aa=((q.x-p.x)*(c.y-a.y)-(r.x-p.x)*(b.y-a.y))/det;
 const bb=((q.y-p.y)*(c.y-a.y)-(r.y-p.y)*(b.y-a.y))/det;
 const cc=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(c.x-a.x))/det;
 const dd=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(c.x-a.x))/det;
 g.save();g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.lineTo(r.x,r.y);g.closePath();g.clip();
 g.transform(aa,bb,cc,dd,p.x-aa*a.x-cc*a.y,p.y-bb*a.x-dd*a.y);g.drawImage(im,0,0);g.restore();
}
function drawErrorBite(b,x,feet){
 const m=errorBiteGeometry(b,x,feet),asset=m.air?(m.closed?6:5):(m.closed?4:1),f=errorSprites[asset]?.frames[0];if(!f)return;const im=f.image;
 const xs=[0,.30,.36,.42,.48,.54,.60,.66,.72,1];
 const lower=m.air?(m.closed?.55:.70):.40,upper=m.air?(m.closed?.43:.56):0;
 const faceBottom=m.air?(m.closed?.59:.76):.53;
 const ys=[0,.12,.24,.30,.34,.38,.42,.46,.50,.54,.58,.62,.66,.70,.74,.78,.84,1];
 const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
 const vertex=(u,v)=>{
  const face=1-smooth((u-.28)/.12),bottom=lower+(faceBottom-lower)*face,top=upper*(1-face);
  const neckBand=(1-smooth((v-bottom)/.04))*(m.air?smooth((v-top)/.04):1);
  const weight=(1-smooth((u-.30)/.36))*neckBand;
  return {x:m.left+u*m.width+m.dx*weight,y:m.top+v*m.height+m.dy*weight};
 };
 for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++){
  const uv=[[xs[i],ys[j]],[xs[i+1],ys[j]],[xs[i+1],ys[j+1]],[xs[i],ys[j+1]]];
  const src=uv.map(([u,v])=>({x:f.pad+u*f.cellW,y:f.pad+v*f.cellH})),dst=uv.map(([u,v])=>vertex(u,v));
  drawErrorTriangle(im,[src[0],src[1],src[2]],[dst[0],dst[1],dst[2]]);
  drawErrorTriangle(im,[src[0],src[2],src[3]],[dst[0],dst[2],dst[3]]);
 }
}

drawFieldEffects=function(){errorOldFieldEffects();if(encounter==='error'){
 for(const shot of errorProjectiles)drawErrorPoison(shot);
 const b=bugs.find(x=>x.type==='error'&&x.hp>0);
 if(b&&(b.attack==='biteStrike'||b.attack==='bite')){
  const p=bugPosition(b);g.save();g.globalAlpha=b.hit>0&&Math.floor(b.hit*36)%2?.65:1;
  drawErrorBite(b,p.x,p.y+Math.sin(simTime*(b.phase===2?5:2.3))*1.7);g.restore();
 }
}};
const errorOldAreaCandidates=areaCandidates,errorOldTacticalBlock=tacticalBlock;
areaCandidates=function(card){const cells=errorOldAreaCandidates(card);return encounter==='error'&&card.steal?cells.filter(p=>p.c===2):cells};
tacticalBlock=function(card){return encounter==='error'&&card.steal&&!areaCandidates(card).length?'奪い返せる空きパネルがない':errorOldTacticalBlock(card)};
const errorOldSubmitOrder=submitOrder;
submitOrder=function(card,spec){if(encounter==='error'&&card.steal&&!areaCandidates(card).length){msg('奪い返せる空きパネルがない');return false}return errorOldSubmitOrder(card,spec)};
const errorOldApplyArea=applyArea;
applyArea=function(card){
 const before=encounter==='error'&&card.steal?[0,1,2].map(r=>panelOwners[cellId(2,r)]):null;
 errorOldApplyArea(card);
 if(encounter==='error'){
  for(const id of capturedPanels.keys())if(id%6===2)capturedPanels.delete(id);
  if(before?.some((owner,r)=>owner==='bugs'&&panelOwners[cellId(2,r)]==='zero'))errorStealClock=10;
 }
};
const errorOldRead=readState;
readState=function(){const s=errorOldRead(),b=bugs.find(x=>x.type==='error');return {...s,error:b?{hp:b.hp,phase:b.phase,head:{col:b.c,row:b.r,layer:'air',weakness:1.25},body:errorBody(b).map(p=>({...p,layer:b.layer?'air':'ground'})),poisonGroundAll:b.phase===2,poisonCells:[...errorPoison],attack:b.attack,summoned:b.summoned}:null}};
const errorOldRun=runCommand;
runCommand=function(raw,options={}){
 if(encounter==='error'&&/(?:頭|顔|ヘッド|head).*(?:狙|攻撃|撃|打|標的)|(?:狙|攻撃|撃).*(?:頭|顔|ヘッド)/i.test(raw)){errorAim='head';const rest=String(raw).replace(/(?:頭|顔|ヘッド|head)(?:部)?(?:を|に)?(?:狙って|狙え|攻撃して|撃って|打って)?/ig,'').trim();if(!rest){msg('頭部を狙う！');sfx('ready');return true}return errorOldRun(rest,options)}
 if(encounter==='error'&&/(?:胴体|身体|体|ボディ|body).*(?:狙|攻撃|撃)|(?:狙|攻撃|撃).*(?:胴体|ボディ)/i.test(raw)){errorAim='body';const rest=String(raw).replace(/(?:胴体|身体|体|ボディ|body)(?:を|に)?(?:狙って|狙え|攻撃して|撃って)?/ig,'').trim();if(!rest){msg('胴体を狙う！');sfx('ready');return true}return errorOldRun(rest,options)}
 return errorOldRun(raw,options);
};
window.zeroBattle={...window.zeroBattle,reset,readState,startErrorEncounter};
