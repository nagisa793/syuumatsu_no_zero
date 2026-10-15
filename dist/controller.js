'use strict';
const legacyReset=reset,legacyHud=updateHud;
const legacyCheckEnd=checkEnd;
checkEnd=function(){
 const wasBattle=state==='battle';legacyCheckEnd();
 if(wasBattle&&(state==='win'||state==='lose')){
  const finalAppearance={...appearance},finalLoadout={...loadout},finalCharge=charge;
  finishOrder(state==='win'?'戦闘終了':'リンク切断');orderQueue=[];
  // The engine freezes pose and simTime through the result transition.
  appearance=finalAppearance;loadout=finalLoadout;charge=finalCharge;
 }
};
reset=function(withIntro=true){phaseTransition=null;swordStrike=null;resetOrders();autoFamilies=[];legacyReset();bugs=createBattleBugs();for(const k of Object.keys(memoryNumbers))delete memoryNumbers[k];if(withIntro)beginBattleIntro();else{state='battle';automaticTarget();startBattleScore()}updateHud()};
updateHud=function(){legacyHud()};
beginTarget=function(){
 if(state==='target')return true;
 if(!['battle','lock','intro'].includes(state))return false;
 if(targetChangeRemaining>1e-8){msg('標的の変更まであと'+Math.ceil(targetChangeRemaining)+'秒。');return false}
 // Clear stored instructions on entry while preserving a committed strike.
 orderQueue=[];pendingTechnique=null;discardInstructionContext();
 if(activeOrder){
  if(techniqueLock||transformation||attackPoseActive()){activeOrder.remaining=0;activeOrder.continuous=false;activeOrder.untilTarget=null;activeOrder.untilAll=false;activeOrder.seconds=0}
  else finishOrder('TARGETへ切り替え');
 }
 autoTechniqueMode=false;targetInstructionCount=0;state='target';lockAge=0;
 voiceFile=null;holding=false;charge=0;pendingMove=pendingShot=null;keys.clear();stopVoices();msg('TARGET');sfx('select');updateHud();return true;
};

cardReaches=function(c,b,fc=col,fr=row){return !!b&&attackLayerMatches(c,b)&&bugCells(b).some(p=>(c.wide||fr===p.r)&&(c.drop||c.projectile||Math.abs(p.c-fc)<=c.range))};
function attackRouteExists(card,target){
 const todo=[[col,row]],seen=new Set([row*6+col]);
 for(let i=0;i<todo.length;i++){const [c,r]=todo[i];if(cardReaches(card,target,c,r))return true;
  for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){const x=c+dx,y=r+dy,id=y*6+x;if(canUsePanel('zero',x,y,layer)&&!seen.has(id)){seen.add(id);todo.push([x,y])}}
 }return false;
}
nextAutoStep=function(target,card){
 const start=row*6+col,dist=Array(18).fill(Infinity),first=Array(18).fill(null),todo=[start];dist[start]=0;
 while(todo.length){todo.sort((a,b)=>dist[a]-dist[b]);const at=todo.shift(),c=at%6,r=Math.floor(at/6);for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){const x=c+dx,y=r+dy;if(!canUsePanel('zero',x,y,layer))continue;const id=y*6+x,cost=dist[at]+1+tileDanger(x,y)*1.3;if(cost<dist[id]){dist[id]=cost;first[id]=first[at]||[dx,dy];if(!todo.includes(id))todo.push(id)}}}
 let best=start,bestScore=Infinity;
 for(let i=0;i<18;i++){if(!Number.isFinite(dist[i]))continue;const c=i%6,r=Math.floor(i/6);let aim=0;
  if(manualDestination)aim=(Math.abs(c-manualDestination.c)+Math.abs(r-manualDestination.r))*8;
  else if(target){const reach=card?cardReaches(card,target,c,r):r===target.r;aim=(card?.wide?0:Math.abs(r-target.r)*5)+(card&&!card.projectile&&!card.drop?Math.max(0,Math.abs(c-target.c)-(card.range||1))*4:Math.abs(c-1)*.3)+(reach?0:3)}
  const score=aim+tileDanger(c,r)*8+dist[i]*.5;if(score<bestScore-.05){best=i;bestScore=score}
 }if(best===start&&target&&card?.damage&&!cardReaches(card,target,col,row)){let attackTile=-1,attackScore=Infinity;for(let i=0;i<18;i++){if(!Number.isFinite(dist[i])||!cardReaches(card,target,i%6,Math.floor(i/6)))continue;const score=dist[i]+tileDanger(i%6,Math.floor(i/6))*2;if(score<attackScore){attackTile=i;attackScore=score}}if(attackTile>=0)best=attackTile}return best===start?null:first[best];
};
function requestLanding(){
 if(!runtimeReady||!['battle','target','lock'].includes(state))return false;
 if(!layer&&!landingRequested&&![activeOrder,...orderQueue].some(o=>o?.card.file==='wing'&&o.remaining>0))return false;
 autoTechniqueMode=false;landingRequested=true;msg('地上に降りて！');processLandingRequest(0);updateHud();return true;
}
function processLandingRequest(dt){
 if(!['battle','target','lock'].includes(state)||phaseTransition)return false;
 if(state!=='battle'&&moveAnim&&(moveAnim.landing||landingRequested&&!techniqueLock&&!transformation&&!attackPoseActive())){
  moveAnim.age+=dt;actionLock=Math.max(0,actionLock-dt);if(moveAnim.age>=moveAnim.duration)moveAnim=null;
 }
 if(!landingRequested)return false;
 if(!layer){
  if(![activeOrder,...orderQueue].some(o=>o?.card.file==='wing'&&o.remaining>0)){landingRequested=false;updateHud()}
  return false;
 }
 if(!land())return false;
 landingRequested=false;updateHud();return true;
}
let autoFamilies=[];
function chooseAutoTechnique(b){
 const legal=c=>c.cost<=energy&&!unavailable(c);
 const wings=files.wing.filter(legal);
 if(!layer&&(poisonActive||typeof groundPoisonThreat==='function'&&groundPoisonThreat()||groundTrapped()||b.layer)&&wings.length)return wings[Math.floor(Math.random()*wings.length)];
 const reachable=c=>{for(let r=0;r<3;r++)for(let x=0;x<6;x++)if(canUsePanel('zero',x,r,layer)&&cardReaches(c,b,x,r))return true;return false};
 const danger=tileDanger(col,row),candidates=Object.values(files).flat().filter(c=>{
  if(!legal(c)||c.file==='wing')return false;
  if(c.file==='area')return !!c.steal&&areaCandidates(c).length>0;
  if(c.file==='shield')return shieldTime<=0&&(danger>0||!autoFamilies.includes('shield'));
  return c.damage&&attackLayerMatches(c,b)&&(c.drop||reachable(c));
 });
 if(!candidates.length)return null;
 const weighted=candidates.map(c=>{
  const recent=autoFamilies.filter(f=>f===c.file).length,last=autoFamilies.at(-1)===c.file;
  let w=1/(1+recent*2);if(last)w*=.15;
  if(c.file==='gravity')w*=.65;
  if(c.file==='shield')w*=danger>3?3:.5;
  if(c.file==='area')w*=.8;
  if(c.file==='sword'&&cardReaches(c,b))w*=1.8;
  return {c,w:w/Math.max(1,files[c.file].length)};
 });
 let pick=Math.random()*weighted.reduce((sum,x)=>sum+x.w,0);
 for(const x of weighted){pick-=x.w;if(pick<=0)return x.c}return weighted.at(-1).c;
}
autoBattle=function(dt){
 if(phaseTransition||!automationEnabled||state!=='battle'||hurtTime>0||zeroBound())return;advanceOrder(dt);autoThink-=dt;autoMoveWait-=dt;autoFireWait-=dt;if(autoTechniqueMode&&!attackPoseActive()&&!transformation&&!layer&&(poisonActive||typeof groundPoisonThreat==='function'&&groundPoisonThreat()||groundTrapped())&&activeOrder?.automaticMode&&activeOrder.card.file!=='wing'&&files.wing.some(c=>energy>=c.cost&&!unavailable(c))){cancelOrders('飛行へ切り替え');autoThink=0}
 if(techniqueLock&&techniqueLock.stage!=='ready'||transformation||actionLock>0||attackPoseActive())return;
 const o=activeOrder,b=o?orderTarget(o):automaticTarget(),c=o?.card,danger=tileDanger(col,row);if(b)zeroFacing=Math.sign(b.c-col)||zeroFacing;
 if(landingRequested&&layer&&!(o?.phase==='ready'&&techniqueLock?.card===c))return;
 if(autoTechniqueMode&&!o&&!orderQueue.length&&!manualDestination&&holdTime<=0&&b&&autoThink<=0){
  if(layer&&!b.layer&&!poisonActive&&!(b.type==='error'&&b.phase===2)){land();autoThink=.3;return}
  const chosen=chooseAutoTechnique(b);
  if(chosen){autoThink=.35;if(submitOrder(chosen,{target:b.id,count:1,automaticMode:true})){autoFamilies.push(chosen.file);if(autoFamilies.length>8)autoFamilies.shift();return}}
 }

 if(state!=='battle')return;
 if(o){if(o.phase==='recover')return;if(o.phase==='ready'&&techniqueLock?.card===c){if(!executeEquipped(c))failOrder('技を発動できない');return}const reason=orderReadiness(o,b);if(reason==='land'&&!moveAnim){land();return}
  if(reason&&!['condition','delay','range','cooldown','shield','land'].includes(reason)){failOrder(({usage:'この技は3回使用済み',battery:'充電不足',air:'空中専用の技',altitude:'標的と高度が合わない',target:'標的がいない',hole:'穴から動けない'})[reason]||reason);return}
  if(!reason&&!moveAnim){o.wait='';if(c.basic){holding=false;charge=0;if(fire(b)){recordOrderUse(c);autoFireWait=.5}return}
   if(o.phase==='queued'){if(activate(c))o.phase='transforming';else failOrder('技を開始できない');return}if(o.phase==='ready'){if(!executeEquipped(c))failOrder('技を発動できない');return}
  }else if(reason)announceOrderWait(o,reason==='range'&&!attackRouteExists(c,b)?'opportunity':reason);
 }
 if(groundTrapped())return;
 if(!o&&attackEnabled&&b&&(typeof enemyHitCells==='function'?enemyHitCells(b,layer).some(p=>p.r===row):b.layer===layer&&row===b.r)&&!moveAnim&&danger<7&&autoFireWait<=0&&shotcd<=0){if(autoShots%5===4&&charge<.82){if(!holding){holding=true;charge=0;chargeReady=false}return}holding=false;if(fire(b)){autoShots++;autoFireWait=.5;setText('autostatus','通常射撃')}return}
 if(manualDestination&&col===manualDestination.c&&row===manualDestination.r){manualDestination=null;movementEnabled=false}
 if(movementEnabled&&snared<=0&&autoThink<=0&&!moveAnim&&moveCd<=0&&(autoMoveWait<=0||danger>3)){autoThink=.14;const step=nextAutoStep(b,c);if(step){move(...step,false);autoMoveWait=layer?.38/wingSpeed:.38;holding=false;charge=0;if(!o)setText('autostatus',danger>1?'回避':'追尾');return}}
 if(!o&&!moveAnim)setText('autostatus',!attackEnabled?'回避・待機':b&&b.layer!==layer?'標的と高度が合わない':'追尾');
};
tick=function(dt){syncBattleMusic();if(state==='paused')return;processLandingRequest(dt);if(!phaseTransition&&['battle','lock'].includes(state))targetChangeRemaining=Math.max(0,targetChangeRemaining-dt);if(phaseTransition&&!['win','lose'].includes(state)){tickPhaseTransition(dt);return}if(state==='intro'){tickBattleIntro(dt);return}commandClock+=dt;if(state==='target'){updateHud();return}if(state==='lock'){lockAge+=dt;if(lockAge>=.72){state='battle';msg(numberLabel(targetId)+'を追尾');updateHud()}return}const before=simTime;animationTick(dt);const step=simTime-before;if(step>0&&state==='battle'&&!phaseTransition){tickBugBombs(step);tickSpiderBind(step);lockPulse=Math.max(0,lockPulse-step);autoBattle(step)}};
window.zeroBattle={...window.zeroBattle,reset,runCommand,parseCommand,beginTarget,readCommand:()=>({target:targetId,order:activeOrder?{card:activeOrder.card.id,remaining:activeOrder.remaining,used:activeOrder.used,phase:activeOrder.phase,wait:activeOrder.wait}:null,queue:orderQueue.map(o=>o.intent?{kind:o.intent.kind}:{id:o.id,card:o.card.id,remaining:o.remaining,untilTarget:o.untilTarget}),history:orderHistory,loadout:Object.fromEntries(Object.entries(loadout).map(([k,v])=>[k,v?.id||null])),equipmentUses:{...equipmentUses}})};
updateHud();
