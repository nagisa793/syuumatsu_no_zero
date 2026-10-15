'use strict';
// A phase change pauses combat while the score and transition effects continue.
let phaseTransition=null;
function beginPhaseTransition(kind,b){
 phaseTransition={kind,boss:b,age:0,duration:2.65,owners:[...panelOwners],poisonSound:false,stealIssued:kind!=='error'};
 hitstop=0;flash=damageFlash=0;screenShake=0;
}
function phasePoisonReveal(c,r){
 if(!phaseTransition)return 1;
 const delay=.55+(5-c)*.055+r*.09;
 return Math.max(0,Math.min(1,(phaseTransition.age-delay)/.35));
}
function interruptZeroForForce(reason){
 if(activeOrder)finishOrder(reason);
 techniqueLock=null;transformation=null;pendingTechnique=null;swordStrike=null;
 holding=false;charge=0;pendingMove=pendingShot=null;actionLock=0;
 appearance.body='base';loadout.weapon=null;
}
function pushZeroFromStolenArea(){
 if(col!==2)return;
 const from=zeroVisualPosition();from.y-=(ZERO_SIZE-72)*layer;
 if(spiderBind)releaseSpiderBind();
 interruptZeroForForce('エリアを奪われて技を中断');
 moveAnim=null;
 let destination=0;if(panelOwners[cellId(destination,row)]!=='zero')destination=1;
 if(panelOwners[cellId(destination,row)]!=='zero')return;
 if(beginMove(destination,row,layer)){moveAnim.from=from;moveAnim.duration=.32;moveAnim.forced=true}
 pose='hurt';poseTime=hurtTime=.42;actionLock=.42;invuln=Math.max(invuln,.35);moveCd=.12;
 screenShake=4;sfx('hurt');
}
function tickPhaseTransition(dt){
 const p=phaseTransition;if(!p||state==='paused')return;
 p.age+=dt;time+=dt;
 const b=p.boss;if(b.motion){b.motion.age=Math.min(b.motion.duration,Math.max(0,p.age-.2));if(b.motion.age>=b.motion.duration)b.motion=null}
 if(!p.poisonSound&&p.age>=.55){p.poisonSound=true;sfx('area');voice(3,[],.22,.025)}
 if(!p.stealIssued&&p.age>=1.35){p.stealIssued=true;errorStealArea()}
 for(const change of panelChanges)change.life-=dt;
 panelChanges=panelChanges.filter(change=>change.life>0);
 if(moveAnim?.forced){moveAnim.age+=dt;if(moveAnim.age>=moveAnim.duration)moveAnim=null}
 if(pose==='hurt'){hurtTime=Math.max(0,hurtTime-dt);poseTime=Math.max(0,poseTime-dt);actionLock=Math.max(0,actionLock-dt);if(poseTime<=0)pose='idle'}
 screenShake=Math.max(0,screenShake-dt*15);
 if(p.age>=p.duration){phaseTransition=null;screenShake=0;if(p.kind==='error'){errorStealClock=10;if(!layer&&!activeOrder&&!orderQueue.some(o=>o.card.file==='wing')){const wing=[quickFiles.wing,...files.wing].find(c=>c?.file==='wing'&&energy>=c.cost&&techniqueSelectionsLeft(c)>0);if(wing)submitOrder(wing,{count:1,target:b.id,confirmed:true})}}updateHud()}
}
function drawPhaseTransition(){
 const p=phaseTransition;if(!p)return;
 const fade=Math.min(1,p.age/.2,(p.duration-p.age)/.4),strength=Math.max(0,fade);
 g.save();g.globalCompositeOperation='multiply';g.fillStyle=`rgba(25,24,34,${strength*.86})`;g.fillRect(0,0,W,H);g.restore();
 // A visible poison wave spreads from the enemy side across the ground.
 for(let r=0;r<3;r++)for(let c=0;c<6;c++){
  const reveal=phasePoisonReveal(c,r);if(!reveal)continue;const q=pos(c,r),pulse=Math.max(0,1-reveal);
  g.save();g.globalAlpha=strength*(.2+pulse*.55);panel(c,r,'#aa4bce80','#e68afa');
  g.strokeStyle='#e9bbff';g.lineWidth=1;g.beginPath();g.ellipse(q.x,q.y+8,8+reveal*26,(8+reveal*26)*.35,0,0,Math.PI*2);g.stroke();
  for(let i=0;i<3;i++){g.fillStyle='#f3bdff';g.fillRect(Math.round(q.x-18+i*17),Math.round(q.y+9-reveal*22-i%2*7),2,4)}g.restore();
 }
 if(p.kind==='error'&&p.age>=1.05){
  const progress=Math.min(1,(p.age-1.05)/.65);
  for(let r=0;r<3;r++){const q=pos(2,r),t=Math.max(0,Math.min(1,progress*1.5-r*.15));g.save();g.globalAlpha=strength*.9*t;panel(2,r,'#ff536249','#ffb5b9');
   const y=q.y-12+t*34;g.fillStyle='#ffd9df';g.fillRect(q.x-36,Math.round(y),72,2);g.restore()}
 }
}
