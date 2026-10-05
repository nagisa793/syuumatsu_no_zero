'use strict';
let battleMusic=null,musicPlaying=false,musicSpeaking=false,musicPlayPending=false,musicFailed=false,musicPrimed=false,musicRequest=0;
const MUSIC_MIX=.176; // 40% of the previous BGM gain; SFX remain unchanged.
// Share the SFX AudioContext. No HTML media-element play/pause transitions
// during recognition, and no reliance on iOS HTMLMediaElement.volume.
class BattleScore {
 constructor(){
  this.paused=true;this.plays=0;this.source=null;this.gain=null;this.buffer=null;this.offset=0;this.startedAt=0;this.generation=0;this._volume=musicVolume*MUSIC_MIX;this._muted=false;this.decoding=null;
  this.bytes=this.loadBytes();
 }
 loadBytes(){return fetch('assets/music/zero-debug-battle-v17.mp3').then(r=>{if(!r.ok)throw new Error('BGM download');return r.arrayBuffer()}).catch(()=>null)}
 get volume(){return this._volume}
 set volume(value){this._volume=Math.max(0,Math.min(1,value));this.applyGain()}
 get muted(){return this._muted}
 set muted(value){this._muted=!!value;this.applyGain()}
 applyGain(){if(this.gain)this.gain.gain.value=this._muted?0:this._volume}
 get currentTime(){return this.source?((this.offset+audio.currentTime-this.startedAt)%this.buffer.duration):this.offset}
 set currentTime(value){this.offset=Math.max(0,value);if(this.source){this.stopSource();this.startSource()}}
 stopSource(){const old=this.source;this.source=null;if(old){try{old.stop()}catch{}old.disconnect()}}
 startSource(){if(this.paused||!this.buffer||!audio)return;this.stopSource();this.gain??=audio.createGain();this.gain.disconnect();this.gain.connect(audio.destination);this.applyGain();const source=audio.createBufferSource();source.buffer=this.buffer;source.loop=true;source.connect(this.gain);this.source=source;this.startedAt=audio.currentTime;source.start(0,this.offset%this.buffer.duration)}
 async ready(){
  if(this.buffer)return;unlockAudio();if(!audio)throw new Error('Web Audio unavailable');
  if(!this.decoding)this.decoding=this.bytes.then(bytes=>{if(!bytes){this.bytes=this.loadBytes();throw new Error('BGM download')}return audio.decodeAudioData(bytes.slice(0))}).then(buffer=>{this.buffer=buffer}).catch(error=>{this.decoding=null;throw error});
  await this.decoding;
 }
 play(){
  if(!this.paused&&this.source)return Promise.resolve();this.paused=false;this.plays++;const generation=++this.generation;
  if(this.buffer){this.startSource();return Promise.resolve()}
  return this.ready().then(()=>{if(generation===this.generation&&!this.paused)this.startSource()});
 }
 pause(){this.offset=this.currentTime;this.paused=true;this.generation++;this.stopSource()}
}
function ensureBattleMusic(){return battleMusic??=new BattleScore()}
function playBattleMusic(){const track=ensureBattleMusic();if(musicPlayPending||musicFailed)return;const request=++musicRequest;musicPlayPending=true;musicPlaying=true;track.play().then(()=>{if(request===musicRequest)musicPlayPending=false}).catch(()=>{if(request!==musicRequest)return;musicPlayPending=false;musicPlaying=false;musicFailed=true;track.pause();msg('BGMの読み込みに失敗しました。BGMボタンで再試行できます。')})}
function restartBattleMusic(){const track=ensureBattleMusic();musicRequest++;musicPlayPending=false;musicFailed=false;musicPrimed=false;musicPlaying=false;track.pause();track.currentTime=0;track.volume=musicVolume*MUSIC_MIX}
function primeBattleScore(){const track=ensureBattleMusic();track.muted=true;musicPrimed=true;if(sound&&music)playBattleMusic()}
function startBattleScore(){const track=ensureBattleMusic();scoreStarted=true;musicPrimed=false;track.currentTime=0;track.muted=false;track.volume=musicVolume*MUSIC_MIX;if(sound&&music)playBattleMusic()}
function syncBattleMusic(){const track=battleMusic;if(!track)return;const volume=musicVolume*MUSIC_MIX;if(track.volume!==volume)track.volume=volume;const active=sound&&music&&(['battle','target','lock'].includes(state)||state==='intro'&&(scoreStarted||musicPrimed));if(!active){if(musicPlaying||!track.paused){track.pause();musicRequest++;musicPlayPending=false;musicPlaying=false}return}if(!musicPlaying&&!musicPlayPending&&!musicFailed)playBattleMusic()}
$('music').onclick=()=>{music=!music;$('music').textContent=music?'BGM ON':'BGM OFF';musicFailed=false;unlockAudio();syncBattleMusic()};
ensureBattleMusic();
