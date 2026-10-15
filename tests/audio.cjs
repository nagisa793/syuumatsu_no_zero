const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'../dist'),listeners={},sessionListeners={},contexts=[],elements={};
let audioClock=10000,mobileActivationPolicy=false,activeGesture=false;class TestDate extends Date{static now(){return audioClock}}
function element(id){return elements[id]??={id,textContent:'',value:'',style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},getContext:()=>({})}}
function listen(type,fn){(listeners[type]??=[]).push(fn)}
function emit(type,extra={}){const event={type,pointerType:'mouse',...extra},before=activeGesture;activeGesture=['pointerup','touchend','click','keydown'].includes(type)||type==='pointerdown'&&event.pointerType==='mouse';try{for(const fn of listeners[type]||[])fn(event)}finally{activeGesture=before}}
class Image{set src(s){this.url=s}}
class AudioContext{
 constructor(){this.state='suspended';this.sampleRate=8000;this.currentTime=0;this.destination={};this.resumes=0;this.sources=[];contexts.push(this)}
 addEventListener(type,fn){if(type==='statechange')this.onstate=fn}
 resume(){this.resumes++;if(mobileActivationPolicy&&!activeGesture)return Promise.reject(Error('activation required'));if(this.holdResume)return new Promise(()=>{});if(this.platformBlocksPlayback)return Promise.resolve();if(this.deferResume)return new Promise(resolve=>queueMicrotask(()=>{this.state='running';this.onstate?.();resolve()}));this.state='running';queueMicrotask(()=>this.onstate?.());return Promise.resolve()}
 createGain(){return{context:this,gain:{value:1,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v}},connect(){},disconnect(){}}}
 createBuffer(ch,n){return{getChannelData:()=>new Float32Array(n)}}
 source(kind){const s={context:this,kind,frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(t,offset,duration){this.started=true;this.at=t;this.offset=offset||0;this.duration=duration},stop(){this.stopped=true}};this.sources.push(s);return s}
 createBufferSource(){return this.source('buffer')}
 createOscillator(){return this.source('oscillator')}
 decodeAudioData(){if(this.decodeFailures){this.decodeFailures--;return Promise.reject(Error('transient decoding failure'))}return Promise.resolve({duration:122.091})}
}
const session={_type:'auto',state:'inactive',dictationActive:false,refusesMix:false,typeChanges:[],get type(){return this._type},set type(value){
 this._type=value;this.typeChanges.push(value);
 if(this.dictationActive&&!this.refusesMix){
  this.state=value==='ambient'?'active':'interrupted';
  if(value==='playback')contexts.at(-1).state='interrupted';
  queueMicrotask(()=>{for(const fn of sessionListeners.statechange||[])fn()});
 }
},addEventListener(type,fn){(sessionListeners[type]??=[]).push(fn)}};
const document={hidden:false,getElementById:element,createElement:()=>element('buffer'),addEventListener:listen};
const context={console,Image,Date:TestDate,Math,Set,Promise,queueMicrotask,setTimeout:fn=>queueMicrotask(fn),Uint8Array,Float32Array,localStorage:{getItem(){return null},setItem(){}},navigator:{audioSession:session,mediaDevices:{getUserMedia(){throw Error('No microphone capture')}}},document,window:{AudioContext,addEventListener:listen},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})};
vm.createContext(context);const run=s=>vm.runInContext(s,context);
run('let scoreStarted=false;let musicVolumeProbe=0;');
for(const f of ['files.js','game.js','music.js','akari-cues.js','akari-voice.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f});
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
(async()=>{
 assert.equal(contexts.length,0,'page load does not start playback');
 run('syncBattleMusic()');assert.equal(contexts.length,0,'a title frame cannot bypass autoplay restrictions');
 mobileActivationPolicy=true;
 run('attemptHomeAutoplay()');await flush();assert.equal(run('audio.state'),'suspended');assert(!run('homeMusic.source'),'a rejected autoplay attempt must not pretend playback is audible');assert(!run('homeMusicPending'));
 emit('pointerdown',{pointerType:'touch'});await flush();assert(!run('homeMusic.source'),'touch-down alone must not start the title score');
 emit('pointerup',{pointerType:'touch'});await flush();
 assert(run('audio?.state==="running"&&homeMusic.source?.started'),'a completed touch must unlock and start home music without another frame/tap');
 const initialHomeSource=run('homeMusic.source');
 contexts[0].state='suspended';emit('touchend');await flush();assert.equal(run('audio.state'),'running');
 contexts[0].state='suspended';emit('click');await flush();assert.equal(run('audio.state'),'running');
 assert.equal(run('homeMusic.source'),initialHomeSource,'touchend/click recover output without restarting an active home score');
 run('stopHomeMusic()');contexts[0].state='suspended';contexts[0].deferResume=true;
 emit('click');assert.equal(run('audio.state'),'suspended');await flush();
 assert(run('audio.state==="running"&&homeMusic.source?.started'),'async output activation must start music without a second tap or animation frame');contexts[0].deferResume=false;
 run('homeStartBuffer=null;homeStartDecoding=null;homeStartBytes=Promise.resolve(null)');await run('prepareHomeStartSound()');assert(run('homeStartBuffer'),'an initial failed SE fetch must be retried');
 mobileActivationPolicy=false;
 console.log('PASS first touch completion starts the home score, with no duplicate source on touchend/click.');
 emit('pointerdown');await flush();run('syncBattleMusic()');await run('homeMusic.ready()');await flush();
 const home=run('homeMusic'),homeSource=home.source;
 assert(homeSource.started&&homeSource.loop);assert.equal(homeSource.context,contexts[0]);assert(run('battleMusic.paused'));
 assert.equal(home.volume,run('musicVolume*MUSIC_MIX'));
 contexts[0].currentTime=1.25;run('state="paused";syncBattleMusic()');assert(home.paused&&homeSource.stopped);assert.equal(home.currentTime,1.25);
 run('state="start";syncBattleMusic()');await flush();assert.equal(home.source.offset,1.25);
 run('musicVolume=.2;syncBattleMusic()');assert.equal(home.volume,.2*run('MUSIC_MIX'));
 run('musicVolume=.55;syncBattleMusic();playHomeStartSound()');await flush();
 assert(contexts[0].sources.some(s=>s.started&&s!==home.source&&!s.loop&&s.kind==='buffer'));
 const resumedHome=home.source;run('state="intro";stopHomeMusic();syncBattleMusic()');await flush();
 assert(home.paused&&resumedHome.stopped);assert(!home.source);assert(run('battleMusic.paused'));
 assert.equal(contexts.length,1,'the home score and launch sound share the existing output');
 contexts[0].currentTime=0;
 console.log('PASS title music waits for a gesture, loops, pauses/resumes, follows the BGM slider and stops before the launch voice; dedicated launch SE uses the same output.');
 run('state="battle";unlockAudio(true);startBattleScore()');await run('battleMusic.ready()');await flush();
 assert.equal(session.type,'playback');assert.equal(run('audio.state'),'running');assert(run('battleMusic.source.started&&battleMusic.source.loop'));
 const track=run('battleMusic'),source=track.source,volume=track.volume;
 run('sfx("shot")');assert(contexts[0].sources.some(s=>s.kind==='oscillator'&&s.started));assert(!source.stopped,'SE does not stop the BGM source');
 assert.equal(track.volume,volume);
 console.log('PASS start tap declares playback and starts both BGM and SE.');

 await run('prepareAkariVoice()');
 const spoken=[],cards=run('Object.values(files).flat()'),cues=run('akariCues');
 for(const card of cards){
  run('speakAkariTechnique(files.'+card.file+'['+(card.num-1)+'])');await flush();
  const active=Array.from(run('akariVoiceSources'));assert.equal(active.length,1);
  if(spoken.length)assert(spoken.at(-1).stopped,'a new name immediately interrupts the previous voice');
  const voice=active[0];assert.equal(voice.offset,cues[card.id].offset);assert.equal(voice.duration,cues[card.id].duration);assert.equal(voice.at,contexts[0].currentTime,'never wait for the old cue to finish');spoken.push(voice);
 }
 assert.equal(spoken.length,19);assert.equal(contexts.length,1,'Akari shares the BGM and SFX output');
 assert.equal(track.source,source);assert(!source.stopped);assert.equal(track.volume,volume);assert.equal(session.type,'playback');
 elements.sfxvolume.oninput({target:{value:'50'}});assert.equal(spoken.at(-1).akariGain.gain.value,.36);assert.equal(track.volume,volume);
 run('clearQueuedAkariVoice()');assert.equal(run('akariVoiceSources.size'),1);assert(!spoken.at(-1).stopped);assert(spoken.slice(0,-1).every(s=>s.stopped));assert(!source.stopped,'clearing pending decoding must retain the current voice and BGM');
 run('stopAkariVoice();sfxVolume=.8');assert(spoken.every(s=>s.stopped));assert(!source.stopped);
 const beforeRapid=contexts[0].sources.length;
 run('speakAkariTechnique(files.sword[0]);speakAkariTechnique(files.guns[0]);speakAkariTechnique(files.shield[0])');await flush();
 assert.equal(contexts[0].sources.length,beforeRapid+1,'only the latest request survives pending decoding');
 assert.equal(Array.from(run('akariVoiceSources'))[0].offset,cues['shield-1'].offset);run('stopAkariVoice()');
 assert.equal(track.source,source);assert(!source.stopped);assert.equal(track.volume,volume);
 console.log('PASS all nineteen Akari names, immediate replacement of an active voice, last-request wins during decoding, and uninterrupted BGM.');

 await run('prepareAkariOpeningVoice();speakAkariOpening()');await flush();
 const opening=Array.from(run('akariVoiceSources'))[0];assert.equal(opening.akariCueName,'エンコードゼロ！');assert.equal(opening.duration,run('akariOpeningCue.duration'));assert.equal(opening.offset,0);assert.equal(opening.context,contexts[0]);assert(!source.stopped);assert.equal(track.volume,volume);
 await run('speakAkariOpening(.4)');await flush();const continued=Array.from(run('akariVoiceSources'))[0];assert(opening.stopped);assert.equal(continued.offset,.4);assert.equal(continued.duration,run('akariOpeningCue.duration-.4'));assert(!source.stopped);assert.equal(track.volume,volume);run('stopAkariVoice()');
 console.log('PASS opening call and resumed offset share the existing audio output without changing BGM gain or score position.');

 contexts[0].currentTime=10.25;contexts[0].state='interrupted';emit('pointerdown');await flush();
 assert.equal(run('audio.state'),'running');assert.equal(track.source,source);assert.equal(track.currentTime,10.25);assert.equal(track.volume,volume);
 contexts[0].state='suspended';emit('keydown');await flush();assert.equal(run('audio.state'),'running');
 contexts[0].state='interrupted';emit('focus');await flush();assert.equal(run('audio.state'),'running');
 console.log('PASS tap, key and page return recover interruptions without restarting or amplifying BGM.');

 document.hidden=true;contexts[0].state='interrupted';const before=contexts[0].resumes;emit('focus');assert.equal(contexts[0].resumes,before);
 document.hidden=false;emit('visibilitychange');await flush();assert.equal(run('audio.state'),'running');
 session.state='interrupted';contexts[0].state='interrupted';const held=contexts[0].resumes;emit('pointerdown');assert.equal(contexts[0].resumes,held,'do not fight an active OS interruption');
 session.state='inactive';for(const fn of sessionListeners.statechange||[])fn();await flush();assert.equal(run('audio.state'),'running');assert.equal(track.source,source);
 console.log('PASS hidden page and OS audio ownership, followed by recovery when the interruption ends.');

 document.activeElement=element('command');emit('focusin');assert.equal(session.type,'playback','keyboard focus must not enable the silent-switch-sensitive ambient session');
 const switches=session.typeChanges.length;session.dictationActive=true;
 session.state='active';for(const fn of sessionListeners.statechange||[])fn();await flush();
 assert.equal(session.type,'playback','output configuration stays stable while native dictation runs');
 assert.equal(session.typeChanges.length,switches,'active output must not trigger a playback/ambient interruption cycle');
 assert.equal(run('audio.state'),'running');assert.equal(track.source,source);assert.equal(track.volume,volume);assert(!track.paused);assert(!source.stopped);
 run('sfx("shot")');assert(contexts[0].sources.at(-1).started);assert.equal(session.type,'playback');
 console.log('PASS keyboard focus keeps playback configured, without ambient mute, session cycling or change in score gain.');

 // An OS-exclusive recorder can still refuse playback. It must not cause
 // repeated resume calls, a new microphone capture, or discarding the score.
 session.dictationActive=false;document.activeElement=element('pause');emit('focusout');await flush();
 document.activeElement=element('command');emit('focusin');await flush();
 audioClock+=501;
 session.dictationActive=true;session.refusesMix=true;session.state='interrupted';contexts[0].state='interrupted';contexts[0].platformBlocksPlayback=true;
 const attempts=contexts[0].resumes;for(const fn of sessionListeners.statechange||[])fn();await flush();
 for(let i=0;i<20;i++)run('unlockAudio()');await flush();
 assert.equal(contexts[0].resumes,attempts);assert.equal(run('audio.state'),'interrupted');assert.equal(track.source,source);assert(!track.paused);
 contexts[0].platformBlocksPlayback=false;session.dictationActive=false;session.refusesMix=false;session.state='active';for(const fn of sessionListeners.statechange||[])fn();await flush();
 assert.equal(run('audio.state'),'running');assert.equal(track.source,source);assert.equal(track.volume,volume);assert.equal(session.type,'playback','resume after OS release even while the input remains focused');
 document.activeElement=element('pause');emit('focusout');await flush();assert.equal(session.type,'playback');assert.equal(track.source,source);
 console.log('PASS OS-forced interruption retains the score and resumes after release, even while keyboard focus remains.');

 audioClock+=501;contexts[0].holdResume=true;contexts[0].state='suspended';const pendingAttempts=contexts[0].resumes;
 run('syncBattleMusic()');await flush();assert.equal(contexts[0].resumes,pendingAttempts+1);
 for(let i=0;i<30;i++)run('syncBattleMusic()');assert.equal(contexts[0].resumes,pendingAttempts+1,'a pending resume must not be flooded every frame');
 audioClock+=1600;contexts[0].holdResume=false;run('syncBattleMusic()');await flush();
 assert.equal(contexts[0].resumes,pendingAttempts+2);assert.equal(run('audio.state'),'running');assert.equal(track.source,source);assert.equal(track.currentTime,10.25);
 console.log('PASS an unresolved resume cannot permanently silence an active battle; recovery keeps the score position.');

 run('speakAkariTechnique(files.gravity[2])');await flush();const beforeCloseVoices=Array.from(run('akariVoiceSources'));
 contexts[0].state='closed';emit('pointerdown');await flush();assert.equal(contexts.length,2);assert.equal(run('audio.state'),'running');assert(source.stopped);
 assert(track.source.started&&track.source.loop);assert.equal(track.source.context,contexts[1]);assert.equal(track.source.offset,10.25);assert.equal(track.gain.context,contexts[1]);
 run('sfx("ready")');assert(contexts[1].sources.some(s=>s.kind==='oscillator'&&s.started));
 run('speakAkariTechnique(files.guns[0])');await flush();const mutedVoice=Array.from(run('akariVoiceSources'))[0];
 assert.equal(mutedVoice.context,contexts[1]);assert.equal(mutedVoice.at,contexts[1].currentTime,'new output must not inherit the old voice clock');assert(beforeCloseVoices.every(s=>s.stopped));
 elements.sfxvolume.oninput({target:{value:'0'}});assert.equal(mutedVoice.akariGain.gain.value,0);
 run('sfx("shot")');assert.equal(run('voices[0].gain.gain.value'),0,'SE slider at zero silences new effects');
 elements.bgmvolume.oninput({target:{value:'0'}});assert.equal(track.volume,0);assert.equal(track.gain.gain.value,0);assert(!track.paused,'zero volume need not restart the score');
 emit('pointerdown');assert.equal(track.gain.gain.value,0,'audio recovery respects slider mute');
 elements.sfxvolume.oninput({target:{value:'80'}});elements.bgmvolume.oninput({target:{value:'55'}});assert.equal(track.volume,volume);assert.equal(mutedVoice.akariGain.gain.value,.576);
 run('state="paused";syncBattleMusic()');emit('pointerdown');assert(track.paused,'recovering output does not start music while the game is paused');
 console.log('PASS closed audio recovery, preserved score position, slider-only mute, restored volumes and pause.');

 contexts[1].decodeFailures=1;run('state="battle";battleMusic=null;musicPlaying=false;musicPlayPending=false;musicFailed=false;musicFailures=0;startBattleScore()');await flush();
 assert(run('musicFailed'));assert(run('battleMusic.paused'));
 audioClock+=800;run('syncBattleMusic()');await run('battleMusic.ready()');await flush();
 assert(!run('musicFailed'));assert(run('battleMusic.source.started'));assert(!run('battleMusic.paused'));assert.equal(run('battleMusic.volume'),volume);
 const retryTrack=run('battleMusic');retryTrack.pause();run('syncBattleMusic()');await flush();assert(!retryTrack.paused);assert(retryTrack.source.started,'a stale musicPlaying flag cannot keep the active score paused');
 console.log('PASS first-load transient BGM failure and a stale playback flag recover automatically at the same volume.');

 run('state="paused";syncBattleMusic();homeMusic.buffer=null;homeMusic.decoding=null;homeMusic.bytes=new Promise(resolve=>globalThis.resolveHomeBytes=resolve);state="start";syncBattleMusic()');
 assert(run('homeMusicPending'));run('state="intro";stopHomeMusic();syncBattleMusic();resolveHomeBytes(new ArrayBuffer(8))');await flush();
 assert(home.paused&&!home.source,'a delayed title decode cannot start over the launch call or battle');
 run('state="start";syncBattleMusic()');await flush();const homeBeforeClose=home.source;assert(homeBeforeClose.started);
 contexts[1].state='closed';emit('pointerdown');await flush();
 assert(homeBeforeClose.stopped);assert.equal(home.source.context,contexts[2]);assert.equal(home.gain.context,contexts[2]);assert(home.source.started&&home.source.loop);assert.equal(home.volume,volume);
 run('state="paused";syncBattleMusic()');assert(home.paused&&!home.source);
 console.log('PASS late title decoding cannot overlap the launch; a closed output restores title music on the replacement audio context at the same volume.');

 audioClock+=1600;run('state="start";stopHomeMusic()');contexts.at(-1).state='suspended';run('attemptHomeAutoplay()');await flush();
 assert(run('audio.state==="running"&&homeMusic.source?.started'),'an origin allowed to autoplay must start without any click/tap event');
 run('state="paused";syncBattleMusic()');
 console.log('PASS permitted launch autoplay starts without a gesture, while rejected autoplay still recovers on a completed touch.');

 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'style.css'),'utf8');
 assert(!html.includes('<h1>'));assert(!html.includes('戦闘中は回復しない'));assert(!html.includes('id="full"'));assert(html.includes('id="pause"'));assert(!html.includes('id="sound"'));assert(!html.includes('id="music"'));
 assert(css.includes('.hud{min-height:54px;padding:6px 12px'));assert(css.includes('.hud{min-height:52px;padding:6px 10px'));
 console.log('PASS removed heading, battery caption and fullscreen control, with a compact header.');
 console.log('ALL AUDIO TESTS PASSED');
})().catch(e=>{console.error(e);process.exit(1)});
