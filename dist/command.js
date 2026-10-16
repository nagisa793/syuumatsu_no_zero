'use strict';

// Shared targeting, HUD and microphone delivery. Orders and interpretation are separate modules.
const bugNames={bee:'STINGER',fly:'DRIFTER',spider:'CRAWLER'};
let automationEnabled=true,enemyAutomationEnabled=true,autoTechniqueMode=false,targetId=null,targetPinned=false;
let targetChangeRemaining=0,targetInstructionCount=0,landingRequested=false;
let commandClock=0,lockAge=0,lockPulse=0,pendingTechnique=null,receipt=null,lastCommandCard=null,autoThink=0,autoMoveWait=0,autoFireWait=.7,autoShots=0;
let voiceFile=null,voiceFileUntil=0;
const voiceWanted=false;
const numberLabel=n=>'No.'+String(n).padStart(3,'0');
const animationTick=tick,animationReset=reset,animationHud=updateHud;

function selectedBug(){return bugs.find(b=>b.id===targetId&&b.hp>0)||null}
function automaticTarget(){
 const chosen=selectedBug();if(chosen&&targetPinned)return chosen;
 if(targetPinned&&!chosen){msg('標的を削除。次の指示まで周囲を警戒するよ。');targetPinned=false}
 const alive=bugs.filter(b=>b.hp>0),cards=equippedAttackCandidates();
 const mismatch=b=>cards.length?!cards.some(c=>attackLayerMatches(c,b)):b.layer!==layer;
 const score=b=>mismatch(b)*18+Math.abs(b.r-row)*2+b.c-(chosen===b?2:0);
 alive.sort((a,b)=>score(a)-score(b));
 targetId=alive[0]?.id??null;return alive[0]||null;
}
reset=function(){
 landingRequested=false;targetChangeRemaining=targetInstructionCount=0;targetId=null;targetPinned=false;autoTechniqueMode=false;pendingTechnique=null;receipt=null;lastCommandCard=null;lockAge=lockPulse=commandClock=0;autoThink=autoMoveWait=autoShots=0;autoFireWait=.7;
 resetEquipment();animationReset();
 bugs.forEach((b,i)=>Object.assign(b,{id:i+1,canFly:bugCanFly(b),decision:.2+i*.17,stepWait:.8+i*.2,cycle:0,burst:0,evadeWait:0,aimRow:b.r,targetLayer:b.layer}));
 automaticTarget();updateHud();
};
updateHud=function(){animationHud()};

function beginTarget(){
 if(!['battle','target','lock'].includes(state))return false;
 state='target';lockAge=0;voiceFile=null;holding=false;charge=0;pendingMove=pendingShot=null;keys.clear();stopVoices();
 msg('TARGET');sfx('select');updateHud();return true;
}
function cancelTarget(){if(!['target','lock'].includes(state))return false;state='battle';lockAge=0;msg('標的選択を解除。戦闘を再開するよ。');updateHud();return true}
function lockTarget(num){
 const b=bugs.find(b=>b.id===num&&b.hp>0);if(!b){msg('その番号のバグはいないよ。');return false}
 if(state!=='target'){
  if(targetChangeRemaining>1e-8){msg('標的の変更まであと'+Math.ceil(targetChangeRemaining)+'秒。');return false}
  if(!beginTarget())return false;
 }
 targetPendingOrders(num);targetId=num;targetPinned=true;targetChangeRemaining=10;
 state='lock';lockAge=0;lockPulse=1.3;autoThink=0;autoFireWait=Math.max(.15,autoFireWait);
 msg(numberLabel(num)+'を狙って！');sfx('ready');updateHud();return true;
}

function normalizedCommand(raw){return String(raw).normalize('NFKC').toLowerCase().replace(/[\s、。・,.;；:：!！?？「」『』―ー-]/g,'')}
let spokenNumber,parseCommand,runCommand;
function commandFeedback(text){msg(text)}
let cardReaches,nextAutoStep,autoBattle,bugPosition,bugShot,tickBugs;
function tileDanger(c,r,l=layer){
 let danger=0;
 for(const b of bugs)if(b.hp>0&&b.attackMotion?.kind==='web'&&r===b.attackMotion.r&&l===0&&c<b.c)danger+=12;
 if(typeof bugBombs!=='undefined')for(const p of bugBombs)if(!p.hit&&p.c===c&&p.r===r&&p.layer===l)danger+=12;
 for(const b of bugs)if(b.attackMotion?.c===c&&b.attackMotion.r===r&&b.attackMotion.layer===l)danger+=10;
 for(const p of bullets)if(p.enemy&&p.layer===l&&p.r===r&&p.c>c-.35){const eta=(p.c-c)/p.speed;if(eta<.65)danger+=10*Math.max(.15,1-eta/.8)}
 for(const b of bugs)if(b.hp>0&&b.tell>0&&b.targetLayer===l&&b.aimRow===r){const eta=b.tell+(b.c-c)/5;if(eta<1.1)danger+=4*(1-eta/1.3)}
 return danger;
}
function bugCanMove(b,c,r,l=b.layer){return (!l||bugCanFly(b))&&bugCells(b,c,r).every(p=>canUsePanel('bugs',p.c,p.r,l)&&!bugs.some(o=>o!==b&&o.hp>0&&o.layer===l&&(bugCells(o).some(q=>q.c===p.c&&q.r===p.r)||o.motion&&bugCells(o,o.motion.c,o.motion.r).some(q=>q.c===p.c&&q.r===p.r))))}
function moveBug(b,c,r,l=b.layer){if((typeof spiderBind!=='undefined'&&spiderBind?.source===b.id&&spiderBind.releaseAge===null)||!bugCanMove(b,c,r,l)||b.motion)return false;b.motion={from:{x:bugPosition(b).x-(bugWidth(b)-1)*76/2,y:bugPosition(b).y},c:b.c,r:b.r,layer:b.layer,age:0,duration:l!==b.layer?.34:b.type==='spider'?.3:b.type==='beetle'?.32:.26};b.c=c;b.r=r;b.layer=l;return true}

function targetBracket(b,color,expanded=0){
 const p=bugPosition(b),w=b.widthTiles?b.widthTiles*57/2:bugTypes[b.type].size*.43,h=bugTypes[b.type].size-4,x=Math.round(p.x-w-expanded),y=Math.round(p.y-h-4-expanded),ww=(w+expanded)*2,hh=h+20+expanded*2;
 g.strokeStyle=color;g.lineWidth=1.5;g.beginPath();for(const [xx,yy,dx,dy] of [[x,y,1,1],[x+ww,y,-1,1],[x,y+hh,1,-1],[x+ww,y+hh,-1,-1]]){g.moveTo(xx+dx*9,yy);g.lineTo(xx,yy);g.lineTo(xx,yy+dy*8)}g.stroke();
}
function targetBadgeBounds(b){
 const p=bugPosition(b);
 return{x:Math.round(Math.max(34,Math.min(W-34,p.x)))-33,y:Math.round(Math.max(26,Math.min(H-21,p.y+18))),width:66,height:19};
}
function drawTargetTitle(){
 const glyphs={T:['11111','00100','00100','00100','00100','00100','00100'],A:['01110','11011','11011','11111','11011','11011','11011'],R:['11110','11011','11011','11110','11100','11010','11011'],G:['01111','11000','11000','11011','11011','11011','01110'],E:['11111','11000','11000','11110','11000','11000','11111']};
 g.save();g.fillStyle=state==='lock'?'#b5ffe2':'#f4ffff';
 for(const [n,letter] of [...'TARGET'].entries())for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(glyphs[letter][y][x]==='1')g.fillRect(64+n*24+x*4+Math.floor((6-y)*.6),80+y*4,4,4);
 g.restore();
}
function drawCommandOverlay(){
 const selecting=state==='target'||state==='lock'||(state==='paused'&&['target','lock'].includes(beforePause));
 if(selecting){
  g.save();g.globalCompositeOperation='multiply';g.fillStyle='#797979';g.fillRect(0,0,W,H);g.restore();
  drawTargetTitle();
  const targets=bugs.filter(b=>b.hp>0&&!b.offscreen).sort((a,b)=>actorGroundAnchor(a).y-actorGroundAnchor(b).y);
  for(const b of targets){const chosen=b.id===targetId&&state==='lock',p=bugPosition(b),blink=chosen&&Math.floor(lockAge*9)%2===0;
   drawBugAnimated(b,p.x,p.y+12,bugTypes[b.type].size,blink);
   targetBracket(b,chosen?'#bcffde':'#a6b6c0',chosen?Math.max(0,7-lockAge*10):0);
   const badge=targetBadgeBounds(b),x=badge.x+badge.width/2,y=badge.y;
   g.fillStyle=chosen?'#b1ffe0':'#10283af2';g.fillRect(badge.x,y,badge.width,badge.height);
   g.strokeStyle=chosen?'#defff0':'#668f9d';g.lineWidth=1;g.strokeRect(badge.x+.5,y+.5,badge.width-1,badge.height-1);
   textPixel(numberLabel(b.id),x,y+14,chosen?'#092025':'#e8fbff',12,'center');
  }

 }else if(state==='battle'){
  const b=selectedBug();if(b&&targetPinned){targetBracket(b,lockPulse>0&&Math.floor(lockPulse*8)%2?'#ffffff':'#9df6d6',lockPulse>0?2:0)}

 }
}

// Native keyboard dictation writes directly into the Akari input. The game
// does not capture microphone audio or create a browser speech recognizer.
let startRequested=false;
function launchBattle(){const fromHome=state==='start';startRequested=false;reset();if(fromHome)beginHomeIntro()}
function beginBattle(){
 if(state==='start'&&typeof openingBlocksHome==='function'&&openingBlocksHome())return;
 if(state==='intro')return;
 if(assetFailed){$('reload').classList.remove('hidden');return}
 unlockAudio(true);
 if(!runtimeReady||!startReady){startRequested=true;syncLoadingGauge();return}
 launchBattle();
}
function startWhenReady(){if(runtimeReady&&startReady&&!assetFailed&&startRequested&&state==='start')launchBattle()}
$('begin').onclick=beginBattle;$('retry').onclick=beginBattle;$('restartPause').onclick=beginBattle;
$('pause').onclick=()=>pause();$('resume').onclick=resumeBattle;
function drawCommandReceipt(){if(typeof drawInstructionStock==='function')drawInstructionStock()}
