'use strict';
// Recorded synthetic speech shares the existing SFX context; it never ducks BGM.
let gotchaBuffer=null,gotchaDecode=null,gotchaLast=-Infinity;
const gotchaBytes=fetch('assets/gotcha.wav?v=35').then(r=>{if(!r.ok)throw new Error('voice cue');return r.arrayBuffer()}).catch(()=>null);
function playGotcha(){
 if(!sound)return;unlockAudio();if(!audio)return;
 if(audio.currentTime-gotchaLast<.3)return;gotchaLast=audio.currentTime;
 const requestedAt=audio.currentTime;
 gotchaDecode??=gotchaBytes.then(bytes=>bytes?audio.decodeAudioData(bytes):null).then(buffer=>gotchaBuffer=buffer).catch(()=>null);
 gotchaDecode.then(buffer=>{if(!buffer||!sound||audio.currentTime-requestedAt>1)return;const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;gain.gain.value=.45*sfxVolume;source.connect(gain);gain.connect(audio.destination);source.onended=()=>{source.disconnect();gain.disconnect()};source.start()});
}
const acknowledgedCommand=runCommand;
runCommand=function(raw){const queued=state==='intro',ok=acknowledgedCommand(raw);if(ok&&!queued&&splitInstructions(raw).some(s=>!['family','info','empty'].includes(interpretInstruction(s).kind)))playGotcha();return ok};
window.zeroBattle={...window.zeroBattle,runCommand};
