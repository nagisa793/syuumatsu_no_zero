'use strict';
const bugTypes={
 bee:{name:'ドリルビー',aliases:['蜂','ハチ','ビイ'],flying:true,size:66.25,hp:20,kind:'drill',cool:3.3,tell:.7,speed:5.5,damage:20},
 fly:{name:'ボムオニヤンマ',aliases:['オニヤンマ','トンボ','とんぼ','ドラゴンフライ'],flying:true,size:65,hp:30,kind:'bomb',cool:3.8,tell:.8,speed:5.5,damage:20},
 spider:{name:'スレッドスパイダー',aliases:['蜘蛛','クモ','くも','スパイダ'],flying:false,size:57.5,hp:40,kind:'web',cool:3.7,tell:.6,speed:18,damage:15},
 beetle:{name:'キャタピラムカデ',aliases:['ムカデ','むかで','センチピード'],flying:false,size:61.25,hp:60,kind:'ram',cool:4.5,tell:.8,speed:8,damage:30}
};
Object.assign(bugNames,Object.fromEntries(Object.entries(bugTypes).map(([t,b])=>[t,b.name])));
function createBattleBugs(){const roster=[['bee',3,0,1],['fly',5,1,1],['spider',3,2,0],['beetle',4,0,0]];
 for(let i=roster.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[roster[i],roster[j]]=[roster[j],roster[i]]}
 return roster.slice(0,3).map(([type,c,r,layer],i)=>({id:i+1,type,c,r,layer,widthTiles:1,hp:bugTypes[type].hp,max:bugTypes[type].hp,cd:1.2+i*.55,tell:0,hit:0,stun:0,attackPose:0,motion:null,decision:.2+i*.17,stepWait:.8+i*.2,cycle:0,burst:0,evadeWait:0,aimRow:r,targetLayer:layer}))}
bugCanFly=b=>!!bugTypes[b.type]?.flying;
function insectAttackProgress(a){const u=a.age<.25?0:a.age<.52?(a.age-.25)/.27:a.age<.66?1:Math.max(0,1-(a.age-.66)/.3);return u*u*(3-2*u)}
function insectWorldCol(b){const a=b.attackMotion;if(a?.kind==='bomb')return a.startC-a.speed*Math.min(a.age,a.duration);if(a&&['drill','ram'].includes(a.kind))return b.c+(a.c-b.c)*insectAttackProgress(a);return b.c}
bugPosition=function(b){
 const p=pos(b.c,b.r,b.layer);
 if(b.layer){let height=bugTypes[b.type].size;if(b.type==='grenade'&&animationSheets.boss)height=Math.max(...animationSheets.boss.frames.slice(4).map(f=>f.height*MIDBOSS_WIDTH/animationSheets.boss.frames[0].width));p.y+=height-72-(b.type==='grenade'?8:0)}
 let out=p;
 if(b.motion){const t=Math.min(1,b.motion.age/b.motion.duration),e=t*t*(3-2*t);out={x:b.motion.from.x+(p.x-b.motion.from.x)*e,y:b.motion.from.y+(p.y-b.motion.from.y)*e}}
 const a=b.attackMotion;if(!a||a.kind==='web')return out;
 if(a.kind==='bomb'){const q=pos(insectWorldCol(b),a.r,1);return{x:q.x,y:p.y}}
 const e=insectAttackProgress(a),q=pos(a.c,a.r,a.layer);
 return{x:out.x+(q.x-out.x)*e,y:out.y+(q.y-out.y)*e};
};
let bugBombs=[],bugBlasts=[],spiderBind=null;
function releaseSpiderBind(){
 if(!spiderBind)return;spiderBind=null;snared=0;holding=false;charge=0;pendingMove=pendingShot=null;
 if(state==='battle'){if(pose==='bound'){pose='idle';poseTime=0}if(!techniqueLock&&!transformation&&!attackPoseActive()){hurtTime=0;actionLock=0;moveCd=0;shotcd=0}invuln=Math.max(invuln,.55);autoThink=0;autoMoveWait=0;autoFireWait=0}
}
function beginSpiderBind(b){
 if(spiderBind||zeroBound()||invuln>0||reflect>0)return false;
 const resumeAttack=attackEnabled;
 if(activeOrder)finishOrder('糸の拘束で技をキャンセル');
 attackEnabled=resumeAttack;techniqueLock=null;transformation=null;pendingTechnique=null;swordStrike=null;
 appearance.body='base';loadout.weapon=null;
 b.motion=null;b.tell=0;b.attackMotion={kind:'web',r:row,layer:0,age:.35,hit:true};
 spiderBind={age:0,pulses:0,source:b.id,releaseAge:null};snared=3;holding=false;charge=0;pendingMove=pendingShot=null;moveAnim=null;actionLock=0;
 pose='bound';poseTime=3;return true;
}
function tickSpiderBind(dt){
 if(!spiderBind)return;const bind=spiderBind;bind.age+=dt;
 if(bind.releaseAge!==null){bind.releaseAge+=dt;if(bind.releaseAge>=.25)releaseSpiderBind();return}
 while(bind.pulses<3&&bind.age+1e-8>=bind.pulses+1){
  bind.pulses++;const blocked=shieldTime>0?Math.min(shield,5):0;shield-=blocked;const damage=5-blocked;
  hp=Math.max(0,hp-damage);totalTaken+=damage;sfx(blocked===5?'block':'hurt');
  floaters.push({...pos(col,row,layer),text:String(damage),color:'#ff8f83',life:.6});damageFlash=.18;updateHud();checkEnd();
  if(state!=='battle'){releaseSpiderBind();return}
 }
 if(bind.age+1e-8>=3){bind.releaseAge=0;snared=0;poseTime=0}
}
function returnDragonfly(b){
 const spaces=[];for(let r=0;r<3;r++)for(let c=0;c<6;c++)if(bugCanMove(b,c,r,1))spaces.push({c,r});
 if(!spaces.length)return false;
 const p=spaces[Math.floor(Math.random()*spaces.length)];b.c=p.c;b.r=p.r;b.layer=1;b.offscreen=false;b.attackMotion=null;b.recoverWait=.75;b.stepWait=1.15;b.cd=1.4+Math.random()*1.1;return true;
}
bugShot=function(b){
 const m=bugTypes[b.type];b.attackPose=0;b.motion=null;
 if(m.kind==='web'){b.attackMotion={kind:'web',r:b.aimRow,layer:0,age:0,hit:false};return}
 if(m.kind==='bomb'){if(b.layer!==1&&!bugCanMove(b,b.c,b.r,1)){b.recoverWait=.4;return}b.layer=1;b.attackMotion={kind:'bomb',startC:b.c,exitC:-2,r:b.r,age:0,speed:m.speed,duration:(b.c+2)/m.speed,dropped:new Set()};b.offscreen=false;return}
 b.attackMotion={kind:m.kind,c:col,r:b.aimRow,layer:b.targetLayer,age:0,struck:false};
};
function dropInsectBomb(b,c,ageAtDrop){
 const a=b.attackMotion,p=bugPosition({...b,attackMotion:{...a,age:ageAtDrop}}),size=34;
 bugBombs.push({c,r:a.r,layer:0,age:0,fromX:p.x-14,fromY:p.y+12-23+size/2,groundY:pos(c,a.r,0).y+8,damage:bugTypes[b.type].damage,duration:.68});
 a.lastDropAge=ageAtDrop;sfx('cannon');
}
function webTip(b){const a=b.attackMotion;return b.c-.35-Math.max(0,a.age-.18)*bugTypes.spider.speed}
function rushBodyAt(b,age){
 const actor={...b,attackMotion:{...b.attackMotion,age}},p=bugPosition(actor),rect=insectSpriteGeometry(actor,p.x,p.y+12);
 if(rect)return {x:rect.left+rect.w/2,y:rect.top+rect.h/2,rx:rect.w/2,ry:rect.h/2};
 const size=bugTypes[b.type].size;return{x:p.x,y:p.y+12-size/2,rx:size*.5,ry:size*.5};
}
function segmentTouchesBox(from,to,left,right,top,bottom){
 let enter=0,exit=1;
 for(const [a,b,min,max] of [[from.x,to.x,left,right],[from.y,to.y,top,bottom]]){
  const delta=b-a;
  if(Math.abs(delta)<1e-8){if(a<min||a>max)return false;continue}
  const t0=(min-a)/delta,t1=(max-a)/delta;enter=Math.max(enter,Math.min(t0,t1));exit=Math.min(exit,Math.max(t0,t1));
  if(enter>exit)return false;
 }
 return true;
}
function rushTouchesZero(b,before,after){
 const a=b.attackMotion;if(!a||b.offscreen)return false;
 const rushLayer=a.kind==='bomb'?1:a.layer??b.layer;
 const zeroRow=(actorGroundAnchor({zero:true}).y-pos(0,0).y)/38;
 if(layer!==rushLayer||Math.abs(zeroRow-a.r)>.5)return false;
 const start=Math.max(before,a.kind==='bomb'?0:.25),end=Math.min(after,a.kind==='bomb'?a.duration:.96);
 if(end<start)return false;
 const ages=[start,...[.25,.52,.66,.96].filter(t=>t>start&&t<end),end];
 const zero=zeroVisualPosition(),feet=zero.y+12,left=zero.x-ZERO_SIZE*.24,right=zero.x+ZERO_SIZE*.24,top=feet-ZERO_SIZE*.9,bottom=feet-ZERO_SIZE*.04;
 for(let i=1;i<ages.length;i++){
  const from=rushBodyAt(b,ages[i-1]),to=rushBodyAt(b,ages[i]),rx=Math.max(from.rx,to.rx),ry=Math.max(from.ry,to.ry);
  if(segmentTouchesBox(from,to,left-rx,right+rx,top-ry,bottom+ry))return true;
 }
 return false;
}
function applyRushContact(b,before,dt){
 const a=b.attackMotion;a.contactWait=Math.max(0,(a.contactWait||0)-dt);
 if(a.contactWait>0||invuln>0||zeroBound()||!rushTouchesZero(b,before,a.age))return;
 const oldHP=hp,oldShield=shield;hurt(bugTypes[b.type].damage,a.startC??b.c);
 if(hp<oldHP||shield<oldShield)a.contactWait=.28;
}
function tickBugAttack(b,dt){
 const a=b.attackMotion;if(!a)return false;const before=a.age;a.age+=dt;
 if(a.kind==='bomb'){
  const previous=a.startC-a.speed*before,current=a.startC-a.speed*Math.min(a.age,a.duration);
  applyRushContact(b,before,dt);
  for(let c=5;c>=0;c--)if(panelOwners[cellId(c,a.r)]==='zero'&&!a.dropped.has(c)&&previous>=c&&current<=c){a.dropped.add(c);dropInsectBomb(b,c,(a.startC-c)/a.speed)}
  if(a.age>=a.duration)b.offscreen=true;
  if(a.age>=a.duration+.35)returnDragonfly(b);return true;
 }
 if(a.kind==='web'){
  if(spiderBind?.source===b.id&&spiderBind.releaseAge===null){a.hit=true;return true}
  if(!a.hit&&layer===0&&row===a.r&&col<b.c&&col>=webTip(b)){a.hit=beginSpiderBind(b)}
  if(a.age>=1.1){b.attackMotion=null;b.recoverWait=.6;b.stepWait=.85;b.decision=0;b.cd=1.2+Math.random()*.8}return true;
 }
 applyRushContact(b,before,dt);
 if(!a.struck&&a.age>=.53){a.struck=true;sfx('sword')}
 if(a.age>=.96){b.attackMotion=null;b.recoverWait=.7;b.stepWait=1.1}return true;
}
function tickBugBombs(dt){
 for(const p of bugBombs){p.duration??=.68;p.age+=dt;
  if(!p.hit&&p.age+1e-8>=p.duration){p.hit=true;
   if(col===p.c&&row===p.r&&layer===0)hurt(p.damage,p.c+1);
   bugBlasts.push({c:p.c,r:p.r,x:p.fromX??pos(p.c,p.r).x,age:0,duration:.65});sfx('explode');screenShake=Math.max(screenShake,4);
  }
 }
 bugBombs=bugBombs.filter(p=>!p.hit);
 for(const e of bugBlasts)e.age+=dt;bugBlasts=bugBlasts.filter(e=>e.age<e.duration);
}
const insectReset=reset;
reset=function(...args){bugBombs=[];bugBlasts=[];spiderBind=null;return insectReset(...args)};
function drawInsectTexture(key,frame,x,y,width,height){
 const data=animationSheets[key],f=data?.frames[frame];if(!f)return false;
 const scale=Math.min(width/data.maxWidth,height/data.maxHeight),w=f.width*scale,h=f.height*scale;
 g.drawImage(f.image,Math.round(x-w/2),Math.round(y-h),Math.round(w),Math.round(h));return true;
}
function drawSpiderBound(){
 if(!spiderBind)return false;const p=pos(col,row,layer),bind=spiderBind;
 const frame=bind.releaseAge!==null?6+Math.min(1,Math.floor(bind.releaseAge/.125)):bind.pulses&&bind.age%1<.22?4:Math.floor(bind.age/.13)%4;
 if(!animationSheets.spiderZero)return false;
 drawCel('spiderZero',frame,p.x,p.y+12,ZERO_SIZE);return true;
}
// Effect entries share the actors' ground-depth queue, rather than always covering them.
function drawSpiderThread(b){
  const a=b.attackMotion,p=bugPosition(b),rect=insectSpriteGeometry(b),mount=rect?.f.silkMouth;
  if(!rect||!mount)return;const start={x:rect.left+mount.x*rect.scale,y:rect.top+mount.y*rect.scale};
  const end=pos(Math.max(-.6,webTip(b)),a.r,0),endX=a.hit&&spiderBind?.source===b.id?pos(col,row).x:end.x;
  const endY=a.hit&&spiderBind?.source===b.id?pos(col,row).y-24*ZERO_SCALE:end.y-13;
  const dx=endX-start.x,dy=endY-start.y,len=Math.hypot(dx,dy),frame=Math.floor(a.age/.055)%4;
  g.save();g.translate(start.x,start.y);g.rotate(Math.atan2(dy,dx));
  // Draw woven silk tiles, preserving fibre proportions along the stream.
  for(let x=0;x<len;x+=24){const f=animationSheets.webSilk?.frames[frame];if(f){const w=Math.min(24,len-x);g.drawImage(f.image,0,0,f.width*w/24,f.height,x,-3,w,6)}}g.restore();
}
function drawFallingInsectBomb(p){
  const q=pos(p.c,p.r,0),t=Math.min(1,p.age/p.duration),height=34;
  const fromY=p.fromY??pos(p.c,p.r,1).y,center=fromY+(p.groundY-height/2-fromY)*t*t;
  ring(q.x,q.y+8,18,'#ffe18a',.7);
  drawInsectTexture('insectBomb',Math.min(3,Math.floor(t*4)),p.fromX??q.x,center+height/2,15,height);
}
function insectDrawEntries(){
 const entries=[];
 for(const b of bugs)if(b.hp>0&&b.attackMotion?.kind==='web'&&b.attackMotion.age>=.18)entries.push({depth:actorGroundAnchor(b).y+.2,draw:()=>drawSpiderThread(b)});
 for(const p of bugBombs)entries.push({depth:pos(p.c,p.r).y+.15,draw:()=>drawFallingInsectBomb(p)});
 for(const e of bugBlasts)entries.push({depth:pos(e.c,e.r).y+.25,draw:()=>{const p=pos(e.c,e.r);drawInsectTexture('insectBlast',Math.min(7,Math.floor(e.age/e.duration*8)),e.x??p.x,p.y+12,77,66)}});
 return entries;
}
tickBugs=function(dt){
 for(const b of bugs){
  if(b.hp<=0)continue;const m=bugTypes[b.type];if(!m.flying&&b.layer){b.layer=0;b.motion=null}b.hit=Math.max(0,b.hit-dt);
  if(spiderBind?.source===b.id&&spiderBind.releaseAge===null){b.motion=null;if(b.attackMotion)b.attackMotion.age+=dt;continue}
  if(b.motion){b.motion.age+=dt;if(b.motion.age>=b.motion.duration)b.motion=null}
  if(b.stun>0&&b.attackMotion?.kind!=='bomb'){b.attackMotion=null;b.stun=Math.max(0,b.stun-dt);continue}
  if(!enemyAutomationEnabled)continue;if(tickBugAttack(b,dt))continue;
  b.cd-=dt;b.stepWait-=dt;b.decision-=dt;b.recoverWait=Math.max(0,(b.recoverWait||0)-dt);b.evadeWait=Math.max(0,b.evadeWait-dt);
  if(b.tell>0){b.tell-=dt;if(b.tell<=0){bugShot(b);b.cycle++;b.cd=m.cool*(.8+Math.random()*.4);b.stepWait=.7}continue}
  if(b.motion||b.recoverWait>0||b.decision>0)continue;b.decision=.18;
  if(b.cd<=0){if(bugs.filter(o=>o.hp>0&&o.tell>0).length>=2){b.cd=.3;continue}b.aimRow=b.r;b.targetLayer=['fly','spider'].includes(b.type)?0:b.layer;b.tell=m.tell;b.stepWait=1.2;continue}
  if(b.stepWait>0)continue;
  const moves=[[b.c-1,b.r],[b.c+1,b.r],[b.c,b.r-1],[b.c,b.r+1]].filter(([c,r])=>bugCanMove(b,c,r));
  if(moves.length){const [c,r]=moves[Math.floor(Math.random()*moves.length)];moveBug(b,c,r)}
  b.stepWait=(m.flying?1.05:1.3)+Math.random()*.7;
 }
};
