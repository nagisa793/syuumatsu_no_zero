'use strict';

// One ownership map shared by the two 3 × 3 layers. Holes affect ground only.
let panelOwners=Array.from({length:18},(_,i)=>i%6<3?'zero':'bugs');
let panelHoles=new Map(),panelChanges=[],capturedPanels=new Map(),nextAttackPower=1,gravityDrops=[],panicAnnounced=false;
const cellId=(c,r)=>r*6+c;
function resetField(){panelOwners=Array.from({length:18},(_,i)=>i%6<3?'zero':'bugs');panelHoles=new Map();panelChanges=[];capturedPanels=new Map();nextAttackPower=1;gravityDrops=[];panicAnnounced=false}
function isHole(c,r){return (panelHoles.get(cellId(c,r))||0)>0}
function groundTrapped(){return layer===0&&isHole(col,row)}
function canUsePanel(team,c,r,l=0){return c>=0&&c<6&&r>=0&&r<3&&panelOwners[cellId(c,r)]===team&&(l===1||!isHole(c,r))}
function bugCanFly(b){return b.type==='bee'||b.type==='fly'}
function bugCells(b,c=b.c,r=b.r){return Array.from({length:b.widthTiles||1},(_,i)=>({c:c+i,r}))}
function panelOccupied(c,r){
 if(col===c&&row===r||moveAnim?.sourceC===c&&moveAnim?.sourceR===r)return true;
 return bugs.some(b=>b.hp>0&&(bugCells(b).some(p=>p.c===c&&p.r===r)||b.motion&&bugCells(b,b.motion.c,b.motion.r).some(p=>p.c===c&&p.r===r)));
}
function areaCandidates(card){
 const owner=card.steal?'bugs':'zero',cells=[];
 // Resolve the leading enemy column BEFORE occupancy filtering. Never skip it.
 const frontier=card.steal?[0,1,2,3,4].find(c=>[0,1,2].some(r=>panelOwners[cellId(c,r)]==='bugs')):null;
 for(let r=0;r<3;r++)for(let c=0;c<6;c++)if((!card.steal||c===frontier)&&panelOwners[cellId(c,r)]===owner&&!panelOccupied(c,r))cells.push({c,r});
 const aim=selectedBug()?.r??row;
 cells.sort((a,b)=>card.steal?(a.c-b.c)||Math.abs(a.r-aim)-Math.abs(b.r-aim):b.c-a.c||Math.abs(a.r-row)-Math.abs(b.r-row));
 return cells;
}
function tacticalBlock(card){
 if(groundTrapped()&&card.file!=='wing')return '穴から動けない！ ウィングで脱出して！';
 if(card.file==='area'){
  if(card.areaHeal&&hp>=MAX_HP)return 'HPは満タンだよ';
  if(card.holes){if(panelHoles.size)return 'パネルの復旧を待って';return ''}
  const count=card.steal||card.give;
  const available=areaCandidates(card).length;
  if(card.steal&&!available)return '最前列に奪える空きパネルがないよ';
  if(!card.steal&&available<count)return `交換できる空きパネルが${count}マス必要だよ`;
  if(panelOwners.filter(o=>o===(card.steal?'bugs':'zero')).length<=Math.min(count,available))return '最後の1マスは残してね';
 }
 if(card.drop&&!bugs.some(b=>b.hp>0))return '標的がいないよ';
 return '';
}
function consumeAttackPower(damage){const power=nextAttackPower;nextAttackPower=1;return Math.round(damage*power*(boost>0?2:1))}
function applyArea(card){
 if(card.holes){
  for(let r=0;r<3;r++)for(let c=0;c<6;c++)if(!panelOccupied(c,r))panelHoles.set(cellId(c,r),card.holes);
  msg('ホールアウト！ 空きパネルが10秒間、穴になるよ。');return;
 }
 const cells=areaCandidates(card).slice(0,card.steal||card.give);
 for(const p of cells){const id=cellId(p.c,p.r);panelOwners[id]=card.steal?'zero':'bugs';if(card.steal)capturedPanels.set(id,15);else capturedPanels.delete(id);panelChanges.push({...p,life:.8,owner:card.steal?'zero':'bugs'})}
 if(card.areaHeal){hp=Math.min(MAX_HP,hp+card.areaHeal);effects.push({kind:'heal',...pos(col,row,layer),life:.7,max:.7})}
 if(card.nextPower)nextAttackPower=card.nextPower;
 msg(card.steal?`${cells.length}マス奪取！ 青いパネルへ移動できるよ。`:card.areaHeal?`${cells.length}マス譲渡。HPを${card.areaHeal}回復！`:`${cells.length}マス譲渡。次の攻撃1回が${card.nextPower}倍！`);
}
function gravityCells(card,b){
 const candidates=card.dropShape==='all'?Array.from({length:18},(_,i)=>[i%6,Math.floor(i/6)]):card.dropShape==='column'?[[b.c,0],[b.c,1],[b.c,2]]:card.dropShape==='line'?[[b.c-1,b.r],[b.c,b.r],[b.c+1,b.r]]:card.dropShape==='cross'?[[b.c,b.r],[b.c-1,b.r],[b.c+1,b.r],[b.c,b.r-1],[b.c,b.r+1]]:[[b.c,b.r]];
 return candidates.filter(([c,r])=>c>=0&&c<6&&r>=0&&r<3&&(card.dropShape!=='all'||panelOwners[cellId(c,r)]==='bugs')).map(([c,r])=>({c,r}));
}
function startGravity(card){
 const target=orderTarget()||bugs.find(b=>b.hp>0);if(!target)return;
 const cells=gravityCells(card,target),damage=consumeAttackPower(card.damage);
 gravityDrops.push({num:card.num,c:target.c,r:target.r,cells,damage,stun:card.stun||0,age:0,duration:1.12,hit:new Set(),impact:false});
 pose='gravity';poseTime=.45;actionLock=Math.max(actionLock,.3);
 msg(`GRAVITY ${String(card.num).padStart(3,'0')}、${card.name}！`);
}
function checkGroundTrap(){
 if(groundTrapped()){
  holding=false;charge=0;pendingMove=pendingShot=null;
  if(!panicAnnounced){panicAnnounced=true;msg('ゼロ「このままじゃ落ちちゃうよ！」 ウィングで飛ぶか、パネルの復旧を待って！');sfx('hurt')}
 }else if(panicAnnounced){panicAnnounced=false;msg(layer?'ウィングで脱出！':'パネル復旧！ 動けるようになったよ。')}
}
function tickField(dt){
 for(const [id,remaining] of panelHoles){const next=remaining-dt;if(next<=1e-8)panelHoles.delete(id);else panelHoles.set(id,next)}
 const frontColumn=Math.max(-1,...Array.from(capturedPanels.keys(),id=>id%6));
 for(const [id,remaining] of capturedPanels){
  // Rear columns wait at the start of their warning phase until the front is returned.
  capturedPanels.set(id,id%6===frontColumn?Math.max(0,remaining-dt):Math.max(5,remaining-dt));
 }
 // Expired enemy columns stay captured until Zero withdraws. A column behind
 // Zero cannot revert either, so there is always a continuous retreat path.
 const protectedColumn=col>=3?col:-1;
 for(const [id,remaining] of capturedPanels){
  const c=id%6,r=Math.floor(id/6);
  if(panelOwners[id]!=='zero'){capturedPanels.delete(id);continue}
  if(c===frontColumn&&remaining<=0&&(protectedColumn<3||c>protectedColumn)&&!(moveAnim?.sourceC===c&&moveAnim?.sourceR===r)){
   panelOwners[id]='bugs';capturedPanels.delete(id);panelChanges.push({c,r,life:.8,owner:'bugs'});
  }
 }
 for(const p of panelChanges)p.life-=dt;panelChanges=panelChanges.filter(p=>p.life>0);
 checkGroundTrap();
 for(const drop of gravityDrops){
  drop.age+=dt;
  // Air and ground are struck at different heights by the same physical drop.
  for(const b of bugs){
   const arrival=b.layer?.64:.92;
   if(b.hp>0&&!drop.hit.has(b.id)&&drop.age>=arrival&&drop.age<arrival+.14&&drop.cells.some(p=>bugCells(b).some(q=>p.c===q.c&&p.r===q.r))){
    drop.hit.add(b.id);hit(b,drop.damage);b.stun=Math.max(b.stun||0,drop.stun);
   }
  }
  if(!drop.impact&&drop.age>=.92){drop.impact=true;screenShake=Math.max(screenShake,5);sfx('explode');for(const p of drop.cells)effects.push({kind:'gravityImpact',...pos(p.c,p.r),life:.42,max:.42})}
 }
 gravityDrops=gravityDrops.filter(d=>d.age<d.duration);
}

function drawFieldEffects(){
 for(const p of panelChanges){g.save();g.globalAlpha=p.life;panel(p.c,p.r,p.owner==='zero'?'#99ffe998':'#ff9d9f98','#e7fff7');g.restore()}
 for(const drop of gravityDrops){
  for(const p of drop.cells){const ground=pos(p.c,p.r),air=pos(p.c,p.r,1);ring(ground.x,ground.y+8,20,'#ffe196',.7);if(drop.age<.64){ring(air.x,air.y+8,16,'#d8b1ff',.9);g.fillStyle='#ffe095';g.fillRect(air.x-1,air.y-10,2,11)}}
  if(drop.age<.3)continue;
  const p=pos(drop.c,drop.r),airY=pos(drop.c,drop.r,1).y-20,groundY=p.y-20;
  const t=Math.max(0,Math.min(1,(drop.age-.3)/.34));
  const y=drop.age<.64?-50+(airY+50)*t*t:airY+(groundY-airY)*Math.min(1,(drop.age-.64)/.28);
  // A single-cell drop fills the projected cell's 57 px horizontal span.
  const frame=animationSheets.gravity?.frames[drop.num-1],width=58,height=frame?Math.ceil(frame.height*width/frame.width):120;
  if(drop.age<1.02){g.save();g.globalAlpha=Math.min(1,(1.02-drop.age)*10);drawEquipment('gravity',drop.num,p.x,y,width,height,1,1,drop.num===1?0:Math.PI);g.restore()}
 }
 if(groundTrapped()){
  const p=pos(col,row),x=Math.max(91,Math.min(385,p.x));
  g.fillStyle='#25172bea';g.fillRect(x-86,p.y-95,172,21);
  textPixel('このままじゃ落ちちゃうよ！',x,p.y-81,'#ffe0a0',10,'center');
 }
}
