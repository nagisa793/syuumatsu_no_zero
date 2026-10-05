'use strict';

// Shared targeting, HUD and microphone delivery. Orders and interpretation are separate modules.
const bugNames={bee:'STINGER',fly:'DRIFTER',spider:'CRAWLER'};
let automationEnabled=true,enemyAutomationEnabled=true,autoTechniqueMode=false,targetId=null,targetPinned=false;
let commandClock=0,lockAge=0,lockPulse=0,pendingTechnique=null,receipt=null,lastCommandCard=null,autoThink=0,autoMoveWait=0,autoFireWait=.7,autoShots=0;
let recognition=null,listening=false,voiceFile=null,voiceFileUntil=0,voiceWanted=false,voiceEpoch=0,voiceRetry=null,voiceFailures=0;
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
 targetId=null;targetPinned=false;autoTechniqueMode=false;pendingTechnique=null;receipt=null;lastCommandCard=null;lockAge=lockPulse=commandClock=0;autoThink=autoMoveWait=autoShots=0;autoFireWait=.7;
 resetEquipment();animationReset();
 bugs.forEach((b,i)=>Object.assign(b,{id:i+1,canFly:bugCanFly(b),decision:.2+i*.17,stepWait:.8+i*.2,cycle:0,burst:0,evadeWait:0,aimRow:b.r,targetLayer:b.layer}));
 automaticTarget();updateHud();
};
updateHud=function(){
 animationHud();const b=selectedBug();
 setText('targetlabel',state==='target'?'SELECT':b?(targetPinned?'':'AUTO / ')+numberLabel(b.id):'—');
 const card=pendingTechnique?.card||transformation?.card||lastCommandCard;
 setText('equippedcode',card?`FILE ${fileMeta[card.file].label} / ${String(card.num).padStart(3,'0')}`:'FILE STANDBY');
 setText('equippedname',card?card.name:'音声でファイルを転送');
 setText('equippedstate',transformation?'展開中':pendingTechnique?'転送待機':card?`${card.cost}% / ${card.file==='wing'?'発動':'1回'}`:'');
 setText('loadoutlabel',[...Object.values(loadout).filter(Boolean).map(c=>fileMeta[c.file].label+' '+String(c.num).padStart(3,'0')),nextAttackPower>1?'次の攻撃 ×'+nextAttackPower:'',groundTrapped()?'移動・攻撃不能':''].filter(Boolean).join(' / '));
 if(state==='target')setText('autostatus','TARGET');else if(state==='lock')setText('autostatus','標的を確認');
 else if(state==='paused')setText('autostatus','一時停止');else if(state==='start')setText('autostatus','指示待機');
 else if(state==='win'||state==='lose')setText('autostatus',state==='win'?'戦闘終了':'リンク切断');
 else if(autoTechniqueMode)setText('autostatus','オートモード · 技を選択中');
};

function beginTarget(){
 if(!['battle','target','lock'].includes(state))return false;
 state='target';lockAge=0;voiceFile=null;holding=false;charge=0;pendingMove=pendingShot=null;keys.clear();stopVoices();
 msg('TARGET');sfx('select');updateHud();return true;
}
function cancelTarget(){if(!['target','lock'].includes(state))return false;state='battle';lockAge=0;msg('標的選択を解除。戦闘を再開するよ。');updateHud();return true}
function lockTarget(num){
 const b=bugs.find(b=>b.id===num&&b.hp>0);if(!b){msg('その番号のバグはいないよ。表示されている番号を指定してね。');return false}
 targetId=num;targetPinned=true;state='lock';lockAge=0;lockPulse=1.3;autoThink=0;autoFireWait=Math.max(.15,autoFireWait);
 msg(`${numberLabel(num)}、${bugNames[b.type]}をロック。`);sfx('ready');updateHud();return true;
}

function normalizedCommand(raw){return String(raw).normalize('NFKC').toLowerCase().replace(/[\s、。・,.;；:：!！?？「」『』―ー-]/g,'')}
let spokenNumber,parseCommand,runCommand;
function commandFeedback(text){$('voicestatus').textContent=text}
let cardReaches,nextAutoStep,autoBattle,bugPosition,bugShot,tickBugs;
function tileDanger(c,r,l=layer){
 let danger=0;
 for(const p of bullets)if(p.enemy&&p.layer===l&&p.r===r&&p.c>c-.35){const eta=(p.c-c)/p.speed;if(eta<.65)danger+=10*Math.max(.15,1-eta/.8)}
 for(const b of bugs)if(b.hp>0&&b.tell>0&&b.targetLayer===l&&b.aimRow===r){const eta=b.tell+(b.c-c)/5;if(eta<1.1)danger+=4*(1-eta/1.3)}
 return danger;
}
function bugCanMove(b,c,r,l=b.layer){return (!l||bugCanFly(b))&&bugCells(b,c,r).every(p=>canUsePanel('bugs',p.c,p.r,l)&&!bugs.some(o=>o!==b&&o.hp>0&&o.layer===l&&(bugCells(o).some(q=>q.c===p.c&&q.r===p.r)||o.motion&&bugCells(o,o.motion.c,o.motion.r).some(q=>q.c===p.c&&q.r===p.r))))}
function moveBug(b,c,r,l=b.layer){if(!bugCanMove(b,c,r,l)||b.motion)return false;b.motion={from:{x:bugPosition(b).x-((b.widthTiles||1)-1)*76/2,y:bugPosition(b).y},c:b.c,r:b.r,age:0,duration:l!==b.layer?.34:b.type==='spider'?.3:.22};b.c=c;b.r=r;b.layer=l;return true}

function targetBracket(b,color,expanded=0){
 const p=bugPosition(b),w=b.widthTiles?b.widthTiles*57/2:bugTypes[b.type].size*.43,h=bugTypes[b.type].size-4,x=Math.round(p.x-w-expanded),y=Math.round(p.y-h-4-expanded),ww=(w+expanded)*2,hh=h+20+expanded*2;
 g.strokeStyle=color;g.lineWidth=1.5;g.beginPath();for(const [xx,yy,dx,dy] of [[x,y,1,1],[x+ww,y,-1,1],[x,y+hh,1,-1],[x+ww,y+hh,-1,-1]]){g.moveTo(xx+dx*9,yy);g.lineTo(xx,yy);g.lineTo(xx,yy+dy*8)}g.stroke();
}
function drawCommandOverlay(){
 const selecting=state==='target'||state==='lock'||(state==='paused'&&['target','lock'].includes(beforePause));
 if(selecting){
  g.save();g.globalCompositeOperation='multiply';g.fillStyle='#646464';g.fillRect(0,0,W,H);g.restore();
  g.fillStyle='#07121ec9';g.fillRect(12,28,164,38);textPixel(state==='lock'?'TARGET LOCK':'TARGET',94,53,state==='lock'?'#a5ffe3':'#edf4ed',22,'center');
  for(const b of bugs)if(b.hp>0){const chosen=b.id===targetId&&state==='lock',p=bugPosition(b),blink=chosen&&Math.floor(lockAge*9)%2===0;
   if(blink)drawBugAnimated(b,p.x,p.y+12,bugTypes[b.type].size,true);
   targetBracket(b,chosen?'#bcffde':'#a6b6c0',chosen?Math.max(0,7-lockAge*10):0);
   const x=Math.max(34,Math.min(W-36,p.x)),y=Math.min(H-24,p.y+28);
   g.fillStyle=chosen?'#b1ffe0':'#152c3e';g.fillRect(Math.round(x-29),Math.round(y-10),58,14);
   textPixel(numberLabel(b.id),x,y+1,chosen?'#092025':'#f4f6ed',10,'center');
  }

 }else if(state==='battle'){
  const b=selectedBug();if(b&&targetPinned){targetBracket(b,lockPulse>0&&Math.floor(lockPulse*8)%2?'#ffffff':'#9df6d6',lockPulse>0?2:0)}

 }
}

// Gather results into one instruction. A complete number can finish promptly,
// even on browsers that omit the speechend event. New words reset the timer.
let voiceCommitTimer=null,voiceFragments=[],voiceCurrentParts=[],voiceInterimText='',voiceSpeaking=false,voiceMarkConsumed=()=>{};
function cancelVoiceCommit(){clearTimeout(voiceCommitTimer);voiceCommitTimer=null}
function clearVoiceUtterance(){cancelVoiceCommit();voiceMarkConsumed();voiceFragments=[];voiceCurrentParts=[];voiceInterimText='';voiceSpeaking=false}
function rawVoiceText(){return [...voiceFragments,...voiceCurrentParts].filter(Boolean).join(' ').trim()}
function currentVoiceText(){return correctVoiceCommand(rawVoiceText())}
function voiceControl(text){
 const command=normalizedCommand(text);
 if(/(?:リセット|りせっと|reset)$/.test(command)){
  clearVoiceUtterance();voiceFile=null;voiceFileUntil=0;musicSpeaking=false;commandFeedback('聞き取りを消去しました');return true;
 }
 if(/(?:エンタ|えんた|enter)$/.test(command)){
  const instruction=text.replace(/(?:エン\s*ター?|えん\s*たー?|enter)[\s、。!！?？]*$/i,'').trim();
  clearVoiceUtterance();musicSpeaking=false;
  if(instruction)runCommand(instruction);
  else commandFeedback('指示を聞いています');
  return true;
 }
 return false;
}
function voiceInstructionReady(text){
 if(!text||/(?:no|number|ナンバ|なんば|番号|ファイル|file|を|に|まで|それから|その後)$/i.test(normalizedCommand(text)))return false;
 const intents=splitInstructions(text).map(interpretInstruction);
 return intents.length>0&&intents.every(intent=>!['empty','clarify'].includes(intent.kind));
}
function scheduleVoiceCommit(epoch,ended=false){
 cancelVoiceCommit();const text=currentVoiceText();if(!text)return;
 if(voiceControl(text))return;
 const ready=voiceInstructionReady(text);
 // Interim hypotheses remain provisional while speech continues; final numeric
 // instructions need a short grace period for trailing counts and conditions.
 if(!ready&&voiceInterimText)return;
 const kind=ready?interpretInstruction(text).kind:null;
 const delay=ended?(kind==='family'?1450:ready?340:620):kind==='family'?2500:kind==='selectTarget'?900:ready?(voiceInterimText?1050:780):1150;
 voiceCommitTimer=setTimeout(()=>{
  voiceCommitTimer=null;
  if(!voiceWanted||epoch!==voiceEpoch||document.hidden)return;
  const instruction=currentVoiceText();
  if(!voiceInstructionReady(instruction))return;
  clearVoiceUtterance();musicSpeaking=false;
  runCommand(instruction);
 },delay);
}
// Restart recognition only while the user has left the microphone enabled.
function micDisplay(mode,detail){setText('voicemode',mode);setText('miclabel',voiceWanted?'マイクを切る':'マイクを接続');$('voice').setAttribute('aria-pressed',String(voiceWanted));if(detail)commandFeedback(detail)}
let voiceCapture=null;
function pinVoiceAudioSession(){const nav=globalThis.navigator;try{if(nav?.audioSession&&nav.audioSession.type!=='play-and-record')nav.audioSession.type='play-and-record'}catch{}}
function releaseVoiceCapture(){if(voiceCapture){for(const track of voiceCapture.getTracks())track.stop();voiceCapture=null}}
function stopVoice(){clearVoiceUtterance();musicSpeaking=false;voiceWanted=false;listening=false;voiceEpoch++;clearTimeout(voiceRetry);voiceRetry=null;const old=recognition;recognition=null;try{old?.abort()}catch{}releaseVoiceCapture();micDisplay('VOICE OFF')}
function prepareVoiceCapture(SR,epoch){
 pinVoiceAudioSession();const nav=globalThis.navigator;
 const ios=nav&&(/iPhone|iPad|iPod/.test(nav.userAgent||'')||nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
 if(!ios||!nav.mediaDevices?.getUserMedia){connectRecognition(SR,epoch);return}
 // Keep one input stream alive across recognition reconnects. It is never
 // recorded, transmitted by this code, or connected to the output speakers.
 nav.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:false},video:false}).then(stream=>{
  if(!voiceWanted||epoch!==voiceEpoch||document.hidden){stream.getTracks().forEach(t=>t.stop());return}
  voiceCapture=stream;connectRecognition(SR,epoch);
 }).catch(error=>{if(epoch!==voiceEpoch)return;stopVoice();micDisplay('MIC DISCONNECTED',error.name==='NotAllowedError'?'マイクを許可してから接続してください。':'マイクの接続を確認して、もう一度接続してください。')});
}
function startVoice(){
 if(voiceWanted)return;if(!['battle','target','lock','paused','intro'].includes(state)){commandFeedback('戦闘を開始してからマイクを接続してください。');return}
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){micDisplay('VOICE UNAVAILABLE','このブラウザでは音声認識を利用できません。音声対応ブラウザで開くか、下の文字コマンドを使ってください。');return}
 voiceWanted=true;voiceFailures=0;const epoch=++voiceEpoch;micDisplay('CONNECTING','マイクに接続しています…');prepareVoiceCapture(SR,epoch);
}
function connectRecognition(SR,epoch){
 if(!voiceWanted||epoch!==voiceEpoch||document.hidden)return;
 try{
  const session=new SR();recognition=session;session.lang='ja-JP';session.continuous=true;session.interimResults=true;session.maxAlternatives=5;
  const processed=new Set(),consumed=new Set();let recentResults=[],startedAt=Date.now(),hadResult=false;
  voiceMarkConsumed=()=>{for(let i=0;i<recentResults.length;i++)if(recentResults[i])consumed.add(i)};
  session.onstart=()=>{if(session!==recognition)return;listening=true;startedAt=Date.now();micDisplay('LISTENING','音声接続中')};
  session.onspeechstart=()=>{if(session!==recognition||!voiceWanted)return;musicSpeaking=voiceSpeaking=true;cancelVoiceCommit()};
  session.onspeechend=()=>{if(session!==recognition||!voiceWanted)return;musicSpeaking=voiceSpeaking=false;scheduleVoiceCommit(epoch,true)};
  session.onresult=e=>{
   if(session!==recognition||!voiceWanted)return;
   cancelVoiceCommit();
   recentResults=e.results;
   for(let i=e.resultIndex;i<e.results.length;i++){
    const result=e.results[i];if(!result)continue;
    if(result.isFinal&&!processed.has(i)&&!consumed.has(i)){
     processed.add(i);hadResult=true;voiceFailures=0;
    }
   }
   voiceCurrentParts=[];
   for(let i=0;i<e.results.length;i++)if(e.results[i]&&!consumed.has(i))voiceCurrentParts.push(selectVoiceTranscript(e.results[i],[...voiceFragments,...voiceCurrentParts].join(' ')));
   voiceInterimText=Array.from(e.results).filter((r,i)=>r&&!r.isFinal&&!consumed.has(i)).map(r=>r[0].transcript).join(' ');
   if(voiceCurrentParts.length){hadResult=true;voiceFailures=0}
   const raw=rawVoiceText(),corrected=currentVoiceText();commandFeedback('聞き取り中：'+raw+(raw!==corrected?' → '+corrected:''));
   scheduleVoiceCommit(epoch);
  };
  session.onerror=e=>{
   if(session!==recognition||!voiceWanted)return;
   if(['not-allowed','service-not-allowed','audio-capture','language-not-supported'].includes(e.error)){
    stopVoice();micDisplay('MIC DISCONNECTED',e.error==='audio-capture'?'マイクが見つかりません。接続を確認してもう一度押してください。':e.error==='language-not-supported'?'日本語の音声認識を利用できません。別の対応ブラウザで開いてください。':'マイクを許可してから「マイクを接続」を押してください。');
   }else if(e.error!=='no-speech'&&e.error!=='aborted'){voiceFailures++;micDisplay('RECONNECTING','音声接続をやり直しています…')}
  };
  session.onend=()=>{
   if(session!==recognition||epoch!==voiceEpoch)return;listening=false;musicSpeaking=false;recognition=null;
   if(!voiceWanted||document.hidden||['win','lose','start'].includes(state))return;
   if(!hadResult&&Date.now()-startedAt<700)voiceFailures++;
   if(voiceFailures>=4){stopVoice();micDisplay('MIC DISCONNECTED','音声接続が切れました。「マイクを接続」で再接続できます。');return}
   // Browsers sometimes end a session without speechend or a final result.
   // Preserve a usable interim transcript and reconnect independently.
   voiceSpeaking=false;
   voiceFragments.push(...voiceCurrentParts);voiceCurrentParts=[];voiceInterimText='';
   scheduleVoiceCommit(epoch,true);
   micDisplay('RECONNECTING');voiceRetry=setTimeout(()=>connectRecognition(SR,epoch),Math.min(2000,300+voiceFailures*400));
  };
  session.start();
 }catch{stopVoice();micDisplay('MIC DISCONNECTED','音声入力を開始できませんでした。もう一度マイクを押してください。')}
}
function toggleVoice(){if(voiceWanted)stopVoice();else startVoice()}
let startRequested=false;
function beginVoiceBattle(){
 if(assetFailed){$('reload').classList.remove('hidden');return}
 // A tap during loading is queued; unlock audio while it is still a user gesture.
 pinVoiceAudioSession();unlockAudio();primeBattleScore();
 if(loadedCoreAssets<2){startRequested=true;$('begin').textContent='準備中…';$('loadstate').textContent=`ゲーム画面を準備中 ${loadedCoreAssets} / 2`;return}
 startRequested=false;reset();try{startVoice()}catch(error){console.warn('Microphone setup deferred:',error);commandFeedback('ゲーム開始済み。マイクはボタンから接続してください。')}
}
function startWhenReady(){if(startRequested&&state==='start'){startRequested=false;reset();commandFeedback('ゲーム開始済み。マイクはボタンから接続してください。')}}
$('begin').onclick=beginVoiceBattle;$('retry').onclick=beginVoiceBattle;$('restartPause').onclick=beginVoiceBattle;$('voice').onclick=toggleVoice;
$('pause').onclick=()=>{pause();updateHud()};$('resume').onclick=()=>{pause();updateHud();if(!voiceWanted)startVoice()};
window.zeroBattle={...window.zeroBattle,reset,parseCommand,runCommand,beginTarget,readCommand:()=>({target:targetId,pinned:targetPinned,pending:pendingTechnique?.card.id||null,microphone:voiceWanted,loadout:Object.fromEntries(Object.entries(loadout).map(([k,v])=>[k,v?.id||null])),equipmentUses:{...equipmentUses}})};
updateHud();requestAnimationFrame(frame);

function drawCommandReceipt(){
 if(receipt&&receipt.until>commandClock){const c=receipt.card,t=receipt.until-commandClock;g.save();g.globalAlpha=Math.min(1,t*3);g.fillStyle='#0b273be8';g.fillRect(12,8,177,34);g.fillStyle='#95f8dd';g.fillRect(12,8,2,34);textPixel(`FILE: ${fileMeta[c.file].label}`,22,22,'#a3ffe1',10);textPixel(`No.${String(c.num).padStart(3,'0')} / ${c.cost}%`,22,35,'#f8e4b1',9);g.restore()}
}
