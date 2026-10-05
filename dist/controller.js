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
reset=function(withIntro=true){resetOrders();autoFamilies=[];legacyReset();bugs=createBattleBugs();for(const k of Object.keys(memoryNumbers))delete memoryNumbers[k];if(withIntro)beginBattleIntro();else{state='battle';automaticTarget();startBattleScore()}updateHud()};
updateHud=function(){legacyHud();const c=activeOrder?.card||transformation?.card||loadout.wing||loadout.shield;setText('equippedcode',c?(c.basic?'NORMAL':'FILE '+fileMeta[c.file].label+' / '+String(c.num).padStart(3,'0')):'NORMAL / 0%');setText('equippedname',c?.name||'ゼロ');setText('equippedstate',transformation?'展開中':activeOrder?orderLabel(activeOrder)+' · '+c.cost+'%':c?c.cost+'% / 発動':'');if(state==='target')setText('autostatus','TARGET')};
beginTarget=function(){if(!['battle','target','lock','intro'].includes(state))return false;state='target';lockAge=0;voiceFile=null;holding=false;charge=0;pendingMove=pendingShot=null;keys.clear();stopVoices();msg('TARGET');commandFeedback('TARGET');sfx('select');updateHud();return true};
cardReaches=function(c,b,fc=col,fr=row){return !!b&&attackLayerMatches(c,b)&&bugCells(b).some(p=>(c.wide||fr===p.r)&&(c.drop||c.projectile||Math.abs(p.c-fc)<=c.range))};
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
let autoFamilies=[];
function chooseAutoTechnique(b){
 const legal=c=>c.cost<=energy&&!unavailable(c);
 const wings=files.wing.filter(legal);
 if(!layer&&(poisonActive||groundTrapped()||b.layer)&&wings.length)return wings[Math.floor(Math.random()*wings.length)];
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
 if(!automationEnabled||state!=='battle'||hurtTime>0||zeroBound())return;advanceOrder(dt);autoThink-=dt;autoMoveWait-=dt;autoFireWait-=dt;if(autoTechniqueMode&&!attackPoseActive()&&!transformation&&!layer&&(poisonActive||groundTrapped())&&activeOrder?.automaticMode&&activeOrder.card.file!=='wing'&&files.wing.some(c=>energy>=c.cost&&!unavailable(c))){cancelOrders('飛行へ切り替え');autoThink=0}
 if(techniqueLock&&techniqueLock.stage!=='ready'||transformation||actionLock>0||attackPoseActive())return;
 const o=activeOrder,b=o?orderTarget(o):automaticTarget(),c=o?.card,danger=tileDanger(col,row);if(b)zeroFacing=Math.sign(b.c-col)||zeroFacing;
 if(autoTechniqueMode&&!o&&b&&autoThink<=0){
  if(layer&&!b.layer&&!poisonActive){land();autoThink=.3;return}
  const chosen=chooseAutoTechnique(b);
  if(chosen){autoThink=.35;if(submitOrder(chosen,{target:b.id,count:1,automaticMode:true})){autoFamilies.push(chosen.file);if(autoFamilies.length>8)autoFamilies.shift();return}}
 }

 let blockedReason='';
 if(o){if(o.phase==='recover')return;if(o.phase==='ready'&&techniqueLock?.card===c){executeEquipped(c);return}const reason=orderReadiness(o,b);blockedReason=reason;o.rangeWait=reason==='range'?(o.rangeWait||0)+dt:0;if(o.rangeWait>=5){finishOrder('射程に届かず指示を終了');updateHud();return}if(reason==='land'&&!moveAnim){land();return}if(reason==='battery'){finishOrder('充電不足');updateHud();return}
  if(!reason&&!moveAnim){o.wait='';if(c.basic){holding=false;charge=0;if(fire(b)){recordOrderUse(c);autoFireWait=.5}return}
   if(o.phase==='queued'){if(activate(c))o.phase='transforming';return}if(o.phase==='ready'&&executeEquipped(c))return;
  }else if(reason)announceOrderWait(o,reason);
 }
 if(groundTrapped())return;
 if(!o&&attackEnabled&&b&&b.layer===layer&&row===b.r&&!moveAnim&&danger<7&&autoFireWait<=0&&shotcd<=0){if(autoShots%5===4&&charge<.82){if(!holding){holding=true;charge=0;chargeReady=false}return}holding=false;if(fire(b)){autoShots++;autoFireWait=.5;setText('autostatus','通常射撃')}return}
 if(manualDestination&&col===manualDestination.c&&row===manualDestination.r){manualDestination=null;movementEnabled=false}
 if(movementEnabled&&snared<=0&&autoThink<=0&&!moveAnim&&moveCd<=0&&(autoMoveWait<=0||danger>3)){autoThink=.14;const step=nextAutoStep(b,c);if(step){move(...step,false);autoMoveWait=layer?.38/wingSpeed:.38;holding=false;charge=0;if(!o)setText('autostatus',danger>1?'回避':'追尾');return}else if(o&&blockedReason==='range'){announceOrderWait(o,'range')}}
 if(!o&&!moveAnim)setText('autostatus',!attackEnabled?'回避・待機':b&&b.layer!==layer?'標的と高度が合わない':'追尾');
};
tick=function(dt){syncBattleMusic();if(state==='intro'){tickBattleIntro(dt);return}if(state!=='paused')commandClock+=dt;if(state==='target'){updateHud();return}if(state==='lock'){lockAge+=dt;if(lockAge>=.72){state='battle';msg(numberLabel(targetId)+'を追尾');updateHud()}return}const before=simTime;animationTick(dt);const step=simTime-before;if(step>0&&state==='battle'){lockPulse=Math.max(0,lockPulse-step);autoBattle(step)}};
window.zeroBattle={...window.zeroBattle,reset,runCommand,parseCommand,beginTarget,readCommand:()=>({target:targetId,order:activeOrder?{card:activeOrder.card.id,remaining:activeOrder.remaining,used:activeOrder.used,phase:activeOrder.phase,wait:activeOrder.wait}:null,history:orderHistory,loadout:Object.fromEntries(Object.entries(loadout).map(([k,v])=>[k,v?.id||null])),equipmentUses:{...equipmentUses}})};
updateHud();
