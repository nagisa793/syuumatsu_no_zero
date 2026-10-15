const {createCanvas,loadImage}=require('@napi-rs/canvas');
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'../dist')+'/',els={},pending=[],timers=new Map(),recognizers=[],frames=[];
let timerId=0,seed=917,clock=0;
function waitVoice(ms){const end=clock+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;clock=next[1].at;timers.delete(next[0]);next[1].fn()}clock=end}
const math=Object.create(Math);math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);const randomizedMovement=math.random;
function element(id){const classes=new Set(),attrs={};return{id,style:{setProperty(){}},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on===undefined)on=!classes.has(x);on?classes.add(x):classes.delete(x)}},setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k],addEventListener(){},tagName:'BUTTON',children:[],appendChild(x){this.children.push(x)},textContent:'',_html:'',get innerHTML(){return this._html},set innerHTML(v){this._html=v;for(const m of v.matchAll(/id="([^"]+)"/g))els[m[1]]=element(m[1])},value:'',focus(){},disabled:false}}
for(const match of fs.readFileSync(root+'index.html','utf8').matchAll(/id="([^"]+)"/g))els[match[1]]=element(match[1]);
els.begin.disabled=/id="begin" disabled/.test(fs.readFileSync(root+'index.html','utf8'));
const adapt=c=>{const orig=c.getContext.bind(c);c.getContext=(...a)=>{const t=orig(...a),draw=t.drawImage.bind(t);t.drawImage=(i,...args)=>draw(i.im||i,...args);return t};return c};
els.game=adapt(createCanvas(960,540));
els.homescene=adapt(createCanvas(960,540));
class Image{set src(s){pending.push(loadImage(root+s).then(im=>{this.im=im;this.complete=true;this.naturalWidth=im.width;this.naturalHeight=im.height;this.onload?.()}))}}
class Audio{constructor(src){this.src=src;this.paused=true;this.volume=1;this.currentTime=0;this.plays=0;this.pauses=0}addEventListener(){}play(){this.paused=false;this.plays++}pause(){this.paused=true;this.pauses++}}
class AudioContext{
 constructor(){this.currentTime=0;this.sampleRate=8000;this.state='running';this.destination={};this.sources=[]}
 resume(){if(this.blockedResume)return new Promise(()=>{});this.state='running';return Promise.resolve()}
 createGain(){const gain={value:1,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v}};return{gain,connect(){},disconnect(){}}}
 createOscillator(){return{frequency:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(){}}}
 createBiquadFilter(){return{frequency:{value:1000,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
 createBuffer(channels,n){return{getChannelData:()=>new Float32Array(n)}}
 createBufferSource(){const s={connect(){},disconnect(){},start(t,offset){this.offset=offset;this.started=true},stop(){this.stopped=true}};this.sources.push(s);return s}
 decodeAudioData(){return Promise.resolve({duration:122.091})}
}
class SpeechRecognition{set onresult(fn){this.resultHandler=fn}get onresult(){return this.resultHandler?(e)=>{this.resultHandler(e);waitVoice(0)}:null}constructor(){throw Error('No browser recognition allowed')}start(){this.started=true;this.onstart?.()}abort(){this.aborted=true;this.onend?.()}result(text,index=0,final=true){this.results[index]={0:{transcript:text},isFinal:final,length:1};this.onresult?.({resultIndex:index,results:this.results})}}
const listeners={},context={console,Image,Audio,Math:math,Set,Uint8Array,Int32Array,Date,navigator:{mediaDevices:{getUserMedia(){throw Error('No site microphone capture allowed')}}},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}),setTimeout:(fn,ms=0)=>{const id=++timerId;timers.set(id,{fn,at:clock+ms});return id},clearTimeout:id=>timers.delete(id),requestAnimationFrame(fn){frames.push(fn)},localStorage:{getItem(){return null},setItem(){}},window:{AudioContext,SpeechRecognition,addEventListener:(n,fn)=>listeners[n]=fn},document:{documentElement:element('html'),body:element('body'),hidden:false,getElementById:id=>els[id]||null,createElement:t=>t==='canvas'?adapt(createCanvas(1,1)):element('created'),querySelectorAll:()=>[],addEventListener:(n,fn)=>listeners[n]=fn}};
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
 els.begin.onclick();assert(run('startRequested'));assert.equal(run('state'),'start');
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
 const homeSource=fs.readFileSync(root+'intro.js','utf8'),homeHTML=fs.readFileSync(root+'index.html','utf8');
 const phone=run('homePhoneBounds()');assert.equal(phone.height,158);assert.equal(phone.angle,Math.PI/6);
 const halfW=(phone.width*Math.cos(phone.angle)+phone.height*Math.sin(phone.angle))/2,halfH=(phone.width*Math.sin(phone.angle)+phone.height*Math.cos(phone.angle))/2;
 assert(phone.x-halfW>=0&&phone.x+halfW<=480&&phone.y-halfH>=0&&phone.y+halfH<=270,'the larger iPhone must fit the home viewport');
 assert(homeSource.includes('target.drawImage(homeArtwork,-15,5,W,H)'));
 assert(homeSource.indexOf('target.drawImage(homePhoneArt')<homeSource.indexOf('target.drawImage(homeArtwork'));
 assert(homeHTML.includes('aria-label="START"><span class="start-star-label" aria-hidden="true">START'));
 const startGraphic=fs.readFileSync(root+'assets/home/start-star-v83.svg','utf8');assert(startGraphic.includes('id="start-lettering"'));assert(!startGraphic.includes('<text'));
 const title=run('homeTitleBounds()');assert(Math.abs(480*.65-(title.x+title.width*.5))<3,'START is horizontally above the の in the title');
 assert.equal(run('state'),'intro');assert(run('homeIntroActive()'));await run('prepareAkariOpeningVoice()');for(let i=0;i<10;i++)await Promise.resolve();
 const openingSource=Array.from(run('akariVoiceSources'))[0];assert.equal(openingSource.akariCueName,'エンコードゼロ！');
 const timing=run('homeIntroTiming()'),initialEnemies=run('JSON.stringify(bugs.map(b=>[b.c,b.r,b.hp]))');
 run('advance(.6)');assert.equal(run('zeroArrivalProgress()'),0);captureOpening('ENCODE');
 els.begin.onclick();assert.equal(run('introAge'),.6,'a duplicated start tap cannot reset or skip the launch');
 run('advance('+(timing.departure+.18-.6)+')');assert(run('homeIntro.departed'));assert.equal(run('zeroArrivalProgress()'),0);captureOpening('TRANSFER');
 run('advance('+(timing.reveal+.35-run('introAge'))+')');assert(run('zeroArrivalProgress()>0&&zeroArrivalProgress()<1'));assert.equal(run('state'),'intro');captureOpening('MATERIALIZE');
 run('advance('+(timing.arrival+.03-run('introAge'))+')');assert.equal(run('zeroArrivalProgress()'),1);assert.equal(run('state'),'intro');captureOpening('ARRIVAL');
 assert.equal(run('col'),1);assert.equal(run('row'),1);assert.equal(run('layer'),0);assert.equal(run('hp'),200);assert.equal(run('elapsed'),0);assert.equal(run('JSON.stringify(bugs.map(b=>[b.c,b.r,b.hp]))'),initialEnemies);
 run('advance('+(timing.debug+.18-run('introAge'))+')');assert(run('introDebug'));captureOpening('DEBUG');
 run('advance('+(timing.end+.1-run('introAge'))+')');assert.equal(run('state'),'target');assert.equal(run('homeIntro'),null);captureOpening('TARGET');
 if(process.env.ZERO_RENDER_OUT){
  fs.mkdirSync(process.env.ZERO_RENDER_OUT,{recursive:true});const sheet=createCanvas(960*2,574*3),out=sheet.getContext('2d');out.fillStyle='#06111d';out.fillRect(0,0,sheet.width,sheet.height);out.font='bold 20px monospace';
  for(const [i,f] of openingFrames.entries()){const x=i%2*960,y=Math.floor(i/2)*574;out.fillStyle='#baffeb';out.fillText(f.name,x+16,y+25);out.drawImage(f.image,x,y+34)}
  fs.writeFileSync(path.join(process.env.ZERO_RENDER_OUT,'opening-contact-sheet.png'),sheet.toBuffer('image/png'));
 }
 assert(!els.begin.disabled);assert.equal(els.loadfill.style.width,'100%');assert.equal(els.zeroload.getAttribute('aria-valuenow'),'100');assert(els.zeroload.classList.contains('is-ready'));assert.equal(els.loadstate.textContent,'');
 await run('battleMusic.ready()');await run('prepareAkariVoice()');for(let i=0;i<10;i++)await Promise.resolve();
 assert(run('audio.state==="running"&&!battleMusic.paused&&!battleMusic.muted&&battleMusic.source.started'));
 assert.equal(recognizers.length,0);assert.equal(Object.keys(els).filter(id=>id.startsWith('tech-')).length,19);
 assert(!('command' in els));assert(!('confirm' in els));assert(!('commandform' in els));
 for(const c of run('tapCards'))assert(els['tech-'+c.id]);
 assert(tap('sword-1'));assert.equal(run('targetInstructionCount'),1);assert(run('orderQueue[0].awaitConfirm'));assert.equal(run('energy'),100);run('draw()');
 assert(context.window.zeroBattle.tapTarget(run('bugs[0].id')));run('advance(.8)');assert.equal(run('state'),'battle');assert(!tap('guns-1'));
 console.log('PASS cold start, nineteen visible skills, touch targeting, BGM and no input capture.');

 fresh();run('beginBattleIntro();beginHomeIntro()');await run('prepareAkariOpeningVoice()');for(let i=0;i<10;i++)await Promise.resolve();run('advance(.4)');
 const voiceBeforePause=Array.from(run('akariVoiceSources'))[0],introBeforePause=run('introAge');els.settings.onclick();assert(voiceBeforePause.stopped);run('advance(2)');assert.equal(run('introAge'),introBeforePause);
 els.settingsresume.onclick();for(let i=0;i<10;i++)await Promise.resolve();const resumedOpening=Array.from(run('akariVoiceSources'))[0];assert.equal(resumedOpening.akariCueName,'エンコードゼロ！');assert(Math.abs(resumedOpening.offset-introBeforePause)<1e-8);run('advance(5)');assert.equal(run('state'),'target');
 fresh();run('beginBattleIntro();beginHomeIntro();homeIntro.ready=false;advance(5)');assert.equal(run('state'),'target','an unresolved voice decode must never hold the opening forever');for(let i=0;i<10;i++)await Promise.resolve();assert.equal(run('akariVoiceSources.size'),0,'a late voice must not play over TARGET');
 console.log('PASS spoken launch, ordered teleport/reveal/DEBUG/TARGET, frozen actors, duplicate-tap protection, pause/resume voice offset and delayed-audio fallback.');

 fresh();run('beginHomeIntro()');await run('prepareAkariOpeningVoice()');for(let i=0;i<10;i++)await Promise.resolve();
 run('audio.blockedResume=true;audio.state="suspended";advance(.8)');assert.equal(run('introAge'),0,'the launch animation must not consume a voice scheduled on suspended audio');
 run('audio.blockedResume=false;audio.state="running";advance(.3)');assert(Math.abs(run('introAge')-.3)<1e-8);run('advance(5)');assert.equal(run('state'),'target');
 fresh();run('beginHomeIntro();audio.blockedResume=true;audio.state="suspended";advance(6)');assert.equal(run('state'),'target','an unavailable output must not trap the player forever');run('audio.blockedResume=false;audio.state="running"');
 console.log('PASS delayed output activation preserves the opening voice/animation clock, with a bounded fallback when output stays unavailable.');

 // Exercise the actual TARGET painter: HP must be drawn after the dimmer,
 // alongside each enemy number, including the selected enemy's lock flash.
 fresh();run('bugs[0].hp=37.2;bugs[1].hp=20;beginTarget();updateHud()');
 const paint=run('g'),originalFill=paint.fillRect.bind(paint),originalText=paint.fillText.bind(paint),paintLog=[];
 paint.fillRect=function(...a){paintLog.push({kind:'fill',blend:paint.globalCompositeOperation});return originalFill(...a)};
 paint.fillText=function(text,...a){paintLog.push({kind:'text',text,font:paint.font});return originalText(text,...a)};
 run('drawCommandOverlay()');
 const dimmer=paintLog.findIndex(e=>e.kind==='fill'&&e.blend==='multiply');assert(dimmer>=0);
 for(const label of ['No.001','No.002','HP 38','HP 20'])assert(paintLog.findIndex(e=>e.text===label)>dimmer,label+' must remain readable above TARGET dimming');
 assert(paintLog.some(e=>e.text==='HP 38'&&e.font.includes('14px')));
 assert(els.targetchoices.innerHTML.includes('HP 38'));assert(els.targetchoices.innerHTML.includes('HP 20'));
 const badge=run('targetBadgeBounds(bugs[0])');assert(badge.x>=0&&badge.y>=0&&badge.x+badge.width<=480&&badge.y+badge.height<=270);
 assert(run('selectTargetAt('+ (badge.x+badge.width/2)+','+(badge.y+badge.height-3)+')'));
 paintLog.length=0;run('drawCommandOverlay()');assert(paintLog.some(e=>e.text==='HP 38'));assert.equal(run('targetId'),1);
 paint.fillRect=originalFill;paint.fillText=originalText;
 console.log('PASS TARGET and lock display current enemy HP above the dimmer; the complete HP/number badge remains tappable.');

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
 assert(menuHtml.indexOf('id="settingspanel"')<menuHtml.indexOf('<summary>ゲームの遊び方</summary>'));assert(menuHtml.indexOf('id="settingsresume"')>menuHtml.indexOf('<summary>音声素材</summary>'));
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
 for(const [id,name] of Object.entries(expected)){assert.equal(run('tapCards.find(c=>c.id==='+JSON.stringify(id)+').name'),name);assert.equal(run('akariCues['+JSON.stringify(id)+'].name'),name)}
 fresh();run('energy=0;beginTarget();updateHud()');assert(els['tech-guns-1'].disabled);assert(!tap('guns-1'));
 assert.equal(run('files.sword[2].range'),2);assert.equal(run('files.shield[2].duration'),3);
 const html=fs.readFileSync(root+'index.html','utf8');assert(!/type="text"|id="command"|id="confirm"/.test(html));assert(!html.includes('dialogue.js'));assert(!html.includes('acknowledge.js'));
 for(const script of [...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]))assert(!/getUserMedia|SpeechRecognition|speechSynthesis/.test(fs.readFileSync(root+script,'utf8')));
 console.log('PASS renamed skills and voice cues, charge limits and no text, mic or OS speech dependencies.');
 console.log('ALL TAP BATTLE TESTS PASSED');
})().catch(e=>{console.error(e);process.exit(1)});
