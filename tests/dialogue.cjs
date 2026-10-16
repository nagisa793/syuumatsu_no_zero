const {createCanvas,loadImage}=require('@napi-rs/canvas');
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'../dist')+'/',els={},pending=[],timers=new Map(),recognizers=[],frames=[],fetches=[];
let timerId=0,seed=917,clock=0;
function waitVoice(ms){const end=clock+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;clock=next[1].at;timers.delete(next[0]);next[1].fn()}clock=end}
const math=Object.create(Math);math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);const randomizedMovement=math.random;
function element(id){const classes=new Set(),attrs={};return{id,style:{setProperty(){}},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on===undefined)on=!classes.has(x);on?classes.add(x):classes.delete(x)}},setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k],addEventListener(){},tagName:'BUTTON',children:[],appendChild(x){this.children.push(x)},textContent:'',_html:'',get innerHTML(){return this._html},set innerHTML(v){this._html=v;for(const m of v.matchAll(/id="([^"]+)"/g))els[m[1]]=element(m[1])},value:'',focus(){},disabled:false}}
for(const match of fs.readFileSync(root+'index.html','utf8').matchAll(/id="([^"]+)"/g))els[match[1]]=element(match[1]);
els.begin.disabled=/id="begin" disabled/.test(fs.readFileSync(root+'index.html','utf8'));
els.touchbegin.disabled=true;
const adapt=c=>{const orig=c.getContext.bind(c);c.getContext=(...a)=>{const t=orig(...a),draw=t.drawImage.bind(t);t.drawImage=(i,...args)=>draw(i.im||i,...args);return t};return c};
els.game=adapt(createCanvas(960,540));
els.homescene=adapt(createCanvas(960,540));
class Image{set src(s){pending.push(loadImage(root+s).then(im=>{this.im=im;this.complete=true;this.naturalWidth=im.width;this.naturalHeight=im.height;this.onload?.()}).catch(error=>{console.error('Image load failed:',s);throw error}))}}
class Audio{constructor(src){this.src=src;this.paused=true;this.volume=1;this.currentTime=0;this.plays=0;this.pauses=0}addEventListener(){}play(){this.paused=false;this.plays++}pause(){this.paused=true;this.pauses++}}
class AudioContext{
 constructor(){this.currentTime=0;this.sampleRate=8000;this.state='running';this.destination={};this.sources=[]}
 resume(){if(this.blockedResume)return new Promise(()=>{});this.state='running';return Promise.resolve()}
 createGain(){const gain={value:1,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v}};return{gain,connect(){},disconnect(){}}}
 createOscillator(){const s={context:this,frequency:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(t){this.started=true;this.at=t},stop(t){if(t===undefined||t<=this.context.currentTime)this.stopped=true;else this.stopAt=t}};this.sources.push(s);return s}
 createBiquadFilter(){return{frequency:{value:1000,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
 createBuffer(channels,n){return{getChannelData:()=>new Float32Array(n)}}
 createBufferSource(){const s={connect(){},disconnect(){},start(t,offset){this.offset=offset;this.started=true},stop(){this.stopped=true}};this.sources.push(s);return s}
 decodeAudioData(){if(this.decodeFailures){this.decodeFailures--;return Promise.reject(Error('temporary decode failure'))}return Promise.resolve({duration:122.091})}
}
class SpeechRecognition{set onresult(fn){this.resultHandler=fn}get onresult(){return this.resultHandler?(e)=>{this.resultHandler(e);waitVoice(0)}:null}constructor(){throw Error('No browser recognition allowed')}start(){this.started=true;this.onstart?.()}abort(){this.aborted=true;this.onend?.()}result(text,index=0,final=true){this.results[index]={0:{transcript:text},isFinal:final,length:1};this.onresult?.({resultIndex:index,results:this.results})}}
const listeners={},context={console,Image,Audio,Math:math,Set,Uint8Array,Int32Array,Date,navigator:{mediaDevices:{getUserMedia(){throw Error('No site microphone capture allowed')}}},fetch:async url=>{fetches.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}},setTimeout:(fn,ms=0)=>{const id=++timerId;timers.set(id,{fn,at:clock+ms});return id},clearTimeout:id=>timers.delete(id),requestAnimationFrame(fn){frames.push(fn)},localStorage:{getItem(){return null},setItem(){}},window:{AudioContext,SpeechRecognition,addEventListener:(n,fn)=>listeners[n]=fn},document:{documentElement:element('html'),body:element('body'),hidden:false,getElementById:id=>els[id]||null,createElement:t=>t==='canvas'?adapt(createCanvas(1,1)):element('created'),querySelectorAll:()=>[],addEventListener:(n,fn)=>listeners[n]=fn}};
vm.createContext(context);
for(const file of [...fs.readFileSync(root+'index.html','utf8').matchAll(/<script src="([^"?]+)\?v=\d+"><\/script>/g)].map(m=>m[1])){
 vm.runInContext(fs.readFileSync(root+file,'utf8'),context,{filename:file});
 if(file!=='boot.js'){
  assert.equal(frames.length,0,'no rendering while a later script is still downloading: '+file);
  assert(els.begin.disabled,'no partially initialized start action: '+file);
  assert(els.touchbegin.disabled,'TOUCH must wait until all game scripts are initialized: '+file);
 }
 if(file==='command.js'){
  // Cached core images can finish while later scripts are still in transit.
  vm.runInContext('assetReady(true);assetReady(true)',context);
  assert(els.begin.disabled,'core images alone cannot enable an incomplete runtime');
  vm.runInContext('loadedAssets=0;loadedCoreAssets=0;startReady=false',context);
 }
}
assert.equal(frames.length,1);
const run=s=>vm.runInContext(s,context);
function tap(id){return context.window.zeroBattle.tapTechnique(id)}
function queue(){return Array.from(context.window.zeroBattle.readCommand().queue,o=>o.card)}
function fresh(){run(`encounter='skirmish';reset(false);automationEnabled=false;enemyAutomationEnabled=false;row=1;col=2;bugs=[{...createBattleBugs()[0],id:1,type:'spider',c:3,r:1,layer:0,hp:500,max:500},{...createBattleBugs()[1],id:2,type:'bee',c:5,r:2,layer:1,hp:500,max:500}];targetId=null;targetPinned=false;automaticTarget()`)}
run('function advance(seconds){for(let t=0;t<seconds-1e-8;t+=1/60)tick(Math.min(1/60,seconds-t))}');
function plan(ids,target=1){assert(run('beginTarget()'));for(const id of ids)assert(tap(id),id);assert(context.window.zeroBattle.tapTarget(target));run('advance(.8)')}
function useStock(count,seconds=2.6){for(let i=0;i<count;i++){assert(context.window.zeroBattle.tapUseStock());run('advance('+seconds+')')}}
const openingFrames=[];
function captureOpening(name){
 run('draw()');if(!process.env.ZERO_RENDER_OUT)return;
 const image=adapt(createCanvas(960,540));image.getContext('2d').drawImage(els.game,0,0);openingFrames.push({name,image});
}
(async()=>{
 assert(els.begin.disabled);assert(Number(els.zeroload.getAttribute('aria-valuenow'))<100);
 const skySeed=seed,skyStart=run('time');run('drawHomeScreen()');
 const firstSky=els.homescene.toBuffer('image/png');run('advance(1);drawHomeScreen()');
 const movingSky=els.homescene.toBuffer('image/png');assert(run('homeSkyClock()')>skyStart,'the home animation clock advances even while the art is downloading');
 assert.equal(seed,skySeed,'title animation must not alter enemy randomness');
 run('state="paused";beforePause="start";advance(2);drawHomeScreen()');assert(movingSky.equals(els.homescene.toBuffer('image/png')),'settings must freeze the title animation');
 run('state="start";time='+skyStart);console.log('PASS title clock during loading, frozen settings and unchanged battle randomness.');
 run('draw()');assert.deepEqual([...els.game.getContext('2d').getImageData(480,380,1,1).data],[3,11,20,255],'the preloaded home view has no faint battlefield beneath it');
 assert.equal(run('opening.phase'),'touch');assert.equal(run('audio'),null,'TOUCH must precede all audio output');
 els.begin.onclick();assert(!run('startRequested'),'START is unavailable behind TOUCH');assert.equal(run('state'),'start');
 for(let i=0;i<pending.length;){const end=pending.length;await Promise.all(pending.slice(i,end));i=end}
 for(let t=0;t<180;t+=.5){
  const p=run('homeCircuitCamera('+t+')'),next=run('homeCircuitCamera('+(t+.5)+')');
  assert(next.x>p.x&&next.y<p.y,'background motion must always be up and right, never reverse');
  const tiles=run('homeCircuitTiles('+t+')');
  for(const [x,y] of [[0,0],[479.99,0],[0,269.99],[479.99,269.99],[240,135]])assert(tiles.some(p=>p.x<=x&&p.y<=y&&p.x+p.width>=x&&p.y+p.height>=y),'the scrolling plate must cover every edge');
 }
 const circuit=adapt(createCanvas(480,270)),circuitPaint=circuit.getContext('2d');
 run('drawHomeSpace')(circuitPaint,0);const circuitBefore=circuitPaint.getImageData(0,0,480,270).data;
 run('drawHomeSpace')(circuitPaint,2);const circuitAfter=circuitPaint.getImageData(0,0,480,270).data;let changed=0;
 for(let i=0;i<circuitBefore.length;i+=4)if(Math.abs(circuitBefore[i]-circuitAfter[i])+Math.abs(circuitBefore[i+1]-circuitAfter[i+1])+Math.abs(circuitBefore[i+2]-circuitAfter[i+2])>20)changed++;
 assert(changed>480*270*.5,'the background art itself must visibly move over a large part of the frame');
 console.log('PASS constant up-right full-background motion and uninterrupted coverage for three minutes.');
 if(process.env.ZERO_RENDER_OUT){
  fs.mkdirSync(process.env.ZERO_RENDER_OUT,{recursive:true});const art=adapt(createCanvas(960,540)),paint=art.getContext('2d');
  paint.scale(2,2);run('drawHomeBackdrop')(paint);fs.writeFileSync(path.join(process.env.ZERO_RENDER_OUT,'home-art-native.png'),art.toBuffer('image/png'));
  for(const t of [0,2,4,6]){run('drawHomeBackdrop')(paint,t);fs.writeFileSync(path.join(process.env.ZERO_RENDER_OUT,'home-'+t+'.png'),art.toBuffer('image/png'))}
  // Artwork/layout inspection only, not a browser or DOM screenshot.
  run('drawHomeBackdrop')(paint,0);const star=await loadImage(root+'assets/home/start-star-v83.svg'),w=480*.18;
  paint.drawImage(star,480*.65-w/2,270*.46-w/2,w,w);
  fs.writeFileSync(path.join(process.env.ZERO_RENDER_OUT,'home-button-shape.png'),art.toBuffer('image/png'));
 }
 const filmFrames=[];
 function captureFilm(name){run('drawHomeScreen()');const image=adapt(createCanvas(960,540));image.getContext('2d').drawImage(els.homescene,0,0);filmFrames.push({name,image})}
 const initialSeed=seed,filmEvents={stopped:0,stopPropagation(){this.stopped++}};
 assert(els.touchbegin.onclick(filmEvents));assert.equal(filmEvents.stopped,1);assert.equal(run('opening.phase'),'film');assert.equal(run('state'),'start');
 assert(!els.touchbegin.onclick(filmEvents),'the first tap cannot start two films or accidentally skip');run('audio.decodeFailures=1');
 await run('preparePrologueAudio()');await run('homeMusic.ready()');for(let i=0;i<12;i++)await Promise.resolve();
 for(const [at,name] of [[.4,'STAR FRACTURE'],[1.7,'WHITE CRUMBLES'],[3.4,'CITY INFESTATION'],[6.4,'DATA COLLAPSE'],[7.6,'AKARI FRONT VIEW'],[8.85,'No.003! LONG SWORD'],[10.45,'ZERO WINDUP'],[10.75,'WHITE SLASH'],[11.2,'BUG DELETION'],[11.6,'ZERO HAS EXITED'],[12.3,'FADE TO WHITE'],[13.3,'WHITE HOLD'],[14.4,'HOME DISSOLVE']]){
  run('advance('+(at-run('opening.age'))+')');captureFilm(name);
  assert.equal(run('opening.phase'),'film');
  if(at<run('prologueTiming.home'))assert(run('homeMusic.paused'),'the title loop must not leak into the film');
  else assert(run('homeMusic.source.started&&!homeMusic.paused'),'the home theme begins with the white-to-home dissolve');
  assert.equal(run('commandSoundSources.size'),0,'the film must not play the Long Sword voice');
 }
 const fadingHomeSource=run('homeMusic.source');
 assert.equal(seed,initialSeed,'film effects must never consume the battle RNG');assert.equal(run('hp'),200);assert.equal(run('energy'),100);assert.equal(run('elapsed'),0);
 assert(run('!prologueScore.loop&&!prologueEffects.loop&&prologueScore.paused&&prologueEffects.paused'));
 for(const cel of run('prologueZero')){const data=cel.getContext('2d').getImageData(0,0,cel.width,cel.height).data;let solid=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>0){solid++;assert.equal(data[i]+data[i+1]+data[i+2],0,'Zero, wings and sword must be pure black')}assert(solid>1000)}
 run('advance(1)');for(let i=0;i<12;i++)await Promise.resolve();assert.equal(run('opening.phase'),'home');assert(run('prologueScore.paused&&prologueEffects.paused'));assert(run('homeMusic.source.started&&!homeMusic.paused'));
 assert.equal(run('homeMusic.source'),fadingHomeSource,'completing the dissolve must not restart the home theme');
 // Ground paths remain separate for the full film, across walk/hold frames
 // and offscreen wraps. Sizes use depth rather than random overlapping y.
 const cast=run('prologueSwarm');assert(cast.some(b=>b.type==='grenade'&&b.flying));assert(cast.some(b=>b.type==='wasp'&&b.flying));assert(cast.some(b=>b.type==='dragonfly'&&b.flying));
 assert(Math.max(...cast.map(b=>b.size))>=Math.min(...cast.map(b=>b.size))*5);
 for(let at=0;at<=16;at+=.1){
  const ground=run('prologueSwarmPlacements('+at+')').filter(b=>!b.flying);
  for(let i=0;i<ground.length;i++)for(let j=i+1;j<ground.length;j++){
   const a=ground[i],b=ground[j],overlapX=Math.abs(a.x-b.x)<(a.w+b.w)/2,overlapY=a.y<b.bottom&&b.y<a.bottom;
   assert(!(overlapX&&overlapY),'ground bugs must never ride on or intersect one another at '+at);
  }
 }
 const filmProbe=adapt(createCanvas(480,270)),filmPaint=filmProbe.getContext('2d'),filmDraw=filmPaint.drawImage.bind(filmPaint),zeroCels=run('prologueZero');let heroDraws=0;
 filmPaint.drawImage=(im,...args)=>{if(zeroCels.includes(im))heroDraws++;return filmDraw(im,...args)};
 run('drawPrologue')(filmPaint,10.75);assert(heroDraws>0,'the slash must show the complete winged silhouette');
 for(const at of [11.4,11.6,12.3,13.3,14.4]){heroDraws=0;run('drawPrologue')(filmPaint,at);assert.equal(heroDraws,0,'the complete Zero and wings must leave after the slash')}
 run('drawPrologue')(filmPaint,13.3);assert([...filmPaint.getImageData(0,0,480,270).data].every(v=>v===255),'the transition holds a clean white frame');
 const expectedHome=adapt(createCanvas(480,270)),homePaint=expectedHome.getContext('2d');run('drawHomeBackdrop')(homePaint,run('homeSkyClock()'));
 run('drawPrologue')(filmPaint,run('prologueTiming.end')-1/60);const lastDissolve=filmPaint.getImageData(0,0,480,270).data,firstHome=homePaint.getImageData(0,0,480,270).data;
 let seamDifference=0;for(let i=0;i<lastDissolve.length;i++)seamDifference+=Math.abs(lastDissolve[i]-firstHome[i]);assert(seamDifference/lastDissolve.length<1,'the final dissolve must match the home screen without a cut');
 for(const at of [0,.3,2,4,7.6,8.9,10.7,12.3,13.4,14.4]){
  run('opening.phase="touch";state="start";updateOpeningGate();stopHomeMusic()');assert(els.touchbegin.onclick(filmEvents));run('advance('+at+')');
  assert(els.skipopening.onclick(filmEvents));for(let i=0;i<12;i++)await Promise.resolve();
  assert.equal(run('opening.phase'),'home');assert.equal(run('state'),'start');assert(run('prologueScore.paused&&prologueEffects.paused'));
  assert(run('homeMusic.source.started&&!homeMusic.paused'),'every skip starts the home loop immediately');
  const homeLoop=run('homeMusic.source');assert(!els.skipopening.onclick(filmEvents));run('advance(.1)');assert.equal(run('homeMusic.source'),homeLoop,'a duplicate skip cannot restart the loop or launch battle');
 }
 run('opening.phase="touch";state="start";updateOpeningGate();stopHomeMusic()');els.touchbegin.onclick(filmEvents);run('advance(3.5)');const filmAge=run('opening.age');els.settings.onclick();run('advance(1)');assert.equal(run('opening.age'),filmAge);assert(run('prologueScore.paused&&prologueEffects.paused'));els.settingsresume.onclick();run('advance(.1)');assert(run('opening.age')>filmAge);assert(run('prologueScore.source.started'));els.skipopening.onclick(filmEvents);
 run('opening.phase="touch";state="start";updateOpeningGate();stopHomeMusic()');els.touchbegin.onclick(filmEvents);run('audio.state="suspended";audio.blockedResume=true;advance(.6)');assert.equal(run('opening.age'),0,'film clock must wait for output activation');run('audio.blockedResume=false;unlockAudio(true);advance(.2)');assert(run('opening.age')>0);els.skipopening.onclick(filmEvents);
 if(process.env.ZERO_RENDER_OUT){const sheet=createCanvas(960*2,574*Math.ceil(filmFrames.length/2)),p=sheet.getContext('2d');p.fillStyle='#06111d';p.fillRect(0,0,sheet.width,sheet.height);p.font='bold 20px monospace';for(const [i,f] of filmFrames.entries()){const x=i%2*960,y=Math.floor(i/2)*574;p.fillStyle='#baffeb';p.fillText(f.name,x+16,y+25);p.drawImage(f.image,x,y+34)}fs.writeFileSync(path.join(process.env.ZERO_RENDER_OUT,'prologue-contact-sheet.png'),sheet.toBuffer('image/png'));}
 run('opening.phase="touch";state="start";updateOpeningGate();stopHomeMusic();prologueScore.buffer=null;prologueScore.decoding=null;prologueScore.bytes=new Promise(resolve=>globalThis.releaseFilmBytes=resolve);prologueAudioWarm=null;prologueAudioReady=false');
 els.touchbegin.onclick(filmEvents);assert(els.skipopening.onclick(filmEvents));run('releaseFilmBytes(new ArrayBuffer(8))');await run('preparePrologueAudio()');for(let i=0;i<12;i++)await Promise.resolve();
 assert.equal(run('opening.phase'),'home');assert(run('prologueScore.paused&&!prologueScore.source&&prologueEffects.paused&&!prologueEffects.source'),'a delayed film decode cannot play after skipping');assert(run('homeMusic.source.started'));
 console.log('PASS TOUCH, separate ground paths and perspective, flying midboss, silent front-view Akari, pure black Zero with no lingering wings, smooth white/home dissolve, frozen battle/RNG and immediate skip in every phase.');
 const homeSource=fs.readFileSync(root+'intro.js','utf8'),homeHTML=fs.readFileSync(root+'index.html','utf8');
 const phone=run('homePhoneBounds()');assert.equal(phone.height,158);assert.equal(phone.angle,Math.PI/6);
 const halfW=(phone.width*Math.cos(phone.angle)+phone.height*Math.sin(phone.angle))/2,halfH=(phone.width*Math.sin(phone.angle)+phone.height*Math.cos(phone.angle))/2;
 assert(phone.x-halfW>=0&&phone.x+halfW<=480&&phone.y-halfH>=0&&phone.y+halfH<=270,'the larger iPhone must fit the home viewport');
 assert(homeSource.includes('target.drawImage(homeArtwork,-15,5,W,H)'));
 assert(homeSource.indexOf('target.drawImage(homePhoneArt')<homeSource.indexOf('target.drawImage(homeArtwork'));
 assert(homeHTML.includes('aria-label="START"><span class="start-star-label" aria-hidden="true">START'));
 const startGraphic=fs.readFileSync(root+'assets/home/start-star-v83.svg','utf8');assert(startGraphic.includes('id="start-lettering"'));assert(!startGraphic.includes('<text'));
 const title=run('homeTitleBounds()');assert(Math.abs(480*.65-(title.x+title.width*.5))<3,'START is horizontally above the の in the title');
 els.begin.onclick();assert.equal(run('state'),'intro');assert(run('homeIntroActive()'));await run('prepareHomeStartSound()');for(let i=0;i<10;i++)await Promise.resolve();
 const openingSource=Array.from(run('commandSoundSources'))[0];assert(openingSource.started&&openingSource.commandGain);assert.equal(openingSource.commandOffset,0);
 const timing=run('homeIntroTiming()'),initialEnemies=run('JSON.stringify(bugs.map(b=>[b.c,b.r,b.hp]))');
 run('advance(.6)');assert.equal(run('zeroArrivalProgress()'),0);captureOpening('ENCODE');
 els.begin.onclick();assert.equal(run('introAge'),.6,'a duplicated start tap cannot reset or skip the launch');
 run('advance('+(timing.departure+.18-.6)+')');assert(run('homeIntro.departed'));assert.equal(run('zeroArrivalProgress()'),0);captureOpening('TRANSFER');
 run('advance('+(timing.reveal+.23-run('introAge'))+')');assert(run('zeroArrivalProgress()>0&&zeroArrivalProgress()<1'));assert.equal(run('state'),'intro');captureOpening('PANEL RECEIVER');
 run('advance('+(timing.reveal+.85-run('introAge'))+')');captureOpening('DATA ASSEMBLY');
 run('advance('+(timing.reveal+1.55-run('introAge'))+')');captureOpening('COLOR RESOLVE');
 run('advance('+(timing.arrival+.03-run('introAge'))+')');assert.equal(run('zeroArrivalProgress()'),1);assert.equal(run('state'),'intro');captureOpening('ARRIVAL');
 assert.equal(run('col'),1);assert.equal(run('row'),1);assert.equal(run('layer'),0);assert.equal(run('hp'),200);assert.equal(run('elapsed'),0);assert.equal(run('JSON.stringify(bugs.map(b=>[b.c,b.r,b.hp]))'),initialEnemies);
 run('advance('+(timing.debug+.18-run('introAge'))+')');assert(run('introDebug'));captureOpening('DEBUG');
 run('advance('+(timing.end+.1-run('introAge'))+')');assert.equal(run('state'),'target');assert.equal(run('homeIntro'),null);captureOpening('TARGET');
 if(process.env.ZERO_RENDER_OUT){
  fs.mkdirSync(process.env.ZERO_RENDER_OUT,{recursive:true});const sheet=createCanvas(960*2,574*Math.ceil(openingFrames.length/2)),out=sheet.getContext('2d');out.fillStyle='#06111d';out.fillRect(0,0,sheet.width,sheet.height);out.font='bold 20px monospace';
  for(const [i,f] of openingFrames.entries()){const x=i%2*960,y=Math.floor(i/2)*574;out.fillStyle='#baffeb';out.fillText(f.name,x+16,y+25);out.drawImage(f.image,x,y+34)}
  fs.writeFileSync(path.join(process.env.ZERO_RENDER_OUT,'opening-contact-sheet.png'),sheet.toBuffer('image/png'));
 }
 assert(!els.begin.disabled);assert.equal(els.loadfill.style.width,'100%');assert.equal(els.zeroload.getAttribute('aria-valuenow'),'100');assert(els.zeroload.classList.contains('is-ready'));assert.equal(els.loadstate.textContent,'');
 await run('battleMusic.ready()');for(let i=0;i<10;i++)await Promise.resolve();
 assert(run('audio.state==="running"&&!battleMusic.paused&&!battleMusic.muted&&battleMusic.source.started'));
 assert.equal(recognizers.length,0);assert.equal(Object.keys(els).filter(id=>id.startsWith('tech-')).length,19);
 assert(!('command' in els));assert(!('confirm' in els));assert(!('commandform' in els));
 for(const c of run('tapCards'))assert(els['tech-'+c.id]);
 assert(tap('sword-1'));assert.equal(run('targetInstructionCount'),1);assert(run('orderQueue[0].awaitConfirm'));assert.equal(run('energy'),100);run('draw()');
 assert(context.window.zeroBattle.tapTarget(run('bugs[0].id')));run('advance(.8)');assert.equal(run('state'),'battle');assert(!tap('guns-1'));
 console.log('PASS cold start, nineteen visible skills, touch targeting, BGM and no input capture.');

 fresh();run('beginBattleIntro();beginHomeIntro();advance(.4)');
 const soundBeforePause=Array.from(run('commandSoundSources'))[0],introBeforePause=run('introAge');els.settings.onclick();assert(soundBeforePause.stopped);run('advance(2)');assert.equal(run('introAge'),introBeforePause);
 els.settingsresume.onclick();const resumedOpening=Array.from(run('commandSoundSources'))[0];assert(Math.abs(resumedOpening.commandOffset-introBeforePause)<1e-8);run('advance(7)');assert.equal(run('state'),'target');
 fresh();run('homeStartBuffer=null;homeStartDecoding=null;homeStartBytes=new Promise(resolve=>globalThis.releaseStartBytes=resolve);beginBattleIntro();beginHomeIntro();advance(7)');assert.equal(run('state'),'target','a delayed button SE must not block the transfer');run('releaseStartBytes(new ArrayBuffer(8))');for(let i=0;i<10;i++)await Promise.resolve();assert.equal(run('commandSoundSources.size'),0);
 console.log('PASS SE launch, ordered teleport/reveal/DEBUG/TARGET, frozen actors, duplicate-tap protection, pause/resume signal offset and delayed-audio fallback.');

 fresh();run('beginHomeIntro()');
 run('audio.blockedResume=true;audio.state="suspended";advance(.8)');assert.equal(run('introAge'),0,'the launch animation must not consume an SE scheduled on suspended audio');
 run('audio.blockedResume=false;audio.state="running";advance(.3)');assert(Math.abs(run('introAge')-.3)<1e-8);run('advance(7)');assert.equal(run('state'),'target');
 fresh();run('beginHomeIntro();audio.blockedResume=true;audio.state="suspended";advance(8)');assert.equal(run('state'),'target','an unavailable output must not trap the player forever');run('audio.blockedResume=false;audio.state="running"');
 console.log('PASS delayed output activation preserves the opening SE/animation clock, with a bounded fallback when output stays unavailable.');

 // In-world targeting prioritizes the bug and its number. HP appears only in
 // the external target buttons, including during the selected lock flash.
 fresh();run('bugs[0].hp=37.2;bugs[1].hp=20;beginTarget();updateHud()');
 const paint=run('g'),originalFill=paint.fillRect.bind(paint),originalText=paint.fillText.bind(paint),paintLog=[];
 paint.fillRect=function(...a){paintLog.push({kind:'fill',blend:paint.globalCompositeOperation,rect:a});return originalFill(...a)};
 paint.fillText=function(text,...a){paintLog.push({kind:'text',text,font:paint.font});return originalText(text,...a)};
 run('drawTargetTitle()');assert(paintLog.length>50);
 assert(paintLog.every(e=>e.rect[0]>=0&&e.rect[0]+e.rect[2]<=240),'the entire TARGET title must stay in the left half');
 assert(paintLog.every(e=>e.rect[1]>55),'TARGET must leave the upper-left stock icons clear');paintLog.length=0;
 run('drawCommandOverlay()');
 const dimmer=paintLog.findIndex(e=>e.kind==='fill'&&e.blend==='multiply');assert(dimmer>=0);
 for(const label of ['No.001','No.002'])assert(paintLog.findIndex(e=>e.text===label)>dimmer,label+' must remain readable above TARGET dimming');
 assert(!paintLog.some(e=>e.kind==='text'&&String(e.text).startsWith('HP ')),'no duplicate HP over the bug');
 assert(paintLog.some(e=>e.text==='No.001'&&e.font.includes('12px')));
 assert(els.targetchoices.innerHTML.includes('HP 38'));assert(els.targetchoices.innerHTML.includes('HP 20'));
 const badge=run('targetBadgeBounds(bugs[0])');assert(badge.x>=0&&badge.y>=0&&badge.x+badge.width<=480&&badge.y+badge.height<=270);
 assert(run('selectTargetAt('+ (badge.x+badge.width/2)+','+(badge.y+badge.height-3)+')'));
 paintLog.length=0;run('drawCommandOverlay()');assert(!paintLog.some(e=>e.kind==='text'&&String(e.text).startsWith('HP ')));assert.equal(run('targetId'),1);
 paint.fillRect=originalFill;paint.fillText=originalText;
 if(process.env.ZERO_RENDER_OUT){run('state="target";draw()');fs.writeFileSync(path.join(process.env.ZERO_RENDER_OUT,'target-numbers-only.png'),els.game.toBuffer('image/png'))}
 console.log('PASS TARGET and lock show large numbers without HP duplicates; external HP stays current and number badges remain tappable.');

 // The visible canvas can be letterboxed on shorter screens. Test the same
 // coordinate conversion that the pointer handler uses, rather than a copy.
 for(const rect of [{left:10,top:20,width:360,height:202.5},{left:10,top:20,width:360,height:130},{left:10,top:20,width:320,height:240}]){
  const scale=Math.min(rect.width/480,rect.height/270),x=rect.left+(rect.width-480*scale)/2+315*scale,y=rect.top+(rect.height-270*scale)/2+180*scale;
  const point=run('battlePointAt('+x+','+y+','+JSON.stringify(rect)+')');assert(Math.abs(point.x-315)<1e-8&&Math.abs(point.y-180)<1e-8);
 }
 assert.equal(run('battlePointAt(10,25,{left:10,top:20,width:360,height:130})'),null);
 assert.equal(run('battlePointAt(150,22,{left:10,top:20,width:320,height:240})'),null);
 console.log('PASS TARGET touch positions stay aligned when the battle fits a shorter or taller viewport, and letterbox taps are ignored.');

 for(const previous of ['battle','target','lock','intro','start','win','lose']){
  fresh();run('beginTarget()');assert(tap('guns-1'));assert(tap('shield-1'));
  run('state='+JSON.stringify(previous)+';targetChangeRemaining=6.5;lockAge=.2;introAge=.4');
  const snapshot=()=>JSON.stringify(run('({hp,elapsed,simTime,lockAge,introAge,targetChangeRemaining,active:activeOrder?.id??null,queue:orderQueue.map(o=>[o.id,o.phase,o.awaitConfirm])})'));
  const before=snapshot();context.document.activeElement=els.settings;
  els.settings.onclick();assert.equal(run('state'),'paused');assert.equal(run('beforePause'),previous);
  assert(!els.settingspanel.classList.contains('hidden'));assert(els.pausepanel.classList.contains('hidden'));
  assert.equal(els.settings.getAttribute('aria-expanded'),'true');assert(els.screen.inert&&els.techniques.inert&&els.battlehud.inert);
  run('advance(2)');assert.equal(snapshot(),before,'opening settings must freeze '+previous+' and preserve the exact instruction stock');
  run('openGameMenu("pausepanel")');assert.equal(run('beforePause'),previous);assert(els.settingspanel.classList.contains('hidden'));assert(!els.pausepanel.classList.contains('hidden'));
  els.settings.onclick();assert.equal(run('beforePause'),previous);assert(!els.settingspanel.classList.contains('hidden'));
  els.settingsresume.onclick();assert.equal(run('state'),previous);assert.equal(snapshot(),before);
  assert(els.settingspanel.classList.contains('hidden')&&els.pausepanel.classList.contains('hidden'));assert(!els.screen.inert&&!els.techniques.inert&&!els.battlehud.inert);
  assert.equal(els.settings.getAttribute('aria-expanded'),'false');
 }
 fresh();context.document.activeElement=els.pause;els.pause.onclick();assert.equal(run('state'),'paused');assert(!els.pausepanel.classList.contains('hidden'));els.resume.onclick();assert.equal(run('state'),'battle');
 els.pause.onclick();els.restartPause.onclick();assert.equal(run('state'),'intro');assert(els.pausepanel.classList.contains('hidden'));assert(!els.screen.inert&&!els.techniques.inert);
 fresh();run('beginTarget()');els.settings.onclick();listeners.keydown({key:'Escape',preventDefault(){},target:els.bgmvolume});assert.equal(run('state'),'target');
 fresh();run('beginPhaseTransition("boss",bugs[0])');els.settings.onclick();const frozenPhase=run('phaseTransition.age');run('advance(3)');assert.equal(run('phaseTransition.age'),frozenPhase);els.settingsresume.onclick();run('advance(.2)');assert(run('phaseTransition.age')>frozenPhase);
 fresh();run('state="start";loadedCoreAssets=0;startReady=false;startRequested=true');els.settings.onclick();run('loadedCoreAssets=2;syncLoadingGauge();startWhenReady()');assert.equal(run('state'),'paused');els.settingsresume.onclick();assert.equal(run('state'),'intro','a start request becoming ready inside settings must launch after resuming');
 const menuHtml=fs.readFileSync(root+'index.html','utf8');assert(!/id="(?:sound|music)"/.test(menuHtml));assert(menuHtml.indexOf('id="settings"')>menuHtml.indexOf('id="pause"'));
 assert(menuHtml.indexOf('id="settingspanel"')<menuHtml.indexOf('<summary>ゲームの遊び方</summary>'));assert(menuHtml.indexOf('id="settingsresume"')>menuHtml.indexOf('<summary>ファイル図鑑'));
 console.log('PASS gear pauses and restores all battle states without draining timers or stock; pause/resume, menu switching, Escape, restart and removed sound toggles.');

 fresh();run('automationEnabled=true;beginTarget()');
 const planned=['sword-1','guns-1','sword-2','shield-1','gravity-1'];
 for(const id of planned)assert(tap(id));
 assert.equal(run('targetInstructionCount'),5);assert.deepEqual(queue(),planned);assert(run('orderQueue.every(o=>o.awaitConfirm&&o.awaitTarget)'));assert(!tap('wing-1'));
 run('advance(2);draw()');assert.equal(run('energy'),100);assert.equal(run('usedFiles'),0);
 assert(context.window.zeroBattle.tapTarget(1));run('advance(1)');assert.equal(run('usedFiles'),0);
 useStock(5);assert.deepEqual(Array.from(run('orderHistory.map(o=>o.card)')),planned);assert.equal(run('usedFiles'),5);assert(!context.window.zeroBattle.tapUseStock());assert.equal(run('targetInstructionCount'),5);assert(!tap('wing-1'));
 assert(run('beginTarget()'));assert.equal(run('targetInstructionCount'),0);assert.deepEqual(queue(),[]);assert(tap('wing-1'));
 console.log('PASS five TARGET registrations, manual one-at-a-time use, FIFO and selection reset only on next TARGET.');

 const grid=[...els.techniques.innerHTML.matchAll(/data-technique="([^"]+)" style="[^"]*grid-row:(\d);grid-column:(\d)/g)].map(m=>[m[1],Number(m[2]),Number(m[3])]);
 assert.equal(grid.length,19);const occupied=new Map(grid.map(([id,r,c])=>[r+','+c,id]));
 for(const [r,file] of ['sword','guns','shield','wing','gravity'].entries())for(let c=1;c<=3;c++)assert.equal(occupied.get((r+1)+','+c),file+'-'+c);
 for(let r=1;r<=4;r++)assert.equal(occupied.get(r+',4'),'area-'+r);
 assert(/id="canceltech"[^>]*grid-row:5;grid-column:4/.test(els.techniques.innerHTML));
 console.log('PASS fixed five-row/four-column deck and Cancel at bottom-right.');

 fresh();run('beginTarget()');for(const id of planned)assert(tap(id));
 assert(els.canceltech.onclick());assert.deepEqual(queue(),planned.slice(0,-1));assert.equal(run('targetInstructionCount'),4);assert(tap('wing-2'));assert.equal(run('targetInstructionCount'),5);assert(context.window.zeroBattle.tapCancel());
 for(let i=0;i<4;i++)assert(context.window.zeroBattle.tapCancel());
 assert.deepEqual(queue(),[]);assert.equal(run('targetInstructionCount'),0);assert.equal(run('lastOrderSpec'),null);assert.equal(run('energy'),100);assert(els.canceltech.disabled);assert(!context.window.zeroBattle.tapCancel());
 assert(tap('sword-1'));assert(tap('sword-1'));assert(context.window.zeroBattle.tapCancel());assert.deepEqual(queue(),['sword-1']);assert.equal(run('targetInstructionCount'),1);
 console.log('PASS Cancel removes newest unexecuted selection and restores both stock space and reserved uses.');

 fresh();run('automationEnabled=true');plan(['sword-1','guns-2']);assert(context.window.zeroBattle.tapUseStock());run('advance(.04)');
 const committed=run('techniqueLock');assert(committed);assert(context.window.zeroBattle.tapCancel());assert.equal(run('techniqueLock'),committed);assert(!context.window.zeroBattle.tapCancel());
 run('advance(2)');assert.equal(run("equipmentUses['sword-1']"),1);assert(!run("equipmentUses['guns-2']"));assert.equal(run('energy'),99);assert(!context.window.zeroBattle.tapCancel());assert(!tap('guns-2'));
 console.log('PASS Cancel preserves committed attacks and cannot reopen a confirmed selection.');

 fresh();run('beginTarget()');assert(context.window.zeroBattle.tapTarget(1));
 for(let i=0;i<20;i++)assert(!tap('guns-1'));
 run('advance(.8)');for(let i=0;i<20;i++)assert(!tap('guns-1'));
 assert.equal(run('targetInstructionCount'),0);assert.deepEqual(queue(),[]);assert(els['tech-guns-1'].disabled);assert(!run('submitOrder(files.guns[0])'));
 assert(!run('beginTarget()'));run('advance(9.3)');assert.equal(run('state'),'battle');assert(!tap('guns-1'));assert(run('beginTarget()'));assert(tap('guns-1'));
 console.log('PASS choosing a target with zero skills closes selection until TARGET is reopened after ten seconds.');

 fresh();run('automationEnabled=true;beginTarget()');for(let i=0;i<3;i++)assert(tap('sword-1'));
 assert(!tap('sword-1'));assert(els['tech-sword-1'].disabled);assert.equal(els['remaining-sword-1'].textContent,'残0');assert(context.window.zeroBattle.tapCancel());assert.equal(els['remaining-sword-1'].textContent,'残1');assert(tap('sword-1'));
 assert(context.window.zeroBattle.tapTarget(1));run('advance(.8)');useStock(3,3.5);
 assert.equal(run("equipmentUses['sword-1']"),3);assert.equal(run('energy'),97);assert.equal(run('appearance.body'),'base');assert(run('beginTarget()'));assert(!tap('sword-1'));assert.equal(run('targetInstructionCount'),0);
 run('cancelTarget()');assert(!run('submitOrder(files.sword[0],{automaticMode:true})'));assert(!run('executeEquipped(files.sword[0])'));assert.equal(run('energy'),97);
 fresh();run('beginTarget()');assert(tap('sword-1'));assert.equal(run("equipmentUses['sword-1']||0"),0);
 console.log('PASS three total uses per skill across TARGET cycles, reservation cap, Cancel refund, Auto enforcement and reset for a new battle.');

 fresh();run('automationEnabled=true');plan(['sword-2','guns-2','sword-1']);useStock(3);
 assert.deepEqual(Array.from(run('orderHistory.map(o=>o.card)')),['sword-2','guns-2','sword-1']);
 assert.equal(run("equipmentUses['sword-2']"),1);assert.equal(run("equipmentUses['guns-2']"),1);assert.equal(run("equipmentUses['sword-1']"),1);
 console.log('PASS confirmed skills still execute FIFO exactly once and return Zero to normal.');

 fresh();run('automationEnabled=true');plan(['shield-1','wing-2']);useStock(2);assert.equal(run('layer'),1);assert(run('shield>0'));
 assert(context.window.zeroBattle.tapLand());run('advance(1)');assert.equal(run('layer'),0);
 fresh();run('automationEnabled=true');plan(['wing-1','shield-2']);useStock(2);assert.equal(run('layer'),1);assert(run('shield>0'));
 console.log('PASS wing and shield combine in either order; landing remains available.');

 fresh();run('automationEnabled=true;layer=1;flight=1;flightPermanent=true;appearance.wing=1;loadout.wing=files.wing[0]');plan(['guns-1','shield-1']);
 run('bugs[0].hp=0;automaticTarget();updateHud()');assert(run('targetChangeRemaining>0'));assert(!els.landtap.disabled);assert(context.window.zeroBattle.tapLand());run('advance(.8)');
 assert.equal(run('layer'),0);assert.equal(run('landingRequested'),false);assert.equal(run('usedFiles'),0);assert.equal(run('orderQueue.length'),2);assert(run('orderQueue.every(o=>o.awaitConfirm&&!o.intent)'));assert(run('targetChangeRemaining>0'));
 console.log('PASS landing after the target dies ignores TARGET cooldown and bypasses unreleased stock without consuming techniques.');

 fresh();run('layer=1;flight=1;flightPermanent=true;appearance.wing=1;beginTarget();updateHud()');assert(!els.landtap.disabled);const frozenElapsed=run('elapsed');
 assert(context.window.zeroBattle.tapLand());run('advance(.5)');assert.equal(run('layer'),0);assert.equal(run('state'),'target');assert.equal(run('moveAnim'),null);assert.equal(run('elapsed'),frozenElapsed);
 fresh();run('layer=1;flight=1;flightPermanent=true;beginTarget()');assert(context.window.zeroBattle.tapTarget(1));assert(context.window.zeroBattle.tapLand());run('advance(.5)');assert.equal(run('layer'),0);assert.equal(run('state'),'lock');
 console.log('PASS landing works during frozen TARGET selection and target-lock animation.');

 fresh();run('automationEnabled=true;layer=1;flight=1;flightPermanent=true;bugs[0].type="bee";bugs[0].layer=1');plan(['guns-1']);assert(context.window.zeroBattle.tapUseStock());run('advance(.1)');
 const landingWindup=run('techniqueLock');assert(landingWindup);assert(context.window.zeroBattle.tapLand());assert(run('landingRequested'));assert.equal(run('techniqueLock'),landingWindup);assert.equal(run('layer'),1);run('advance(2)');assert.equal(run('layer'),0);assert.equal(run('landingRequested'),false);assert.equal(run("equipmentUses['guns-1']"),1);
 fresh();run('layer=1;flight=1;flightPermanent=true;hurtTime=actionLock=poseTime=.3;pose="hurt"');assert(context.window.zeroBattle.tapLand());run('advance(1)');assert.equal(run('layer'),0);assert.equal(run('landingRequested'),false);
 fresh();run('layer=1;flight=1;flightPermanent=true;beginPhaseTransition("boss",bugs[0])');assert(context.window.zeroBattle.tapLand());assert(run('landingRequested'));run('advance(3.3)');assert.equal(run('layer'),0);assert.equal(run('landingRequested'),false);
 console.log('PASS landing requests survive attacks, damage and phase changes, preserve attack commitment and execute as soon as movement is available.');

 for(const type of ['beetle','bee','fly']){
  const air=type==='beetle'?0:1,kind={beetle:'ram',bee:'drill',fly:'bomb'}[type];
  const setup=(age,zeroCol=3,extra='')=>{fresh();run('row=1;col='+zeroCol+';layer='+air+';bugs=[{id:1,type:'+JSON.stringify(type)+',c:5,r:1,layer:'+air+',hp:100,max:100,hit:0,stun:0,widthTiles:1,attackMotion:{kind:'+JSON.stringify(kind)+',c:0,r:1,layer:'+air+',age:'+age+',struck:true,startC:5,speed:5.5,duration:7/5.5,dropped:new Set(),'+extra+'}}]')};
  setup(type==='fly'?(5-2.45)/5.5:.35,3,'contactHit:true,');run('tickBugAttack(bugs[0],.04)');assert.equal(run('hp'),200-run('bugTypes['+JSON.stringify(type)+'].damage'),type+' body must hit along the path, regardless of old end-tile/contact flags');
  setup(type==='fly'?.9:.51,3);run('tickBugAttack(bugs[0],.01)');assert.equal(run('hp'),200,type+' leaves no damage behind on a passed panel');
  setup(type==='fly'?0:.28,3);run('tickBugAttack(bugs[0],.6)');assert.equal(run('hp'),200-run('bugTypes['+JSON.stringify(type)+'].damage'),type+' fast movement must not tunnel through Zero');
  setup(type==='fly'?(5-2.45)/5.5:.35,3);run('layer=1-layer;tickBugAttack(bugs[0],.04)');assert.equal(run('hp'),200,type+' only contacts its own layer');
  if(type!=='fly'){
   setup(.82,3);run('tickBugAttack(bugs[0],.02)');assert.equal(run('hp'),200-run('bugTypes['+JSON.stringify(type)+'].damage'),type+' returning body remains dangerous');
   setup(.9,0,'struck:false,');run('tickBugAttack(bugs[0],.01)');assert.equal(run('hp'),200,type+' old destination does not deal damage while the body is elsewhere');
  }
 }
 console.log('PASS centipede, bee and dragonfly rush hitboxes follow visible bodies through the full rush, sweep fast movement and leave no panel damage behind.');

 for(const file of ['sword','guns','shield','wing','gravity','area'])for(let n=1;n<=run('files.'+file+'.length');n++){
  fresh();run('automationEnabled=true');plan([file+'-'+n]);useStock(1,3.5);assert.equal(run("equipmentUses['"+file+'-'+n+"']"),1,file+'-'+n+' must execute exactly once');
 }
 console.log('PASS all nineteen techniques reach their actual combat implementations.');

 fresh();run('automationEnabled=true;bugs[0].c=5');plan(['sword-1','guns-1']);assert(context.window.zeroBattle.tapUseStock());run('advance(8)');
 assert.equal(run('activeOrder.card.id'),'sword-1');assert.equal(run('activeOrder.wait'),'opportunity');assert.equal(run('activeOrder.used'),0);assert.equal(run('orderHistory.length'),0);assert.equal(run('energy'),100);
 run('bugs[0].c=3;advance(2.5)');assert.equal(run("equipmentUses['sword-1']"),1);assert.equal(run('energy'),99);assert.equal(run('activeOrder'),null);assert(run('orderQueue[0].awaitConfirm'));
 console.log('PASS unreachable Sword remains pending beyond five seconds, then fires once when the enemy reaches the front.');

 fresh();run('automationEnabled=true;col=1;for(let r=0;r<3;r++)panelHoles.set(cellId(2,r),30)');plan(['sword-1']);assert(context.window.zeroBattle.tapUseStock());run('advance(7)');
 assert.equal(run('activeOrder.card.id'),'sword-1');assert.equal(run('energy'),100);run('panelHoles.clear();advance(3)');assert.equal(run("equipmentUses['sword-1']"),1);
 console.log('PASS a blocked route waits and resumes when panels become traversable.');

 fresh();run('automationEnabled=true;bugs[0].c=5');plan(['sword-1','guns-1','gravity-1']);assert(context.window.zeroBattle.tapUseStock());run('advance(.3)');
 assert.equal(run('activeOrder.card.id'),'sword-1');assert(!els.usestock.disabled);assert(context.window.zeroBattle.tapUseStock());run('advance(3)');
 assert(!run("equipmentUses['sword-1']"));assert.equal(run("equipmentUses['guns-1']"),1);assert.equal(run('energy'),99);assert.equal(run('techniqueSelectionsLeft(files.sword[0])'),3);
 assert.deepEqual(Array.from(run('orderHistory.map(o=>[o.card,o.uses])'),o=>Array.from(o)),[['sword-1',0],['guns-1',1]]);assert.equal(run('orderQueue[0].card.id'),'gravity-1');assert(run('orderQueue[0].awaitConfirm'));
 fresh();run('automationEnabled=true;bugs[0].c=5');plan(['sword-1']);assert(context.window.zeroBattle.tapUseStock());run('advance(.3)');assert(!els.usestock.disabled);assert(context.window.zeroBattle.tapUseStock());assert.equal(run('activeOrder'),null);assert(els.usestock.disabled);assert.equal(run('energy'),100);
 console.log('PASS Use Skill skips a waiting skill and arms only the next one; an empty stock can still cancel the wait without charge or use consumption.');

 fresh();run('automationEnabled=true');plan(['sword-1','guns-2']);assert(context.window.zeroBattle.tapUseStock());run('advance(.04)');
 const protectedWindup=run('techniqueLock');assert(protectedWindup);assert(context.window.zeroBattle.tapUseStock());assert.equal(run('techniqueLock'),protectedWindup);run('advance(3)');
 assert.equal(run("equipmentUses['sword-1']"),1);assert.equal(run("equipmentUses['guns-2']"),1);
 console.log('PASS Use Skill cannot skip a committed windup or cancel an executing attack.');

 for(const fight of ['boss','error']){
  run("encounter="+JSON.stringify(fight)+";encounterBattery=41;encounterHP=70;errorEntryBattery=32;errorEntryHP=60;reset(false);automationEnabled=false;enemyAutomationEnabled=false;hp=0;checkEnd();advance(1.5)");
  assert.equal(run('state'),'lose');assert(!els.result.classList.contains('hidden'));assert(!els.restartAll.classList.contains('hidden'));assert(els.retry.classList.contains('hidden'));assert(els.nextEnemy.classList.contains('hidden'));
  els.restartAll.onclick();assert.equal(run('encounter'),'skirmish');assert.equal(run('hp'),200);assert.equal(run('energy'),100);assert.equal(run('state'),'intro');assert(run("bugs.every(b=>!['grenade','error'].includes(b.type))"));assert.equal(run('Object.keys(equipmentUses).length'),0);
 }
 run("encounter='error';reset(false);hp=0;checkEnd()");els.retry.onclick();assert.equal(run('encounter'),'skirmish');assert.equal(run('hp'),200);assert.equal(run('energy'),100);
 for(const fight of ['boss','error']){
  run('encounter='+JSON.stringify(fight)+';reset(false);hp=85;energy=37;for(const b of bugs)b.hp=0;checkEnd()');assert.equal(run('state'),'win');assert(!els.retry.classList.contains('hidden'));assert(!els.restartAll.classList.contains('hidden'));
  els.retry.onclick();assert.equal(run('encounter'),fight);assert.equal(run('state'),'intro');
 }
 assert(!fs.readFileSync(root+'index.html','utf8').includes('id="resulttext"'));
 console.log('PASS boss defeats restart from the first battle with full HP/charge; victories retain same-encounter retry and the extra result sentence is removed.');

 fresh();run('automationEnabled=true;autoTechniqueMode=true;advance(90)');
 for(const count of Object.values(run('equipmentUses')))assert(count<=3);
 assert(run('Object.keys(equipmentUses).length>3'));assert(run('bugs.some(b=>b.hp>0)'));
 console.log('PASS extended Auto battle respects the per-technique cap while using multiple skills.');

 run("encounter='error';reset(false);automationEnabled=false;enemyAutomationEnabled=false;layer=1;col=1;row=1;bugs=bugs.filter(b=>b.type==='error');bugs[0].phase=2;bugs[0].layer=1;bugs[0].c=3;bugs[0].r=1;errorStealArea()");
 assert.equal(run('panelChanges.filter(p=>p.capture&&p.owner==="bugs").length'),3);
 run('errorStealClock=.01;applyArea(files.area[2])');assert.equal(run('errorStealClock'),10);assert(run('[0,1,2].every(r=>panelOwners[cellId(2,r)]==="zero")'));
 run('tickErrorWorld(9.99)');assert(run('[0,1,2].every(r=>panelOwners[cellId(2,r)]==="zero")'));
 run('panelChanges=[];tickErrorWorld(.01)');assert(run('[0,1,2].every(r=>panelOwners[cellId(2,r)]==="bugs")'));assert.equal(run('panelChanges.filter(p=>p.capture&&p.owner==="bugs").length'),3);
 run('applyArea(files.area[0]);tickErrorWorld(4);applyArea(files.area[0])');assert.equal(run('errorStealClock'),10);run('tickErrorWorld(9.99)');assert.equal(run('panelOwners.filter((o,i)=>i%6===2&&o==="zero").length'),2);run('tickErrorWorld(.01)');assert(run('[0,1,2].every(r=>panelOwners[cellId(2,r)]==="bugs")'));
 run('panelChanges=[];errorStealArea()');assert.equal(run('panelChanges.length'),0);
 run('applyArea(files.area[2]);col=2;row=1;errorStealClock=0;tickErrorWorld(.01)');assert.equal(run('col'),0);assert(run('moveAnim.forced'));
 for(const life of [1.1,.85,.5])run('for(const p of panelChanges)p.life='+life+';drawPanelChanges()');
 console.log('PASS ERROR waits a full ten seconds after each successful reclaim, animates every stolen panel, avoids empty effects and pushes Zero back safely.');

 run("encounter='error';reset(false);automationEnabled=true;enemyAutomationEnabled=false;col=1;row=1;bugs=bugs.filter(b=>b.type==='error');hit(bugs[0],260)");
 assert(run('phaseTransition'));run('advance(1.4)');assert(run('panelChanges.some(p=>p.capture&&p.owner===\"bugs\")'));
 const transitionLife=run('panelChanges[0].life');run('advance(.3)');assert(run('panelChanges[0].life')<transitionLife);
 run('advance(2.8)');assert.equal(run('phaseTransition'),null);assert.equal(run('layer'),1);assert.equal(run("Object.entries(equipmentUses).filter(([id])=>id.startsWith('wing-')).reduce((n,[,uses])=>n+uses,0)"),1);
 console.log('PASS ERROR phase-change capture effects animate during the pause, and automatic Wing still executes exactly once.');

 const expected={ 'shield-1':'シールド','shield-2':'ヘビーシールド','shield-3':'リフレクター','guns-1':'キャノン','guns-2':'ヘビーキャノン','guns-3':'スピアキャノン','gravity-3':'自由の女神' };
 for(const [id,name] of Object.entries(expected)){assert.equal(run('tapCards.find(c=>c.id==='+JSON.stringify(id)+').name'),name)}
 fresh();run('energy=0;beginTarget();updateHud()');assert(els['tech-guns-1'].disabled);assert(!tap('guns-1'));
 assert.equal(run('files.sword[2].range'),2);assert.equal(run('files.shield[2].duration'),3);
 const html=fs.readFileSync(root+'index.html','utf8');assert(!/type="text"|id="command"|id="confirm"/.test(html));assert(!html.includes('dialogue.js'));assert(!html.includes('acknowledge.js'));
 for(const script of [...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]))assert(!/getUserMedia|SpeechRecognition|speechSynthesis/.test(fs.readFileSync(root+script,'utf8')));
 assert(!fetches.some(url=>url.includes('assets/akari/')),'no Akari voice files are ever requested');
 assert(!html.includes('akari-voice.js')&&!html.includes('akari-cues.js')&&!html.includes('SE・ボイス'));
 console.log('PASS renamed skills, command SE, charge limits and no voice files, text, mic or OS speech dependencies.');
 console.log('ALL TAP BATTLE TESTS PASSED');
})().catch(e=>{console.error(e);process.exit(1)});
