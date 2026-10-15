'use strict';
let activeOrder=null,orderQueue=[],orderHistory=[],lastOrderSpec=null,orderSerial=0;
let attackEnabled=true,movementEnabled=true,manualDestination=null,holdTime=0,snared=0,zeroFacing=1;
const basicCard={id:'normal',file:'normal',name:'通常射撃',num:0,cost:0,damage:1,projectile:true,basic:true};
fileMeta.normal={jp:'通常射撃',label:'NORMAL'};
function resetOrders(){activeOrder=null;orderQueue=[];orderHistory=[];lastOrderSpec=null;attackEnabled=movementEnabled=true;manualDestination=null;holdTime=snared=0;zeroFacing=1}
function orderLabel(o){return o.untilAll?'全て倒すまで':o.untilTarget?numberLabel(o.untilTarget)+'を倒すまで':o.seconds?Math.max(0,o.seconds-o.elapsed).toFixed(1)+'秒':o.continuous?'継続':'残り'+o.remaining+'回'}
function clearAttackVisual(){if(!(pose==='sword'&&poseTime>0)){loadout.weapon=null;appearance.body='base'}holding=false;charge=0;pendingShot=null}
function discardInstructionContext(){voiceFile=null;voiceFileUntil=0;lastOrderSpec=null}
function failOrder(reason){
 const card=activeOrder?.card;if(!card)return;
 finishOrder(reason);if(techniqueLock?.card===card)techniqueLock=null;if(transformation?.card===card)transformation=null;
 if(lastCommandCard===card)lastCommandCard=null;if(receipt?.card===card)receipt=null;
 if(memoryNumbers[card.file]===card.num)delete memoryNumbers[card.file];
 pendingTechnique=null;discardInstructionContext();msg(reason+' · 指示を終了');updateHud();
}
function finishOrder(reason='完了'){if(!activeOrder)return;if(activeOrder.card.basic)attackEnabled=false;orderHistory.push({card:activeOrder.card.id,uses:activeOrder.used,reason});if(orderHistory.length>60)orderHistory.shift();activeOrder=null;clearAttackVisual()}
function cancelOrders(reason='指示を解除',keepEffects=true){
 if(techniqueLock||transformation||attackPoseActive()){
  orderQueue=[];pendingTechnique=null;
  if(activeOrder){activeOrder.remaining=0;activeOrder.continuous=false;activeOrder.untilTarget=null;activeOrder.untilAll=false;activeOrder.seconds=0}
  msg(reason);updateHud();return;
 }
 finishOrder(reason);orderQueue=[];pendingTechnique=null;transformation=null;actionLock=0;clearAttackVisual();if(!keepEffects){shield=shieldTime=reflect=regen=boost=shieldVisualTime=0;loadout.shield=null;appearance.shield=0;if(layer)land()}msg(reason);updateHud()}
function submitOrder(card,spec={}){
 const manual=!spec.automaticMode&&!spec.confirmed;
 if(manual&&state!=='target'){msg('技はTARGET画面で選んでね。');return false}
 if(manual&&targetInstructionCount>=5){msg('このTARGETでは技を5つまで登録できるよ。');return false}
 if(techniqueSelectionsLeft(card)<(spec.count??1)){msg('同じ技は1バトル3回までだよ。');return false}
 if(energy<card.cost){msg('充電不足。必要'+card.cost+'%、残り'+Math.floor(energy)+'%。');return false}
 const o={id:++orderSerial,card,remaining:spec.count??1,used:0,untilTarget:null,untilAll:false,continuous:false,seconds:0,delay:0,elapsed:0,phase:'queued',wait:'',target:targetId,...spec,awaitConfirm:manual};
 if(o.untilTarget&&!bugs.some(b=>b.id===o.untilTarget&&b.hp>0)){msg('その標的はもういないよ。');return false}
 // Every accepted technique occupies its own FIFO entry. Neither an active
 // repeat nor a committed windup may be replaced by a later submission.
 if(manual||activeOrder||orderQueue.length||techniqueLock||transformation||attackPoseActive()||manualDestination||holdTime>0||moveAnim)orderQueue.push(o);else activeOrder=o;
 if(manual)targetInstructionCount++;
 o.awaitTarget=state==='target'&&!spec.targetExplicit;
 lastOrderSpec={card,target:o.target,orderId:o.id};lastCommandCard=card;receipt={card,until:commandClock+2.4};voiceFile=null;attackEnabled=true;
 msg(card.name+'を登録。');updateHud();return true;
}
function releaseNextOrder(){
 if(!['battle','target','lock'].includes(state))return false;
 if(state==='target'){msg('先に標的の番号を決めてね。');return false}
 const next=orderQueue.find(o=>o.awaitConfirm);
 if(!next){msg('ストックは空だよ。');return false}
 next.awaitConfirm=false;if(autoTechniqueMode)autoTechniqueMode=false;
 msg(next.card.name+'！');sfx('ready');updateHud();return true;
}
function waitingRangeOrder(){
 const o=activeOrder;
 if(!o||o.intent||o.card.basic||o.used>0||o.phase!=='queued'||techniqueLock||transformation||attackPoseActive())return null;
 const target=orderTarget(o);
 return target&&orderReadiness(o,target)==='range'?o:null;
}
function latestPendingOrder(){return [activeOrder,...orderQueue].find(o=>o?.id===lastOrderSpec?.orderId)||null}
function updatePendingOrder(spec,target=null){
 const o=latestPendingOrder();if(!o)return false;
 if(target!==null){if(!bugs.some(b=>b.id===target&&b.hp>0))return false;o.target=target;o.awaitTarget=false}
 if(spec.explicitLimit){o.remaining=Math.max(0,spec.count-o.used);o.continuous=false;o.untilTarget=null;o.untilAll=false;o.seconds=0}
 for(const key of ['untilTarget','untilAll','untilSelected','continuous','seconds','delay','condition'])if(spec[key]!==undefined)o[key]=spec[key];
 msg(o.card.name+' · '+orderLabel(o));updateHud();return true;
}
function targetPendingOrders(target){
 for(const o of [activeOrder,...orderQueue])if(o?.awaitTarget){o.target=target;if(o.untilSelected)o.untilTarget=target;o.awaitTarget=false}
}
function advanceOrder(dt){
 snared=Math.max(0,snared-dt);if(holdTime>0){holdTime=Math.max(0,holdTime-dt);if(!holdTime)movementEnabled=true}
 if(!activeOrder&&orderQueue.length&&!orderQueue[0].awaitConfirm&&!(landingRequested&&layer)&&!techniqueLock&&!transformation&&!attackPoseActive()&&!actionLock&&!moveAnim&&!manualDestination&&holdTime<=0){
  const next=orderQueue.shift();
  if(state==='paused'&&(!next.intent||!['resume','info','cancel'].includes(next.intent.kind))){discardInstructionContext();msg('一時停止中のため指示を終了');return}
  if(next.intent){
   // Actions such as landing, targeting and normal fire occupy the same FIFO
   // as techniques. Their dispatch may clear orders; protect the later batch.
   const later=orderQueue;orderQueue=[];
   if(next.intent.kind!=='automode'&&autoTechniqueMode){autoTechniqueMode=false;updateHud()}
   const ok=dispatchIntent(next.intent,false);orderQueue.push(...later);
   if(!ok)discardInstructionContext();updateHud();return;
  }
  if(autoTechniqueMode&&!next.automaticMode)autoTechniqueMode=false;
  activeOrder=next;
 }
 const o=activeOrder;if(!o)return;
 if(o.condition&&!o.triggered){const v=o.condition.stat==='hp'?hp:energy;if(o.condition.comparison==='lte'?v<=o.condition.value:v>=o.condition.value)o.triggered=true;else return}
 if(o.delay>0){o.delay=Math.max(0,o.delay-dt);return}o.elapsed+=dt;
 if(o.untilTarget&&!bugs.some(b=>b.id===o.untilTarget&&b.hp>0)){const resumeAuto=!!o.card.basic;finishOrder('標的を撃破');if(resumeAuto)attackEnabled=true;return}
 if(o.untilAll&&!bugs.some(b=>b.hp>0)){const resumeAuto=!!o.card.basic;finishOrder('全て撃破');if(resumeAuto&&bugs.some(b=>b.hp>0))attackEnabled=true;return}
 if(o.seconds&&o.elapsed>=o.seconds){finishOrder('指定時間が終了');return}
 if(o.phase==='recover'&&poseTime<=0&&actionLock<=0){clearAttackVisual();if(!o.continuous&&!o.untilTarget&&!o.untilAll&&!o.seconds&&o.remaining<=0){finishOrder();return}o.phase='queued'}
}
function recordOrderUse(c){const o=activeOrder;if(!o||o.card.id!==c.id)return;o.used++;o.remaining=Math.max(0,o.remaining-1);o.phase='recover';o.wait='';if(!c.basic)memoryNumbers[c.file]=c.num}
function orderTarget(o=activeOrder){return o?(bugs.find(b=>b.hp>0&&b.id===(o.untilTarget||o.target))||(!o.untilTarget?automaticTarget():null)):selectedBug()}
function orderReadiness(o,b){
 const c=o.card;if(techniqueUsesLeft(c)<=0)return 'usage';if(o.condition&&!o.triggered)return 'condition';if(o.delay>0)return 'delay';if(energy<c.cost)return 'battery';
 if(groundTrapped()&&c.file!=='wing')return 'hole';if((c.requireGround||c.target==='up')&&layer)return 'land';if((c.requireAir||c.target==='down')&&!layer)return 'air';
 if((cooldowns[c.id]||0)>0||c.basic&&(shotcd>0||autoFireWait>0))return 'cooldown';
 if(c.file==='shield'&&shieldVisualTime>0&&o.used>0)return 'shield';
 const special=tacticalBlock(c);if(special)return special;
 if(c.damage&&!c.drop&&!c.flight){if(!b)return 'target';if(!attackLayerMatches(c,b))return 'altitude';if(!cardReaches(c,b))return 'range'}return '';
}
function announceOrderWait(o,reason){const text=({condition:'指定条件を待機',delay:'開始待ち',battery:'充電不足',hole:'穴から脱出待ち',land:'地上へ移動',air:'空中専用 · 飛行待ち',altitude:'標的と高度が合わない',range:'射程へ接近',opportunity:'射程に入るのを待機',cooldown:'再使用待ち',flight:'飛行中',shield:'防御中',target:'標的待ち'})[reason]||reason;if(o.wait!==reason){o.wait=reason;msg(reason==='opportunity'?o.card.name+'：'+text:text)}setText('autostatus',text)}
