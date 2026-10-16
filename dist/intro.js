'use strict';
let introAge=0,introCommands=[],introDebug=false,scoreStarted=false,homeIntro=null;
const homeArtwork=new Image(),homeCircuitArt=new Image(),homeTitleArt=new Image(),homePhoneArt=new Image();
for(const image of [homeArtwork,homeCircuitArt,homeTitleArt,homePhoneArt]){image.onload=()=>assetReady(false);image.onerror=assetError}
homeArtwork.src='assets/home/title-akari-v81.webp';
homeCircuitArt.src='assets/home/title-circuit-v81.webp';
homeTitleArt.src='assets/home/title-logo-v81.webp';
homePhoneArt.src='assets/home/title-iphone-v83.webp';
const homeScene=$('homescene'),homeSceneContext=homeScene.getContext('2d');
const homeLogoSurface=document.createElement('canvas');homeLogoSurface.width=960;homeLogoSurface.height=480;
const homeLogoPaint=homeLogoSurface.getContext('2d');
const homeReducedMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function homeIntroActive(){return !!homeIntro&&(state==='intro'||state==='paused'&&beforePause==='intro')}
function homeIntroTiming(){
 const signal=ENCODE_SIGNAL_DURATION;
 return {signal,departure:signal+.18,reveal:signal+.95,arrival:signal+3.00,debug:signal+3.55,end:signal+4.20};
}
function beginBattleIntro(){homeIntro=null;introAge=0;introCommands=[];introDebug=false;scoreStarted=false;state='intro';primeBattleScore();msg('');commandFeedback('接続中')}
function beginHomeIntro(){
 stopHomeMusic();
 introAge=0;introCommands=[];introDebug=false;scoreStarted=false;state='intro';
 const scene=homeIntro={audioWait:0,departed:false,arrived:false,startedAt:time};stopVoices();playHomeStartSound(()=>homeIntro===scene&&state==='intro'&&introAge<.3);playHomeIntroSound();
}
function playHomeIntroSound(){
 const scene=homeIntro;if(!scene)return;
 const accept=()=>homeIntro===scene&&state==='intro'&&introAge<homeIntroTiming().signal;
 playEncodeSound(Math.min(introAge,homeIntroTiming().signal),accept);
}
function resumeHomeIntroSound(){if(homeIntroActive()&&state==='intro'&&introAge<homeIntroTiming().signal)playHomeIntroSound()}
function runIntroCommands(){for(const command of introCommands.splice(0))runCommand(command.text??command,command.options||{})}
function tickBattleIntro(dt){
 if(homeIntro){
  // Do not let wall-clock animation consume a signal scheduled on a suspended
  // output. A bounded wait still allows play when audio is unavailable.
  if(sound&&audio&&audio.state!=='running'){
   homeIntro.audioWait+=dt;unlockAudio();if(homeIntro.audioWait<1.5)return;
  }
  introAge+=dt;const t=homeIntroTiming();
  if(introAge>=t.departure&&!homeIntro.departed){homeIntro.departed=true;sfx('boot')}
  if(introAge>=t.reveal&&!scoreStarted){scoreStarted=true;startBattleScore()}
  if(introAge>=t.arrival&&!homeIntro.arrived){homeIntro.arrived=true;sfx('ready')}
  if(introAge>=t.debug&&!introDebug){introDebug=true;sfx('debug')}
  if(introAge>=t.end){homeIntro=null;beginTarget();runIntroCommands()}
  return;
 }
 introAge+=dt;if(introAge>=.68&&!scoreStarted){scoreStarted=true;startBattleScore()}if(introAge>=.94&&!introDebug){introDebug=true;sfx('debug')}if(introAge>=2.15){beginTarget();runIntroCommands()}
}
function zeroArrivalProgress(){if(!homeIntroActive())return 1;const t=homeIntroTiming();return Math.max(0,Math.min(1,(introAge-t.reveal)/(t.arrival-t.reveal)))}
function drawZeroTransfer(){
 const q=zeroArrivalProgress();if(q<=0)return;
 const p=zeroVisualPosition(),feet=p.y+12,cel=zeroAnimationFrame();
 if(q>=1){drawCel(cel.sheet,cel.frame,p.x,feet,ZERO_SIZE);return}
 const settle=Math.max(0,Math.min(1,(q-.76)/.24)),presence=Math.min(1,q/.16)*(1-settle);
 const build=Math.max(0,Math.min(1,(q-.18)/.54)),ease=build*build*(3-2*build);
 g.save();
 // The receiver wakes first, then locks four corners of the initial panel.
 for(const [rx,ry,delay] of [[31,9,0],[24,6,.06]]){
  g.globalAlpha=Math.max(0,Math.min(1,(q-delay)/.12))*(1-settle)*.75;g.strokeStyle='#a6ffdf';g.lineWidth=1;
  g.beginPath();g.ellipse(p.x,feet,rx,ry,0,0,Math.PI*2);g.stroke();
 }
 g.globalAlpha=presence;g.strokeStyle='#ceffef';
 for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
  const x=p.x+sx*29,y=feet+sy*9;g.beginPath();g.moveTo(x-sx*7,y);g.lineTo(x,y);g.lineTo(x,y-sy*3);g.stroke();
 }
 const beam=presence*Math.min(1,Math.max(0,(q-.08)/.15))*.48;
 const glow=g.createLinearGradient(p.x-26,0,p.x+26,0);glow.addColorStop(0,'#81ffe600');glow.addColorStop(.5,`rgba(133,255,231,${beam})`);glow.addColorStop(1,'#81ffe600');
 g.globalAlpha=1;g.fillStyle=glow;g.fillRect(p.x-26,0,52,feet+6);
 // Feet, legs, torso and head assemble in order, followed by a color resolve.
 const scan=feet-(ZERO_SIZE+4)*ease;
 if(build>0){
  g.save();g.beginPath();g.rect(p.x-80,scan,160,feet-scan+3);g.clip();
  drawCel(cel.sheet,cel.frame,p.x,feet,ZERO_SIZE,Math.min(1,build*5),false,build<.94);g.restore();
  if(build>=.94&&settle<1){g.save();g.globalAlpha=(1-settle)*.32;drawCel(cel.sheet,cel.frame,p.x,feet,ZERO_SIZE,(1-settle)*.32,false,true);g.restore()}
 }
 if(build>0&&build<1){
  g.fillStyle='#edfff5';g.fillRect(Math.round(p.x-22),Math.round(scan),44,2);
  g.fillStyle='#8bffe785';g.fillRect(Math.round(p.x-27),Math.round(scan-2),54,1);
 }
 // Individual data packets stream inwards, instead of popping in the sprite.
 for(let n=0;n<24;n++){
  const cycle=(q*2.6+n*.381966)%1,side=n%2?1:-1;
  const x=p.x+side*(1-cycle)*(31+n%5*3),y=feet-8-n%8*9-(1-cycle)*24;
  g.globalAlpha=presence*Math.sin(cycle*Math.PI)*.75;g.fillStyle=n%3?'#8bfde2':'#f3ffe5';
  g.fillRect(Math.round(x),Math.round(y),n%4?1:2,n%3?3:5);
 }
 if(settle>0){g.globalAlpha=1;ring(p.x,feet,24+settle*19,'#dcfff2',(1-settle)*.8)}
 g.restore();
}
function homeSkyClock(){return homeReducedMotion?0:homeIntroActive()?homeIntro.startedAt+introAge:time}
function homeCircuitCamera(clock){
 // Unbounded world offset: no reversal or jump at the end of a camera loop.
 return {x:clock*18,y:-clock*11,width:W*1.4,height:H*1.4};
}
function homeCircuitTiles(clock){
 const p=homeCircuitCamera(clock),tiles=[];
 const firstX=Math.floor(-p.x/p.width),firstY=Math.floor(-p.y/p.height);
 for(let j=firstY;j*p.height+p.y<H;j++)for(let i=firstX;i*p.width+p.x<W;i++)
  tiles.push({x:i*p.width+p.x,y:j*p.height+p.y,width:p.width,height:p.height,flipX:Math.abs(i%2)===1,flipY:Math.abs(j%2)===1});
 return tiles;
}
function drawHomeSpace(target,clock){
 target.save();target.imageSmoothingEnabled=false;
 const sky=target.createLinearGradient(0,0,W,H);sky.addColorStop(0,'#073554');sky.addColorStop(.5,'#06152e');sky.addColorStop(1,'#10374c');target.fillStyle=sky;target.fillRect(0,0,W,H);
 // Mirror-repeat the complete background plate so matching edge pixels meet.
 // Every part travels along the same up-right vector; there are no rotating
 // rings, counter-scrolling lanes, oscillations, or gameplay RNG calls.
 if(homeCircuitArt.complete&&homeCircuitArt.naturalWidth)for(const p of homeCircuitTiles(clock)){
  target.save();target.translate(p.x+(p.flipX?p.width:0),p.y+(p.flipY?p.height:0));target.scale(p.flipX?-1:1,p.flipY?-1:1);
  target.drawImage(homeCircuitArt,0,0,p.width,p.height);target.restore();
 }
 target.fillStyle='#02091e3d';target.fillRect(0,0,W,H);
 const shade=target.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#020d1800');shade.addColorStop(.58,'#02091b05');shade.addColorStop(1,'#01071c96');target.fillStyle=shade;target.fillRect(0,0,W,H);
 target.restore();
}
function homeTitleBounds(){
 const aspect=homeTitleArt.naturalWidth/homeTitleArt.naturalHeight||2.1,height=Math.min(154,316/aspect),width=height*aspect;
 return {x:W-8-width,y:H-10-height,width,height};
}
function drawHomeTitle(target,clock){
 if(!homeTitleArt.complete||!homeTitleArt.naturalWidth)return;
 const p=homeTitleBounds(),q=(clock%8)/8;
 if(q>=.27){target.drawImage(homeTitleArt,p.x,p.y,p.width,p.height);return}
 if(homeLogoSurface.width!==homeTitleArt.naturalWidth||homeLogoSurface.height!==homeTitleArt.naturalHeight){homeLogoSurface.width=homeTitleArt.naturalWidth;homeLogoSurface.height=homeTitleArt.naturalHeight}
 const w=homeLogoSurface.width,h=homeLogoSurface.height;
 homeLogoPaint.clearRect(0,0,w,h);homeLogoPaint.imageSmoothingEnabled=false;homeLogoPaint.drawImage(homeTitleArt,0,0,w,h);
 {
  homeLogoPaint.save();homeLogoPaint.globalCompositeOperation='source-atop';
  const x=-w*.3+q/.27*w*1.6,glint=homeLogoPaint.createLinearGradient(x-70,0,x+70,0);
  glint.addColorStop(0,'#ffffff00');glint.addColorStop(.5,'#e5fcff70');glint.addColorStop(1,'#ffffff00');homeLogoPaint.fillStyle=glint;homeLogoPaint.fillRect(0,0,w,h);homeLogoPaint.restore();
 }
 target.drawImage(homeLogoSurface,p.x,p.y,p.width,p.height);
}
function homePhoneBounds(){
 const height=158;
 return {x:398,y:93,width:height*homePhoneArt.naturalWidth/homePhoneArt.naturalHeight,height,angle:Math.PI/6};
}
function drawHomeBackdrop(target,clock=homeSkyClock()){
 drawHomeSpace(target,clock);
 target.save();target.imageSmoothingEnabled=false;
 // A real iPhone, seen square-on. Rotation is only in the screen plane:
 // Enlarge the flat sprite by 30%, easing the tilt from 45 to 30 degrees.
 if(homePhoneArt.complete&&homePhoneArt.naturalWidth){
  const p=homePhoneBounds();
  target.save();target.translate(p.x,p.y);target.rotate(p.angle);target.drawImage(homePhoneArt,-p.width/2,-p.height/2,p.width,p.height);target.restore();
 }
 // Source elbow clearance is 30 logical pixels; halve it without clipping.
 if(homeArtwork.complete&&homeArtwork.naturalWidth)target.drawImage(homeArtwork,-15,5,W,H);
 drawHomeTitle(target,clock);target.restore();
}
function drawHomeScreen(){
 homeSceneContext.save();homeSceneContext.scale(homeScene.width/W,homeScene.height/H);
 homeSceneContext.imageSmoothingEnabled=false;drawHomeBackdrop(homeSceneContext);homeSceneContext.restore();
}

function presentHomeIntro(){
 const t=homeIntroTiming(),a=introAge,sx=canvas.width/W,sy=canvas.height/H;
 ctx.save();ctx.scale(sx,sy);ctx.imageSmoothingEnabled=false;
 if(a<t.reveal){
  const exit=Math.max(0,Math.min(1,(a-t.departure)/(t.reveal-t.departure)));
  ctx.fillStyle='#030b14';ctx.fillRect(0,0,W,H);ctx.save();ctx.globalAlpha=1-exit;drawHomeBackdrop(ctx);ctx.restore();
  // Keep the designed title composition through the spoken call. The existing
  // broad screen-slice transition takes it into the transfer, without substituting
  // a default font or a detached emblem during the first animation frame.
  if(exit>0){ctx.fillStyle=`rgba(182,255,232,${Math.sin(exit*Math.PI)*.19})`;ctx.fillRect(0,0,W,H);ctx.fillStyle='#010611';for(let n=0;n<18;n++){const h=H/18,w=exit*W*(.65+Math.sin(n*4.9)*.35);ctx.fillRect(n%2?W-w:0,n*h,w,h-1)}}
 }else{
  const reveal=Math.min(1,(a-t.reveal)/.24);ctx.drawImage(buffer,0,0,W,H);
  if(reveal<1){ctx.fillStyle=`rgba(2,8,16,${1-reveal})`;ctx.fillRect(0,0,W,H)}
  if(a>=t.debug){const opacity=Math.min(1,(a-t.debug)/.09,(t.end-a)/.16);ctx.save();ctx.globalAlpha=Math.max(0,opacity);ctx.fillStyle='#061218d9';ctx.fillRect(0,96,W,42);ctx.textAlign='center';ctx.font='900 28px monospace';ctx.fillStyle='#baffeb';ctx.fillText('DEBUG',W/2,127);ctx.fillRect(184,134,112,1);ctx.restore()}
 }
 ctx.restore();
}
function presentBattleFrame(){
 if(homeIntroActive()){presentHomeIntro();return}
 ctx.imageSmoothingEnabled=false;if(state!=='intro'&&!(state==='paused'&&beforePause==='intro')){ctx.drawImage(buffer,0,0,canvas.width,canvas.height);return}
 const sx=canvas.width/W,sy=canvas.height/H,t=introAge;ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);if(t<.12)return;
 const power=Math.max(0,1-t/.95);ctx.save();ctx.globalAlpha=Math.min(1,(t-.12)/.56);
 for(let y=0;y<H;y+=3){const dx=Math.round((Math.sin(y*.14+t*42)*21+Math.sin(y*.4-t*90)*7)*power);ctx.drawImage(buffer,0,y,W,3,dx*sx,y*sy,W*sx,3*sy)}ctx.restore();
 if(t<.95){ctx.fillStyle='#b9ffe5';for(let n=0;n<30;n++){ctx.globalAlpha=(.04+n%4*.04)*power;ctx.fillRect(((n*73+Math.floor(t*110)*17)%W)*sx,((n*47+Math.floor(t*120)*13)%H)*sy,(3+n%9)*sx,sy)}ctx.globalAlpha=1}
 if(t>=.94&&t<1.96){ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(t-.94)/.12,(1.96-t)/.18));ctx.fillStyle='#061218d9';ctx.fillRect(0,111*sy,canvas.width,46*sy);ctx.textAlign='center';ctx.font='900 '+Math.round(32*sy)+'px monospace';ctx.fillStyle='#90ffe4';ctx.fillText('DEBUG',canvas.width/2,145*sy);ctx.fillStyle='#c6ffee';ctx.fillRect(174*sx,153*sy,132*sx,sy);ctx.restore()}
}
