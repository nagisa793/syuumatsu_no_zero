// Browser API simulation: cold start has no recognition-model download gate.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist'),events=[],els=new Map();
const element=id=>els.get(id)||els.set(id,{textContent:'',setAttribute(){}}).get(id);
const c={console,window:{addEventListener(){}},setText:(id,text)=>element(id).textContent=text,$:element};
vm.createContext(c);
vm.runInContext(`let voiceWanted=false,voiceBlocked=false,listening=false,recognition=null,voiceForceReady=false,voiceExecutions=[],voiceLastTranscript='',voiceLastAlternatives=[],spokenStarts=0,readingsStarted=0,corrections=0,executions=[];function micDisplay(){};function resumeVoice(){startVoice()};function suspendVoice(){};function toggleVoice(){};function startVoice(){spokenStarts++;voiceWanted=listening=true;recognition={};};function loadVoiceReadings(){readingsStarted++;return new Promise(()=>{})};function chooseVoiceInstruction(t){return t};function forceVoiceInstruction(t){corrections++;return 'corrected '+t};function drainVoiceInstruction(){executions.push(voiceExecutions.shift())}`,c);
vm.runInContext(fs.readFileSync(path.join(root,'voice-continuous.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c);
run('startVoice()');assert(run('listening&&recognition&&spokenStarts===1'));assert.equal(run('readingsStarted'),1,'optional dictionary is still pending while listening already works');
assert.equal(c.window.zeroBattle.readMicrophone().modelDownloadRequired,false);
for(const state of ['intro','target','lock','battle','paused','win','lose']){run('state='+JSON.stringify(state)+';suspendVoice();toggleVoice()');assert(run('voiceWanted&&listening'),'no game state switches the mic off')}
run('voiceExecutions.push({text:"raw instruction"});drainVoiceInstruction()');assert.equal(run('executions[0].text'),'raw instruction','pending dictionary never blocks commands');
run('voiceForceReady=true;voiceExecutions.push({text:"raw instruction"});drainVoiceInstruction()');assert.equal(run('executions[1].text'),'corrected raw instruction');assert.equal(run('corrections'),1);
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');const scripts=[...index.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);
for(const script of scripts){const content=fs.readFileSync(path.join(root,script),'utf8');assert(!/new Worker\(|createVoiceTranscriber\(|voice-whisper-worker|transformers\.min\.js|huggingface\.co\//.test(content),'active game script must not load an AI runtime: '+script)}
assert(!/250MB|1\.6GB|voiceready|voice-segments/.test(index));
console.log('PASS immediate browser start during unresolved optional dictionary fetch, gameplay state retention, execution-only correction and no local AI runtime in active scripts.');
