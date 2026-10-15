const {createCanvas,loadImage}=require('@napi-rs/canvas');
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'../dist')+'/',els={},pending=[],timers=new Map(),recognizers=[],frames=[];
let timerId=0,seed=917,clock=0;
function waitVoice(ms){const end=clock+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;clock=next[1].at;timers.delete(next[0]);next[1].fn()}clock=end}
const math=Object.create(Math);math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);const randomizedMovement=math.random;
function element(id){const classes=new Set(),attrs={};return{id,style:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on===undefined)on=!classes.has(x);on?classes.add(x):classes.delete(x)}},setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k],addEventListener(){},children:[],appendChild(x){this.children.push(x)},textContent:'',innerHTML:'',value:'',focus(){}}}
for(const match of fs.readFileSync(root+'index.html','utf8').matchAll(/id="([^"]+)"/g))els[match[1]]=element(match[1]);
els.begin.disabled=/id="begin" disabled/.test(fs.readFileSync(root+'index.html','utf8'));
const adapt=c=>{const orig=c.getContext.bind(c);c.getContext=(...a)=>{const t=orig(...a),draw=t.drawImage.bind(t);t.drawImage=(i,...args)=>draw(i.im||i,...args);return t};return c};
els.game=adapt(createCanvas(960,540));
class Image{set src(s){pending.push(loadImage(root+s).then(im=>{this.im=im;this.complete=true;this.naturalWidth=im.width;this.naturalHeight=im.height;this.onload?.()}))}}
class Audio{constructor(src){this.src=src;this.paused=true;this.volume=1;this.currentTime=0;this.plays=0;this.pauses=0}addEventListener(){}play(){this.paused=false;this.plays++}pause(){this.paused=true;this.pauses++}}
class AudioContext{
 constructor(){this.currentTime=0;this.sampleRate=8000;this.state='running';this.destination={};this.sources=[]}
 resume(){this.state='running';return Promise.resolve()}
 createGain(){const gain={value:1,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v}};return{gain,connect(){},disconnect(){}}}
 createOscillator(){return{frequency:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}}}
 createBiquadFilter(){return{frequency:{value:1000,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
 createBuffer(channels,n){return{getChannelData:()=>new Float32Array(n)}}
 createBufferSource(){const s={connect(){},disconnect(){},start(t,offset){this.offset=offset;this.started=true},stop(){this.stopped=true}};this.sources.push(s);return s}
 decodeAudioData(){return Promise.resolve({duration:122.091})}
}
class SpeechRecognition{set onresult(fn){this.resultHandler=fn}get onresult(){return this.resultHandler?(e)=>{this.resultHandler(e);waitVoice(0)}:null}constructor(){recognizers.push(this);this.results=[]}start(){this.started=true;this.onstart?.()}abort(){this.aborted=true;this.onend?.()}result(text,index=0,final=true){this.results[index]={0:{transcript:text},isFinal:final,length:1};this.onresult?.({resultIndex:index,results:this.results})}}
const listeners={},context={console,Image,Audio,Math:math,Set,Uint8Array,Int32Array,Date,navigator:{},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}),setTimeout:(fn,ms=0)=>{const id=++timerId;timers.set(id,{fn,at:clock+ms});return id},clearTimeout:id=>timers.delete(id),requestAnimationFrame(fn){frames.push(fn)},localStorage:{getItem(){return null},setItem(){}},window:{AudioContext,SpeechRecognition,addEventListener:(n,fn)=>listeners[n]=fn},document:{hidden:false,getElementById:id=>els[id]||null,createElement:t=>t==='canvas'?adapt(createCanvas(1,1)):element('created'),querySelectorAll:()=>[],addEventListener:(n,fn)=>listeners[n]=fn}};
vm.createContext(context);
for(const file of [...fs.readFileSync(root+'index.html','utf8').matchAll(/<script src="([^"?]+)\?v=\d+"><\/script>/g)].map(m=>m[1])){
 vm.runInContext(fs.readFileSync(root+file,'utf8'),context,{filename:file});
 if(file!=='boot.js'){
  assert.equal(frames.length,0,'no rendering while a later script is still downloading: '+file);
  assert(els.begin.disabled,'no partially initialized start action: '+file);
 }
 if(file==='command.js'){
  // Cached core images can finish while later scripts are still in transit.
  vm.runInContext('assetReady(true);assetReady(true)',context);
  assert(els.begin.disabled,'core images alone cannot enable an incomplete runtime');
  vm.runInContext('loadedAssets=0;loadedCoreAssets=0;startReady=false',context);
 }
}
assert.equal(frames.length,1,'exactly one loop starts after the final script');
console.log('PASS delayed scripts and cached core images cannot start an incomplete game.');
const run=s=>vm.runInContext(s,context);
run('startupDraws=0;savedStartupDraw=g.drawImage;g.drawImage=()=>startupDraws++;drawZeroAnimated();g.drawImage=savedStartupDraw');assert.equal(run('startupDraws'),0,'unloaded cels never display an obsolete Zero fallback');
run('function settlePhase(){let n=0;while(phaseTransition&&n++<100)tickPhaseTransition(.05)};function advance(seconds){for(let t=0;t<seconds-1e-8;t+=1/60){const dt=Math.min(1/60,seconds-t);if(audio)audio.currentTime+=dt;tick(dt)}}');
// Six-actor fixture exercises every existing attack independently of random spawns.
const specimens=new Map(),combinations=new Set();
for(const [species,hp] of Object.entries({bee:20,fly:30,spider:40,beetle:60}))assert.equal(run('bugTypes['+JSON.stringify(species)+'].hp'),hp,species+' assigned HP');
assert(run('Object.values(bugTypes).every(b=>b.damage%5===0)'), 'all bug attacks end in 0 or 5');
for(let i=0;i<200;i++){
 const roster=run('createBattleBugs()');
 assert.equal(roster.length,3);assert.equal(new Set(roster.map(b=>b.type)).size,3);
 assert.deepEqual(Array.from(roster,b=>b.id),[1,2,3]);
 combinations.add(Array.from(roster,b=>b.type).sort().join(','));
 roster.forEach(b=>{assert(b.c>=3&&b.c<=5&&b.r>=0&&b.r<=2);assert(!b.layer||run('bugTypes['+JSON.stringify(b.type)+'].flying'));assert.equal(b.hp,run('bugTypes['+JSON.stringify(b.type)+'].hp'));assert.equal(b.max,b.hp);specimens.set(b.type,b)});
}
assert.equal(specimens.size,4);assert.equal(combinations.size,4);
run('reset(false)');assert.equal(run('bugs.length'),3);
const fixture=['bee','fly','spider','beetle','spider','fly'].map((type,i)=>({...specimens.get(type),id:i+1}));
console.log('PASS production roster: three unique random species, all four reachable, legal layers and sequential IDs.');
function fresh(auto=false,enemies=false){run('stopVoice();reset(false)');run('bugs='+JSON.stringify(fixture));run('automationEnabled='+auto+';enemyAutomationEnabled='+enemies)}
function render(name){run('draw()');fs.writeFileSync('/tmp/'+name+'.png',els.game.toBuffer('image/png'))}

(async()=>{
run('state="start"');assert(!els.begin.disabled);els.begin.onclick();assert(run('startRequested'));assert.equal(run('state'),'start');
for(let i=0;i<pending.length;){const end=pending.length;await Promise.all(pending.slice(i,end));i=end}assert.equal(run('state'),'intro','early start tap is honored after images finish');
assert(run('voiceWanted&&listening'),'queued first tap also connects the microphone');
if(process.env.ZERO_ART_AUDIT){
 const entries=[...Object.entries(run('animationSheets')),...Array.from(run('errorSprites'),(d,i)=>['error'+i,d])];
 for(const [key,data] of entries){const cols=6,c=createCanvas(cols*180,Math.ceil(data.frames.length/cols)*160),t=c.getContext('2d');t.imageSmoothingEnabled=false;t.fillStyle='#27323c';t.fillRect(0,0,c.width,c.height);
  data.frames.forEach((f,i)=>{const im=f.image||f,w=f.sx===undefined?(im.width||im.naturalWidth):f.cellW,h=f.sy===undefined?(im.height||im.naturalHeight):f.cellH,scale=Math.min(158/w,132/h),x=(i%cols)*180,y=Math.floor(i/cols)*160;t.fillStyle='#eaf6ff';t.font='13px monospace';t.fillText(key+' '+i,x+4,y+15);if(f.sx===undefined)t.drawImage(im.im||im,x+(180-w*scale)/2,y+25+(132-h*scale),w*scale,h*scale);else t.drawImage(im.im||im,f.sx,f.sy,w,h,x+(180-w*scale)/2,y+25+(132-h*scale),w*scale,h*scale)});
  fs.writeFileSync('/tmp/audit55_'+key+'.png',c.toBuffer('image/png'));
 }
}

// Diagonal limbs and both wings must survive cleanup; disconnected atlas scraps must not.
run(`fragmentProbe={data:new Uint8ClampedArray(40*40*4)};
function probeInk(x,y){const k=(y*40+x)*4;fragmentProbe.data[k]=100;fragmentProbe.data[k+3]=255}
for(let y=8;y<17;y++)for(let x=8;x<17;x++)probeInk(x,y);
for(let i=0;i<9;i++)probeInk(16+i,16+i);
for(let y=30;y<33;y++)for(let x=1;x<4;x++)probeInk(x,y);
pruneCelFragments(fragmentProbe,40,40);
`);
assert.equal(run('fragmentProbe.data[(24*40+24)*4+3]'),255,'thin diagonal leg remains complete');
assert.equal(run('fragmentProbe.data[(31*40+2)*4+3]'),0,'neighbouring image scrap is removed');
run(`pairedProbe={data:new Uint8ClampedArray(40*40*4)};
for(let y=8;y<24;y++)for(const x of [5,6,7,8,9,25,26,27,28,29]){const k=(y*40+x)*4;pairedProbe.data[k]=100;pairedProbe.data[k+3]=255}
pruneCelFragments(pairedProbe,40,40,true);`);
assert.equal(run('pairedProbe.data[(12*40+27)*4+3]'),255,'separate second wing is preserved');
console.log('PASS fine diagonal limbs, paired wings and atlas fragment cleanup.');

assert(recognizers.at(-1)?.started,'recognition starts after deferred loading');
// A transient render exception must leave the next frame scheduled.
run('savedDraw=draw;draw=()=>{throw new Error("transient draw failure")}');
const brokenFrame=frames.shift();assert.throws(()=>brokenFrame(16),/transient draw failure/);
assert.equal(frames.length,1);run('draw=savedDraw');assert.doesNotThrow(()=>frames.shift()(32));
assert.equal(frames.length,1,'render loop survives a failed frame without duplication');
run('beginVoiceBattle()');assert(run('voiceWanted&&listening'),'cached repeat start connects too');
console.log('PASS cold and warm starts connect voice; one render failure does not terminate the loop.');
await run('battleMusic.ready()');
assert.equal(run('loadedAssets'),20);assert.equal(run('Object.values(animationSheets).reduce((n,s)=>n+s.frames.length,0)'),156);
run('stopVoice();navigator={userAgent:"iPhone",mediaDevices:{getUserMedia:()=>Promise.reject(new Error("permission denied"))}};beginVoiceBattle()');
assert.equal(run('state'),'intro','battle intro starts without waiting on microphone permission');
await Promise.resolve();await Promise.resolve();run('advance(2.2)');assert.equal(run('state'),'target','permission failure leaves the playable target flow active');run('stopVoice();navigator={}');
run('stopVoice();navigator={userAgent:"iPhone",mediaDevices:{getUserMedia:()=>new Promise(resolve=>{pendingPermission=resolve})}};beginVoiceBattle();advance(2.2)');
assert.equal(run('state'),'target','unanswered microphone permission cannot block the intro');assert(run('voiceWanted&&listening'),'the optional iOS input holder never gates speech recognition');recognizers.at(-1).result('許可待ち中も受信する',0,false);assert.equal(run('rawVoiceText()'),'許可待ち中も受信する');
run('runCommand("No.001");advance(.8)');assert.equal(run('state'),'battle','manual command still enters play while permission is pending');
run('stopVoice();lateCaptureStopped=false;pendingPermission({getTracks:()=>[{stop(){lateCaptureStopped=true}}]})');
await Promise.resolve();assert(run('lateCaptureStopped&&!voiceWanted'),'late permission callback cannot reconnect a canceled session');
run('navigator={};savedRecognition=window.SpeechRecognition;delete window.SpeechRecognition;beginVoiceBattle();advance(2.2)');
assert.equal(run('state'),'target','no speech API does not stop game startup');
run('window.SpeechRecognition=savedRecognition;stopVoice()');
console.log('PASS denied, pending and unsupported microphone paths keep the game running.');
run('loadedAssets=0;loadedCoreAssets=0;startReady=false;$("begin").disabled=true');
run('for(let i=0;i<9;i++)assetReady(false);assetReady(true)');assert(els.begin.disabled,'optional art and one core image do not hold the start button');
run('assetReady(true)');assert(!els.begin.disabled,'game becomes startable when background and Akari portrait are ready');assert.equal(run('loadedAssets'),11);
run('fallbackSheetBackup={...animationSheets};delete animationSheets.motion;delete animationSheets.loops;delete animationSheets.bugs;delete animationSheets.extra;draw();Object.assign(animationSheets,fallbackSheetBackup)');
assert(['intro','target'].includes(run('state')),'static sprites cover animation sheets while they continue loading');
assert.equal(run('Object.values(files).flat().length'),19);
assert.equal(run('Object.entries(files).every(([family,cards])=>cards.length===(family==="area"?4:3))'),true);
assert.equal(run('files.area[3].id'), 'area-4');
assert.equal(run('files.area[3].name'),'ホールアウト');
assert(run('Object.values(files).flat().filter(c=>c.damage||c.reflect).every(c=>((c.damage||c.reflect)%5===0)&&c.desc.includes(String(c.damage||c.reflect)))'),'file attack damage is rounded and descriptions agree');
for(const [family,expected] of Object.entries({sword:[30,20,20],guns:[20,30,20],gravity:[10,20,30]}))assert.deepEqual(Array.from(run('files['+JSON.stringify(family)+']'),c=>c.damage),expected,family+' damage relative to 20–60 HP');
assert.equal(run('files.shield[2].reflect'),15);
assert.equal(run('basicCard.damage'),1);
fresh(false,false);run('charge=0;fire()');assert.equal(run('bullets.at(-1).damage'),1,'regular shot damage');
fresh(false,false);run('charge=.9;fire()');assert.equal(run('bullets.at(-1).damage'),5,'charged shot damage');
assert(!fs.readFileSync(root+'index.html','utf8').includes('アカリの声で、ゼロが動く。'));
assert(!fs.readFileSync(root+'index.html','utf8').includes('標的と技を、声で指揮する。'));
assert.equal((els.filecatalog.innerHTML.match(/<tr><td>/g)||[]).length,19);
console.log('PASS 19 visible techniques and simplified start screen.');
run('reset();automationEnabled=true;enemyAutomationEnabled=true');run('advance(2.3)');assert.equal(run('state'),'target');
assert(run('runCommand("No.002")'));run('advance(.8)');assert.equal(run('state'),'battle');
assert(!run('runCommand("File guns No.004")'));assert.equal(run('activeOrder'),null);
assert(!run('runCommand("File area No.005")'));
assert.equal(run('interpretInstruction("ファイルウィングNo.010").kind'),'clarify');
for(const [family,cards] of Object.entries(run('files')))for(const c of cards){
 for(const number of [String(c.num).padStart(3,'0'),['','ワン','ツー','スリー','フォー'][c.num]]){
  const input='ファイル'+({sword:'ソード',guns:'ガンズ',shield:'シールド',wing:'ウィング',gravity:'グラビティ',area:'エリア'})[family]+'No.'+number;
  const result=run('parseCommand('+JSON.stringify(input)+')');assert.equal(result?.file,family,input);assert.equal(result?.num,c.num,input);
 }
}
assert.equal(run('parseCommand("ファイルグラビティNo.002").num'),2);
assert.equal(run('parseCommand("ファイルエリアNo.004").num'),4);
for(const [phrase,num] of [['2',2],['ツー',2],['002',2],['ゼロゼロツー',2],['ゼロゼロ二',2]])assert.equal(run('parseCommand('+JSON.stringify('ファイルグラビティNo.'+phrase)+')?.num'),num);
console.log('PASS number normalization and strict voice selection for 001–003 / area 004.');
function lane(){fresh(true);run('enemyAutomationEnabled=false;hp=120;bugs.forEach(b=>{b.hp=b.max=5000;b.motion=null});col=2;row=1;bugs[0].c=3;bugs[0].r=1;bugs[2].c=3;bugs[2].r=1;targetId=3;targetPinned=true')}
for(const [n,expected] of [[1,[1]],[2,[0,1,2]],[3,[1,3,4]]]){
 fresh(false,false);
 run('col=2;row=1;zeroFacing=1;bugs='+JSON.stringify([[3,0],[3,1],[3,2],[4,1],[5,1]].map(([c,r],i)=>({id:i+1,type:'spider',c,r,layer:0,hp:500,max:500,cd:100,tell:0,hit:0,stun:0}))));
 assert(run('immediateActivate(files.sword['+(n-1)+'])'));run('advance(.18)');
 assert.deepEqual(Array.from(run('bugs'),(b,i)=>b.hp<500?i:-1).filter(i=>i>=0),expected,'sword '+n+' hit pattern');
}
console.log('PASS sword 001 forward 1, 002 vertical 3, 003 horizontal 3.');
for(const [n,expectedHp] of [[1,0],[2,0],[3,0]]){
 fresh(false,false);
 run('col=2;row=1;zeroFacing=1;bugs=[{id:1,type:"bee",c:3,r:1,layer:0,hp:20,max:20,cd:100,tell:0,hit:0,stun:0}]');
 assert(run('immediateActivate(files.guns['+(n-1)+'])'));
 run('advance(.4)');assert.equal(run('bugs[0].hp'),expectedHp,'guns '+n+' actual hit against 20 HP');
}
fresh(false,false);
run('col=2;row=1;zeroFacing=1;bugs=[{id:1,type:"bee",c:3,r:1,layer:0,hp:20,max:20,cd:100,tell:0,hit:0,stun:0}];immediateActivate(files.shield[2]);hurt(20)');
assert.equal(run('hp'),200,'parry blocks incoming damage');
assert.equal(run('bullets.at(-1).damage'),15,'parry retaliation uses balanced power');
run('advance(.4)');assert.equal(run('bugs[0].hp'),5,'parry actual hit against 20 HP');
console.log('PASS guns and parry apply the new damage against real enemy HP.');
for(const c of run('Object.values(files).flat()')){
 lane();assert(run('runCommand('+JSON.stringify('File '+c.file+' No.'+c.num)+')'),c.id);
 for(let i=0;i<240&&!run('equipmentUses['+JSON.stringify(c.id)+']');i++)run('advance(1/60)');
 assert.equal(run('equipmentUses['+JSON.stringify(c.id)+']'),1,c.id+' must activate');
 assert.equal(run('energy'),100-c.cost,c.id+' battery');
 if(c.file==='wing'){assert.equal(run('layer'),1);assert(run('flightPermanent'))}
 if(c.holes)assert(run('panelHoles.size>0'));
 run('advance(1.3)');assert.equal(run('appearance.body'),'base',c.id+' default body');
 const used=run('equipmentUses['+JSON.stringify(c.id)+']');run('advance(2)');assert.equal(run('equipmentUses['+JSON.stringify(c.id)+']'),used,c.id+' no repeat');
}
console.log('PASS all 19 voice selected techniques activate once, spend battery and clear weapons.');
for(const [n,name,speed] of [[1,'アオサギの翼',1],[2,'悪魔の翼',1.15],[3,'サモトラケの翼',1.35]]){
 fresh(false);assert.equal(run('files.wing['+(n-1)+'].name'),name);
 run('immediateActivate(files.wing['+(n-1)+']);advance(.7)');assert.equal(run('layer'),1);assert.equal(run('wingSpeed'),speed);
 run('move(1,0)');assert(Math.abs(run('moveCd')-.16/speed)<1e-9,'wing speed applies to movement');
 run('advance(30)');assert.equal(run('layer'),1,'flight persists');
 run('runCommand("降りて");advance(.5)');assert.equal(run('layer'),0);assert.equal(run('wingSpeed'),1);
 assert(run('animationSheets.wing.frames['+(n-1)+'].width>60'),'wing sprite exists');
}
for(const [n,name] of [[1,'怒れるサボテン'],[2,'モアイ像'],[3,'自由の女神像']]){
 lane();assert.equal(run('files.gravity['+(n-1)+'].name'),name);
 run('automationEnabled=false;bugs=bugs.filter(b=>[1,3].includes(b.id));immediateActivate(files.gravity['+(n-1)+']);advance(1.1)');
 assert.equal(run('bugs[0].hp'),5000-run('files.gravity['+(n-1)+'].damage'),'gravity hits flying enemy');
 assert.equal(run('bugs[1].hp'),5000-run('files.gravity['+(n-1)+'].damage'),'gravity hits ground enemy');
 assert(run('animationSheets.gravity.frames['+(n-1)+'].width>60'),'gravity sprite exists');
}
run('window.equipmentCalls=[];const originalDrawEquipment=drawEquipment;drawEquipment=function(...args){window.equipmentCalls.push(args);return originalDrawEquipment(...args)}');
for(const n of [1,2,3]){
 fresh(false);run('appearance.shield='+n+';shield=20;shieldTime=5;shieldVisualTime=1;drawZeroAnimated()');
 if(process.env.ZERO_SCREENSHOT)render('zero_bubble_'+n);
 run('gravityDrops=[{num:'+n+',c:4,r:1,cells:[{c:4,r:1}],age:.76}];drawGravityDrop(gravityDrops[0])');
 const gravity=run('window.equipmentCalls.filter(c=>c[0]==="gravity").at(-1)');
 assert(gravity,'gravity '+n+' is drawn');assert.equal(gravity[4],58,'gravity covers one tile width');
 assert.equal(gravity[8],n===1?0:Math.PI,'statues land head-first');
}
run('drawEquipment=originalDrawEquipment');if(process.env.ZERO_SCREENSHOT)render('zero_gravity_shield');
console.log('PASS three shield bubbles and full-tile gravity sprites; statues land head-first.');
lane();run('runCommand("File area No.004");advance(1.1)');assert.equal(run('equipmentUses["area-4"]'),1);assert(run('panelHoles.size>0'));
console.log('PASS new wing art/speed/landing, cactus, moai, Statue of Liberty and area hole.');
fresh(true);run('startVoice()');const sr=recognizers.at(-1);
sr.onspeechstart();sr.result('ファイルウィング',0);sr.onspeechend();waitVoice(180);
sr.onspeechstart();sr.result('ナンバー002',1);sr.onspeechend();waitVoice(3000);run('advance(1.5)');assert(!run('equipmentUses["wing-2"]'),'no automatic voice execution before Enter');sr.result('エンター',2);run('advance(1.5)');
assert.equal(run('equipmentUses["wing-2"]'),1,'split voice command triggers the correct new wing');run('stopVoice()');
console.log('PASS split microphone command for remapped wing.');

// Failed command context must not turn the next unrelated number into a retry.
fresh(false);run('runCommand("ファイルガンズ")');assert.equal(run('voiceFile'),'guns');
assert(!run('runCommand("ファイルガンズNo.999")'));assert.equal(run('voiceFile'),null,'a rejected command clears the pending family immediately');
assert.equal(run('interpretInstruction("No.002").kind'),'clarify','failed input cannot leak into the next instruction');
// Every valid instruction in a batch runs in order, even around an invalid one.
lane();run('runCommand("ファイルガンズNo.001 それからファイルガンズNo.999 それからファイルガンズNo.002")');
assert.equal(run('activeOrder?.card.id'),'guns-1');assert.equal(run('orderQueue[0]?.card.id'),'guns-2');
run('savedBatchUse=recordOrderUse;batchUses=[];recordOrderUse=function(c){batchUses.push(c.id);savedBatchUse(c)}');
run('advance(8)');assert.deepEqual(Array.from(run('batchUses')),['guns-1','guns-2'],'valid instructions surrounding a bad instruction execute in spoken order');
lane();run('batchUses=[];targetId=1;bugs[0].layer=1');
assert(run('runCommand("ファイルウィングNo.001、ファイルガンズNo.002、ダウン、ターゲット003、ファイルグラビティNo.003、通常射撃、ファイルシールドNo.001")'));
assert.equal(run('activeOrder.card.id'),'wing-1');assert.equal(run('orderQueue.length'),6);
run('advance(18)');assert.deepEqual(Array.from(run('batchUses')),['wing-1','guns-2','gravity-3','normal','shield-1'],'landing, target selection and ordinary fire cannot overwrite a technique batch');
assert.equal(run('layer'),0);assert.equal(run('targetId'),3);assert.equal(run('activeOrder'),null);assert.equal(run('orderQueue.length'),0);
lane();run('batchUses=[]');assert(run('runCommand("左に移動 それから左に移動 それからファイルガンズNo.001")'));
run('advance(8)');assert.equal(run('col'),0,'two movement commands execute sequentially from their actual positions');assert.deepEqual(Array.from(run('batchUses')),['guns-1']);
// A failed repeated command must disappear instead of blocking the next one.
lane();run('batchUses=[];targetId=1;bugs[0].layer=1');
assert(run('runCommand("ファイルソードNo.001 ターゲット001を倒すまで それからファイルグラビティNo.001")'));
run('advance(1/60)');assert.equal(run('activeOrder'),null,'an incompatible-layer repeat is discarded immediately');assert.equal(run('voiceFile'),null);assert.equal(run('lastOrderSpec'),null);
run('advance(4)');assert.deepEqual(Array.from(run('batchUses')),['gravity-1']);assert.equal(run('orderQueue.length'),0);
lane();run('batchUses=[];col=0;for(let r=0;r<3;r++)panelHoles.set(cellId(1,r),10)');
assert(run('runCommand("ファイルソードNo.001を倒すまで使って それからファイルガンズNo.001")'));
run('advance(1/60)');assert.equal(run('activeOrder'),null,'a repeat with no reachable attack position is discarded immediately');run('advance(4)');assert.deepEqual(Array.from(run('batchUses')),['guns-1']);
lane();run('batchUses=[];energy=3');assert(run('runCommand("ファイルガンズNo.002を3回使って それからファイルグラビティNo.001")'));
run('advance(10)');assert.deepEqual(Array.from(run('batchUses')),['guns-2','gravity-1'],'battery exhaustion clears the failed repeat and advances to the affordable next technique');assert.equal(run('activeOrder'),null);
lane();run('batchUses=[]');assert(run('runCommand("ファイルソードNo.001 それから一時停止 それから再開 それからファイルガンズNo.001")'));
run('advance(10)');assert.equal(run('state'),'battle');assert.deepEqual(Array.from(run('batchUses')),['sword-1','guns-1'],'queued pause/resume cannot cancel or deadlock later attacks');
lane();run('batchUses=[]');assert(run('runCommand("ファイルガンズNo.001 それからオートモード それからファイルガンズNo.002")'));
run('advance(5)');assert(!run('autoTechniqueMode'));assert.deepEqual(Array.from(run('batchUses')),['guns-1','guns-2'],'queued Auto Mode cannot replace a subsequent manual technique');
lane();run('batchUses=[]');assert(run('runCommand("ファイルガンズ それからNo.001 それからNo.002")'));
run('advance(8)');assert.deepEqual(Array.from(run('batchUses')),['guns-1','guns-2'],'family and following numbers resolve in spoken order');
for(const phrase of ['ファイルガンズNo.001 No.002 No.003','ファイルガンズNo.001、002、003']){
 lane();run('batchUses=[]');assert(run('runCommand('+JSON.stringify(phrase)+')'));run('advance(12)');
 assert.deepEqual(Array.from(run('batchUses')),['guns-1','guns-2','guns-3'],'number lists cannot silently drop later techniques: '+phrase);
}
// New submissions append even when delivered in separate calls and during
// a committed attack. A repeat remains active until its actual condition ends.
lane();run('batchUses=[];runCommand("ファイルソードNo.002");runCommand("ファイルガンズNo.003");advance(.06);runCommand("ファイルソードNo.001");runCommand("ファイルシールドNo.002")');
assert.deepEqual(Array.from(run('[activeOrder,...orderQueue].map(o=>o.card.id)')),['sword-2','guns-3','sword-1','shield-2']);
run('advance(15)');assert.deepEqual(Array.from(run('batchUses')),['sword-2','guns-3','sword-1','shield-2']);
for(const phrase of ['ソード002→ガンズ003→ソード001→倒すまで→003','ソード002 それから ガンズ003 次に ソード001 続いて 倒すまで そして 003','ソード002、ガンズ003、ソード001、倒すまで、003']){
 lane();run('batchUses=[];state="target";bugs=bugs.filter(b=>b.id===3||b.id===4);bugs[0].hp=bugs[0].max=55;bugs[1].c=5;bugs[1].r=1;bugs[1].layer=0;targetId=4;targetPinned=false');
 assert(run('runCommand('+JSON.stringify(phrase)+')'),phrase);
 assert.equal(run('state'),'target');assert.deepEqual(Array.from(run('[activeOrder,...orderQueue].map(o=>o.card.id)')),['sword-2','guns-3','sword-1','sword-3']);
 assert.equal(run('orderQueue[1].untilTarget'),4);assert.equal(run('orderQueue[2].untilTarget'),null,'a repeat condition never leaks into the next technique');
 run('advance(2)');assert.equal(run('batchUses.length'),0,'TARGET does not prematurely execute stored skills');
 assert(run('runCommand("ターゲット003")'));assert.equal(run('state'),'lock','target selection bypasses stored skills without canceling them');
 assert.equal(run('orderQueue[1].untilTarget'),3,'the selected target supplies the pending repeat condition');
 run('advance(18)');assert.deepEqual(Array.from(run('batchUses')),['sword-2','guns-3','sword-1','sword-3'],phrase+' executes every skill after target selection and death');
}
lane();run('batchUses=[];runCommand("ファイルソードNo.001");runCommand("3回");runCommand("ファイルガンズNo.002")');
assert.equal(run('activeOrder.remaining'),3);assert.equal(run('orderQueue.length'),1,'a detached count modifies its technique instead of creating another entry');run('advance(12)');assert.deepEqual(Array.from(run('batchUses')),['sword-1','sword-1','sword-1','guns-2']);
lane();run('batchUses=[];bugs=bugs.filter(b=>b.id===3||b.id===4);bugs[1].c=5;bugs[1].r=1;bugs[1].layer=0;runCommand("ファイルソードNo.001をターゲット003を倒すまで");runCommand("ファイルガンズNo.002");runCommand("ファイルシールドNo.001");advance(2.5)');
assert.equal(run('activeOrder.card.id'),'sword-1');assert.equal(run('activeOrder.untilTarget'),3);assert.deepEqual(Array.from(run('orderQueue.map(o=>o.card.id)')),['guns-2','shield-1'],'adding skills never terminates the active repeat');
run('bugs[0].hp=0;advance(8)');assert.deepEqual(Array.from(run('batchUses.slice(-2)')),['guns-2','shield-1'],'the full queue resumes when the condition ends');
lane();run('batchUses=[];state="target"');
for(let batch=0;batch<8;batch++)assert(run('runCommand("ファイルガンズNo.001、002、001")'));
assert.equal(run('orderQueue.length'),23,'all 24 instructions across eight submissions are retained');run('runCommand("ターゲット003");advance(80)');
assert.deepEqual(Array.from(run('batchUses')),Array.from({length:8},()=>['guns-1','guns-2','guns-1']).flat(),'all 24 techniques execute oldest first');
lane();run('batchUses=[];state="target";runCommand("ファイルガンズNo.001 ターゲット003、それからファイルシールドNo.002")');assert.equal(run('state'),'lock','an explicit target attached to the first technique starts the pending battle');run('advance(8)');assert.deepEqual(Array.from(run('batchUses')),['guns-1','shield-2']);
console.log('PASS accumulating technique FIFO across independent submissions, TARGET, motion commitment, standalone conditions, target death, alternate phrasing and 24 queued techniques.');
run('recordOrderUse=savedBatchUse');
console.log('PASS immediate failed-context disposal and real FIFO execution across invalid instructions, mixed techniques/actions, movement, layer mismatch and battery exhaustion.');

// Speech results and endpoint events may split a sentence anywhere. Only Enter
// may submit it, and every confirmed portion must be consumed exactly once.
run('savedMicrophoneCommand=runCommand;voiceCommits=[];runCommand=function(text,options){voiceCommits.push(text);return savedMicrophoneCommand(text,options)}');
function micFresh(){fresh(false);run('stopVoice();voiceCommits=[];state="battle";startVoice()');return recognizers.at(-1)}
let stockMic=micFresh();
for(const text of ['ファイルソードNo.002','ファイルガンズNo.003','ファイルソードNo.001']){stockMic.result(text+' エンター',stockMic.results.length,true)}
assert.deepEqual(Array.from(run('[activeOrder,...orderQueue].map(o=>o.card.id)')),['sword-2','guns-3','sword-1'],'independent speech submissions append to the same technique queue');
assert(run('voiceWanted&&listening'),'stocking techniques leaves microphone reception active');
let mic=micFresh();
mic.result('ファイルガンズ エンター',0,true);assert.equal(run('voiceFile'),'guns');
mic.result('No.999 エンター',1,false);assert.equal(run('voiceFile'),null);assert.equal(run('rawVoiceText()'),'');assert(run('voiceWanted&&listening'));
mic.result('No.999 エンター',1,true);assert.equal(run('rawVoiceText()'),'');assert.equal(run('voiceCommits.length'),2,'late final does not replay a failed instruction');
mic.result('ファイルガンズNo.002 エンター',2,true);assert.equal(run('activeOrder.card.id'),'guns-2');assert.equal(run('rawVoiceText()'),'','fresh speech after a failed Enter has no failed-input residue');
mic=micFresh();run('automationEnabled=true;enemyAutomationEnabled=false;col=2;row=1;targetId=3;targetPinned=true;bugs.forEach(b=>{b.c=3;b.r=1;b.layer=0;b.hp=b.max=5000});liveBatchUses=[];savedLiveBatchUse=recordOrderUse;recordOrderUse=function(c){liveBatchUses.push(c.id);savedLiveBatchUse(c)}');
mic.result('ファイルガンズNo.001 エンター',0,false);
mic.result('ファイルガンズNo.001 エンター ファイルガンズNo.002',0,false);
mic.result('エンター',1,false);
assert.equal(run('activeOrder.card.id'),'guns-1');assert.equal(run('orderQueue[0].card.id'),'guns-2');
mic.result('エンター',1,true);run('advance(8)');assert.deepEqual(Array.from(run('liveBatchUses')),['guns-1','guns-2'],'multiple commands across partial ASR callbacks execute in the original order exactly once');
assert(run('voiceWanted&&listening'));assert.equal(run('rawVoiceText()'),'');run('recordOrderUse=savedLiveBatchUse');
mic=micFresh();
mic.onspeechstart();mic.result('ファイルガンズNo.002',0,false);waitVoice(12000);
assert.equal(run('voiceCommits.length'),0,'an understood interim number never executes');
mic.result('ファイルガンズNo.002',0,true);mic.onspeechend();waitVoice(12000);
assert.equal(run('voiceCommits.length'),0,'final results, pauses and complete numbers never execute');
assert(run('rawVoiceText().includes("ガンズ")'),'the complete draft stays available');
mic.onspeechstart();mic.result('3回使って',1,true);mic.onspeechend();waitVoice(8000);
assert.equal(run('voiceCommits.length'),0,'trailing conditions remain editable before Enter');
mic.result('エンター',2,false);assert.equal(run('voiceCommits.length'),1,'a spoken Enter executes immediately without waiting for a final event');waitVoice(4000);
mic.result('エンター',2,true);
assert.equal(run('voiceCommits.length'),1);assert.equal(run('activeOrder.card.id'),'guns-2');assert.equal(run('activeOrder.remaining'),3);
assert.equal(run('rawVoiceText()'),'','submitted draft is cleared');
mic.result('エンター',2,true);mic.onspeechend();waitVoice(12000);
assert.equal(run('voiceCommits.length'),1,'duplicate final callbacks never re-submit');
assert(run('voiceWanted&&listening'),'Enter never disconnects the microphone');

mic=micFresh();run('state="target"');mic.result('No.002',0,true);mic.onspeechend();waitVoice(12000);
assert.equal(run('state'),'target','target number waits for Enter too');
mic.result('エンター',1,true);assert.equal(run('state'),'lock');assert.equal(run('targetId'),2);

mic=micFresh();mic.result('ファイルグラビティNo.002',0,false);mic.onend();waitVoice(1000);
assert.equal(run('voiceCommits.length'),0,'session end preserves an interim command without executing');
assert(run('rawVoiceText().includes("グラビティ")'));
let reconnected=recognizers.at(-1);assert.notEqual(reconnected,mic);assert(run('voiceWanted&&listening'));
mic.result('エンター',1,true);assert.equal(run('voiceCommits.length'),0,'stale session callbacks cannot execute');
reconnected.result('エンター',0,false);reconnected.onend();waitVoice(1000);
assert.equal(run('voiceCommits.length'),1,'Enter survives a browser that omits its final result');
assert.equal(run('activeOrder.card.id'),'gravity-2');assert.equal(run('rawVoiceText()'),'');assert(run('voiceWanted&&listening'));

mic=micFresh();mic.result('ファイルソード',0,true);mic.onend();waitVoice(1000);
recognizers.at(-1).result('No.003',0,true);recognizers.at(-1).onend();waitVoice(1000);
recognizers.at(-1).result('ターゲット001を倒すまで',0,true);waitVoice(15000);
assert.equal(run('voiceCommits.length'),0,'conditions survive multiple reconnects and a long pause');
recognizers.at(-1).result('エンター',1,true);
assert.equal(run('activeOrder.card.id'),'sword-3');assert.equal(run('activeOrder.untilTarget'),1);
assert.equal(run('voiceCommits.length'),1);

mic=micFresh();mic.result('ファイルガンズNo.001',0,true);mic.result('リセット',1,true);
assert.equal(run('rawVoiceText()'),'');assert.equal(run('voiceCommits.length'),0);assert.equal(run('activeOrder'),null);
mic.result('エンター',2,true);assert.equal(run('voiceCommits.length'),0,'empty Enter cannot replay a reset command');
mic.result('ファイルシールドNo.002 エンター',3,true);
assert.equal(run('activeOrder.card.id'),'shield-2');assert.equal(run('voiceCommits.length'),1);

mic=micFresh();mic.result('ファイルガンズNo.001 リセット ファイルウィングNo.003 エンター',0,true);
assert.equal(run('voiceCommits.length'),1);assert.equal(run('activeOrder.card.id'),'wing-3');
mic=micFresh();mic.result('ファイルウィングNo.002 それからファイルガンズNo.003',0,true);waitVoice(12000);
assert.equal(run('activeOrder'),null,'a full multi-command draft remains unsubmitted');
mic.result('エンター',1,true);
assert.equal(run('activeOrder.card.id'),'wing-2');assert.equal(run('orderQueue[0].card.id'),'guns-3');assert.equal(run('voiceCommits.length'),1);
mic=micFresh();mic.result('ファイルソードNo.001 エンター ファイルガンズNo.002 エンター',0,true);
assert.deepEqual(Array.from(run('voiceCommits')),['ファイルソードNo.001','ファイルガンズNo.002']);
assert.equal(run('activeOrder.card.id'),'sword-1');assert.equal(run('orderQueue[0].card.id'),'guns-2','two Enter keys in one result retain both commands in order');

mic=micFresh();mic.result('ファイルガンズNo.003 エンター ファイルシールドNo.001',0,true);
assert.equal(run('voiceCommits.length'),1);assert(run('rawVoiceText().includes("シールド")'),'words after Enter form the next draft');
mic.result('エンター',1,true);assert.equal(run('voiceCommits.length'),2);assert.equal(run('activeOrder.card.id'),'guns-3');assert.equal(run('orderQueue[0].card.id'),'shield-1','a split continuation does not overwrite the first command');
mic=micFresh();mic.result('ファイルガンズNo.001',0,false);mic.result('エンター',1,true);
assert.equal(run('voiceCommits.length'),1,'a final Enter can submit an earlier unfinished result');assert.equal(run('activeOrder.card.id'),'guns-1');
mic=micFresh();run('autoTechniqueMode=true');mic.result('降りて',0,true);waitVoice(15000);
assert(run('autoTechniqueMode'),'unsubmitted words never end Auto Mode');mic.result('エンター',1,true);assert(!run('autoTechniqueMode'));

// Spoken Enter works while the browser is still emitting interim text.
mic=micFresh();mic.result('ファイルガンズNo.002',0,true);mic.result('エンター',1,false);mic.onspeechend();
assert.equal(run('voiceCommits.length'),1);
mic.result('エンター',1,true);assert.equal(run('voiceCommits.length'),1);assert.equal(run('activeOrder.card.id'),'guns-2');
mic.result('エンター',1,true);assert.equal(run('voiceCommits.length'),1);
mic=micFresh();mic.result('ファイルガンズNo.003',0,false);mic.onspeechend();waitVoice(20000);
assert.equal(run('voiceCommits.length'),0);mic.result('リセット',1,false);mic.onspeechend();
mic.result('リセット',1,true);assert.equal(run('rawVoiceText()'),'');mic.result('エンター',2,true);assert.equal(run('voiceCommits.length'),0);
// Enter submitted during the battle-entry animation keeps batch ordering too.
mic=micFresh();run('state="intro";introCommands=[]');
mic.result('ファイルウィングNo.002 エンター ファイルガンズNo.003 エンター',0,true);
assert.equal(run('introCommands.length'),2);assert.equal(run('activeOrder'),null);
run('state="battle";runIntroCommands()');assert.equal(run('activeOrder.card.id'),'wing-2');assert.equal(run('orderQueue[0].card.id'),'guns-3');
for(const [text,num,count,seconds] of [
 ['ファイルガンズ No.002 3回使って',2,3,undefined],
 ['ファイルソード No.003、2回',3,2,undefined],
 ['ファイルガンズ ナンバーゼロゼロツー スリー回',2,3,undefined],
 ['ファイルガンズ No.001 5秒間撃って',1,1,5]
]){const i=run('interpretInstruction('+JSON.stringify(text)+')');assert.equal(i.kind,'technique',text);assert.equal(i.card.num,num);assert.equal(i.spec.count,count);assert.equal(i.spec.seconds,seconds)}


// Spoken control keys must work on interim transcripts; later revisions to the
// same result may add the next instruction, but may not replay the first one.
mic=micFresh();run('state="target"');mic.result('No.002 エンター',0,false);
assert.equal(run('state'),'lock','spoken Enter selects a target without final=true');assert.equal(run('voiceCommits.length'),1);
mic.result('No.002 エンター',0,true);assert.equal(run('voiceCommits.length'),1);
mic=micFresh();mic.result('ファイルガンズNo.001 エンター',0,false);assert.equal(run('voiceCommits.length'),1);
mic.result('ファイルガムズNo.001 エンター ファイルソートNo.003',0,false);
assert.equal(run('voiceCommits.length'),1);assert.equal(run('rawVoiceText()').trim(),'ファイルソートNo.003','a revised tail stays raw');
mic.result('ファイルガムズNo.001 エンター ファイルソートNo.003 エンター',0,true);
assert.equal(run('voiceCommits.length'),2);assert.equal(run('activeOrder.card.id'),'guns-1','the first instruction is retained');assert.equal(run('orderQueue[0].card.id'),'sword-3','the new command follows the first');
mic.result('ファイルガムズNo.001 エンター ファイルソートNo.003 エンター',0,true);assert.equal(run('voiceCommits.length'),2);
for(const key of ['エンター','えんたー','エンタ','エン ター','ｴﾝﾀｰ','Enter','Ｅｎｔｅｒ']){
 mic=micFresh();mic.result('ファイルガンズNo.001',0,false);mic.result(key,1,false);
 assert.equal(run('voiceCommits.length'),1,'spoken control '+key);assert.equal(run('activeOrder.card.id'),'guns-1');
 assert(run('listening&&voiceWanted'),'spoken Enter keeps the microphone connected');
}
mic=micFresh();mic.result('ファイルガンズNo.003',0,false);mic.result('リセット',1,false);
assert.equal(run('rawVoiceText()'),'','spoken Reset clears interim input immediately');mic.result('エンター',2,false);assert.equal(run('voiceCommits.length'),0);

// Raw recognition is never filtered, replaced with a preferred alternative,
// corrected or even passed to the semantic correction function while listening.
mic=micFresh();run('savedLiveCorrection=correctVoiceCommand;captureCorrections=0;correctVoiceCommand=function(text){captureCorrections++;return savedLiveCorrection(text)}');
const primary='ファイる ガムズ ナンバーゼロゼロツー';
mic.results[0]={0:{transcript:primary},1:{transcript:'ファイルガンズNo.002'},length:2,isFinal:false};mic.onresult({resultIndex:0,results:mic.results});
assert.equal(run('rawVoiceText()'),primary);assert.equal(els.voicestatus.textContent,'エンター待ち：'+primary);assert.equal(run('captureCorrections'),0);
mic.result(primary,0,true);assert.equal(run('rawVoiceText()'),primary);assert.equal(run('captureCorrections'),0);
mic.result('3回使って',1,false);assert.equal(run('captureCorrections'),0);mic.result('エンター',2,false);
assert(run('captureCorrections>0'),'correction begins only during execution');assert.equal(run('activeOrder.card.id'),'guns-2');assert.equal(run('activeOrder.remaining'),3);
run('correctVoiceCommand=savedLiveCorrection');
mic=micFresh();mic.result('全然わからない言葉でも そのまま',0,false);
assert.equal(run('rawVoiceText()'),'全然わからない言葉でも そのまま');assert.equal(els.voicestatus.textContent,'エンター待ち：全然わからない言葉でも そのまま');
mic.onend();waitVoice(1000);assert.equal(run('rawVoiceText()'),'全然わからない言葉でも そのまま','unknown words survive reconnect too');assert.equal(run('voiceCommits.length'),0);
console.log('PASS immediate spoken Enter/Reset, no final event required, same-result trailing revisions, verbatim raw input and correction only on execution.');

// Some engines replace their result list instead of retaining the previous
// utterance. A consumed Enter must not consume the next utterance at index 0.
mic=micFresh();mic.result('オートモード エンター',0,true);
assert(run('autoTechniqueMode'));
mic.onspeechend();mic.onspeechstart();mic.results=[];
mic.result('ファイる ガムズ ナンバーゼロゼロツー',0,false);
assert.equal(run('rawVoiceText()'),'ファイる ガムズ ナンバーゼロゼロツー','fresh speech after Auto Mode is never treated as consumed');
assert(run('autoTechniqueMode'),'a fresh draft does not execute until spoken Enter');
mic.result('ファイる ガムズ ナンバーゼロゼロツー エンター',0,true);
assert.equal(run('voiceCommits.length'),2);assert(!run('autoTechniqueMode'));
assert.equal(run('activeOrder.card.id'),'guns-2');

// Recycled final slots can arrive without speechstart, and a new utterance may
// be identical to the last one. Neither case may be silently discarded.
mic=micFresh();mic.result('オートモード エンター',0,true);
mic.result('ファイルシールドNo.001 エンター',0,true);
assert.equal(run('voiceCommits.length'),2);assert.equal(run('activeOrder.card.id'),'shield-1');
mic.onspeechend();mic.onspeechstart();mic.result('ファイルシールドNo.001 エンター',0,true);
assert.equal(run('voiceCommits.length'),3,'identical fresh speech executes once more');
mic.result('ファイルシールドNo.001 エンター',0,true);assert.equal(run('voiceCommits.length'),3,'its duplicate callback does not execute again');
mic=micFresh();mic.result('オートモード',0,true);mic.result('エンター',1,true);
mic.results=[{0:{transcript:'ファイルガンズNo.002'},isFinal:true},{0:{transcript:'エンター'},isFinal:true}];
mic.onresult({resultIndex:0,results:mic.results});
assert.equal(run('voiceCommits.length'),2,'an entire recycled list including the same Enter is fresh');assert.equal(run('activeOrder.card.id'),'guns-2');
mic=micFresh();mic.result('オートモード エンター',0,true);mic.onspeechend();mic.onspeechstart();
mic.result('オートモード エンター ファイルガンズNo.001',0,false);
mic.result('オートモード エンター ファイルガムズNo.001 エンター',0,true);
assert.equal(run('voiceCommits.length'),2,'cumulative next-utterance revisions do not replay Auto Mode');assert.equal(run('activeOrder.card.id'),'guns-1');
mic=micFresh();mic.result('ファイルガンズ',0,true);mic.onspeechend();mic.onspeechstart();mic.result('ナンバー002',0,true);
assert.equal(run('rawVoiceText()'),'ファイルガンズ ナンバー002','recycled unsubmitted final speech is retained');
mic.result('エンター',1,false);assert.equal(run('activeOrder.card.id'),'guns-2');

// A transport error or audio end without onend must reconnect with the raw
// draft intact. No recovery timer is an implicit Enter.
for(const event of ['network','no-speech','audioend']){
 mic=micFresh();mic.result('ファイルソート ナンバーゼロゼロ二',0,false);
 if(event==='audioend')mic.onaudioend();else mic.onerror({error:event});
 waitVoice(2000);reconnected=recognizers.at(-1);assert.notEqual(reconnected,mic,event+' reconnects without an end callback');
 assert(run('voiceWanted&&listening'));assert.equal(run('rawVoiceText()'),'ファイルソート ナンバーゼロゼロ二');assert.equal(run('voiceCommits.length'),0);
 mic.result('リセット',1,true);assert.equal(run('rawVoiceText()'),'ファイルソート ナンバーゼロゼロ二','late old callbacks are ignored');
 reconnected.result('エンター',0,false);assert.equal(run('activeOrder.card.id'),'sword-2');assert.equal(run('voiceCommits.length'),1);
}
mic=micFresh();mic.result('ファイル ガムズ',0,false);waitVoice(46000);
assert.notEqual(recognizers.at(-1),mic,'silent stuck recognizer is renewed');assert.equal(run('voiceCommits.length'),0);
assert.equal(run('rawVoiceText()'),'ファイル ガムズ');recognizers.at(-1).result('ナンバー002 エンター',0,true);assert.equal(run('activeOrder.card.id'),'guns-2');
mic=micFresh();mic.onspeechstart();mic.result('まだ話している言葉',0,false);waitVoice(90000);
assert.notEqual(recognizers.at(-1),mic,'a stuck speechstart flag cannot prevent transport recovery');assert.equal(run('rawVoiceText()'),'まだ話している言葉');
recognizers.at(-1).result('リセット',0,false);assert.equal(run('rawVoiceText()'),'');
mic=micFresh();mic.onspeechstart();
for(let i=0;i<8;i++){mic.result('話を続けている '+i,0,false);waitVoice(15000);assert.equal(recognizers.at(-1),mic,'ongoing result delivery never tears down a live utterance')}

// The mic is owned by the user's switch, not encounter state or animations.
mic=micFresh();mic.result('まだ指示の途中',0,false);
run('reset(false)');assert.equal(recognizers.at(-1),mic);assert(run('voiceWanted&&listening'));assert.equal(run('rawVoiceText()'),'まだ指示の途中','retry cannot erase an unfinished instruction');
for(const outcome of ['win','lose']){
 run('state="battle";'+(outcome==='win'?'bugs.forEach(b=>b.hp=0)':'hp=0')+';checkEnd()');assert.equal(run('state'),outcome);assert(run('voiceWanted&&listening'));
 mic.onend();waitVoice(1500);mic=recognizers.at(-1);assert(run('voiceWanted&&listening'),'recognition reconnects on the result screen');
 mic.result('結果画面でも声を拾う',0,false);assert(run('rawVoiceText().includes("結果画面でも声を拾う")'));run('reset(false)');
}
mic=micFresh();mic.result('ファイルガンズ',0,false);
context.document.hidden=true;listeners.visibilitychange();assert(run('voiceWanted&&listening'),'background visibility never stops a live microphone');assert.equal(run('rawVoiceText()'),'ファイルガンズ');
waitVoice(5000);context.document.hidden=false;listeners.visibilitychange();mic=recognizers.at(-1);assert(run('voiceWanted&&listening'),'foreground automatically restores capture');
mic.result('ナンバー002',mic.results.length,false);assert(run('rawVoiceText().includes("ナンバー002")'),'paused combat still accepts raw voice');run('pause()');mic.result('エンター',mic.results.length,false);assert.equal(run('activeOrder.card.id'),'guns-2');
mic=micFresh();mic.onerror({error:'audio-capture'});waitVoice(2000);assert.notEqual(recognizers.at(-1),mic);assert(run('voiceWanted&&listening'),'a temporary capture interruption is retried');
mic=micFresh();mic.result('許可前の入力',0,false);mic.onerror({error:'not-allowed'});waitVoice(3000);assert(run('voiceWanted&&!listening'));assert.equal(run('rawVoiceText()'),'許可前の入力');
run('startVoice()');assert(run('voiceWanted&&listening'),'permission retry keeps the original draft');
mic=micFresh();run('semanticExceptionCommand=runCommand;runCommand=()=>{throw new Error("semantic failure")}');
mic.result('失敗する指示 エンター',0,false);assert(run('voiceWanted&&listening'));assert.equal(run('rawVoiceText()'),'');run('runCommand=semanticExceptionCommand');
mic.result('ファイルガンズNo.002 エンター',1,false);assert.equal(run('activeOrder.card.id'),'guns-2','a command exception never blocks the next speech');
// Raw intake finishes before expensive interpretation starts, even in one event.
mic=micFresh();mic.results=[{0:{transcript:'ファイルガンズNo.001 エンター 続く声'},isFinal:false}];
mic.resultHandler({resultIndex:0,results:mic.results});assert.equal(run('voiceCommits.length'),0,'interpretation is outside the recognition callback');assert.equal(run('rawVoiceText()'),'続く声');waitVoice(0);assert.equal(run('voiceCommits.length'),1);
run('stopVoice()');waitVoice(60000);assert(!run('voiceWanted||listening'),'only explicit mic off disables automatic recovery');
mic=micFresh();mic.result('オートモード エンター',0,false);mic.result('別の新しい言葉をそのまま受信',0,false);
assert.equal(run('rawVoiceText()'),'別の新しい言葉をそのまま受信','reused interim slots without speechstart or final are never silently swallowed');
run('stopVoice();captureAcquisitions=0;captureTracks=[];navigator={userAgent:"iPhone",mediaDevices:{getUserMedia:()=>{captureAcquisitions++;const track={readyState:"live",muted:false,stop(){this.readyState="ended"}};captureTracks.push(track);return Promise.resolve({getTracks:()=>[track]})}}};state="battle";startVoice()');
await Promise.resolve();await Promise.resolve();mic=recognizers.at(-1);assert(run('voiceWanted&&listening'));assert.equal(run('captureAcquisitions'),1);
mic.result('ファイルソード',0,false);run('captureTracks[0].muted=true;captureTracks[0].onmute()');assert(!run('listening'));run('captureTracks[0].muted=false;captureTracks[0].onunmute()');waitVoice(2000);assert(run('listening'));assert.equal(run('captureAcquisitions'),1,'a short interruption reuses the held input');
run('captureTracks[0].readyState="ended";captureTracks[0].onended()');waitVoice(500);await Promise.resolve();await Promise.resolve();assert.equal(run('captureAcquisitions'),2);assert(run('voiceWanted&&listening'));assert.equal(run('rawVoiceText()'),'ファイルソード','hardware track replacement preserves raw draft');
mic=recognizers.at(-1);mic.result('No.002 エンター',0,false);assert.equal(run('activeOrder.card.id'),'sword-2');
run('captureTracks[1].muted=true;captureTracks[1].onmute()');waitVoice(2000);await Promise.resolve();await Promise.resolve();assert.equal(run('captureAcquisitions'),3,'permanently muted hardware input is reacquired automatically');assert(run('voiceWanted&&listening'));
run('stopVoice();navigator={}');
console.log('PASS microphone ownership across retries/results/visibility, capture interruption, stuck speech flags, live utterances and interpretation exceptions.');


// Command corrections belong to execution, including Auto Mode misspellings,
// ordinary phrasing and each of the six file families with mixed digit forms.
for(const text of ['アートモード','オート モードにして','オートモードを開始','自動で技を選んで戦って','auto mode']){
 mic=micFresh();mic.result(text,0,false);assert.equal(run('rawVoiceText()'),text);assert(!run('autoTechniqueMode'));
 mic.result('エンター',1,false);assert(run('autoTechniqueMode'),text+' corrected at submission');
}
for(const [spoken,file] of [['ファイる ソート','sword'],['ファイる 感図','guns'],['ファイる シルド','shield'],['ファイる ウイング','wing'],['ファイる クラビティ','gravity'],['ファイる エリヤ','area']]){
 mic=micFresh();mic.result(spoken+' ナンバーゼロゼロツー',0,false);
 assert.equal(run('rawVoiceText()'),spoken+' ナンバーゼロゼロツー');assert.equal(run('activeOrder'),null);
 mic.result('エンター',1,false);assert.equal(run('activeOrder.card.id'),file+'-2');
}
mic=micFresh();run('automationEnabled=true;bugs.forEach(b=>b.hp=b.max=5000)');
for(let cycle=0;cycle<12;cycle++){
 mic.onspeechend();mic.onspeechstart();mic.results=[];mic.result('オートモード エンター',0,true);run('advance(.8)');
 assert(run('autoTechniqueMode&&voiceWanted&&listening'));
 mic.onspeechend();mic.onspeechstart();mic.results=[];mic.result('ファイル ガムズ ナンバーゼロゼロツー',0,false);
 assert.equal(run('rawVoiceText()'),'ファイル ガムズ ナンバーゼロゼロツー');assert(run('autoTechniqueMode'));
 mic.result('ファイル ガムズ ナンバーゼロゼロツー エンター',0,true);assert(!run('autoTechniqueMode'));
 assert.equal(run('voiceCommits.length'),(cycle+1)*2);run('advance(.8)');assert(run('voiceWanted&&listening'));
}
console.log('PASS recycled result slots after Auto Mode, duplicate/fresh utterances, raw draft recovery without onend, idle/active-speech health checks, six-family execution correction and twelve live Auto Mode/manual cycles.');

run('stopVoice();runCommand=savedMicrophoneCommand');
console.log('PASS Enter-only submission, long pauses, interim/final revisions, reconnects, reset, targets, multiple commands, trailing drafts and stale callback rejection.');


// Midboss uses a real two-cell footprint, and keeps the entry battery on retries.
fresh(false);run('energy=61;hp=137;bugs.forEach(b=>b.hp=0);checkEnd()');
assert.equal(run('state'),'win');assert(!els.nextEnemy.classList.contains('hidden'));
assert.equal(run('bossArtState'),'ready');els.nextEnemy.onclick();
assert.equal(run('hp'),137,'remaining HP carried to boss');assert.equal(run('encounter'),'boss');assert.equal(run('energy'),61);assert.equal(run('bugs.length'),1);
assert.equal(run('bugs[0].hp'),150);assert.equal(run('state'),'intro');
run('automationEnabled=false;enemyAutomationEnabled=false;advance(2.2)');assert.equal(run('state'),'target');
run('runCommand("No.001");advance(.8);stopVoice()');assert.equal(run('state'),'battle');
assert.equal(run('energy'),61);run('hp=30;reset(false)');assert.equal(run('hp'),137,'retry preserves original carried HP checkpoint');assert(els.nextEnemy.classList.contains('hidden'));
function bossFresh(){run('encounter="boss";encounterBattery=61;encounterHP=200;reset(false);stopVoice();automationEnabled=false;enemyAutomationEnabled=false')}
bossFresh();run('energy=24;reset(false)');assert.equal(run('energy'),61,'retry restores checkpoint, never recharges to 100');
bossFresh();assert.deepEqual(Array.from(run('bugCells(bugs[0])'),p=>p.c),[4,5]);
run('applyArea(files.area[3])');assert(!run('isHole(4,1)'));assert(!run('isHole(5,1)'));
assert(!run('bugCanMove(bugs[0],4,0,0)'),'two-cell ground boss cannot move into holes');
assert(run('bugCanMove(bugs[0],4,0,1)'),'flying boss can cross holes');
assert(!run('bugCanMove(bugs[0],5,1,1)'),'rear cell cannot leave the board');
bossFresh();run('col=3;row=1;zeroFacing=1;immediateActivate(files.sword[2]);advance(.18)');
assert.equal(run('bugs[0].hp'),130,'horizontal sword hits two-cell boss once');
bossFresh();run('bullets=[{c:5.8,r:1,layer:0,dir:-1,speed:12,damage:10,enemy:false}];advance(.12)');
assert.equal(run('bugs[0].hp'),140,'shot can hit the rear cell from the right');
bossFresh();run('gravityDrops=[{num:1,c:5,r:1,cells:[{c:5,r:1}],damage:5,stun:0,age:.8,duration:1.12,hit:new Set(),impact:false}];tickField(.13)');
assert.equal(run('bugs[0].hp'),145,'gravity hits the rear occupied cell');
console.log('PASS next encounter, battery checkpoint, two-cell ownership/holes and damage.');
bossFresh();run('hit(bugs[0],75)');assert.equal(run('bugs[0].layer'),0,'exactly half stays grounded');
run('submitOrder(files.sword[0],{untilTarget:1});hit(bugs[0],1)');assert.equal(run('bugs[0].layer'),1);assert(run('poisonActive'));
assert.equal(run('activeOrder'),null,'unreachable repeat order clears when the boss takes off');
run('settlePhase();hitstop=0;shield=999;shieldTime=100;invuln=100;advance(1.01)');assert.equal(run('hp'),197,'ground poison applies exactly 3 per second through armor');
run('beginTarget();advance(3)');assert.equal(run('hp'),197,'TARGET pauses poison');
run('state="paused";advance(3)');assert.equal(run('hp'),197,'pause freezes poison');
run('state="battle";layer=1;advance(1)');assert.equal(run('hp'),197,'air layer is safe');
assert.equal(run('bugs[0].hp'),74,'boss is immune to its own poison');
for(const targetLayer of [0,1]){
 bossFresh();run('layer='+targetLayer+';bugs[0].layer='+targetLayer+';beginBossAttack(bugs[0],"blast");tickBossWorld(1.16)');
 assert.equal(run('hp'),170,'explosion can strike layer '+targetLayer);
}
bossFresh();run('beginBossAttack(bugs[0],"blast");row=0;tickBossWorld(1.16)');assert.equal(run('hp'),200,'explosion is avoidable outside telegraphed row');
bossFresh();run('enemyAutomationEnabled=true;col=0;row=1;layer=1;beginBossAttack(bugs[0],"suction");tickMidboss(bugs[0],.81);tickMidboss(bugs[0],.4)');
assert.equal(run('col'),2,'strong suction rapidly pulls Zero to the front');
assert.equal(run('hp'),200,'suction does not deal remote damage');run('advance(.6)');assert(run('zeroBound()'),'front-row capture');assert.equal(run('col'),2);
run('enemyAutomationEnabled=false;bugs[0].bindAge=0;window.hurtSounds=0;window.originalSfx=sfx;sfx=function(k){if(k==="hurt")window.hurtSounds++;window.originalSfx(k)};state="paused";tick(2)');assert.equal(run('bugs[0].bindAge'),0);run('state="battle";advance(.95)');assert.equal(run('hp'),200,'first pulse waits a full second');
run('advance(.1)');assert.equal(run('hp'),190);
run('cancelOrders();move(-1,0);land()');assert.equal(run('col'),2);assert.equal(run('layer'),1);assert.equal(run('activate(files.wing[0])'),false);
run('advance(1)');assert.equal(run('hp'),180);run('advance(1)');assert.equal(run('hp'),170);assert(!run('zeroBound()'));assert.equal(run('window.hurtSounds'),3);run('sfx=window.originalSfx');
for(const r of [0,2])for(const l of [0,1]){bossFresh();run('row='+r+';layer='+l+';col=0;enemyAutomationEnabled=true;beginBossAttack(bugs[0],"suction");advance(1.6)');assert.equal(run('col'),2,'all rows/layers pull to own front');assert(!run('zeroBound()'),'other rows avoid mouth');}

bossFresh();run('hit(bugs[0],76);hit(bugs[0],100);checkEnd()');assert.equal(run('state'),'win');
assert(!els.restartAll.classList.contains('hidden'));assert(!els.retry.classList.contains('hidden'));assert(!run('poisonActive'));assert(!els.nextEnemy.classList.contains('hidden'));assert(!run('startNextEncounter()'));
run('hp=1;state="battle";bugs=[createMidboss()];poisonActive=true;tickBossWorld(1)');assert.equal(run('state'),'lose','poison can finish the battle');
console.log('PASS strict half-HP flight, poison cadence/freeze, cross-layer blast/suction and cleanup.');
bossFresh();run('automationEnabled=true;enemyAutomationEnabled=true;runCommand("オートモード");advance(120)');
assert.equal(run('state'),'win','autonomous fight can finish both boss phases');
assert(run('energy>=0&&energy<=61'),'autonomous boss fight respects carried battery');
console.log('PASS complete autonomous midboss battle:',JSON.stringify(run('({seconds:elapsed,hp,battery:energy})')));
if(process.env.ZERO_SCREENSHOT){
 bossFresh();render('zero_boss_ground');
 run('col=2;startBossBinding(bugs[0]);tickBossBinding(bugs[0],1.05)');render('zero_boss_bound');bossFresh();
 run('hurt(20);hitstop=0;advance(.1);effects.push({kind:"bossBlast",...pos(3,1),life:.55,max:.75})');render('zero_boss_impact');
 run('hit(bugs[0],76);hitstop=0;settlePhase();advance(2);bossPhaseFlash=0');render('zero_boss_air');
}
bossFresh();run('col=2;holding=true;charge=.7;hurt(20)');
assert.equal(run('hp'),180);assert(run('hurtTime>0'));assert.equal(run('col'),1);assert.equal(run('charge'),0);
assert.equal(run('zeroAnimationFrame().frame'),15);assert.equal(run('fire()'),false);assert.equal(run('activate(files.wing[0])'),false);
run('cancelOrders();move(1,0)');assert.equal(run('col'),1,'new voice command cannot cancel stagger');
run('advance(.7)');assert.equal(run('hurtTime'),0);assert(run('activate(files.wing[0])'));run('advance(.7)');assert.equal(run('layer'),1);
run('poisonActive=true;advance(1)');assert.equal(run('hp'),180,'actual wing prevents poison');
run('land();advance(1.1)');assert.equal(run('hp'),177);assert.equal(run('hurtTime'),0,'poison allows escape commands');
bossFresh();run('hp=55;energy=9;bugs[0].hp=0;checkEnd()');els.retry.onclick();assert.equal(run('hp'),200);assert.equal(run('energy'),61);
run('state="win"');els.restartAll.onclick();assert.equal(run('encounter'),'skirmish');assert.equal(run('hp'),200);assert.equal(run('energy'),100);
console.log('PASS stagger, wing escape, checkpoint retry and full restart.');
// Front-column ownership must be resolved before filtering occupied cells.
for(const n of [0,1,2]){
 fresh(false);run('bugs=[{id:1,type:"spider",c:3,r:0,layer:0,hp:40},{id:2,type:"spider",c:3,r:2,layer:0,hp:40}]');
 assert.equal(run('areaCandidates(files.area['+n+']).length'),1);assert.equal(run('tacticalBlock(files.area['+n+'])'),'');
 run('applyArea(files.area['+n+'])');assert.equal(run('panelOwners.filter(o=>o==="zero").length'),10);assert.equal(run('panelOwners[cellId(4,1)]'),'bugs');
 fresh(false);run('bugs=[];panelOwners[cellId(3,0)]=panelOwners[cellId(3,2)]="zero";applyArea(files.area['+n+'])');
 assert.equal(run('panelOwners.filter(o=>o==="zero").length'),12);assert.equal(run('panelOwners[cellId(4,1)]'),'bugs');
}
bossFresh();run('bugs[0].c=3;bugs[0].r=0;row=2;col=2;beginBossAttack(bugs[0],"blast")');
assert.deepEqual(Array.from(run('bossHazards[0].cells'),p=>[p.c,p.r]),[[0,0],[1,0],[2,0]]);
run('tickBossWorld(1.16)');assert.equal(run('hp'),200,'blast does not follow Zero row');
bossFresh();run('bugs[0].layer=1;beginBossAttack(bugs[0],"blast");tickBossWorld(1.16)');assert.equal(run('hp'),170,'cross-layer blast hits all Zero panels');
const paths=[];
for(let trial=0;trial<3;trial++){
 bossFresh();run('enemyAutomationEnabled=true;bugs[0].cd=1000');const visited=new Set(),path=[];
 for(let i=0;i<500;i++){run('tickMidboss(bugs[0],.2)');const p=run('bugs[0].c+","+bugs[0].r');visited.add(p);path.push(p)}
 assert.equal(new Set([...visited].map(p=>p.split(',')[1])).size,3,'boss reaches all three rows');paths.push(path.join(';'));
}
assert.equal(new Set(paths).size,3,'retry does not rewind movement randomness');
bossFresh();run('moveBug(bugs[0],3,1);bugs[0].motion.duration=.42;tickMidboss(bugs[0],.1)');const groundAge=run('bugs[0].motion.age');
bossFresh();run('bugs[0].phase=2;bugs[0].layer=1;moveBug(bugs[0],3,1);bugs[0].motion.duration=.42;tickMidboss(bugs[0],.1)');assert.equal(run('bugs[0].motion.age'),groundAge*1.15);
fresh(false);run('appearance.body="guns";appearance.guns=2;pose="shoot";poseTime=.3;loadout.weapon=files.guns[1];bugs.forEach(b=>b.hp=0);checkEnd();advance(.95)');
assert.equal(run('appearance.body'),'guns');assert.equal(run('pose'),'shoot');assert.equal(run('poseTime'),.3);
console.log('PASS frontier partial capture, committed blast lanes, random boss paths, exact 1.25 movement and final pose retention.');
for(let n=1;n<=3;n++){
 fresh(false);run('appearance.body="guns";appearance.guns='+n+';pose="shoot";poseTime=.25');
 assert.equal(run('zeroAnimationFrame().sheet'),'gunsMotion');assert.equal(run('zeroAnimationFrame().frame'),(n-1)*3+2);
 if(process.env.ZERO_SCREENSHOT)render('zero_guns_'+n);
}
if(process.env.ZERO_SCREENSHOT){bossFresh();run('bugs[0].layer=1;bugs[0].phase=2;bugs[0].r=0');render('zero_boss_air_top');}
bossFresh();run('hit(bugs[0],76);hitstop=0;automationEnabled=true;runCommand("オートモード");settlePhase();advance(1.6)');assert.equal(run('layer'),1,'auto escapes ground poison with Wing');assert(run('Object.keys(equipmentUses).some(k=>k.startsWith("wing-"))'));
run('runCommand("ファイルガンズNo.001")');assert.equal(run('autoTechniqueMode'),false,'manual instruction ends auto mode');
bossFresh();run('automationEnabled=true;bugs[0].hp=bugs[0].max=5000;runCommand("オートモード");advance(35)');
const families=new Set(Object.keys(run('equipmentUses')).map(k=>k.split('-')[0]));for(const family of ['guns','sword','gravity','area','shield'])assert(families.has(family),'auto used '+family);
for(const bossLayer of [0,1])for(const zeroRow of [0,1,2]){
 bossFresh();run('bugs[0].layer='+bossLayer+';layer='+(1-bossLayer)+';row='+zeroRow+';beginBossAttack(bugs[0],"blast")');
 assert.equal(run('bossHazards[0].cells.length'),9);run('tickBossWorld(1.16)');assert.equal(run('hp'),170);
}
bossFresh();run('enemyAutomationEnabled=false;moveBug(bugs[0],3,1);bugs[0].motion.duration=.42;tickMidboss(bugs[0],.1)');assert.equal(run('bugs[0].motion.age'),.125,'normal boss speed is previous enraged speed');
for(const type of ['bee','fly','grenade']){
 bossFresh();run('bugs[0].type='+JSON.stringify(type)+';bugs[0].layer=1;bugs[0].r=0;bugs[0].motion=null');const y0=run('bugPosition(bugs[0]).y');run('bugs[0].r=1');assert(Math.abs(run('bugPosition(bugs[0]).y')-y0-38)<1e-8,'air row spacing '+type);
}
const renderSource=fs.readFileSync(root+'render.js','utf8');assert(!renderSource.includes('ABANDONED CITY'));assert(!renderSource.includes('GROUND LINK'));assert(!renderSource.includes('空中 AIR'));assert(renderSource.indexOf('drawCommandReceipt()')<renderSource.indexOf('const actors='),'receipt behind characters');
fresh(false);run('window.gotchaCount=0;playGotcha=()=>window.gotchaCount++;runCommand("ファイルガンズNo.001")');assert.equal(run('window.gotchaCount'),1);run('runCommand("ファイルガンズNo.099")');assert.equal(run('window.gotchaCount'),1,'invalid command has no acknowledgement');
if(process.env.ZERO_SCREENSHOT){fresh(false);run('bugs=bugs.slice(0,3);row=0;layer=1;appearance.wing=1;flight=1;receipt={card:files.wing[0],until:commandClock+3}');render('zero_clean_air_hud');bossFresh();run('bugs[0].layer=1;bugs[0].r=0');render('zero_clean_boss_hud');}
console.log('PASS varied auto tactics, priority Wing, manual override, both cross-layer blast directions, new speed, air spacing, HUD stacking and gotcha acknowledgement.');
fresh(false);run('bugs=[];for(let r=0;r<3;r++)for(let c=3;c<5;c++)panelOwners[cellId(c,r)]="zero"');
assert.equal(run('areaCandidates(files.area[0]).length'),0,'the last enemy column is protected');
assert.equal(run('panelOwners.filter(x=>x==="zero").length'),15);
fresh(false);run('bugs=[];applyArea(files.area[2])');
assert.equal(run('capturedPanels.size'),3);assert.equal(run('capturedPanels.get(cellId(3,1))'),15);
run('col=3;tickField(10.01)');assert.equal(run('panelOwners[cellId(3,1)]'),'zero');
assert.equal(run('capturedPanels.get(cellId(3,1))<5'),true,'capture warning starts at ten seconds');
run('tickField(5.1)');assert.equal(run('panelOwners.filter(x=>x==="zero").length'),12,'held column remains while Zero stands on it');
run('col=2;tickField(.02)');assert.equal(run('panelOwners.filter(x=>x==="zero").length'),9,'all expired cells return after Zero retreats');
fresh(false);run('bugs=[];for(let r=0;r<3;r++){panelOwners[cellId(3,r)]="zero";panelOwners[cellId(4,r)]="zero";capturedPanels.set(cellId(3,r),0);capturedPanels.set(cellId(4,r),0)};col=4;tickField(.02)');
assert.equal(run('panelOwners.filter(x=>x==="zero").length'),15,'all panels behind Zero stay available');
run('col=3;tickField(.02)');assert.equal(run('panelOwners.filter(x=>x==="zero").length'),12,'rightmost captured column returns first');
run('col=2;tickField(.02)');assert.equal(run('panelOwners.filter(x=>x==="zero").length'),12,'rear column must wait until its own warning expires');
assert.equal(run('capturedPanels.get(cellId(3,1))>4.9'),true,'rear warning starts only after front returns');
run('tickField(5.1)');assert.equal(run('panelOwners.filter(x=>x==="zero").length'),9,'rear column reverts after warning');
fresh(false);run('bugs=[];panelOwners[cellId(3,1)]="zero";panelOwners[cellId(3,2)]="zero"');
assert.deepEqual(Array.from(run('areaCandidates(files.area[2])'),p=>[p.c,p.r]),[[3,0]],'remaining cell of the current column takes precedence');
run('applyArea(files.area[2])');assert.equal(run('panelOwners[cellId(4,0)]'),'bugs','do not skip forward to another column');
bossFresh();run('bugs[0].layer=1;bugs[0].r=0');
run('window.bossDraw=[];const previousBossDraw=g.drawImage;g.drawImage=function(...args){window.bossDraw.push(args);return previousBossDraw.apply(this,args)};drawMidboss(bugs[0],350,100,false);g.drawImage=previousBossDraw');
assert.equal(run('window.bossDraw.at(-1)[3]'),run('Math.round(MIDBOSS_WIDTH*animationSheets.boss.frames[4].width/animationSheets.boss.frames[0].width)'),'air sprite retains ground art scale');
bossFresh();run('enemyAutomationEnabled=true;bugs[0].cd=0;bugs[0].stepWait=10;Math.random=()=>.64;tickMidboss(bugs[0],.02)');assert.equal(run('bugs[0].attack'),'blast','65% branch blasts');
bossFresh();run('enemyAutomationEnabled=true;bugs[0].cd=0;bugs[0].stepWait=10;Math.random=()=>.65;tickMidboss(bugs[0],.02)');assert.equal(run('bugs[0].attack'),'suction','remaining 35% branch suctions');math.random=randomizedMovement;
console.log('PASS shield placement, area cap and timed retreat, boss blast weighting, youthful acknowledgement asset.');
fresh(false);run('row=1;col=1;pose="sword";poseTime=.5;actionLock=.3;moveCd=0;pendingMove=null');
run('advance(.32);move(1,0,false)');assert.equal(run('col'),1,'sword cannot be cancelled by movement after the shorter action lock');
run('advance(.19);move(1,0,false)');assert.equal(run('col'),2,'movement resumes after the swing finishes: '+JSON.stringify(run('({state,pose,poseTime,actionLock,moveCd,groundTrapped:groundTrapped()})')));
fresh(false);run('row=1;col=1;pose="shoot";poseTime=.3;actionLock=0;moveCd=0');
run('move(1,0,false)');assert.equal(run('col'),1,'gun animation cannot be cancelled');
fresh(false);run('row=1;col=1;pose="sword";poseTime=.5;actionLock=.3;cancelOrders("指示を解除");move(1,0,false)');
assert.equal(run('col'),1,'voice cancellation does not release an attack pose');
fresh(false);run('row=1;col=1;layer=1;pose="shoot";poseTime=.3;actionLock=0;land()');
assert.equal(run('layer'),1,'landing cannot cancel a shot');
fresh(true);run('enemyAutomationEnabled=false;movementEnabled=false;bugs=[{id:1,type:"spider",c:2,r:1,layer:0,hp:90,max:90,cd:100,tell:0,hit:0,stun:0}];row=1;col=1;targetId=1;submitOrder(files.sword[0])');
run('advance(.06)');assert(run('transformation?.card.file')==='sword','sword transformation begins');
run('submitOrder(files.guns[0])');assert.equal(run('orderQueue.length'),1,'new instruction waits behind committed sword');
run('advance(.72)');assert.equal(run('equipmentUses[files.sword[0].id]'),1,'sword strike completes even when a new file is ordered');
assert(run('bugs[0].hp<90'),'committed sword deals damage');
console.log('PASS attack poses lock movement, command cancellation and landing until recovery.');
lane();run('submitOrder(files.sword[0]);advance(.06)');
assert.equal(run('techniqueLock.stage'),'windup','file activation immediately commits Zero to the tile');
const committedCol=run('col');run('move(-1,0,false);beginMove(1,row);autoBattle(.2)');
assert.equal(run('col'),committedCol,'manual, direct and automatic movement cannot cancel windup');
run('advance(.18)');assert.equal(run('col'),committedCol);assert(run('techniqueLock'),'windup remains locked until execution');
run('advance(.06)');assert.equal(run('equipmentUses[files.sword[0].id]'),1,'committed sword executes');
assert.equal(run('techniqueLock.stage'),'recovery');run('move(-1,0,false);advance(.16)');
assert.equal(run('col'),committedCol,'recovery cannot be cancelled by movement');
run('movementEnabled=false;advance(.35)');assert.equal(run('techniqueLock'),null,'lock ends after complete motion');
lane();run('submitOrder(files.sword[0]);advance(.06)');assert.equal(run('techniqueLock.stage'),'windup');
run('automationEnabled=false;hurt(10)');assert.equal(run('techniqueLock'),null,'real damage cancels the commitment');
assert.equal(run('transformation'),null,'damage cancels the pending windup');
run('advance(.2)');assert(!run('equipmentUses[files.sword[0].id]'),'canceled windup never strikes');
lane();run('submitOrder(files.sword[0]);advance(.06)');
run('bugs.find(b=>b.id===3).r=0;movementEnabled=true;advance(.29)');
assert.equal(run('equipmentUses[files.sword[0].id]'),1,'an enemy moving out of range cannot cancel the committed strike');
assert.equal(run('col'),2,'Zero stays on the committed tile even when the target moves');
run('movementEnabled=false;advance(.6)');assert.equal(run('techniqueLock'),null,'missed strike still completes recovery');
console.log('PASS complete file commitment from deployment through strike and recovery, with damage cancellation.');
// ERROR's air head and ground T shape intentionally occupy different layers.
run('encounter="error";reset(false);automationEnabled=false;enemyAutomationEnabled=false');
assert.equal(run('bugs[0].hp'),500);assert.equal(run('bugs[0].type'),'error');
assert.deepEqual(Array.from(run('enemyHitCells(bugs[0],0)'),p=>[p.c,p.r]),[[4,1],[5,1]]);
assert.deepEqual(Array.from(run('enemyHitCells(bugs[0],1)'),p=>[p.c,p.r]),[[3,1]]);
run('bugs[0].r=0');assert.deepEqual(Array.from(run('enemyHitCells(bugs[0],0)'),p=>[p.c,p.r]),[[4,0],[5,0]]);
run('bugs[0].c=4;bugs[0].r=1');assert(run('bugCanMove(bugs[0],3,1)'));assert(!run('bugCanMove(bugs[0],5,1)'));assert.deepEqual(Array.from(run('enemyHitCells(bugs[0],0)'),p=>[p.c,p.r]),[[5,1],[6,1]]);
run('bugs[0].c=3');assert(!run('bugCanMove(bugs[0],2,1)'),'head cannot enter Zero air territory');
assert.equal(run('areaCandidates(files.area[0]).length'),0,'ERROR territory cannot be stolen');
assert.match(run('tacticalBlock(files.area[0])'),/奪い返せる空きパネルがない/);
assert.equal(run('submitOrder(files.area[0])'),false,'blocked area order is rejected immediately');
assert.equal(run('activeOrder'),null,'rejected area order does not wait forever');
run('bugs[0].motion={from:bugPosition(bugs[0]),age:0,duration:.53}');
assert.deepEqual([0,.14,.28,.42].map(age=>run('bugs[0].motion.age='+age+';errorFrame(bugs[0])[1]')),[0,1,2,3],'walking cycles four distinct leg poses');
run('bugs[0].motion=null');
run('bugs[0].c=3;strikeEnemy(bugs[0],20,"head")');assert.equal(run('bugs[0].hp'),475,'head deals 1.25 times damage');
run('strikeEnemy(bugs[0],20,"body")');assert.equal(run('bugs[0].hp'),455);
run('errorAim="body"');assert.equal(run('enemyHitCells(bugs[0],1).length'),0,'body instruction avoids head in ground phase');
run('errorAim=null;hit(bugs[0],206)');assert.equal(run('bugs[0].phase'),2);assert.equal(run('bugs[0].layer'),1);
assert.deepEqual(Array.from(run('enemyHitCells(bugs[0],1)'),p=>[p.c,p.r]),[[3,1],[4,1],[5,1]]);
assert.equal(run('enemyHitCells(bugs[0],0).length'),0);run('settlePhase();hp=200;layer=0;tickErrorWorld(1)');assert.equal(run('hp'),197);
run('layer=1;tickErrorWorld(1)');assert.equal(run('hp'),197,'wing avoids full-ground poison');
run('bugs=[createError()];summonErrorBugs(bugs[0])');assert.equal(run('bugs.filter(b=>b.hp>0).length'),3);
run('summonErrorBugs(bugs[0])');assert.equal(run('bugs.filter(b=>b.hp>0).length'),3,'summon respects two-minion cap');
run('bugs[1].chargeAge=9.99;bugs[1].chargeStarted=true;bugs[1].chargeRow=row;bugs[1].chargeLayer=layer;tickErrorMinions(.02)');assert.equal(run('bugs[1].hp'),0,'minion charge consumes minion');
run('encounter="error";reset(false);enemyAutomationEnabled=true;automationEnabled=false;bugs[0].attack="poison";bugs[0].aimCol=col;bugs[0].aimRow=row;bugs[0].targetLayer=layer;hp=200;executeErrorAttack(bugs[0])');
assert.equal(run('errorPoison.size'),0,'poison panel waits for the visible liquid to land');
run('tickErrorWorld(.3)');assert.equal(run('errorPoison.size'),0);
run('tickErrorWorld(.33)');assert.equal(run('errorPoison.size'),1);assert(run('hp')<200,'liquid hit applies damage at impact');
run('errorProjectiles=[];errorPoison.clear();bugs[0].attack="bite";bugs[0].aimCol=col;bugs[0].aimRow=row;bugs[0].targetLayer=layer;hp=200;invuln=0;executeErrorAttack(bugs[0])');
assert.equal(run('bugs[0].attack'),'biteStrike');assert.equal(run('hp'),200,'bite waits for the face to reach its target');
run('tickError(bugs[0],.27)');assert.equal(run('hp'),200);
run('tickError(bugs[0],.02)');assert.equal(run('hp'),175);
run('tickError(bugs[0],.5)');assert.equal(run('bugs[0].attack'),'recover');
run('bugs[0].summoned=1;for(let i=0;i<40;i++)chooseErrorAttack(bugs[0])');assert(!['bind','binding'].includes(run('bugs[0].attack')),'removed attack is never selected');
if(process.env.ZERO_SCREENSHOT){run('encounter="error";reset(false);enemyAutomationEnabled=false');render('zero_error_ground');for(let i=0;i<4;i++){run('bugs[0].motion={from:bugPosition(bugs[0]),age:'+(i*.14)+',duration:.53}');render('zero_error_walk'+i)}run('bugs[0].motion=null;bugs[0].attack="biteStrike";bugs[0].attackAge=.35;bugs[0].aimCol=1;bugs[0].aimRow=1;bugs[0].targetLayer=0');render('zero_error_bite');run('bugs[0].attack=null;errorProjectiles=[{c:1,r:1,layer:0,from:pos(3,1,1),age:.36,duration:.62,impact:false}]');render('zero_error_poison');run('hit(bugs[0],251);settlePhase();layer=1');render('zero_error_air')}
if(process.env.ZERO_SCREENSHOT){
 for(const phase of [1,2])for(const age of [0,.15,.28,.36,.55,.77]){
  run('encounter="error";reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs[0].phase='+phase+';bugs[0].layer='+(phase-1)+';bugs[0].attack="biteStrike";bugs[0].attackAge='+age+';bugs[0].aimCol=1;bugs[0].aimRow=1;bugs[0].targetLayer=0');
  render('error_bite_'+phase+'_'+Math.round(age*100));
 }
}
run('encounter="boss";state="win";hp=117;energy=22;errorArtReady=false;startErrorEncounter()');assert(!els.nextEnemy.textContent.includes('ERROR'),'pre-fight button does not reveal boss');
run('errorArtReady=true;startErrorEncounter()');assert.equal(run('encounter'),'error');assert.equal(run('hp'),117);assert.equal(run('energy'),22);assert.equal(run('state'),'intro');
run('advance(6.75)');assert.equal(run('state'),'target');
run('state="battle";bugs=[createError()];hit(bugs[0],500);checkEnd()');assert.equal(run('state'),'win');assert(!els.restartAll.classList.contains('hidden'));assert(els.nextEnemy.classList.contains('hidden'));
console.log('PASS ERROR horizontal layer-specific hitbox, weak head, poison/flight, summon, checkpoint, intro and result.');
assert.equal(run('errorSprites[7].frames.length'),36,'twelve whole painted cels for each boss row');
const swingHashes=new Set();
for(const f of run('errorSprites[7].frames')){
 const c=createCanvas(440,300),t=c.getContext('2d');t.drawImage(f.image.im||f.image,f.sx,f.sy,440,300,0,0,440,300);
 swingHashes.add(require('crypto').createHash('sha256').update(c.toBuffer('image/png')).digest('hex'));
}
assert.equal(swingHashes.size,36,'windup, six sweep panels and recoil use distinct finished artwork');
run('encounter="error";reset(false);bugs[0].phase=2;bugs[0].layer=1;bugs[0].attack="swingStrike";bugs[0].attackAge=.25;savedSweepDraw=g.drawImage;sweepDrawCalls=0;g.drawImage=function(...args){sweepDrawCalls++;return savedSweepDraw(...args)};drawErrorSwing(bugs[0],373,190);g.drawImage=savedSweepDraw');
assert.equal(run('sweepDrawCalls'),1,'runtime draws one complete cel instead of deforming neck/head/wing components');
for(const bossRow of [0,1,2])for(const bossCol of [2,3,4])for(let panel=0;panel<6;panel++){
 run('encounter="error";reset(false);automationEnabled=false;enemyAutomationEnabled=true;bugs[0].phase=2;bugs[0].layer=1;bugs[0].r='+bossRow+';bugs[0].c='+bossCol+';bugs[0].attack="swing";layer=1;shield=shieldTime=0;hp=200;invuln=0;row='+Math.floor(panel/2)+';col='+(bossCol-2+panel%2)+';executeErrorAttack(bugs[0])');
 assert.equal(run('hp'),200,'warning cannot deal damage before neck extension');assert.equal(run('bugs[0].attack'),'swingStrike');
 const before=panel*.1-.01;if(before>0){run('tickError(bugs[0],'+before+')');assert.equal(run('hp'),200,'later panels wait for their own painted pose')}
 run('tickError(bugs[0],.02)');assert.equal(run('hp'),170,'neck contact deals one 30-damage hit in panel '+panel);
 run('tickError(bugs[0],1)');assert.equal(run('hp'),170,'neck pass cannot repeat damage');
}
for(const [c,r,l] of [[0,0,1],[3,1,1],[1,2,0]]){
 run('encounter="error";reset(false);automationEnabled=false;enemyAutomationEnabled=true;bugs[0].phase=2;bugs[0].layer=1;bugs[0].attack="swing";col='+c+';row='+r+';layer='+l+';shield=shieldTime=0;hp=200;executeErrorAttack(bugs[0]);tickError(bugs[0],.7)');
 assert.equal(run('hp'),200,'outside the six air panels is safe');
}
console.log('PASS ERROR neck sweep: 36 complete cels, six physical panel contacts, all boss rows/columns, synchronized delayed hits, one 30-damage hit, ground and outside-range misses.');
if(process.env.ZERO_SWING_AUDIT){
 run('encounter="error";reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs[0].phase=2;bugs[0].layer=1;layer=1;flightPermanent=true;appearance.wing=1;shield=shieldTime=0;col=1;row=1;hp=200');
 for(let r=0;r<3;r++)for(let frame=0;frame<12;frame++){
  run('bugs[0].r='+r+';bugs[0].attack='+(frame<4?'"swing"':'"swingStrike"')+';bugs[0].tell='+(frame<4?1-frame*.25:0)+';bugs[0].attackAge='+(frame<4?0:frame<10?(frame-4)*.1+.04:frame===10?.64:.76));
  render('error_swing_'+r+'_'+frame);
 }
}
// Requested shield overflow and defeat behavior are shared by all encounters.
run('encounter="skirmish";reset(false);automationEnabled=false;enemyAutomationEnabled=false;hp=200;shield=20;shieldTime=5;invuln=0;hurt(100)');
assert.equal(run('shield'),0);assert.equal(run('hp'),120,'20 shield against 100 damage spills 80 into HP');
run('reset(false);automationEnabled=false;enemyAutomationEnabled=false;hp=200;shield=60;shieldTime=5;invuln=0;hurt(20)');
assert.equal(run('shield'),40);assert.equal(run('hp'),200,'shield retains the exact remaining capacity');
assert.equal(run('files.guns[1].cost'),2,'heavy pulse consumes 2 percent');
run('shield=0;hp=5;invuln=0;hurt(10)');assert.equal(run('state'),'lose');assert.equal(els.resulttext.textContent,'');
assert.equal(run('zeroAnimationFrame().sheet'),'defeat');assert.equal(run('transformation'),null);
for(const [seconds,frame] of [[.15,0],[.25,1],[.35,2]]){run('tick('+seconds+')');assert.equal(run('zeroAnimationFrame().frame'),frame);if(process.env.ZERO_SCREENSHOT)render('zero_defeat_'+frame)}
run('tick(2)');assert.equal(run('zeroAnimationFrame().frame'),2,'defeated pose remains after results');
run('reset(false)');assert.equal(run('defeatAge'),0);assert.equal(run('zeroDefeatOrigin'),null);
run('encounter="error";reset(false)');assert.equal(run('actorShadowCells(bugs[0]).length'),3);assert.equal(run('actorShadowCells(bugs[0]).filter(p=>p.layer===0).length'),2);
run('bugs[0].r=0');assert.equal(run('actorShadowCells(bugs[0]).length'),3,'top row keeps the horizontal three-cell footprint');
run('bugs[0].c=4;draw()');assert(run('Number.isFinite(pos(bugs[0].c+1,bugs[0].r).x)'),'shadow draws when ERROR reaches its farthest column');
console.log('PASS updated attack values, shield overflow, persistent defeat cels and full ERROR footprint shadows.');
// ERROR phase response, shared equipment, exact summon lifetime, and parry silhouette.
run('encounter="error";reset(false);automationEnabled=true;enemyAutomationEnabled=false;autoTechniqueMode=false;attackEnabled=false;submitOrder(files.shield[0])');
run('advance(1.2)');assert(run('shield>0&&shieldTime>0'),'ground shield is active');
assert(run('runCommand("File: ウィング No.001")'));run('advance(1.4)');
assert.equal(run('layer'),1,'Wing can launch during an existing shield');
assert(run('shield>0&&shieldTime>0&&loadout.shield&&loadout.wing'),'shield persists around winged Zero');
run('encounter="error";reset(false);automationEnabled=true;enemyAutomationEnabled=false;autoTechniqueMode=false;attackEnabled=false;submitOrder(files.wing[1]);advance(1.4)');
assert.equal(run('layer'),1);assert(run('runCommand("File: シールド No.002")'));run('advance(1.4)');
assert(run('shield>0&&loadout.shield&&loadout.wing'),'shield can deploy while flying');
run('encounter="error";reset(false);automationEnabled=true;enemyAutomationEnabled=false;autoTechniqueMode=false;attackEnabled=false;shield=60;shieldTime=5;shieldVisualTime=5;appearance.shield=1;loadout.shield=files.shield[0];hit(bugs[0],251)');
assert.equal(run('bugs[0].phase'),2);assert.equal(run('activeOrder?.card.file||orderQueue[0]?.card.file'),'wing','phase change requests Wing without a spoken command');
run('settlePhase();advance(1.5)');assert.equal(run('layer'),1);assert(run('shield>0&&loadout.shield'),'automatic flight retains shield');
run('encounter="error";reset(false);enemyAutomationEnabled=false;summonErrorBugs(bugs[0])');
assert.equal(run('bugs.filter(b=>b.type!=="error"&&b.hp>0).length'),2);
run('tickErrorMinions(9.29)');assert.equal(run('bugs.filter(b=>b.type!=="error"&&b.hp>0).length'),2);
run('tickErrorMinions(.02)');assert(run('bugs.filter(b=>b.type!=="error").every(b=>b.chargeStarted&&b.chargeTell>0)'),'telegraph starts before rush');
run('tickErrorMinions(.68)');assert.equal(run('bugs.filter(b=>b.type!=="error"&&b.hp>0).length'),2,'minions still present before ten seconds');
run('tickErrorMinions(.02)');assert.equal(run('bugs.filter(b=>b.type!=="error"&&b.hp>0).length'),0,'minions rush and vanish at ten seconds');
run('encounter="error";reset(false);enemyAutomationEnabled=false;summonErrorBugs(bugs[0])');
for(let tickNo=0;tickNo<599;tickNo++)run('tickErrorMinions(1/60)');
assert.equal(run('bugs.filter(b=>b.type!=="error"&&b.hp>0).length'),2,'alive after 599 fixed updates');
run('tickErrorMinions(1/60)');assert.equal(run('bugs.filter(b=>b.type!=="error"&&b.hp>0).length'),0,'rush on the 600th update exactly');
assert.equal(run('files.shield[2].duration'),3);
run('parryArcCount=0;parryLineCount=0;originalArc=g.arc;originalLineTo=g.lineTo;g.arc=function(...args){parryArcCount++;return originalArc.apply(this,args)};g.lineTo=function(...args){parryLineCount++;return originalLineTo.apply(this,args)};drawShieldBubble(3,100,100);g.arc=originalArc;g.lineTo=originalLineTo');
assert.equal(run('parryArcCount'),0,'parry has no circular path');assert(run('parryLineCount>=33'),'parry outlines a dodecagon');
run('appearance.shield=3;shield=999;shieldTime=3;shieldVisualTime=3;parryTexts=[];originalTextPixel=textPixel;textPixel=function(s,...args){parryTexts.push(String(s));return originalTextPixel(s,...args)};drawZeroAnimated();textPixel=originalTextPixel');
assert(!Array.from(run('parryTexts')).includes('999'),'parry does not show an absorption number');
if(process.env.ZERO_SCREENSHOT){render('zero_parry');run('appearance.shield=2;shield=120;shieldTime=5;flight=1;flightPermanent=true;layer=1;appearance.wing=2');render('zero_shield_wing')}
console.log('PASS continuous ERROR silhouette, overlapping shields and wings, phase flight, 10-second rush, and three-second polygon parry.');
run('encounter="error";reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs[0].r=1');
assert.deepEqual(Array.from(run('enemyHitCells(bugs[0],0)'),p=>[p.c,p.r]),[[4,1],[5,1]]);
assert(run('!enemyHitCells(bugs[0],0).some(p=>p.r===0||p.r===2)'),'abdomen no longer occupies adjacent rows');
run('col=1;row=0;layer=0;zeroFacing=1;immediateActivate(files.guns[0]);advance(.6)');assert.equal(run('bugs[0].hp'),500,'shot in adjacent row misses the abdomen');
run('encounter="skirmish";reset(false);automationEnabled=false;enemyAutomationEnabled=false;fire()');
assert.equal(run('bullets.at(-1).damage'),1);assert.equal(run('zeroAnimationFrame().sheet'),'basicMotion','normal shot uses dedicated transformed-left-arm art');
for(const wing of [1,2,3])for(const gun of [1,2,3]){
 run('layer=1;flight=1;flightPermanent=true;appearance.wing='+wing+';appearance.body="guns";appearance.guns='+gun+';pose="shoot";poseTime=.2;moveAnim=null;hurtTime=0;transformation=null;draw()');
 assert.equal(run('zeroAnimationFrame().sheet'),'gunsMotion');assert(run('Number.isFinite(zeroWingMount(zeroAnimationFrame(),100,100).x)'));
 if(process.env.ZERO_SCREENSHOT)render('wing'+wing+'_guns'+gun);
}
if(process.env.ZERO_SCREENSHOT){
 run('encounter="error";reset(false);automationEnabled=false;enemyAutomationEnabled=false;draw()');render('error_ellipse');
 run('encounter="skirmish";reset(false);automationEnabled=false;enemyAutomationEnabled=false;fire();draw()');render('normal_left_gun');
}
console.log('PASS horizontal ERROR hitboxes, adjacent-row miss, normal left-arm gun and all nine gun/wing combinations.');
// ERROR collision and recapturable front column.
run('encounter="error";reset(false);automationEnabled=false;enemyAutomationEnabled=false;errorAim="body"');
assert(!run('bugCanMove({type:"bee",layer:1},3,1,1)'), 'head blocks minions independently of aim');
assert(run('bugCanMove({type:"bee",layer:0},3,1,0)'), 'ground below head remains unoccupied');
assert(!run('bugCanMove({type:"bee",layer:0},4,1,0)'), 'body blocks ground minions');
run('bugs.push({id:2,type:"bee",c:3,r:0,layer:1,hp:20})');
assert(!run('bugCanMove(bugs[0],3,0)'), 'ERROR head cannot move into minion');
run('bugs[1].c=4;bugs[1].r=0;bugs[1].layer=0');
assert(!run('bugCanMove(bugs[0],3,0)'), 'ERROR body cannot move into minion');
run('bugs[1].c=5;bugs[1].motion={c:4,r:0,layer:0}');
assert(!run('bugCanMove(bugs[0],3,0)'), 'moving minion reserves source cell');
run('savedMinionTick=encounterTickBugs');
// Real randomized movement repeatedly checks both layers and source reservations.
for(let trial=0;trial<20;trial++){
 run('reset(false);enemyAutomationEnabled=true;automationEnabled=false;summonErrorBugs(bugs[0])');
 for(let step=0;step<500;step++){
  run('tickBugs(.016)');
  assert(!run('bugs.some(b=>b.hp>0&&errorOverlaps(b,b.c,b.r))'),'actors never overlap '+JSON.stringify({trial,step,bugs:run('bugs')}));
 }
}
run('reset(false);enemyAutomationEnabled=false;automationEnabled=false;col=1;row=1;hit(bugs[0],251);settlePhase()');
assert.deepEqual(Array.from(run('[0,1,2].map(r=>panelOwners[cellId(2,r)])')),['bugs','bugs','bugs']);
assert.equal(run('areaCandidates(files.area[2]).length'),3);
run('applyArea(files.area[2])');
assert.equal(run('capturedPanels.size'),0,'returned home panels have no enemy return timer');
assert.equal(run('areaCandidates(files.area[2]).length'),0,'original ERROR territory remains protected');
run('layer=1;tickErrorWorld(9.99)');assert.equal(run('panelOwners[cellId(2,1)]'),'zero');
run('tickErrorWorld(.01)');assert.equal(run('panelOwners[cellId(2,1)]'),'bugs','recapture occurs at ten seconds');
run('applyArea(files.area[0]);tickErrorWorld(10)');
assert.deepEqual(Array.from(run('[0,1,2].map(r=>panelOwners[cellId(2,r)])')),['bugs','bugs','bugs']);
assert(run('[0,1].every(c=>[0,1,2].every(r=>panelOwners[cellId(c,r)]==="zero"))'),'repeated steals do not shrink another column');
run('reset(false);savedSiren=errorSiren;sirenCalls=0;errorSiren=()=>sirenCalls++;errorIntro=true;state="intro";advance(6.75);errorSiren=savedSiren');
assert.equal(run('sirenCalls'),5,'three original sirens plus one before and after');
console.log('PASS ERROR collision reservations, phase steal, ten-second recapture, protected enemy territory, five sirens.');
// Dedicated enemy cels plus ballistic bombs and integrated silk restraint.
assert.deepEqual(Array.from(run('Object.keys(bugTypes).filter(t=>!["grenade","error"].includes(t))')).sort(),['bee','beetle','fly','spider']);
for(const key of ['bugWasp','bugDragonfly','bugSpider','bugCentipede','spiderZero','insectBlast'])assert.equal(run('animationSheets['+JSON.stringify(key)+'].frames.length'),8);
for(const key of ['insectBomb','webSilk'])assert.equal(run('animationSheets['+JSON.stringify(key)+'].frames.length'),4);
run('encounter="skirmish";reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[{type:"fly",id:1,c:4,r:1,layer:1,hp:30,max:30,hit:0,stun:0,aimRow:1,targetLayer:1}];col=1;row=1;layer=0;hp=200;bugShot(bugs[0]);tickBugAttack(bugs[0],.37)');
assert.equal(run('bugBombs.length'),1);assert.equal(run('bugBombs[0].layer'),0);
assert(run('bugBombs[0].fromY<bugBombs[0].groundY-34'),'bomb visibly starts high above ground');
run('tickBugBombs(.66)');assert.equal(run('hp'),200,'no damage before physical landing');
run('col=2;tickBugBombs(.02)');assert.equal(run('hp'),180,'nose touching ground triggers damage');assert.equal(run('bugBlasts.length'),1);
run('tickBugAttack(bugs[0],1)');assert.equal(run('bugBombs.length'),2,'remaining zero panels receive individual bombs');assert(run('bugs[0].offscreen'));assert.equal(run('enemyHitCells(bugs[0],1).length'),0);
run('tickBugAttack(bugs[0],.36)');assert(!run('bugs[0].offscreen'));assert(run('canUsePanel("bugs",bugs[0].c,bugs[0].r,1)'));
run('reset(false);automationEnabled=false;enemyAutomationEnabled=false;layer=1;hp=200;bugBombs=[{c:col,r:row,layer:0,age:0,damage:20,fromY:0,groundY:pos(col,row).y,duration:.68}];tickBugBombs(.68)');assert.equal(run('hp'),200,'aerial Zero avoids ground explosion');
for(const phase of ['queued','transforming','ready','recover']){
 run('encounter="skirmish";reset(false);automationEnabled=true;enemyAutomationEnabled=false;bugs=[{type:"spider",id:1,c:3,r:1,layer:0,hp:40,max:40,hit:0,stun:0,tell:0,aimRow:1,targetLayer:0}];col=1;row=1;layer=0;hp=200;energy=100;submitOrder(files.guns[0]);activeOrder.phase='+JSON.stringify(phase)+';techniqueLock={card:files.guns[0],stage:"windup"};transformation={card:files.guns[0],age:.1,duration:.5};beginSpiderBind(bugs[0])');
 assert.equal(run('activeOrder'),null,'interrupted '+phase+' order is cleared');
 assert(run('zeroBound()'));assert(!run('beginMove(2,1)'));
 run('advance(1.05)');assert.equal(run('hp'),195);
 run('advance(1)');assert.equal(run('hp'),190);
 run('advance(1)');assert.equal(run('hp'),185);assert(!run('zeroBound()'),'input unlocks at three seconds');
 run('advance(.3)');assert.equal(run('spiderBind'),null);assert(run('snared===0&&techniqueLock===null&&transformation===null'));
 run('movementEnabled=false;attackEnabled=false;col=2;row=1;actionLock=0;moveAnim=null;poseTime=0;pose="idle";submitOrder(files.sword[0]);advance(1.5)');
 assert.equal(run('equipmentUses[files.sword[0].id]'),1,'new command executes after restraint in '+phase);
}
// Drive attacks through the actual public game tick, not direct helper calls.
run('encounter="skirmish";reset(false);automationEnabled=false;enemyAutomationEnabled=true;bugs=[{type:"fly",id:1,c:4,r:1,layer:1,hp:30,max:30,hit:0,stun:0,tell:0,cd:100,decision:100,stepWait:100,evadeWait:0,aimRow:1,targetLayer:0}];col=1;row=1;layer=0;hp=200;bugShot(bugs[0]);advance(1.5)');
assert.equal(run('hp'),180,'the real tick lands the aerial bomb');
assert(run('bugBlasts.length>0'),'the real tick advances the explosion frames');
run('advance(1)');assert.equal(run('bugs[0].attackMotion'),null,'real tick returns bomber');
run('reset(false);automationEnabled=false;enemyAutomationEnabled=true;bugs=[{type:"spider",id:1,c:4,r:1,layer:0,hp:40,max:40,hit:0,stun:0,tell:0,cd:100,decision:100,stepWait:100,evadeWait:0,aimRow:1,targetLayer:0}];col=1;row=1;layer=0;hp=200;bugShot(bugs[0]);advance(.5);enemyAutomationEnabled=false');
assert(run('spiderBind'),'real tick captures Zero');run('advance(3.35)');assert.equal(run('hp'),185);assert.equal(run('spiderBind'),null);assert(run('beginMove(2,1)'),'real tick releases movement');
run('reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[{type:"spider",id:1,c:4,r:1,layer:0,hp:40,max:40,hit:0,stun:0,tell:0,aimRow:1,targetLayer:0}];col=1;row=0;bugShot(bugs[0]);tickBugAttack(bugs[0],1.1)');assert.equal(run('spiderBind'),null);assert(run('bugs[0].stepWait>0&&bugs[0].recoverWait>0'),'miss pauses in recovery before resuming walking');
if(process.env.ZERO_SCREENSHOT){
 run('reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[{type:"fly",id:1,c:4,r:1,layer:1,hp:30,max:30,hit:0,stun:0,tell:0,aimRow:1,targetLayer:0}];col=1;row=1;layer=0;hp=200;bugShot(bugs[0])');
 for(let i=0;i<24;i++){run('tickBugAttack(bugs[0],.06);tickBugBombs(.06)');render('bomb_sequence_'+String(i).padStart(2,'0'))}
 run('reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[{type:"spider",id:1,c:4,r:1,layer:0,hp:40,max:40,hit:0,stun:0,tell:0,aimRow:1,targetLayer:0}];col=1;row=1;layer=0;hp=200;bugShot(bugs[0]);tickBugAttack(bugs[0],.36)');render('silk_stream_v50');
 run('tickBugAttack(bugs[0],.03)');render('silk_bound_v50');
 for(const age of [.2,.4,.8,1.05,2.05,3.05,3.3]){run('tickSpiderBind('+age+'-(spiderBind?.age||0));');render('silk_pose_'+String(age).replace('.','_'))}
 for(const type of ['bee','spider','beetle','fly'])for(let f=0;f<8;f++){
  run('reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[{type:'+JSON.stringify(type)+',id:1,c:4,r:1,layer:'+(['bee','fly'].includes(type)?1:0)+',hp:40,max:40,hit:0,stun:0,tell:0}];savedCel=insectAnimationFrame;insectAnimationFrame=()=>'+f);render('cel_'+type+'_'+f);run('insectAnimationFrame=savedCel');
 }
}
console.log('PASS real ballistic fall/impact, four interrupted order phases, 3-second restraint recovery and fresh commands.');
if(process.env.ZERO_SCREENSHOT){
 for(const type of ['bee','fly','spider','beetle']){
  run('reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[{type:'+JSON.stringify(type)+',id:1,c:4,r:1,layer:'+(['bee','fly'].includes(type)?1:0)+',hp:40,max:40,hit:0,stun:0,tell:0,aimRow:1,targetLayer:0}];col=1;row=1;layer=0');render('new_bug_'+type);
  run('bugShot(bugs[0]);tickBugAttack(bugs[0],.4)');render('new_bug_'+type+'_attack');
 }
}
console.log('PASS new four-species art, physical drill/ram, bomb windup/fall/hit/dodge/layer, and thread attack.');
run('stopVoice();state="battle";navigator={};startVoice()');
for(let attempt=0;attempt<6;attempt++){recognizers.at(-1).onend();waitVoice(1000);assert(run('voiceWanted&&listening'),'transient failures keep recognition enabled')}
run('stopVoice()');
console.log('PASS recognition automatically survives six repeated session endings.');
// Repeat binding without resetting the game, and retain a later committed attack.
run('reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[{type:"spider",id:1,c:4,r:1,layer:0,hp:1000,max:1000,hit:0,stun:0,tell:0}];col=1;row=1;layer=0');
for(let cycle=0;cycle<8;cycle++){
 run('hp=200;invuln=0;beginSpiderBind(bugs[0]);advance(3.4)');
 assert.equal(run('hp'),185);assert.equal(run('spiderBind'),null);assert(!run('zeroBound()'));assert(run('snared===0'));
}
run('invuln=0;beginSpiderBind(bugs[0]);spiderBind.releaseAge=.1;pose="sword";poseTime=.4;techniqueLock={card:files.sword[0],stage:"recovery"};actionLock=.3;releaseSpiderBind()');
assert.equal(run('pose'),'sword');assert.equal(run('techniqueLock.stage'),'recovery','release cannot cancel a new attack');
console.log('PASS eight consecutive bind/release cycles and non-cancellation of later attacks.');
for(const type of ['bee','beetle']){
 run('reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[{type:'+JSON.stringify(type)+',id:1,c:4,r:1,layer:'+ (type==='bee'?1:0)+',hp:40,max:40,hit:0,stun:0,tell:0,aimRow:1,targetLayer:'+(type==='bee'?1:0)+'}];col=1;row=1;layer=bugs[0].layer;bugShot(bugs[0]);tickBugAttack(bugs[0],.52)');
 assert(Math.abs(run('enemyHitCells(bugs[0],layer)[0].c')-1)<1e-6,'hitbox follows '+type+' lunge');
}
// Rhythmic movement, swept airborne contact, single-cell centipede and stable foreground order.
run('encounter="skirmish";reset(false);automationEnabled=false;enemyAutomationEnabled=true;bugs=[{type:"spider",id:1,c:4,r:1,layer:0,hp:40,max:40,hit:0,stun:0,tell:0,cd:100,decision:0,stepWait:0,aimRow:1,targetLayer:0}];col=1;row=1;layer=0;bugShot(bugs[0]);advance(.5)');
assert(run('spiderBind'));
const boundPosition=Array.from(run('[bugs[0].c,bugs[0].r]'));
run('advance(1.4)');
assert.deepEqual(Array.from(run('[bugs[0].c,bugs[0].r]')),boundPosition,'source stays stationary throughout restraint');
assert(!run('moveBug(bugs[0],3,1)'),'direct movement cannot break a held silk connection');
assert(run('bugs[0].attackMotion.kind==="web"&&insectAnimationFrame(bugs[0])===6'),'hold cel and mouth-to-Zero thread survive the original attack timeout');
assert(run('insectDrawEntries().length>0'),'bound silk remains in the depth queue');
run('advance(1.9)');assert.equal(run('spiderBind'),null);run('bugs[0].cd=100;advance(1.2)');
assert(run('bugs[0].motion!==null||bugs[0].c!=='+boundPosition[0]+'||bugs[0].r!=='+boundPosition[1]),'spider resumes autonomous movement after releasing Zero');
for(const air of [0,1]){
 run('reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[{type:"fly",id:1,c:4,r:1,layer:1,hp:30,max:30,hit:0,stun:0,aimRow:1}];col=1;row=1;layer='+air+';hp=200;bugShot(bugs[0]);tickBugAttack(bugs[0],.60)');
 assert.equal(run('hp'),air?180:200,'rush contacts only its airborne lane');
 if(air){run('invuln=0;tickBugAttack(bugs[0],.1)');assert.equal(run('hp'),180,'one pass cannot repeatedly deal contact damage')}
}
run('reset(false);bugs=[{type:"beetle",id:1,c:4,r:1,layer:0,hp:60,max:60,hit:0,stun:0,tell:0}];automationEnabled=false;enemyAutomationEnabled=false');
assert.deepEqual(Array.from(run('bugCells(bugs[0])'),p=>p.c),[4]);
assert(run('bugCanMove(bugs[0],5,1)'),'single-cell centipede can occupy the rear column');
assert(!run('bugCanMove(bugs[0],6,1)'),'cannot move beyond the arena edge');
assert(run('Math.abs(bugPosition(bugs[0]).x-pos(4,1).x)<.001'),'art centers over its one occupied panel');
assert(run('insectSpriteGeometry(bugs[0]).w>=64&&insectSpriteGeometry(bugs[0]).w<=70'),'centipede almost fills one 72px panel');
assert(run('actorShadowGeometry(bugs[0]).rx<=33'),'shadow fits the resized chassis');
run('bullets=[{c:5.1,r:1,layer:0,speed:0,damage:1,enemy:false,hit:new Set()}];advance(.02)');assert.equal(run('bugs[0].hp'),60,'the adjacent panel has no centipede hitbox');
run('bullets=[{c:4.1,r:1,layer:0,speed:0,damage:1,enemy:false,hit:new Set()}];advance(.02)');assert.equal(run('bugs[0].hp'),59,'its occupied panel still receives gunfire');
for(const species of ['spider','beetle']){
 run('bugs=[{type:'+JSON.stringify(species)+',id:1,c:4,r:1,layer:0,hp:60,max:60,hit:0,stun:0,tell:0}];simTime=0');
 assert.equal(run('insectAnimationFrame(bugs[0])'),0);run('simTime=17.3');assert.equal(run('insectAnimationFrame(bugs[0])'),0,'stationary ground bug does not keep walking');
}
run('bugs=[{type:"bee",id:1,c:4,r:1,layer:1,hp:20,max:20,hit:0,stun:0,tell:0}];simTime=0');const restWing=run('insectAnimationFrame(bugs[0])');run('simTime=.19');assert.equal(run('insectAnimationFrame(bugs[0])'),restWing,'wing cel holds for 200 ms');run('bugs[0].motion={age:.12,duration:.26};simTime=.19');assert.equal(run('insectAnimationFrame(bugs[0])'),restWing,'moving does not accelerate wing animation');run('simTime=.21');assert.notEqual(run('insectAnimationFrame(bugs[0])'),restWing);
run('bugs=[{type:"spider",id:1,c:4,r:0,layer:0,hp:40,max:40,hit:0,stun:0,tell:0},{type:"fly",id:2,c:4,r:2,layer:1,hp:30,max:30,hit:0,stun:0,tell:0}];bugBlasts=[{c:4,r:0,age:.2,duration:.65}];col=1;row=1;layer=0;bullets=[];effects=[]');
const ordered=Array.from(run('battleDrawEntries()'),e=>e.bug?.id|| (e.zero?'zero':'effect'));
assert(ordered.indexOf(1)<ordered.indexOf(2),'rear ground actor never covers a front airborne actor');
assert(ordered.indexOf('effect')<ordered.indexOf('zero'),'rear explosion renders behind foreground Zero');
run('bugs=[{type:"beetle",id:1,c:4,r:0,layer:0,hp:60,max:60,hit:0,stun:0,tell:0}];moveBug(bugs[0],4,1)');
assert.equal(run('actorGroundAnchor(bugs[0]).y'),run('pos(0,0).y'),'moving actors retain their source depth at the first frame');
run('bugs[0].motion.age=bugs[0].motion.duration/2');assert(Math.abs(run('actorGroundAnchor(bugs[0]).y-pos(0,.5).y'))<.001,'depth and shadow interpolate with movement');
console.log('PASS held wing cels, stationary rests, complete silk hold/release, swept rush contact, single-cell body/hits and ground-depth rendering.');
if(process.env.ZERO_SCREENSHOT){
 run('bugs=[{type:"beetle",id:1,c:4,r:1,layer:0,hp:60,max:60,hit:0,stun:0,tell:0}];col=1;row=1;layer=0;bugBlasts=[];simTime=0');render('single_centipede_v52');
 run('bugs=[{type:"spider",id:1,c:4,r:1,layer:0,hp:40,max:40,hit:0,stun:0,tell:0}];hp=200;invuln=0;beginSpiderBind(bugs[0]);tickSpiderBind(1.5)');render('held_thread_v51');
}
// One size applies to idle, guns, flight, shield, bound and defeat cels.
run('encounter="skirmish";reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[];col=1;row=1;layer=0;pose="idle";poseTime=0;simTime=0');
assert(Math.abs(run('ZERO_SIZE')-82.8)<.0001);
assert(run('Math.abs(actorShadowGeometry({zero:true}).rx-(animationSheets.motion.frames[0].footWidth*ZERO_SIZE/animationSheets.motion.rowHeights[0])*.46)<.01'),'shadow uses the same enlarged body scale');
run('savedDrawCel=drawCel;zeroCelCalls=[];drawCel=function(...args){zeroCelCalls.push(args);return savedDrawCel(...args)}');
for(const stance of ['idle','basic','shoot','sword']){
 run('pose='+JSON.stringify(stance)+';poseTime=.2;appearance.body='+JSON.stringify(stance==='shoot'?'guns':stance==='sword'?'sword':'base')+';drawZeroAnimated()');
 assert.equal(run('zeroCelCalls.at(-1)[4]'),run('ZERO_SIZE'),stance+' cel uses the same enlarged height');
}
run('row=0;layer=1;flight=1;flightPermanent=true;appearance.wing=3;pose="idle";poseTime=0;drawZeroAnimated()');
assert.equal(run('zeroCelCalls.at(-1)[4]'),run('ZERO_SIZE'));
assert(run('zeroVisualPosition().y+12-ZERO_SIZE>=0'),'top airborne stance fits inside the screen');
run('layer=0;row=1;bugs=[{type:"spider",id:1,c:4,r:1,layer:0,hp:40,max:40,hit:0,stun:0,tell:0}];invuln=0;beginSpiderBind(bugs[0]);drawSpiderBound()');assert.equal(run('zeroCelCalls.at(-1)[4]'),run('ZERO_SIZE'),'silk-bound Zero stays enlarged');
run('releaseSpiderBind();layer=1;row=0;beginZeroDefeat();state="lose";drawZeroDefeated()');assert(run('zeroDefeatOrigin.y+12-ZERO_SIZE>=0'),'airborne defeat begins at the visible enlarged position');assert.equal(run('zeroCelCalls.at(-1)[4]'),run('ZERO_SIZE'),'defeated Zero stays enlarged');
run('drawCel=savedDrawCel');
if(process.env.ZERO_SCREENSHOT){
 run('reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[];col=1;row=1;layer=0;simTime=0');render('zero_idle_v54');
 run('row=0;layer=1;flight=1;flightPermanent=true;appearance.wing=3;appearance.guns=2;appearance.body="guns";pose="shoot";poseTime=.2;shield=20;shieldTime=5;appearance.shield=1');render('zero_air_guns_v54');
 run('encounter="boss";reset(false);automationEnabled=false;enemyAutomationEnabled=false;col=2;startBossBinding(bugs[0]);tickBossBinding(bugs[0],1.05)');render('zero_boss_bound_v54');
}
console.log('PASS uniform 1.15 character, weapon/flight anchors, shadow, restrained and defeat sizes.');
// Stolen territory is a legal ERROR destination, with ownership and occupancy still enforced.
run('encounter="error";reset(false);automationEnabled=false;enemyAutomationEnabled=false;layer=1;bugs[0].phase=2;bugs[0].layer=1;errorStealArea()');
assert(run('bugCanMove(bugs[0],2,1)'),'ERROR can move its head into the column it stole');
run('bugs[0].c=2');assert(run('panelOccupied(2,1)'),'ERROR head reserves the stolen panel too');
assert(!run('areaCandidates(files.area[2]).some(p=>p.c===2&&p.r===1)'),'occupied head panel cannot be recaptured');
assert(!run('bugCanMove(bugs[0],1,1)'),'ERROR cannot move farther into unstolen Zero territory');
run('bugs[0].c=3;panelOwners[cellId(2,1)]="zero"');assert(!run('bugCanMove(bugs[0],2,1)'),'recaptured panel remains unavailable');
run('errorStealArea();bugs.push({id:2,type:"bee",c:2,r:0,layer:1,hp:20})');assert(!run('bugCanMove(bugs[0],2,0)'),'minions still block ERROR in stolen territory');
run('bugs.pop();enemyAutomationEnabled=true;bugs[0].cd=1000;bugs[0].stepWait=0;visitedStolen=false');
for(let i=0;i<1500;i++)run('tickBugs(.016);if(bugs[0].c===2)visitedStolen=true');
assert(run('visitedStolen'),'the real randomized movement enters stolen territory');
assert(!fs.existsSync(root+'assets/atlas-v3.webp'),'obsolete Zero atlas is removed');
for(const name of ['zero-motion-v8.png','zero-loops-v8.png','zero-motion.png','zero-equipped-loops.png'])assert(!fs.existsSync(root+'assets/animation/'+name),'obsolete '+name+' removed');
assert(!fs.readFileSync(root+'animation.js','utf8').includes('zero-idle'),'no old Zero fallback at startup');
assert.equal(run('bugWidth(createMidboss())'),2,'enlarged midboss keeps its two-cell footprint');
assert(Math.abs(run('MIDBOSS_WIDTH')-131.1)<.0001,'midboss graphic enlarges by 1.15');
if(process.env.ZERO_SCREENSHOT){
 run('encounter="error";reset(false);automationEnabled=false;enemyAutomationEnabled=false;layer=1;bugs[0].phase=2;bugs[0].layer=1;errorStealArea();bugs[0].c=2;bugs[0].r=1');render('error_stolen_front_v54');
 for(const wing of [false,true]){
  run('encounter="skirmish";reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[];row=1;layer='+Number(wing)+';flight=1;appearance.wing=3;appearance.guns=3;appearance.body="guns";pose="shoot";poseTime=.2');render('pierce_round_gun_'+(wing?'air':'ground')+'_v54');
 }
}
console.log('PASS ERROR stolen-column movement, recapture/collision restrictions, old-art removal and two-cell midboss size.');
run('encounter="boss";reset(false);automationEnabled=false;enemyAutomationEnabled=false;savedFreshCel=drawCel;freshCelCalls=[];drawCel=function(...args){freshCelCalls.push(args);return savedFreshCel(...args)};drawZeroAnimated();drawCel=savedFreshCel');
assert(!run('zeroBound()'),'fresh boss battle does not inherit restraint');
assert(run('freshCelCalls.length>0'),'fresh boss battle draws the current Zero');
assert(run('Number.isFinite(freshCelCalls.at(-1)[2])&&Number.isFinite(freshCelCalls.at(-1)[3])'),'fresh Zero has finite screen coordinates');
if(process.env.ZERO_SCREENSHOT)render('fresh_midboss_zero_v54');
// Strong suction works throughout both layers, allows movement, then pulls back quickly.
for(const r of [0,1,2])for(const l of [0,1])for(const c of [0,1]){
 bossFresh();run('enemyAutomationEnabled=true;col='+c+';row='+r+';layer='+l+';beginBossAttack(bugs[0],"suction");advance(.8);advance(.28)');
 assert.equal(run('col'),2,'rapid suction from row '+r+' layer '+l+' column '+c);
 if(r!==1){run('moveCd=0;move(-1,0,false)');assert.equal(run('col'),1,'movement is available during suction');run('advance(.16)');assert.equal(run('col'),2,'active vacuum swiftly recaptures the front')}
}
// A real arm-sword strike waits for the downward cel and returns to the base pose.
for(let n=1;n<=3;n++){
 run('encounter="skirmish";reset(false);automationEnabled=false;enemyAutomationEnabled=false;col=2;row=1;bugs=[{id:1,type:"spider",c:3,r:1,layer:0,hp:500,max:500,cd:100,tell:0,hit:0,stun:0}];zeroFacing=1;immediateActivate(files.sword['+(n-1)+'])');
 assert.equal(run('bugs[0].hp'),500,'no sword damage before the swing');run('advance(.04)');assert.equal(run('bugs[0].hp'),500);
 const sheet=['swordEdge','swordWide','swordLong'][n-1];assert.equal(run('zeroAnimationFrame().sheet'),sheet,'correct numbered sword is attached to Zero');
 run('advance(.035)');assert.equal(run('bugs[0].hp'),500-run('files.sword['+(n-1)+'].damage'),'damage coincides with the downward swing');
 assert(run('swordStrike.age<.1'),'the damaging downstroke finishes within a tenth of a second');
 assert.equal(run('zeroAnimationFrame().frame'),4);run('advance(.25)');assert.equal(run('swordStrike'),null);assert.equal(run('pose'),'idle');
 // Damage cancels a pending strike, so it cannot hit after a stagger.
 run('invuln=0;immediateActivate(files.sword['+(n-1)+']);savedEnemyHP=bugs[0].hp;hurt(10);advance(.8)');assert.equal(run('bugs[0].hp'),run('savedEnemyHP'),'a canceled sword never hits later');
 if(process.env.ZERO_SCREENSHOT){
  for(const flying of [0,1])for(let f=0;f<8;f++){
   run('reset(false);automationEnabled=false;enemyAutomationEnabled=false;bugs=[];layer='+flying+';flight=1;flightPermanent=true;appearance.wing=3;appearance.sword='+n+';appearance.body="sword";pose="sword";poseTime=.4;savedSwordFrame=zeroAnimationFrame;zeroAnimationFrame=()=>({sheet:'+JSON.stringify(sheet)+',frame:'+f+',phase:3})');render('sword'+n+'_layer'+flying+'_cel'+f);run('zeroAnimationFrame=savedSwordFrame');
  }
 }
}
// Voice-priority rendering runs at 30 fps; a fast swing must still hit once,
// preserve the commitment and play its low follow-through before recovery.
for(const fps of [30,60])for(const l of [0,1]){
 run('encounter="skirmish";reset(false);automationEnabled=false;enemyAutomationEnabled=false;col=2;row=1;layer='+l+';flightPermanent=!!layer;bugs=[{id:1,type:"'+(l?'bee':'spider')+'",c:3,r:1,layer:'+l+',hp:500,max:500,cd:100,tell:0,hit:0,stun:0}];zeroFacing=1;executeEquipped(files.sword[0]);fastMotionCels=[];fastBeforeBattery=energy;fastBeforeCol=col;fastBeforeUses=usedFiles');
 for(let i=0;i<Math.ceil(fps*.4);i++){
  run('if(poseTime>0){move(-1,0,false);if(col!==fastBeforeCol)throw Error("fast swing canceled by movement")}tick('+(1/fps)+');if(pose==="sword")fastMotionCels.push(zeroAnimationFrame().frame)');
 }
 assert.equal(run('bugs[0].hp'),470,'fast '+fps+' fps swing hits once in layer '+l);
 assert.equal(run('usedFiles'),run('fastBeforeUses'),'fast follow-through never repeats the technique');
 assert.equal(run('energy'),run('fastBeforeBattery'));
 assert(run('fastMotionCels.includes(5)&&fastMotionCels.includes(6)'),'both deep follow-through cels remain visible at '+fps+' fps');
 assert.equal(run('pose'),'idle','fast swing completes recovery within .4 seconds');
}
console.log('PASS fast sword hit and complete follow-through at 30/60 fps in both layers.');
run('encounter="skirmish";reset(false);layer=1;flight=1;appearance.wing=1;pose="idle";airShadow1=actorShadowGeometry({zero:true}).rx;appearance.wing=3;airShadow3=actorShadowGeometry({zero:true}).rx');
assert.equal(run('airShadow1'),run('airShadow3'),'the body shadow is independent of wing span');assert(run('airShadow3<36'),'airborne Zero shadow fits its body');
assert(run('animationSheets.wing.frames[2].width/animationSheets.wing.frames[2].height>1.5'),'Nike marble wings use the real broad, swept silhouette');
// Phase cinematics freeze combat but keep the microphone and score active.
bossFresh();run('enemyAutomationEnabled=true;automationEnabled=false;startVoice();hit(bugs[0],76);phaseStartHP=hp;phaseStartTime=elapsed;phaseStartBattery=energy;phaseStartRow=bugs[0].r;advance(.45)');
assert(run('phaseTransition?.kind==="boss"'));assert.equal(run('elapsed'),run('phaseStartTime'));assert.equal(run('hp'),run('phaseStartHP'));assert.equal(run('energy'),run('phaseStartBattery'));assert(run('listening&&voiceWanted'),'phase effects do not stop recognition');assert(run('musicPlaying&&!battleMusic.paused'),'score keeps running under the dark overlay');
if(process.env.ZERO_SCREENSHOT)render('boss_phase_dark_v55');
run('advance(.85)');assert(run('phasePoisonReveal(0,2)>0'),'poison visibly spreads to the rear panels');assert.equal(run('hp'),run('phaseStartHP'));
if(process.env.ZERO_SCREENSHOT)render('boss_phase_poison_v55');
run('advance(1.45)');assert.equal(run('phaseTransition'),null,'battle resumes after the phase effects');run('layer=0;advance(.4)');assert(run('hp<phaseStartHP'),'poison begins damaging only after combat resumes');
run('encounter="error";reset(false);automationEnabled=false;enemyAutomationEnabled=false;col=2;row=1;layer=1;flight=1;flightPermanent=true;hit(bugs[0],251);errorPhaseHP=hp;advance(.9)');
assert.equal(run('panelOwners[cellId(2,1)]'),'zero','steal waits for its cinematic beat');assert.equal(run('hp'),run('errorPhaseHP'));
if(process.env.ZERO_SCREENSHOT)render('error_phase_poison_v55');
run('advance(.6)');assert.equal(run('panelOwners[cellId(2,1)]'),'bugs');assert.equal(run('col'),0,'front Zero is blown to the rear row');assert(run('moveAnim?.forced'),'retreat has an actual knockback animation');
if(process.env.ZERO_SCREENSHOT)render('error_phase_steal_v55');
run('advance(1.25)');assert.equal(run('phaseTransition'),null);assert.equal(run('hp'),run('errorPhaseHP'),'the cutscene itself causes no damage');assert(run('canUsePanel("zero",col,row,layer)'));
run('applyArea(files.area[2]);col=2;errorStealClock=0;tickErrorWorld(.01)');assert.equal(run('col'),0,'periodic recapture also blows Zero back');
console.log('PASS rapid all-lane suction with movement, integrated downward sword hits/cancellation, body shadows, poison/steal cinematics, live audio/voice and forced retreat.');
// End-to-end forced voice conversion runs against the actual battle parser and
// FIFO, not a stub that merely checks the resulting text.
context.strongVoiceReadings=JSON.parse(fs.readFileSync(root+'assets/voice/readings.json','utf8'));
run('voiceReadings=strongVoiceReadings;voiceForceReady=true');
mic=micFresh();run('state="target"');mic.result('ターゲット二 変態',0,true);assert.equal(run('state'),'lock');assert.equal(run('targetId'),2);assert(run('voiceWanted&&listening'));
mic=micFresh();mic.result('ファイル感図 ナンバーゼロゼロツー 変態',0,true);assert.equal(run('activeOrder.card.id'),'guns-2');assert.equal(run('rawVoiceText()'),'');
mic.result('ファイルソルト三 センター',1,true);assert.equal(run('orderQueue[0].card.id'),'sword-3','a distant transcription still appends a valid technique');
mic=micFresh();mic.result('ファイルウイング二',0,false);assert(run('rawVoiceText().includes('+'"ウイング"'+')'));mic.result('リーセット',1,true);assert.equal(run('rawVoiceText()'),'','a nearest Reset word clears the raw draft');
mic=micFresh();mic.result('ソード002 ガムズ003 ソルト001 変態',0,true);assert.deepEqual(Array.from(run('[activeOrder,...orderQueue].map(o=>o.card.id)')),['sword-2','guns-3','sword-1']);assert(run('voiceWanted&&listening'));
// Recognition must not convert an incomplete ordinary word into a control.
mic=micFresh();mic.result('ファイルガンズNo.002 変態',0,false);
assert.equal(run('activeOrder'),null,'fuzzy Enter cannot submit an interim word');
assert.equal(run('rawVoiceText()'),'ファイルガンズNo.002 変態');
mic.result('ファイルガンズNo.002 変態',0,true);
assert.equal(run('activeOrder.card.id'),'guns-2');
run('voiceForceReady=false;stopVoice()');
console.log('PASS forced homophone controls, kanji readings, six-family correction and multi-technique FIFO against real game commands.');
// The native recognizer may offer several hypotheses for the same audio.
// They must remain untouched until Enter, then improve the command without
// changing explicit numbers, known actions, repeat limits or batch order.
run('voiceReadings=strongVoiceReadings;voiceForceReady=true');
mic=micFresh();
mic.results[0]={0:{transcript:'ファイル ダンシ No.002'},1:{transcript:'ファイル ガンズ No.002'},length:2,isFinal:false};mic.onresult({resultIndex:0,results:mic.results});
assert.equal(run('rawVoiceText()'),'ファイル ダンシ No.002');assert.equal(run('activeOrder'),null);
mic.results[0]={0:{transcript:'ファイル ダンシ No.002 エンター'},1:{transcript:'ファイル ガンズ No.002 エンター'},length:2,isFinal:true};mic.onresult({resultIndex:0,results:mic.results});
assert.equal(run('activeOrder.card.id'),'guns-2');assert.equal(context.window.zeroBattle.readMicrophone().lastTranscript,'ファイル ダンシ No.002 エンター');
assert.deepEqual(Array.from(context.window.zeroBattle.readMicrophone().alternatives),['ファイル ダンシ No.002 エンター','ファイル ガンズ No.002 エンター']);
for(const [primary,candidate] of [
 ['ファイル ダンシ No.002','ファイル ガンズ No.003'],
 ['ファイル ソード No.002','ファイル シールド No.002'],
 ['ファイル ダンシ No.002 3回使って','ファイル ガンズ No.002'],
 ['ファイル ソードNo.002 ファイル ダンシNo.003','ファイル ガンズNo.003']
])assert.equal(run('chooseVoiceInstruction('+JSON.stringify(primary)+',['+JSON.stringify(candidate)+'])'),primary,'alternative cannot change instruction meaning: '+primary);
mic=micFresh();
mic.results[0]={0:{transcript:'ファイルソードNo.002 それからファイル ダンシNo.003 3回 エンター'},1:{transcript:'ファイルソードNo.002 それからファイルガンズNo.003 3回 エンター'},length:2,isFinal:true};mic.onresult({resultIndex:0,results:mic.results});
assert.deepEqual(Array.from(run('[activeOrder,...orderQueue].map(o=>o.card.id)')),['sword-2','guns-3']);assert.equal(run('orderQueue[0].remaining'),3);
fresh(false);run('voiceForceReady=false;stopVoice();savedDelayedMicStart=window.SpeechRecognition.prototype.start;window.SpeechRecognition.prototype.start=function(){this.started=true};startVoice()');
const waitingMic=recognizers.at(-1);waitVoice(12000);assert.equal(recognizers.at(-1),waitingMic,'first permission prompt is not aborted at five seconds');assert(!waitingMic.aborted);
waitingMic.onstart();waitingMic.result('ファイルガンズNo.002 エンター',0,true);assert.equal(run('activeOrder.card.id'),'guns-2');
run('stopVoice();window.SpeechRecognition.prototype.start=savedDelayedMicStart');
console.log('PASS unfinished fuzzy controls, raw N-best intake, execution-only candidate choice, number/condition/action preservation, batch FIFO and delayed initial permission.');
console.log('PASS current browser voice transport with no local model worker or download gate.');
console.log('ALL CURRENT TESTS PASSED.');
})().catch(e=>{console.error(e);process.exit(1)});
