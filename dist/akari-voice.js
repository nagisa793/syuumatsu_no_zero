'use strict';
// Pre-rendered Japanese cues share the game's output. No OS speech session,
// microphone, speech recognizer or voice model is used on the player's device.
let akariVoiceBuffer=null,akariVoiceDecode=null,akariVoiceGeneration=0,akariVoiceUntil=0,akariVoiceContext=null;
const akariVoiceSources=new Set();
function loadAkariVoiceBytes(){return fetch('assets/akari/techniques-v3.wav').then(r=>{if(!r.ok)throw Error('Akari voice');return r.arrayBuffer()}).catch(()=>null)}
let akariVoiceBytes=loadAkariVoiceBytes();
let akariOpeningBuffer=null,akariOpeningDecode=null;
function loadAkariOpeningBytes(){return fetch('assets/akari/encode-zero-v2.wav').then(r=>{if(!r.ok)throw Error('Akari opening');return r.arrayBuffer()}).catch(()=>null)}
let akariOpeningBytes=loadAkariOpeningBytes();
function prepareAkariVoice(){
 if(akariVoiceBuffer)return Promise.resolve(akariVoiceBuffer);
 if(!audio)return Promise.resolve(null);
 akariVoiceDecode??=akariVoiceBytes.then(async bytes=>{if(!bytes)bytes=await(akariVoiceBytes=loadAkariVoiceBytes());if(!bytes)throw Error('Akari voice');return audio.decodeAudioData(bytes.slice(0))}).then(buffer=>akariVoiceBuffer=buffer).catch(()=>{akariVoiceDecode=null;return null});
 return akariVoiceDecode;
}
function prepareAkariOpeningVoice(){
 if(akariOpeningBuffer)return Promise.resolve(akariOpeningBuffer);
 if(!audio)return Promise.resolve(null);
 akariOpeningDecode??=akariOpeningBytes.then(async bytes=>{if(!bytes)bytes=await(akariOpeningBytes=loadAkariOpeningBytes());if(!bytes)throw Error('Akari opening');return audio.decodeAudioData(bytes.slice(0))}).then(buffer=>akariOpeningBuffer=buffer).catch(()=>{akariOpeningDecode=null;return null});
 return akariOpeningDecode;
}
function stopAkariVoice(){
 akariVoiceGeneration++;akariVoiceUntil=0;
 for(const source of akariVoiceSources){try{source.stop()}catch{}}
 akariVoiceSources.clear();
}
function clearQueuedAkariVoice(){
 akariVoiceGeneration++;
 const now=audio?.currentTime||0;akariVoiceUntil=now;
 for(const source of akariVoiceSources){
  if(source.akariAt>now){try{source.stop()}catch{}akariVoiceSources.delete(source)}
  else akariVoiceUntil=Math.max(akariVoiceUntil,source.akariEnd+.055);
 }
}
function syncAkariVoiceVolume(){for(const source of akariVoiceSources)if(source.akariGain)source.akariGain.gain.value=.72*sfxVolume}
function playAkariCue(cue,prepare,offset=0,accept=()=>true){
 if(!sound||!cue)return Promise.resolve(null);
 unlockAudio(true);if(!audio)return Promise.resolve(null);
 stopAkariVoice();akariVoiceContext=audio;
 const generation=akariVoiceGeneration,context=audio,duration=Math.max(0,cue.duration-offset);
 return prepare().then(buffer=>{
  if(!buffer||!duration||!sound||context!==audio||generation!==akariVoiceGeneration||!accept())return null;
  const source=context.createBufferSource(),gain=context.createGain();
  source.buffer=buffer;gain.gain.value=.72*sfxVolume;
  source.akariGain=gain;source.connect(gain);gain.connect(context.destination);
  const at=context.currentTime;
  source.akariAt=at;source.akariEnd=at+duration;source.akariCueName=cue.name;
  source.onended=()=>{source.disconnect();gain.disconnect();akariVoiceSources.delete(source)};
  akariVoiceSources.add(source);source.start(at,(cue.offset||0)+offset,duration);
  akariVoiceUntil=at+duration+.055;
  return {source,duration};
 }).catch(()=>null);
}
function speakAkariTechnique(card){
 if(!sound||!akariCues[card.id])return false;
 playAkariCue(akariCues[card.id],prepareAkariVoice);
 return true;
}
function speakAkariOpening(offset=0,accept=()=>true){return playAkariCue(akariOpeningCue,prepareAkariOpeningVoice,offset,accept)}
