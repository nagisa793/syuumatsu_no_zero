const {createCanvas,loadImage}=require('@napi-rs/canvas');
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'../dist')+'/',els={},pending=[],timers=new Map(),recognizers=[];
let timerId=0,seed=917,clock=0;
function waitVoice(ms){const end=clock+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;clock=next[1].at;timers.delete(next[0]);next[1].fn()}clock=end}
const math=Object.create(Math);math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
function element(id){const classes=new Set(),attrs={};return{id,style:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on===undefined)on=!classes.has(x);on?classes.add(x):classes.delete(x)}},setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k],addEventListener(){},children:[],appendChild(x){this.children.push(x)},textContent:'',innerHTML:'',value:'',focus(){}}}
for(const match of fs.readFileSync(root+'index.html','utf8').matchAll(/id="([^"]+)"/g))els[match[1]]=element(match[1]);
const adapt=c=>{const orig=c.getContext.bind(c);c.getContext=(...a)=>{const t=orig(...a),draw=t.drawImage.bind(t);t.drawImage=(i,...args)=>draw(i.im||i,...args);return t};return c};
els.game=adapt(createCanvas(960,540));
class Image{set src(s){pending.push(loadImage(root+s).then(im=>{this.im=im;this.complete=true;this.naturalWidth=im.width;this.naturalHeight=im.height;this.onload?.()}))}}
class Audio{constructor(src){this.src=src;this.paused=true;this.volume=1;this.currentTime=0;this.plays=0;this.pauses=0}addEventListener(){}play(){this.paused=false;this.plays++}pause(){this.paused=true;this.pauses++}}
class AudioContext{
 constructor(){this.currentTime=0;this.sampleRate=8000;this.state='running';this.destination={};this.sources=[]}
 resume(){this.state='running';return Promise.resolve()}
 createGain(){const gain={value:1,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v}};return{gain,connect(){},disconnect(){}}}
 createOscillator(){return{frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}}}
 createBuffer(channels,n){return{getChannelData:()=>new Float32Array(n)}}
 createBufferSource(){const s={connect(){},disconnect(){},start(t,offset){this.offset=offset;this.started=true},stop(){this.stopped=true}};this.sources.push(s);return s}
 decodeAudioData(){return Promise.resolve({duration:122.091})}
}
class SpeechRecognition{constructor(){recognizers.push(this);this.results=[]}start(){this.started=true;this.onstart?.()}abort(){this.aborted=true;this.onend?.()}result(text,index=0,final=true){this.results[index]={0:{transcript:text},isFinal:final,length:1};this.onresult?.({resultIndex:index,results:this.results})}}
const listeners={},context={console,Image,Audio,Math:math,Set,Uint8Array,Int32Array,Date,navigator:{},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}),setTimeout:(fn,ms=0)=>{const id=++timerId;timers.set(id,{fn,at:clock+ms});return id},clearTimeout:id=>timers.delete(id),requestAnimationFrame(){},localStorage:{getItem(){return null},setItem(){}},window:{AudioContext,SpeechRecognition,addEventListener:(n,fn)=>listeners[n]=fn},document:{hidden:false,getElementById:id=>els[id]||null,createElement:t=>t==='canvas'?adapt(createCanvas(1,1)):element('created'),querySelectorAll:()=>[],addEventListener:(n,fn)=>listeners[n]=fn}};
vm.createContext(context);
for(const file of [...fs.readFileSync(root+'index.html','utf8').matchAll(/<script src="([^"?]+)\?v=\d+"><\/script>/g)].map(m=>m[1]))vm.runInContext(fs.readFileSync(root+file,'utf8'),context,{filename:file});
const run=s=>vm.runInContext(s,context);
run('function advance(seconds){for(let t=0;t<seconds-1e-8;t+=1/60){const dt=Math.min(1/60,seconds-t);if(audio)audio.currentTime+=dt;tick(dt)}}');
// Six-species fixture exercises every existing attack independently of random spawns.
const specimens=new Map(),combinations=new Set();
for(const [species,hp] of Object.entries({bee:20,fly:30,moth:40,spider:40,mantis:50,beetle:60}))assert.equal(run('bugTypes['+JSON.stringify(species)+'].hp'),hp,species+' assigned HP');
assert(run('Object.values(bugTypes).every(b=>b.damage%5===0)'), 'all bug attacks end in 0 or 5');
for(let i=0;i<200;i++){
 const roster=run('createBattleBugs()');
 assert.equal(roster.length,3);assert.equal(new Set(roster.map(b=>b.type)).size,3);
 assert.deepEqual(Array.from(roster,b=>b.id),[1,2,3]);
 combinations.add(Array.from(roster,b=>b.type).sort().join(','));
 roster.forEach(b=>{assert(b.c>=3&&b.c<=5&&b.r>=0&&b.r<=2);assert(!b.layer||run('bugTypes['+JSON.stringify(b.type)+'].flying'));assert.equal(b.hp,run('bugTypes['+JSON.stringify(b.type)+'].hp'));assert.equal(b.max,b.hp);specimens.set(b.type,b)});
}
assert.equal(specimens.size,6);assert(combinations.size>10);
run('reset(false)');assert.equal(run('bugs.length'),3);
const fixture=['bee','fly','spider','mantis','beetle','moth'].map((type,i)=>({...specimens.get(type),id:i+1}));
console.log('PASS production roster: three unique random species, all six reachable, legal layers and sequential IDs.');
function fresh(auto=false,enemies=false){run('reset(false)');run('bugs='+JSON.stringify(fixture));run('automationEnabled='+auto+';enemyAutomationEnabled='+enemies)}
function render(name){run('draw()');fs.writeFileSync('/tmp/'+name+'.png',els.game.toBuffer('image/png'))}

(async()=>{
run('state="start"');assert(!els.begin.disabled);els.begin.onclick();assert(run('startRequested'));assert.equal(run('state'),'start');
for(let i=0;i<pending.length;){const end=pending.length;await Promise.all(pending.slice(i,end));i=end}assert.equal(run('state'),'intro','early start tap is honored after images finish');
await run('battleMusic.ready()');
assert.equal(run('loadedAssets'),11);assert.equal(run('Object.values(animationSheets).reduce((n,s)=>n+s.frames.length,0)'),121);
run('navigator={userAgent:"iPhone",mediaDevices:{getUserMedia:()=>Promise.reject(new Error("permission denied"))}};beginVoiceBattle()');
assert.equal(run('state'),'intro','battle intro starts without waiting on microphone permission');
await Promise.resolve();await Promise.resolve();run('advance(2.2)');assert.equal(run('state'),'target','permission failure leaves the playable target flow active');run('stopVoice();navigator={}');
run('loadedAssets=0;loadedCoreAssets=0;startReady=false;$("begin").disabled=true');
run('for(let i=0;i<9;i++)assetReady(false);assetReady(true)');assert(els.begin.disabled,'optional art and one core image do not hold the start button');
run('assetReady(true)');assert(!els.begin.disabled,'game becomes startable when background and character atlas are ready');assert.equal(run('loadedAssets'),11);
run('fallbackSheetBackup={...animationSheets};delete animationSheets.motion;delete animationSheets.loops;delete animationSheets.bugs;delete animationSheets.extra;draw();Object.assign(animationSheets,fallbackSheetBackup)');
assert(['intro','target'].includes(run('state')),'static sprites cover animation sheets while they continue loading');
assert.equal(run('Object.values(files).flat().length'),19);
assert.equal(run('Object.entries(files).every(([family,cards])=>cards.length===(family==="area"?4:3))'),true);
assert.equal(run('files.area[3].id'), 'area-4');
assert.equal(run('files.area[3].name'),'ホールアウト');
assert(run('Object.values(files).flat().filter(c=>c.damage||c.reflect).every(c=>((c.damage||c.reflect)%5===0)&&c.desc.includes(String(c.damage||c.reflect)))'),'file attack damage is rounded and descriptions agree');
for(const [family,expected] of Object.entries({sword:[20,15,10],guns:[10,25,15],gravity:[5,15,20]}))assert.deepEqual(Array.from(run('files['+JSON.stringify(family)+']'),c=>c.damage),expected,family+' damage relative to 20–60 HP');
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
 assert(run('immediateActivate(files.sword['+(n-1)+'])'));
 assert.deepEqual(Array.from(run('bugs'),(b,i)=>b.hp<500?i:-1).filter(i=>i>=0),expected,'sword '+n+' hit pattern');
}
console.log('PASS sword 001 forward 1, 002 vertical 3, 003 horizontal 3.');
for(const [n,expectedHp] of [[1,10],[2,0],[3,5]]){
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
 fresh(false);run('appearance.shield='+n+';shieldVisualTime=1;drawZeroAnimated()');
 const shield=run('window.equipmentCalls.filter(c=>c[0]==="shield").at(-1)');
 assert(shield,'shield '+n+' is drawn');assert.deepEqual(Array.from(shield.slice(4,6)),[[23,41],[34,58],[47,77]][n-1]);assert(shield[2]>run('pos(col,row,layer).x')+30,'shield sits ahead within Zero panel');
 run('gravityDrops=[{num:'+n+',c:4,r:1,cells:[{c:4,r:1}],age:.76}];drawFieldEffects()');
 const gravity=run('window.equipmentCalls.filter(c=>c[0]==="gravity").at(-1)');
 assert(gravity,'gravity '+n+' is drawn');assert.equal(gravity[4],58,'gravity covers one tile width');
 assert.equal(gravity[8],n===1?0:Math.PI,'statues land head-first');
}
run('drawEquipment=originalDrawEquipment');if(process.env.ZERO_SCREENSHOT)render('zero_gravity_shield');
console.log('PASS three increasing shields and full-tile gravity sprites; statues land head-first.');
lane();run('runCommand("File area No.004");advance(1.1)');assert.equal(run('equipmentUses["area-4"]'),1);assert(run('panelHoles.size>0'));
console.log('PASS new wing art/speed/landing, cactus, moai, Statue of Liberty and area hole.');
fresh(true);run('startVoice()');const sr=recognizers.at(-1);
sr.onspeechstart();sr.result('ファイルウィング',0);sr.onspeechend();waitVoice(180);
sr.onspeechstart();sr.result('ナンバー002',1);sr.onspeechend();waitVoice(400);run('advance(1.5)');
assert.equal(run('equipmentUses["wing-2"]'),1,'split voice command triggers the correct new wing');run('stopVoice()');
console.log('PASS split microphone command for remapped wing.');

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
bossFresh();run('col=3;row=1;zeroFacing=1;immediateActivate(files.sword[2])');
assert.equal(run('bugs[0].hp'),140,'horizontal sword hits two-cell boss once');
bossFresh();run('bullets=[{c:5.8,r:1,layer:0,dir:-1,speed:12,damage:10,enemy:false}];advance(.12)');
assert.equal(run('bugs[0].hp'),140,'shot can hit the rear cell from the right');
bossFresh();run('gravityDrops=[{num:1,c:5,r:1,cells:[{c:5,r:1}],damage:5,stun:0,age:.8,duration:1.12,hit:new Set(),impact:false}];tickField(.13)');
assert.equal(run('bugs[0].hp'),145,'gravity hits the rear occupied cell');
console.log('PASS next encounter, battery checkpoint, two-cell ownership/holes and damage.');
bossFresh();run('hit(bugs[0],75)');assert.equal(run('bugs[0].layer'),0,'exactly half stays grounded');
run('submitOrder(files.sword[0],{untilTarget:1});hit(bugs[0],1)');assert.equal(run('bugs[0].layer'),1);assert(run('poisonActive'));
assert.equal(run('activeOrder'),null,'unreachable repeat order clears when the boss takes off');
run('hitstop=0;shield=999;shieldTime=100;invuln=100;advance(1.01)');assert.equal(run('hp'),197,'ground poison applies exactly 3 per second through armor');
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
assert.equal(run('col'),1,'suction pulls Zero toward the boss');
assert.equal(run('hp'),200,'suction does not deal remote damage');run('advance(.6)');assert(run('zeroBound()'),'front-row capture');assert.equal(run('col'),2);
run('enemyAutomationEnabled=false;bugs[0].bindAge=0;window.hurtSounds=0;window.originalSfx=sfx;sfx=function(k){if(k==="hurt")window.hurtSounds++;window.originalSfx(k)};state="paused";tick(2)');assert.equal(run('bugs[0].bindAge'),0);run('state="battle";advance(.95)');assert.equal(run('hp'),200,'first pulse waits a full second');
run('advance(.1)');assert.equal(run('hp'),190);
run('cancelOrders();move(-1,0);land()');assert.equal(run('col'),2);assert.equal(run('layer'),1);assert.equal(run('activate(files.wing[0])'),false);
run('advance(1)');assert.equal(run('hp'),180);run('advance(1)');assert.equal(run('hp'),170);assert(!run('zeroBound()'));assert.equal(run('window.hurtSounds'),3);run('sfx=window.originalSfx');
for(const r of [0,2])for(const l of [0,1]){bossFresh();run('row='+r+';layer='+l+';col=0;enemyAutomationEnabled=true;beginBossAttack(bugs[0],"suction");advance(1.6)');assert.equal(run('col'),2,'all rows/layers pull to own front');assert(!run('zeroBound()'),'other rows avoid mouth');}

bossFresh();run('hit(bugs[0],76);hit(bugs[0],100);checkEnd()');assert.equal(run('state'),'win');
assert(!els.restartAll.classList.contains('hidden'));assert(!els.retry.classList.contains('hidden'));assert(!run('poisonActive'));assert(els.nextEnemy.classList.contains('hidden'));assert(!run('startNextEncounter()'));
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
 run('hit(bugs[0],76);hitstop=0;advance(2);bossPhaseFlash=0');render('zero_boss_air');
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
bossFresh();run('hit(bugs[0],76);hitstop=0;automationEnabled=true;runCommand("オートモード");advance(1.6)');assert.equal(run('layer'),1,'auto escapes ground poison with Wing');assert(run('Object.keys(equipmentUses).some(k=>k.startsWith("wing-"))'));
run('runCommand("ファイルガンズNo.001")');assert.equal(run('autoTechniqueMode'),false,'manual instruction ends auto mode');
bossFresh();run('automationEnabled=true;bugs[0].hp=bugs[0].max=5000;runCommand("オートモード");advance(35)');
const families=new Set(Object.keys(run('equipmentUses')).map(k=>k.split('-')[0]));for(const family of ['guns','sword','gravity','area','shield'])assert(families.has(family),'auto used '+family);
for(const bossLayer of [0,1])for(const zeroRow of [0,1,2]){
 bossFresh();run('bugs[0].layer='+bossLayer+';layer='+(1-bossLayer)+';row='+zeroRow+';beginBossAttack(bugs[0],"blast")');
 assert.equal(run('bossHazards[0].cells.length'),9);run('tickBossWorld(1.16)');assert.equal(run('hp'),170);
}
bossFresh();run('enemyAutomationEnabled=false;moveBug(bugs[0],3,1);bugs[0].motion.duration=.42;tickMidboss(bugs[0],.1)');assert.equal(run('bugs[0].motion.age'),.125,'normal boss speed is previous enraged speed');
for(const type of ['bee','fly','moth','grenade']){
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
assert.equal(run('window.bossDraw.at(-1)[3]'),run('Math.round(114*animationSheets.boss.frames[4].width/animationSheets.boss.frames[0].width)'),'air sprite retains ground art scale');
bossFresh();run('enemyAutomationEnabled=true;bugs[0].cd=0;bugs[0].stepWait=10;Math.random=()=>.64;tickMidboss(bugs[0],.02)');assert.equal(run('bugs[0].attack'),'blast','65% branch blasts');
bossFresh();run('enemyAutomationEnabled=true;bugs[0].cd=0;bugs[0].stepWait=10;Math.random=()=>.65;tickMidboss(bugs[0],.02)');assert.equal(run('bugs[0].attack'),'suction','remaining 35% branch suctions');
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
run('advance(.49)');assert.equal(run('col'),committedCol);assert(run('techniqueLock'),'windup remains locked until execution');
run('advance(.1)');assert.equal(run('equipmentUses[files.sword[0].id]'),1,'committed sword executes');
assert.equal(run('techniqueLock.stage'),'recovery');run('move(-1,0,false);advance(.25)');
assert.equal(run('col'),committedCol,'recovery cannot be cancelled by movement');
run('movementEnabled=false;advance(.35)');assert.equal(run('techniqueLock'),null,'lock ends after complete motion');
lane();run('submitOrder(files.sword[0]);advance(.06)');assert.equal(run('techniqueLock.stage'),'windup');
run('automationEnabled=false;hurt(10)');assert.equal(run('techniqueLock'),null,'real damage cancels the commitment');
assert.equal(run('transformation'),null,'damage cancels the pending windup');
run('advance(.2)');assert(!run('equipmentUses[files.sword[0].id]'),'canceled windup never strikes');
lane();run('submitOrder(files.sword[0]);advance(.06)');
run('bugs.find(b=>b.id===3).r=0;movementEnabled=true;advance(.66)');
assert.equal(run('equipmentUses[files.sword[0].id]'),1,'an enemy moving out of range cannot cancel the committed strike');
assert.equal(run('col'),2,'Zero stays on the committed tile even when the target moves');
run('movementEnabled=false;advance(.6)');assert.equal(run('techniqueLock'),null,'missed strike still completes recovery');
console.log('PASS complete file commitment from deployment through strike and recovery, with damage cancellation.');
console.log('ALL CURRENT TESTS PASSED.');
})().catch(e=>{console.error(e);process.exit(1)});
