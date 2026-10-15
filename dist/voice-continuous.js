'use strict';
// Use the browser's existing recognizer. There is no model worker, model
// download, GPU initialization or model-ready gate on this path.
const browserMicDisplay=micDisplay;
micDisplay=function(mode,detail){browserMicDisplay(mode,detail);if(voiceWanted){setText('miclabel',voiceBlocked?'マイクを再接続':'マイク ON');$('voice').setAttribute('aria-pressed','true')}};
// Pause/TARGET/results do not request recognition or hardware shutdown.
suspendVoice=function(){if(voiceWanted)resumeVoice()};
toggleVoice=function(){startVoice()};$('voice').onclick=toggleVoice;
const browserVoiceStart=startVoice;
startVoice=function(){
 // Start recognition before the optional execution-only reading dictionary.
 // Neither a dictionary download nor a dictionary error gates listening.
 browserVoiceStart();
 if(voiceWanted)loadVoiceReadings().catch(()=>{});
};
const rawVoiceExecution=drainVoiceInstruction;
drainVoiceInstruction=function(){
 if(voiceExecutions.length){const job=voiceExecutions[0];job.text=chooseVoiceInstruction(job.text,job.candidates);if(voiceForceReady)job.text=forceVoiceInstruction(job.text)}
 rawVoiceExecution();
};
window.addEventListener('focus',()=>{if(voiceWanted)resumeVoice()});
window.zeroBattle={...window.zeroBattle,readMicrophone:()=>({backend:'browser',captureActive:listening,engineReady:!!recognition,modelDownloadRequired:false,lastTranscript:voiceLastTranscript,alternatives:voiceLastAlternatives.slice(),blocked:voiceBlocked})};
