'use strict';

// This presentation lives inside the existing battle viewport. No game state,
// battle RNG, orders, HP or battery are advanced by the film.
const prologueTiming=Object.freeze({fracture:1.15,reveal:2.8,mouth:7.2,command:8.4,strike:10.1,hit:10.6,exit:11.35,fade:11.45,white:13.15,home:13.7,end:15.1});
const opening={phase:'touch',age:0,wait:0,started:false,loaded:0,failed:0};
const prologueArt={},prologueInsects={};
const prologueNames=['city','akari','zero','wing','wasp','dragonfly','spider','centipede','grenade'];
function prologueImageUrl(name){
 if(name==='grenade')return 'assets/animation/boss-weevil.png';
 return 'assets/prologue/'+(name==='zero'?'zero-original-v88.png':name==='wing'?'wing-original-v87.png':name==='akari'?'akari-v88.webp':name+'-v86.webp');
}
for(const name of prologueNames){
 const image=new Image();prologueArt[name]=image;
 image.onload=()=>{
  if(['wasp','dragonfly','spider','centipede'].includes(name)){
   prologueInsects[name]=splitSheet(image,4,2,'bug'+name[0].toUpperCase()+name.slice(1));
  }
  if(name==='grenade')prologueInsects.grenade=splitBossSheet(image);
  if((name==='zero'||name==='wing')&&prologueArt.zero.complete&&prologueArt.wing.complete)buildPrologueSilhouettes();
  opening.loaded++;updateOpeningGate();
 };
 image.onerror=function(){if(!this._retried){this._retried=true;this.src=prologueImageUrl(name)+'?retry=1';return}opening.failed++;updateOpeningGate()};
 image.src=prologueImageUrl(name);
}
const prologueZero=[];
function buildPrologueSilhouettes(){
 prologueZero.length=0;
 // Preserve the exact approved hair, collar, proportions, LEFT sword-arm and
 // Nike feather contour from the battle. Merge them before tinting the shot.
 const body=splitSheet(prologueArt.zero,4,2,'swordLong'),wing=splitSheet(prologueArt.wing,3,1,'wing').frames[2];
 const poses=[1,3,0,4,6,7];
 for(let frame=0;frame<6;frame++){
  const cell=document.createElement('canvas');cell.width=256;cell.height=256;
  const p=cell.getContext('2d');p.imageSmoothingEnabled=false;
  const wingHeight=222*wing.height/wing.width;
  p.save();p.translate(111,128);p.rotate(([-5,0,5,8,3,-3][frame])*Math.PI/180);p.drawImage(wing.image,-111,-wingHeight/2,222,wingHeight);p.restore();
  const f=body.frames[poses[frame]],scale=144/(f.scaleHeight||body.maxHeight),w=f.width*scale,h=f.height*scale;
  p.drawImage(f.image,Math.round(139-w*f.anchor),Math.round(238-f.foot*scale),Math.round(w),Math.round(h));
  // The requested shot is a black silhouette, including the Samothrace wings.
  p.globalCompositeOperation='source-in';p.fillStyle='#000';p.fillRect(0,0,256,256);
  prologueZero.push(cell);
 }
}
const prologueScore=new BattleScore('assets/music/zero-prologue-score-v88.mp3');prologueScore.loop=false;
const prologueEffects=new BattleScore('assets/music/zero-prologue-effects-v88.mp3');prologueEffects.loop=false;
let prologueAudioReady=false,prologueAudioWarm=null;
function preparePrologueAudio(){
 if(prologueAudioWarm)return prologueAudioWarm;
 const prepare=async track=>{for(let attempt=0;attempt<2;attempt++)try{await track.ready();return}catch(error){if(attempt===1)throw error}};
 prologueAudioWarm=Promise.allSettled([prepare(prologueScore),prepare(prologueEffects)]).then(()=>{prologueAudioReady=true});
 return prologueAudioWarm;
}
function openingBlocksHome(){return opening.phase!=='home'&&!(opening.phase==='film'&&opening.age>=prologueTiming.home)}
function updateOpeningGate(){
 $('start').setAttribute('data-opening',opening.phase);
 $('touchbegin').disabled=!runtimeReady;
 $('touchgate').classList.toggle('hidden',opening.phase!=='touch');
 $('skipopening').classList.toggle('hidden',opening.phase!=='film');
 const amount=(opening.loaded+opening.failed)/prologueNames.length;
 $('touchloadfill').style.width=Math.round(amount*100)+'%';
 $('touchload').classList.toggle('hidden',amount>=1);
}
function beginPrologue(event){
 event?.stopPropagation?.();
 if(!runtimeReady||state!=='start'||opening.phase!=='touch')return false;
 unlockAudio(true);stopHomeMusic();stopVoices();stopCommandSound();
 Object.assign(opening,{phase:'film',age:0,wait:0,started:false});
 // Play this tiny sound immediately in the activation event. The pre-rendered
 // music/effects and title score decode while the first star is visible.
 sfx('select');preparePrologueAudio();ensureHomeMusic().ready().catch(()=>{});
 updateOpeningGate();$('skipopening').focus();return true;
}
function stopPrologueAudio(){prologueScore.pause();prologueEffects.pause()}
function finishPrologue(event){
 event?.stopPropagation?.();
 if(opening.phase!=='film')return false;
 const titleAlreadyPlaying=!openingBlocksHome();
 unlockAudio(true);opening.phase='home';opening.age=prologueTiming.end;
 stopPrologueAudio();stopCommandSound();stopVoices();
 updateOpeningGate();
 // Cancel pending film decodes before starting the already warmed title loop.
 const title=ensureHomeMusic();if(!titleAlreadyPlaying)title.currentTime=0;homeMusicRetryAt=0;
 syncHomeMusic();drawHomeScreen();$('begin').focus();return true;
}
function syncPrologueAudio(){
 prologueScore.volume=musicVolume*MUSIC_MIX;
 prologueEffects.volume=sfxVolume*.46;
 const active=opening.phase==='film'&&opening.age<prologueTiming.home&&opening.started&&state==='start'&&!document.hidden;
 for(const [track,enabled] of [[prologueScore,sound&&music],[prologueEffects,sound&&sfxVolume>0]]){
  if(!active||!enabled){if(!track.paused)track.pause();continue}
  if(audio?.state!=='running')unlockAudio();
  if(track.buffer&&track.paused){track.currentTime=opening.age;track.play().catch(()=>{})}
 }
}
function tickPrologue(dt){
 if(opening.phase!=='film')return;
 if(!opening.started){
  opening.wait+=dt;
  const images=opening.loaded+opening.failed===prologueNames.length;
  const output=!sound||audio?.state==='running';
  if(!images||(!prologueAudioReady||!output)&&opening.wait<2)return;
  opening.started=true;
 }
 opening.age=Math.min(prologueTiming.end,opening.age+dt);syncPrologueAudio();
 if(opening.age>=prologueTiming.end)finishPrologue();
}
const presentationTick=tick;
tick=function(dt){
 if(state==='start'&&opening.phase==='film'){if(!document.hidden){time+=dt;tickPrologue(dt)}syncBattleMusic();return}
 presentationTick(dt);
};
const presentationHome=drawHomeScreen;
drawHomeScreen=function(){
 if(opening.phase==='home'){presentationHome();return}
 const p=homeSceneContext;p.save();p.scale(homeScene.width/W,homeScene.height/H);p.imageSmoothingEnabled=false;
 p.fillStyle='#000';p.fillRect(0,0,W,H);
 if(opening.phase==='film')drawPrologue(p,opening.age);
 p.restore();
};
function prologueHash(n){const value=Math.sin(n*127.1+311.7)*43758.5453;return value-Math.floor(value)}
function filmEase(q){q=Math.max(0,Math.min(1,q));return q*q*(3-2*q)}
function prologueStar(p,cx,cy,r){
 const points=[[50,0],[64.43,25],[93.3,25],[78.87,50],[93.3,75],[64.43,75],[50,100],[35.57,75],[6.7,75],[21.13,50],[6.7,25],[35.57,25]];
 for(let i=0;i<points.length;i++){const x=cx+(points[i][0]-50)*r/50,y=cy+(points[i][1]-50)*r/50;i?p.lineTo(x,y):p.moveTo(x,y)}p.closePath();
}
function drawPrologueCel(p,image,index,columns,rows,x=0,y=0,w=W,h=H){
 if(!image?.complete||!image.naturalWidth)return;
 const cw=image.naturalWidth/columns,ch=image.naturalHeight/rows;
 p.drawImage(image,index%columns*cw,Math.floor(index/columns)*ch,cw,ch,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function drawPrologueCity(p,a){
 const k=Math.max(0,Math.min(3,(a-2.5)*.7)),index=Math.floor(k),fade=Math.min(1,(k-index)*5),zoom=1.025+Math.max(0,a-2.8)*.006;
 p.save();p.translate(W/2,H*.6);p.scale(zoom,zoom);p.translate(-W/2,-H*.6);
 drawPrologueCel(p,prologueArt.city,index,2,2);
 if(index<3&&fade>0){p.globalAlpha=fade;drawPrologueCel(p,prologueArt.city,index+1,2,2);p.globalAlpha=1}
 // Image-derived rectangular facade fragments drift into the data stream.
 for(let i=0;i<28;i++){
  const age=(a*.32+prologueHash(i))%1,x=prologueHash(i+50)*W,y=H-age*H;
  p.globalAlpha=Math.sin(age*Math.PI)*.58;p.fillStyle=i%3?'#47d9df':'#ffab67';
  p.fillRect(Math.round(x+Math.sin(i+a)*4),Math.round(y),i%4?2:5,i%3?3:7);
 }
 p.globalAlpha=1;p.restore();
}
const prologueSwarm=Array.from({length:36},(_,i)=>{
 if(i<25){
  const depth=i<12?0:i<20?1:2,j=i-[0,12,20][depth];
  const boss=[8,17,23].includes(i),type=boss?'grenade':i%3?'dragonfly':'wasp';
  return {id:i,type,flying:true,depth,size:boss?[19,33,58][depth]:[8,17,34][depth]+i%3*2,x:(j*.61803398875%1)*720-90,y:25+prologueHash(i+260)*[94,120,125][depth],speed:[4,10,22][depth],period:720,opacity:[.53,.78,1][depth]};
 }
 // Three street depths with shared lane speed and clear vertical separation.
 // No spider can sit on a centipede, even when the lane wraps offscreen.
 const j=i-25,lane=j<4?0:j<8?1:2,n=j-[0,4,8][lane];
 return {id:i,type:j%2?'spider':'centipede',flying:false,depth:3+lane,lane,size:[17,27,43][lane],x:n*[160,180,240][lane]+[40,95,180][lane],feet:[204,237,284][lane],speed:[6,13,25][lane],period:[640,720,720][lane],opacity:[.63,.86,1][lane]};
});
function prologueSwarmPlacements(a){
 const entries=[];
 for(const b of prologueSwarm){
  const sheet=prologueInsects[b.type];if(!sheet)continue;
  const cycle=1.6,phase=(a%cycle)/1.04,moving=b.flying||phase<1;
  const distance=b.flying?a*b.speed:(Math.floor(a/cycle)+filmEase(phase))*cycle*b.speed;
  const index=b.flying?(b.type==='grenade'?[4,5,4,5]:[0,1,2,1])[Math.floor(a*(b.type==='grenade'?3:4)+b.id)%4]:moving?[0,1,0,2][Math.floor(a*4+b.id)%4]:0;
  const f=sheet.frames[index];if(!f)continue;
  const h=b.size,w=h*f.width/f.height,x=((b.x-distance+120)%b.period+b.period)%b.period-120;
  const bottom=b.flying?b.y+h/2+Math.sin(a*1.3+b.id)*[1,2,3][b.depth]:b.feet;
  entries.push({...b,f,x,y:bottom-h,w,h,bottom});
 }
 return entries.sort((a,b)=>a.depth-b.depth||a.bottom-b.bottom);
}
const filmGlyphs={
 N:['11001','11001','11101','11111','10111','10011','10011'],
 o:['00000','00000','01110','11011','11011','11011','01110'],
 '.':['000','000','000','000','000','110','110'],
 '0':['01110','11011','11011','11011','11011','11011','01110'],
 '3':['11110','00011','00011','01110','00011','00011','11110'],
 '!':['110','110','110','110','000','110','110'],
 'ロ':['000000000','000000000','111111100','110001100','110001100','110001100','110001100','110001100','111111100'],
 'ン':['000000000','000000000','110000000','011000000','000000100','000001100','000011000','001110000','111000000'],
 'グ':['000000101','000000010','001111100','011000100','110000100','000001100','000011000','000110000','011100000'],
 'ソ':['000000000','000000000','110000100','011001100','000001000','000011000','000110000','001100000','011000000'],
 'ー':['000000000','000000000','000000000','000000000','111111100','111111100','000000000','000000000','000000000'],
 'ド':['000000101','000000010','110000000','110000000','111100000','110110000','110011000','110000000','110000000']
};
function drawFilmWord(p,word,y,unit){
 const letters=[...word],width=letters.reduce((sum,c)=>sum+(filmGlyphs[c][0].length+1)*unit,0)-unit;
 let left=(W-width)/2;p.fillStyle='#fff';
 for(const c of letters){const rows=filmGlyphs[c];for(let r=0;r<rows.length;r++)for(let x=0;x<rows[r].length;x++)if(rows[r][x]==='1')p.fillRect(Math.round(left+x*unit),y+r*unit,unit,unit);left+=(rows[0].length+1)*unit}
}
function drawPrologueSwarm(p,a,deleting=0){
 for(const b of prologueSwarmPlacements(a)){
  const {f,x,y,w,h}=b;if(x+w/2<0||x-w/2>W)continue;
  const q=deleting?Math.max(0,Math.min(1,(deleting-x/W)*3.5)):0;
  if(q>=1)continue;
  p.save();p.globalAlpha=b.opacity;
  if(!b.flying){p.fillStyle='#020913';p.globalAlpha=b.opacity*(1-q)*.58;p.beginPath();p.ellipse(x,b.bottom-1,w*.4,Math.max(1,h*.055),0,0,Math.PI*2);p.fill();p.globalAlpha=b.opacity}
  if(q<=0)p.drawImage(f.image,Math.round(x-w/2),Math.round(y),Math.round(w),Math.round(h));
  else for(let strip=0;strip<8;strip++){
   const sw=f.width/8;p.globalAlpha=b.opacity*(1-q)*(strip%3?.8:1);p.drawImage(f.image,strip*sw,0,sw,f.height,Math.round(x-w/2+strip*w/8+q*(strip%2?30:10)),Math.round(y-q*q*(12+strip*5)),Math.ceil(w/8),h);
  }
  p.restore();
 }
}
function prologueHeroPose(a){
 const strike=a-prologueTiming.strike,dash=filmEase((a-prologueTiming.hit)/.65);
 return {visible:a>=prologueTiming.strike&&a<prologueTiming.exit,frame:strike<.17?0:strike<.34?1:strike<.53?2:strike<.69?3:strike<1.15?4:5,x:100+dash*655-105,y:49-strike*5,w:210,h:210};
}
function drawPrologue(p,a){
 const t=prologueTiming;
 if(a<t.fracture){
  p.fillStyle='#f6ffff';p.fillRect(0,0,W,H);
  const q=Math.max(0,(a-.18)/(.97)),radius=45+q*q*q*650;
  p.save();p.beginPath();p.rect(0,0,W,H);prologueStar(p,W/2,H/2,radius);p.fillStyle='#000';p.fill('evenodd');p.restore();
  if(a<.4){p.strokeStyle='#b7ecf3';p.lineWidth=1;p.beginPath();prologueStar(p,W/2,H/2,45);p.stroke()}
  for(let n=0;n<6;n++){
   const angle=n*Math.PI/3-Math.PI/2,from=radius*.76,to=Math.min(700,radius+Math.max(0,a-.1)*550);
   p.strokeStyle='#e8fcff';p.lineWidth=1;p.beginPath();p.moveTo(W/2+Math.cos(angle)*from,H/2+Math.sin(angle)*from);p.lineTo(W/2+Math.cos(angle)*to,H/2+Math.sin(angle)*to);p.stroke();
  }
  return;
 }
 if(a<t.mouth){
  drawPrologueCity(p,a);drawPrologueSwarm(p,a);
  if(a<t.reveal){
   const progress=(a-t.fracture)/(t.reveal-t.fracture);
   // White tiles break away individually, revealing the real city plate.
   for(let r=0;r<17;r++)for(let c=0;c<30;c++){
    const threshold=prologueHash(r*31+c)*.78+Math.abs(c-15)/30*.15,q=(progress-threshold)*5;
    if(q>=1)continue;p.globalAlpha=q<=0?1:1-q;
    p.fillStyle='#f7ffff';const dx=q>0?(prologueHash(c*17+r)-.5)*q*22:0,dy=q>0?-q*q*(20+prologueHash(c+r*7)*75):0;
    p.fillRect(Math.round(c*16+dx),Math.round(r*16+dy),17,17);
   }p.globalAlpha=1;
  }
 }else if(a<t.command){
  p.fillStyle='#000';p.fillRect(0,0,W,H);
  const q=a-t.mouth,index=[0,1,2,3,1,3][Math.min(5,Math.floor(q*5))],zoom=1.02+q*.025;
  drawPrologueCel(p,prologueArt.akari,index,2,2,(W-W*zoom)/2,(H-H*zoom)/2,W*zoom,H*zoom);
 }else if(a<t.strike){
  p.fillStyle='#000';p.fillRect(0,0,W,H);
  const q=a-t.command;p.save();
  drawFilmWord(p,'No.003!',92,4);
  if(q>.26)drawFilmWord(p,'ロングソード!',142,3);
  p.fillRect(154,79,29,2);p.fillRect(297,183,29,2);p.restore();
 }else if(a<t.white){
  drawPrologueCity(p,6.9);const front=Math.max(0,Math.min(1.5,(a-t.hit)/.40));
  drawPrologueSwarm(p,a,front);
  const hero=prologueHeroPose(a);
  if(a>=t.hit){
   const q=a-t.hit,length=Math.min(W+70,q*2400),strength=Math.max(0,1-q/1.05);
   p.save();p.globalAlpha=strength*.25;p.fillStyle='#cbffff';p.fillRect(0,127,length,32);
   p.globalAlpha=strength;p.fillStyle='#fff';p.fillRect(0,139,length,6);p.fillRect(0,135,length*.86,2);p.fillRect(0,149,length*.92,1);p.restore();
  }
  if(hero.visible&&prologueZero[hero.frame]){
   p.save();p.globalAlpha=1;
   p.drawImage(prologueZero[hero.frame],Math.round(hero.x),Math.round(hero.y),hero.w,hero.h);p.restore();
  }
  const white=filmEase((a-t.fade)/(t.white-t.fade));if(white){p.fillStyle=`rgba(255,255,255,${white})`;p.fillRect(0,0,W,H)}
 }else if(a<t.home){p.fillStyle='#fff';p.fillRect(0,0,W,H)}
 else{
  drawHomeBackdrop(p,homeSkyClock());
  p.save();p.globalAlpha=1-filmEase((a-t.home)/(t.end-t.home));p.fillStyle='#fff';p.fillRect(0,0,W,H);p.restore();
 }
}
$('touchbegin').onclick=beginPrologue;
$('skipopening').onclick=finishPrologue;
document.addEventListener('visibilitychange',()=>{if(opening.phase==='film')syncPrologueAudio()});
updateOpeningGate();
window.zeroBattle={...window.zeroBattle,beginPrologue,finishPrologue,readOpening:()=>({phase:opening.phase,age:opening.age,loaded:opening.loaded,failed:opening.failed})};
