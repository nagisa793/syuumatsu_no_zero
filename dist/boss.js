'use strict';

// A second encounter; its entry battery is also the checkpoint for retries.
let encounter='skirmish',encounterBattery=100,encounterHP=MAX_HP,poisonActive=false,poisonClock=0,bossHazards=[],bossPhaseFlash=0;
let bossArtState='loading',pendingNextEncounter=false;
bugTypes.grenade={name:'グレネードウィービル',aliases:['ゾウムシ','ぞうむし','手榴弾','中ボス','グレネード','ウィービル'],flying:true,size:108,hp:150,kind:'blast',damage:30};
bugNames.grenade=bugTypes.grenade.name;
function createMidboss(){return {id:1,type:'grenade',widthTiles:2,c:4,r:1,layer:0,hp:150,max:150,phase:1,cd:1.8,tell:0,hit:0,stun:0,motion:null,stepWait:1.2,attackPose:0,attack:null,cycle:0,suction:0,pullClock:0,suctionClock:0,targetLayer:0,aimRow:1}}

// Overlapping crops retain the extended snout/wings; connected components remove
// the few pixels belonging to the neighbouring cel without trimming the boss.
function splitBossSheet(image){
 const regions=[[0,0,404,512],[394,0,365,512],[750,0,424,512],[1174,0,362,512],[0,512,407,512],[391,512,396,512],[737,512,455,512],[1170,512,366,512]],frames=[];
 for(const [x,y,w,h] of regions){
  const cell=document.createElement('canvas');cell.width=w;cell.height=h;const t=cell.getContext('2d');
  t.drawImage(image,x,y,w,h,0,0,w,h);const pixels=t.getImageData(0,0,w,h),d=pixels.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let largest=[];
  for(let i=0;i<w*h;i++){const k=i*4;if(d[k]>80&&d[k+2]>80&&d[k+1]<Math.min(d[k],d[k+2])*.65&&Math.abs(d[k]-d[k+2])<70)d[k+3]=0}
  for(let start=0;start<w*h;start++){
   if(seen[start]||d[start*4+3]<32)continue;let head=0,tail=1;queue[0]=start;seen[start]=1;
   const add=i=>{if(i>=0&&i<w*h&&!seen[i]&&d[i*4+3]>=32){seen[i]=1;queue[tail++]=i}};
   while(head<tail){const i=queue[head++];if(i%w)add(i-1);if(i%w<w-1)add(i+1);add(i-w);add(i+w)}
   if(tail>largest.length)largest=Array.from(queue.subarray(0,tail));
  }
  if(largest.length<500)throw new Error('Boss sprite missing');
  const keep=new Uint8Array(w*h);let left=w,right=0,top=h,bottom=0;
  for(const i of largest){keep[i]=1;left=Math.min(left,i%w);right=Math.max(right,i%w);top=Math.min(top,Math.floor(i/w));bottom=Math.max(bottom,Math.floor(i/w))}
  for(let i=0;i<w*h;i++)if(!keep[i])d[i*4+3]=0;
  t.putImageData(pixels,0,0);const crop=document.createElement('canvas');crop.width=right-left+1;crop.height=bottom-top+1;crop.getContext('2d').drawImage(cell,left,top,crop.width,crop.height,0,0,crop.width,crop.height);
  frames.push({image:crop,width:crop.width,height:crop.height,white:null});
 }
 return {frames};
}
function loadBossSprites(){
 bossArtState='loading';const image=new Image();
 image.onload=()=>{try{animationSheets.boss=splitBossSheet(image);bossArtState='ready';if(pendingNextEncounter){pendingNextEncounter=false;startNextEncounter()}}catch(error){console.error(error);bossArtFailure()}};
 image.onerror=bossArtFailure;image.src='assets/animation/boss-weevil.png';
}
function bossArtFailure(){bossArtState='failed';pendingNextEncounter=false;$('nextEnemy').disabled=false;$('nextEnemy').textContent='次の敵と戦う';msg('中ボスの画像を読み込めませんでした。もう一度ボタンを押してください。')}
function startNextEncounter(){
 if(state!=='win'||encounter!=='skirmish')return false;
 if(bossArtState!=='ready'||!bindSpriteReady){pendingNextEncounter=true;$('nextEnemy').disabled=true;$('nextEnemy').textContent='中ボスを準備中…';if(bossArtState==='failed'){loadBossSprites();if(!bindSpriteReady)boundImage.src='assets/animation/boss-bind-integrated.png'}return false}
 encounterBattery=energy;encounterHP=hp;encounter='boss';pendingNextEncounter=false;beginVoiceBattle();return true;
}
const encounterReset=reset,encounterCheckEnd=checkEnd;
reset=function(withIntro=true){
 pendingNextEncounter=false;poisonActive=false;poisonClock=0;bossHazards=[];bossPhaseFlash=0;
 encounterReset(withIntro);
 if(encounter==='boss'){energy=encounterBattery;hp=encounterHP;bugs=[createMidboss()];targetId=1;targetPinned=false}
 $('restartAll').classList.add('hidden');$('nextEnemy').classList.add('hidden');$('nextEnemy').disabled=false;$('nextEnemy').textContent='次の敵と戦う';updateHud();
};
checkEnd=function(){
 const wasBattle=state==='battle';encounterCheckEnd();
 if(wasBattle&&(state==='win'||state==='lose')){
  for(const b of bugs)b.suction=0;bossHazards=[];poisonActive=false;poisonClock=0;bossPhaseFlash=0;
  $('nextEnemy').classList.toggle('hidden',!(state==='win'&&encounter==='skirmish'));
  $('restartAll').classList.toggle('hidden',!(encounter==='boss'&&state==='win'));
  if(encounter==='boss'&&state==='win'){$('resultlabel').textContent='MIDBOSS CLEAR';$('resulttitle').textContent='BUG DELETED'}
 }
};
$('nextEnemy').onclick=startNextEncounter;
function startFromBeginning(){encounter='skirmish';encounterBattery=100;encounterHP=MAX_HP;beginVoiceBattle()}
$('restartAll').onclick=startFromBeginning;
function zeroBound(){return bugs.some(b=>b.type==='grenade'&&(b.hp>0||state==='win'||state==='lose')&&b.bindAge!==undefined)}
function releaseBossSuction(b){
 delete b.bindAge;delete b.bindPulses;
 b.suction=0;snared=0;
 if(canUsePanel('zero',col,row,layer))return;
 const safe=[];for(let r=0;r<3;r++)for(let c=0;c<6;c++)if(canUsePanel('zero',c,r,layer))safe.push({c,r,d:Math.abs(col-c)+Math.abs(row-r)});
 safe.sort((a,b)=>a.d-b.d);if(safe.length&&beginMove(safe[0].c,safe[0].r))moveAnim.duration=.24;
}


function enterBossAirPhase(b){
 if(b.type!=='grenade'||b.phase!==1||b.hp<=0||b.hp>=75)return;
 releaseBossSuction(b);b.phase=2;b.attack=null;b.suction=0;b.tell=0;b.stun=0;b.cd=2.2;b.stepWait=1.1;bossHazards=[];
 b.motion={from:pos(b.c,b.r,b.layer),c:b.c,r:b.r,age:0,duration:.75};b.layer=1;
 // A grounded repeat order must not block the next voice command after takeoff.
 if(activeOrder?.card.damage&&!activeOrder.card.drop&&!attackLayerMatches(activeOrder.card,b)){
  finishOrder('標的が飛行したため指示を終了');transformation=null;actionLock=0;
 }
 poisonActive=true;poisonClock=0;bossPhaseFlash=1.8;screenShake=5;voice(2,[95,140,220,330],.5,.08);voice(3,[],.32,.07);
 msg('翼が開いた！ 地上が毒に侵されている。ウィングで回避！！');
}
const encounterHit=hit;
hit=function(b,damage){encounterHit(b,damage);enterBossAirPhase(b)};

function beginBossAttack(b,kind){
 b.attack=kind;b.aimRow=b.r;b.targetLayer=layer;b.tell=kind==='suction'?.8:1.15;b.stepWait=2.8;
 if(kind==='blast'){
  const crossLayer=b.layer!==layer,cells=crossLayer?Array.from({length:18},(_,i)=>({c:i%6,r:Math.floor(i/6)})).filter(p=>panelOwners[cellId(p.c,p.r)]==='zero'):Array.from({length:b.c},(_,c)=>({c,r:b.r}));
  bossHazards.push({cells,layer:b.targetLayer,age:0,delay:1.15,duration:1.65,damage:30,hit:false});tone(170,.15,'triangle',.04);
 }else voice(2,[210,160,115],.4,.065);
}
function suctionFront(r,l){let front=-1;for(let c=0;c<6;c++)if(canUsePanel('zero',c,r,l))front=c;return front}
function startBossBinding(b){
 b.suction=0;b.attack='bind';b.bindAge=0;b.bindPulses=0;moveAnim=null;holding=false;charge=0;pendingMove=pendingShot=null;
 if(transformation){transformation=null;if(activeOrder)activeOrder.phase='queued'}
 appearance.body='base';loadout.weapon=null;pose='hurt';poseTime=0;snared=0;
}
function tickBossBinding(b,dt){
 b.bindAge+=dt;
 while(b.bindPulses<3&&b.bindAge+1e-8>=b.bindPulses+1){
  b.bindPulses++;totalTaken+=Math.min(hp,10);hp=Math.max(0,hp-10);damageFlash=.18;screenShake=3;sfx('hurt');
  floaters.push({...bindingLayout(b).zero,text:'10',color:'#ff8f83',life:.6});updateHud();checkEnd();if(state!=='battle')return;
 }
 if(b.bindAge>=3-1e-8){releaseBossSuction(b);b.attack=null;b.cd=2;b.stepWait=.8;pose='idle'}
}
function tickMidboss(b,dt){
 if(b.hp<=0)return;enterBossAirPhase(b);b.hit=Math.max(0,b.hit-dt);b.attackPose=Math.max(0,b.attackPose-dt);if(b.attack==='slam'&&!b.attackPose)b.attack=null;
 const moveDt=dt*1.25*(b.phase===2?1.15:1);
 if(b.motion){b.motion.age+=b.motion.duration===.75?dt:moveDt;if(b.motion.age>=b.motion.duration)b.motion=null}
 if(b.bindAge!==undefined){tickBossBinding(b,dt);return}
 if(b.stun>0){b.stun=Math.max(0,b.stun-dt);return}
 if(!enemyAutomationEnabled)return;
 if(b.suction>0){
  b.suction=Math.max(0,b.suction-dt);b.pullClock+=dt;
  const front=suctionFront(row,layer);
  if(front>=0&&col===front&&row===b.r&&!moveAnim&&!techniqueLock){startBossBinding(b);return}
  if(b.pullClock>=.26){b.pullClock-=.26;
   if(front>col&&!moveAnim&&!techniqueLock){let next=col+1;
    while(next<front&&!canUsePanel('zero',next,row,layer))next++;
    if(canUsePanel('zero',next,row,layer)){beginMove(next,row);snared=.3;moveCd=.3;pendingMove=null}
   }
  }
  if(!b.suction){releaseBossSuction(b);b.attack=null;b.cd=2;b.stepWait=.4}return;
 }
 if(b.tell>0){b.tell=Math.max(0,b.tell-dt);if(!b.tell){b.cycle++;b.attackPose=.5;
  if(b.attack==='suction'){b.suction=2.4;b.pullClock=b.suctionClock=0;voice(2,[100,75,55],.5,.075)}
  else{b.attack=null;b.cd=2.2;b.stepWait=.65}
 }return}
 if(b.motion)return;b.cd-=dt;b.stepWait-=moveDt;
 if(b.cd<=0){beginBossAttack(b,Math.random()<.65?'blast':'suction');return}
 if(b.stepWait>0)return;
 const choices=[[b.c-1,b.r],[b.c+1,b.r],[b.c,b.r-1],[b.c,b.r+1]].filter(([c,r])=>bugCanMove(b,c,r));
 if(choices.length){const [c,r]=choices[Math.floor(Math.random()*choices.length)];moveBug(b,c,r);b.motion.duration=.42}
 b.stepWait=.9+Math.random()*.8;
}
const encounterTickBugs=tickBugs,encounterBugPosition=bugPosition;
tickBugs=function(dt){if(encounter==='boss'){for(const b of bugs)tickMidboss(b,dt)}else encounterTickBugs(dt)};
bugPosition=function(b){const p=encounterBugPosition(b);return b.widthTiles?{x:p.x+(b.widthTiles-1)*76/2,y:p.y}:p};
function tickBossWorld(dt){
 for(const h of bossHazards){h.age+=dt;if(!h.hit&&h.age>=h.delay){h.hit=true;screenShake=6;sfx('explode');
  for(const p of h.cells)effects.push({kind:'bossBlast',...pos(p.c,p.r,h.layer),life:.75,max:.75});
  if(layer===h.layer&&h.cells.some(p=>p.c===col&&p.r===row))hurt(h.damage,bugs.find(b=>b.type==='grenade')?.c);
 }}
 bossHazards=bossHazards.filter(h=>h.age<h.duration);bossPhaseFlash=Math.max(0,bossPhaseFlash-dt);
 if(layer!==0)poisonClock=0;
 if(poisonActive&&state==='battle'&&layer===0){
  poisonClock+=dt;
  while(poisonClock>=1/3-1e-8&&hp>0){poisonClock=Math.max(0,poisonClock-1/3);hp=Math.max(0,hp-1);totalTaken++;floaters.push({...pos(col,row,layer),text:'−1',color:'#d7a1ff',life:.55});updateHud();checkEnd()}
 }
}
const encounterTick=tick;
tick=function(dt){const before=simTime;encounterTick(dt);const step=simTime-before;if(step>0&&state==='battle')tickBossWorld(step)};
const encounterTileDanger=tileDanger;
tileDanger=function(c,r,l=layer){
 let danger=encounterTileDanger(c,r,l);
 for(const h of bossHazards)if(!h.hit&&h.layer===l&&h.cells.some(p=>p.c===c&&p.r===r))danger+=12;
 const b=bugs.find(b=>b.type==='grenade'&&b.hp>0);
 if(b?.attack==='suction'&&r===b.r&&c===suctionFront(r,l))danger+=7;
 return danger;
};

function drawBossTerrain(){
 if(encounter!=='boss')return;
 const boss=bugs.find(b=>b.type==='grenade'&&b.hp>0);
 if(boss){for(const cell of bugCells(boss)){const p=pos(cell.c,cell.r);ring(p.x,p.y+10,20,boss.layer?'#92edf0':'#e8c780',.55)}}
 if(poisonActive){
  for(let r=0;r<3;r++)for(let c=0;c<6;c++){
   panel(c,r,isHole(c,r)?'#b95aed15':'#833a8e85','#b880c4');
   const p=pos(c,r);g.fillStyle='#d2ed8070';
   for(let i=0;i<3;i++){const yy=((simTime*12+i*11+c*4)%25);g.fillRect(Math.round(p.x-16+i*14),Math.round(p.y+15-yy),2,2)}

  }
 }
 for(const h of bossHazards)if(!h.hit){for(const cell of h.cells){const p=pos(cell.c,cell.r,h.layer),pulse=.35+Math.sin(simTime*22)*.15;
  g.save();g.globalAlpha=pulse;if(h.layer===0)panel(cell.c,cell.r,'#ff653e','#fff0bc');else{g.fillStyle='#ff653e';g.fillRect(p.x-25,p.y-8,50,27)}g.restore();
  ring(p.x,p.y+7,21,'#ffc589',.9);textPixel('!',p.x,p.y+8,'#fff0b6',12,'center');
 }}
 const b=bugs.find(b=>b.type==='grenade'&&b.hp>0);
 if(b?.attack==='suction'){
  for(let l=0;l<2;l++)for(let r=0;r<3;r++){
   const front=suctionFront(r,l);if(front<0)continue;const end=pos(front,r,l);
   for(let i=0;i<12;i++){const t=(simTime*(b.suction?1.8:.7)+i/12)%1,start=pos(0,r,l);g.fillStyle=i%3?'#a2e9e980':'#eeffff';g.fillRect(Math.round(start.x+(end.x-start.x+20)*t-15),Math.round(start.y-18+Math.sin(i*2.1+simTime*8)*8),4,1)}
  }
 }

}
function drawMidboss(b,x,feet,white){
 const sheet=animationSheets.boss;if(!sheet||b.bindAge!==undefined&&bindSpriteReady)return;
 const attacking=(b.attack==='suction'||b.attack==='bind')?2:b.attack==='blast'||b.attackPose>0?3:Math.floor(simTime/(b.layer?.15:.4))%2;
 const index=(b.layer?4:0)+attacking,f=sheet.frames[index],w=b.layer?Math.round(114*f.width/sheet.frames[0].width):114,h=Math.round(f.height*w/f.width),bob=Math.sin(simTime*(b.layer?4:2))*1.5;

 const rising=b.motion&&b.motion.duration===.75,t=rising?Math.min(1,b.motion.age/.75):1;
 g.save();
 if(rising){const ground=sheet.frames[0],gh=Math.round(ground.height*w/ground.width);g.globalAlpha=1-t;g.drawImage(ground.image,Math.round(x-w/2),Math.round(feet-gh+bob),w,gh)}
 g.globalAlpha=(b.hit>0?.8:1)*t;g.drawImage(white?frameWhite(f):f.image,Math.round(x-w/2),Math.round(feet-h+bob),w,h);
 if(rising){g.globalAlpha=(1-t)*.45;ring(x,feet-8,35+t*20,'#ceffdd',1-t)}
 g.restore();
}
const encounterDrawBug=drawBugAnimated;
drawBugAnimated=function(b,x,y,size,white=false){if(b.type==='grenade')drawMidboss(b,x,y,white||b.hit>.08);else encounterDrawBug(b,x,y,size,white)};
const encounterReadState=readState;
readState=function(){return {...encounterReadState(),encounter,entryBattery:encounterBattery,entryHP:encounterHP,maxHP:MAX_HP,poison:poisonActive,poisonLayer:'ground',poisonDamagePerSecond:poisonActive?3:0,enemies:bugs.map(b=>({number:b.id,type:b.type,canFly:bugCanFly(b),hp:b.hp,maxHp:b.max,row:b.r,col:b.c,widthTiles:b.widthTiles||1,phase:b.phase||1,layer:b.layer?'air':'ground'}))}};
window.zeroBattle={...window.zeroBattle,reset,readState,startNextEncounter};
loadBossSprites();

// Each cel is a complete, continuously drawn boss + snout + captured Zero scene.
let bindSpriteReady=false;
const boundImage=new Image();
boundImage.onload=()=>{
 const frames=[];
 for(let i=0;i<8;i++){
  const x=Math.round(i%4*boundImage.naturalWidth/4),y=Math.round(Math.floor(i/4)*boundImage.naturalHeight/2),
   w=Math.round((i%4+1)*boundImage.naturalWidth/4)-x,h=Math.round((Math.floor(i/4)+1)*boundImage.naturalHeight/2)-y;
  const c=document.createElement('canvas');c.width=w;c.height=h;const t=c.getContext('2d');t.drawImage(boundImage,x,y,w,h,0,0,w,h);
  // Exclude disconnected fragments of neighbouring cels at atlas boundaries.
  const pixels=t.getImageData(0,0,w,h),data=pixels.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let largest=[];
  for(let start=0;start<w*h;start++){
   if(seen[start]||data[start*4+3]<32)continue;let head=0,tail=1;queue[0]=start;seen[start]=1;
   const add=j=>{if(j>=0&&j<w*h&&!seen[j]&&data[j*4+3]>=32){seen[j]=1;queue[tail++]=j}};
   while(head<tail){const j=queue[head++];if(j%w)add(j-1);if(j%w<w-1)add(j+1);add(j-w);add(j+w)}
   if(tail>largest.length)largest=Array.from(queue.subarray(0,tail));
  }
  const keep=new Uint8Array(w*h);for(const j of largest)keep[j]=1;for(let j=0;j<w*h;j++)if(!keep[j])data[j*4+3]=0;
  t.putImageData(pixels,0,0);frames.push(c);
 }
 animationSheets.bound={frames};bindSpriteReady=true;
 if(pendingNextEncounter&&bossArtState==='ready'){pendingNextEncounter=false;startNextEncounter()}
};
boundImage.onerror=()=>{bindSpriteReady=false;bossArtFailure()};
boundImage.src='assets/animation/boss-bind-integrated.png';
const unboundDrawZero=drawZeroAnimated;
drawZeroAnimated=function(){if(!zeroBound()||!bindSpriteReady)unboundDrawZero()};
function bindingLayout(b){
 const p=bugPosition(b),size=150,left=p.x-size*.68,top=Math.max(4,p.y+12-size*.88);
 return {left,top,size,zero:{x:left+size*.23,y:top+size*.82}};
}
function drawBossBinding(){
 const b=bugs.find(b=>b.bindAge!==undefined);if(!b||!bindSpriteReady)return;
 const pulse=b.bindAge%1,phase=pulse<.16&&b.bindPulses?2:Math.floor(b.bindAge/.18)%4,index=(b.layer?4:0)+phase;
 const {left,top,size}=bindingLayout(b);
 g.drawImage(animationSheets.bound.frames[index],Math.round(left),Math.round(top),size,size);
 textPixel('拘束 '+Math.max(0,3-b.bindAge).toFixed(1),left+size*.23,top+9,'#ffd3a1',9,'center');
}
