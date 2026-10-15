'use strict';
const tapFamilies=['sword','guns','shield','wing','gravity'];
const stockColors={sword:'#ffcc84',guns:'#8fe6ff',wing:'#c5e7ff',shield:'#ffe16a',area:'#91ffe0',gravity:'#dfb4ff',normal:'#bbd8e5'};
// Row-major order also gives keyboard focus the same order as the visible grid.
const tapCards=tapFamilies.flatMap((file,row)=>[...files[file],...(files.area[row]?[files.area[row]]:[])]);
function techniqueGridPosition(c){return{row:c.file==='area'?c.num:tapFamilies.indexOf(c.file)+1,column:c.file==='area'?4:c.num}}
let targetChoiceKey='',tapSelectionCycle=0;
function techniqueStat(c){return c.reflect?'3秒':c.shield?'耐久'+c.shield:c.flight?'飛行':c.steal?'最大'+c.steal:c.holes?'10秒': '攻撃'+c.damage}
$('techniques').innerHTML=tapCards.map(c=>{const at=techniqueGridPosition(c);return `<button type="button" id="tech-${c.id}" class="technique" data-technique="${c.id}" style="--tech-color:${stockColors[c.file]};${c.file==='area'?'':`--tech-tint:${stockColors[c.file]}20;--tech-border:${stockColors[c.file]}70;`}grid-row:${at.row};grid-column:${at.column}" aria-label="${c.name}、${techniqueStat(c)}、消費${c.cost}%" title="${c.desc} · 消費${c.cost}%" disabled><span class="tech-file">${fileMeta[c.file].jp} ${String(c.num).padStart(3,'0')}</span><strong>${c.name}</strong><small><span>${techniqueStat(c)}</span><span class="tech-cost"><span class="tech-remaining" id="remaining-${c.id}">残3</span>${c.cost}%</span></small><span class="tap-count" id="count-${c.id}"></span></button>`}).join('')+'<button type="button" id="canceltech" class="technique technique-cancel" style="grid-row:5;grid-column:4" aria-label="最後に選んだ未使用の技を1つ取り消す" disabled><span class="tech-file">UNDO</span><strong>Cancel</strong><small>1つ戻す</small></button>';
function tapTechnique(id){
 unlockAudio(true);
 const c=tapCards.find(c=>c.id===id);
 if(!runtimeReady||!c||state!=='target'||phaseTransition)return false;
 if(techniqueSelectionsLeft(c)<=0){msg('同じ技は1バトル3回までだよ。');return false}
 if(energy<c.cost){msg('充電が足りないよ。');return false}
 if(autoTechniqueMode){autoTechniqueMode=false;if(activeOrder?.automaticMode)cancelOrders('アカリの指示へ切り替え')}
 // Target confirmation closes selection even when the player chose zero skills.
 const ok=submitOrder(c,{count:1,target:null,tapSelectionCycle});
 if(ok){msg(c.name+'を登録。');speakAkariTechnique(c);updateHud()}
 return ok;
}
function tapUseStock(){
 unlockAudio(true);if(!runtimeReady||!['battle','lock'].includes(state)||phaseTransition)return false;
 const waiting=waitingRangeOrder();
 if(waiting){
  finishOrder('待機中の技をスキップ');
  if(lastOrderSpec?.orderId===waiting.id)discardInstructionContext();
  autoTechniqueMode=false;stopAkariVoice();
 }
 const next=waiting?orderQueue.find(o=>!o.intent&&!o.automaticMode):orderQueue.find(o=>o.awaitConfirm);
 if(!next){if(!waiting)return false;msg(waiting.card.name+'の待機をキャンセル。');updateHud();return true}
 if(next.awaitConfirm){if(!releaseNextOrder())return false}
 else{msg(next.card.name+'！');updateHud()}
 speakAkariTechnique(next.card);updateHud();return true;
}
function cancelableTechniqueSelection(){
 const candidates=[...orderQueue];
 if(!techniqueLock&&!transformation&&!attackPoseActive())candidates.push(activeOrder);
 return candidates.filter(o=>o&&o.tapSelectionCycle===tapSelectionCycle&&!o.intent&&!o.automaticMode&&o.phase==='queued'&&o.used===0).sort((a,b)=>b.id-a.id)[0]||null;
}
function tapCancel(){
 unlockAudio(true);
 if(!runtimeReady||!['battle','lock','target'].includes(state)||phaseTransition)return false;
 const selected=cancelableTechniqueSelection();if(!selected)return false;
 if(selected===activeOrder)activeOrder=null;
 else orderQueue.splice(orderQueue.indexOf(selected),1);
 targetInstructionCount=Math.max(0,targetInstructionCount-1);
 if(lastOrderSpec?.orderId===selected.id){
  const previous=[activeOrder,...orderQueue].filter(o=>o&&o.tapSelectionCycle===tapSelectionCycle).sort((a,b)=>b.id-a.id)[0];
  lastOrderSpec=previous?{card:previous.card,target:previous.target,orderId:previous.id}:null;
  lastCommandCard=previous?.card||null;receipt=previous?{card:previous.card,until:commandClock+2.4}:null;
 }
 clearQueuedAkariVoice();sfx('move');msg(selected.card.name+'の選択を戻したよ。');updateHud();return true;
}
function tapTarget(number){
 unlockAudio(true);if(!runtimeReady||state!=='target')return false;
 const ok=lockTarget(number);updateTapControls();return ok;
}
function selectTargetAt(x,y){
 if(state!=='target')return false;
 const hits=bugs.filter(b=>b.hp>0&&!b.offscreen).map(b=>{
  const p=bugPosition(b),w=Math.max(24,b.widthTiles?b.widthTiles*57/2:bugTypes[b.type].size*.43),h=bugTypes[b.type].size;
  const badge=targetBadgeBounds(b);
  const inside=x>=p.x-w&&x<=p.x+w&&y>=p.y-h-7&&y<=p.y+20||x>=badge.x&&x<=badge.x+badge.width&&y>=badge.y&&y<=badge.y+badge.height;
  return{b,inside,d:(x-p.x)**2+(y-(p.y-h/2))**2};
 }).filter(hit=>hit.inside).sort((a,b)=>a.d-b.d);
 return hits.length?tapTarget(hits[0].b.id):false;
}
function battlePointAt(clientX,clientY,rect=canvas.getBoundingClientRect()){
 if(!rect.width||!rect.height)return null;
 // object-fit keeps the battle's 16:9 shape when the available height changes.
 const scale=Math.min(rect.width/W,rect.height/H),left=rect.left+(rect.width-W*scale)/2,top=rect.top+(rect.height-H*scale)/2;
 const x=(clientX-left)/scale,y=(clientY-top)/scale;
 return x>=0&&x<=W&&y>=0&&y<=H?{x,y}:null;
}
canvas.addEventListener?.('pointerup',e=>{
 if(state!=='target')return;
 const p=battlePointAt(e.clientX,e.clientY);
 if(p&&selectTargetAt(p.x,p.y))e.preventDefault();
});
function tapLand(){unlockAudio(true);return requestLanding()}

function updateTapControls(){
 const live=runtimeReady&&['battle','lock'].includes(state)&&!phaseTransition;
 const planning=runtimeReady&&state==='target'&&!phaseTransition;
 const items=stockInstructions();
 for(const c of tapCards){
  const remaining=techniqueSelectionsLeft(c),button=$('tech-'+c.id),disabled=!planning||targetInstructionCount>=5||energy<c.cost||remaining<=0;
  if(button.disabled!==disabled)button.disabled=disabled;
  setText('remaining-'+c.id,'残'+remaining);
  button.setAttribute('aria-label',c.name+'、'+techniqueStat(c)+'、消費'+c.cost+'%、選択可能あと'+remaining+'回');
  const count=items.filter(o=>o.card.id===c.id&&o.phase!=='recover').length;
  setText('count-'+c.id,count?String(count):'');
  button.classList.toggle('is-queued',count>0);
 }
 const changing=state==='target',cooldown=Math.ceil(targetChangeRemaining);
 $('targettap').disabled=!live||cooldown>0;
 setText('targettap',cooldown>0?'TARGET '+cooldown:'TARGET');
 const next=orderQueue.find(o=>o.awaitConfirm);
 const waiting=waitingRangeOrder();
 $('canceltech').disabled=!(live||planning)||!cancelableTechniqueSelection();
 $('usestock').disabled=!live||!next&&!waiting;
 $('usestock').setAttribute('aria-label',waiting?waiting.card.name+(orderQueue.some(o=>!o.intent&&!o.automaticMode)?'の待機をやめて次の技を使う':'の待機をキャンセルする'):next?next.card.name+'を使う':'使えるストックなし');
 $('landtap').disabled=!runtimeReady||!['battle','target','lock'].includes(state)||!(layer||landingRequested||items.some(o=>o.card.file==='wing'));
 $('landtap').setAttribute('aria-label',landingRequested?'着地指示を受付済み':'地上へ着地する');
 $('autotap').disabled=!live;$('autotap').setAttribute('aria-pressed',String(autoTechniqueMode));
 setText('autotap',autoTechniqueMode?'オート ON':'オート');
 $('targetchoices').classList.toggle('hidden',!changing);
 $('targetchoices').parentElement?.classList.toggle('targeting',changing);
 const alive=bugs.filter(b=>b.hp>0),key=alive.map(b=>b.id+':'+Math.ceil(b.hp)).join(',');
 if(key!==targetChoiceKey){
  targetChoiceKey=key;
  $('targetchoices').innerHTML=alive.map(b=>`<button type="button" id="target-${b.id}" aria-label="${numberLabel(b.id)}、HP ${Math.ceil(b.hp)}を狙う"><span>${numberLabel(b.id)}</span><small>HP ${Math.ceil(b.hp)}</small></button>`).join('');
  for(const b of alive)$('target-'+b.id).onclick=()=>tapTarget(b.id);
 }
}
for(const c of tapCards)$('tech-'+c.id).onclick=()=>tapTechnique(c.id);
$('targettap').onclick=()=>{unlockAudio(true);beginTarget()};
$('usestock').onclick=tapUseStock;
$('canceltech').onclick=tapCancel;
$('landtap').onclick=tapLand;
$('autotap').onclick=()=>{
 unlockAudio(true);if(!['battle','lock'].includes(state))return;
 if(autoTechniqueMode){autoTechniqueMode=false;if(activeOrder?.automaticMode)cancelOrders('オートモード終了');msg('アカリの指示を待つよ。')}
 else dispatchIntent({kind:'automode'},false);
 updateHud();
};
const tapHud=updateHud;updateHud=function(){tapHud();updateTapControls()};
const tapReset=reset;reset=function(...args){stopAkariVoice();targetChoiceKey='';tapSelectionCycle++;const result=tapReset(...args);prepareAkariVoice();return result};
const tapBeginTarget=beginTarget;beginTarget=function(){const previous=state,ok=tapBeginTarget();if(ok&&previous!=='target'){tapSelectionCycle++;clearQueuedAkariVoice()}updateTapControls();return ok};
const tapCheckEnd=checkEnd;checkEnd=function(){const previous=state;tapCheckEnd();if(previous==='battle'&&['win','lose'].includes(state))clearQueuedAkariVoice()};
const tapPause=pause;pause=function(){const result=tapPause();if(state==='paused')stopAkariVoice();return result};

function stockInstructions(){return [activeOrder,...orderQueue].filter(o=>o&&!o.intent&&!o.automaticMode)}
function drawStockSymbol(c,x,y){
 const color=stockColors[c.file]||'#bbd8e5';g.fillStyle=color;g.strokeStyle=color;g.lineWidth=2;
 switch(c.file){
 case 'sword':poly([[x+9,y+19],[x+18,y+5],[x+20,y+9],[x+12,y+21]],color);g.fillRect(x+6,y+17,9,2);g.fillRect(x+7,y+20,3,4);break;
 case 'guns':case 'normal':g.fillRect(x+6,y+10,15,6);g.fillRect(x+17,y+9,6,3);g.fillRect(x+8,y+15,4,7);g.fillStyle='#163442';g.fillRect(x+18,y+12,3,2);break;
 case 'wing':poly([[x+13,y+18],[x+4,y+6],[x+5,y+16],[x+10,y+21]],color);poly([[x+15,y+18],[x+24,y+6],[x+23,y+16],[x+18,y+21]],color);break;
 case 'shield':poly([[x+7,y+7],[x+21,y+7],[x+20,y+18],[x+14,y+23],[x+8,y+18]],color);g.fillStyle='#173e39';g.fillRect(x+13,y+10,2,9);g.fillRect(x+10,y+13,8,2);break;
 case 'area':for(let r=0;r<2;r++)for(let k=0;k<3;k++)g.fillRect(x+5+k*7,y+8+r*8,5,6);g.fillStyle='#fff3c8';g.fillRect(x+11,y+4,8,2);g.fillRect(x+17,y+3,2,4);break;
 case 'gravity':poly([[x+7,y+9],[x+14,y+5],[x+21,y+9],[x+14,y+13]],color);g.fillRect(x+8,y+10,12,8);g.fillRect(x+13,y+19,2,4);g.fillRect(x+10,y+21,8,2);break;
 }
}
function stockText(t,x,y,color,size=10){g.font='bold '+size+'px monospace';g.textAlign='left';g.lineWidth=3;g.strokeStyle='#03111c';g.strokeText(t,x,y);g.fillStyle=color;g.fillText(t,x,y)}
function drawInstructionStock(){
 const planning=state==='target'||state==='paused'&&beforePause==='target',items=planning?orderQueue.filter(o=>o&&!o.intent&&!o.automaticMode):stockInstructions();if(!items.length&&!planning)return;g.save();
 const slots=planning?5:Math.min(5,items.length);
 for(let i=0;i<slots;i++){const o=items[i],x=12+i*32,y=8,live=o&&o===activeOrder;g.fillStyle=live?'#21464be8':'#081c2de8';g.fillRect(x,y,28,28);g.strokeStyle=live?'#d5ffe3':o?'#95f8dd':'#47616d';g.lineWidth=1;g.strokeRect(x+.5,y+.5,27,27);if(o){drawStockSymbol(o.card,x,y);stockText(String(o.card.num).padStart(3,'0'),x+12,y+25,'#e9fbf8',7)}if(i===0&&o){g.fillStyle='#ffd79c';g.fillRect(x,y-2,28,2)}}
 const c=items[0]?.card;if(c){stockText(c.name,12,49,'#eefcf9',10);stockText('攻撃 '+(c.damage||0)+' / 消費 '+c.cost+'%',12,62,'#ffdca7',9)}else stockText('ストック 0 / 5',12,49,'#b4ced5',10);
 if(items.length>5)stockText('+'+(items.length-5),174,26,'#eafcf5',9);g.restore();
}
window.zeroBattle={...window.zeroBattle,reset,tapTechnique,tapUseStock,tapCancel,tapTarget,selectTargetAt,tapLand,
 readAudio:()=>({context:audio?.state||'not-started',session:globalThis.navigator?.audioSession?.state||'unsupported',type:globalThis.navigator?.audioSession?.type||'unsupported',resumePending:!!audioResumePending,musicPaused:battleMusic?.paused??true,volume:battleMusic?.volume??null,akariVoices:akariVoiceSources.size}),
 readCommand:()=>({target:targetId,pinned:targetPinned,targetChangeRemaining,targetInstructionCount,landingRequested,
  order:activeOrder?{card:activeOrder.card.id,remaining:activeOrder.remaining,used:activeOrder.used,phase:activeOrder.phase,wait:activeOrder.wait}:null,
  queue:orderQueue.map(o=>({card:o.card.id,awaitConfirm:!!o.awaitConfirm,remaining:o.remaining})),history:orderHistory})};
updateTapControls();
