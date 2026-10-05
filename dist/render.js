'use strict';
// Pixel-space battle renderer. All gameplay uses the fixed 60 Hz simulation.
const whiteSprites={};
function whiteSprite(name){if(whiteSprites[name])return whiteSprites[name];const im=sprites[name];if(!im)return null;const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const t=c.getContext('2d');t.drawImage(im,0,0);t.globalCompositeOperation='source-in';t.fillStyle='#f1fffb';t.fillRect(0,0,c.width,c.height);return whiteSprites[name]=c}
function textPixel(text,x,y,color='#d9f5f7',size=8,align='left'){g.font=`bold ${size}px monospace`;g.textAlign=align;g.fillStyle='#04101e';g.fillText(text,Math.round(x)+1,Math.round(y)+1);g.fillStyle=color;g.fillText(text,Math.round(x),Math.round(y))}
function panel(c,r,fill,edge){const p=pos(c,r);poly([[p.x-36,p.y-12],[p.x+36,p.y-12],[p.x+36,p.y+22],[p.x-36,p.y+22]],fill,edge)}
function drawInsectAttack(p,a,dir){
 g.save();g.translate(Math.round(a.x),Math.round(a.y-16));g.scale(dir,1);
 if(p.kind==='needle')poly([[-10,-2],[9,0],[-10,3],[-6,0]],'#ffe184','#fff3c7');
 else if(p.kind==='acid'){g.fillStyle='#a1ee64';g.fillRect(-4,-5,9,10);g.fillRect(-7,-2,15,5);g.fillStyle='#eaffbd';g.fillRect(-2,-4,4,3);for(let i=0;i<3;i++)g.fillRect(-10-i*4,Math.sin(simTime*12+i)*5,2,2)}
 else if(p.kind==='web'){g.strokeStyle='#eee9ff';for(let i=0;i<4;i++){const a=i*Math.PI/4;g.beginPath();g.moveTo(-Math.cos(a)*9,-Math.sin(a)*9);g.lineTo(Math.cos(a)*9,Math.sin(a)*9);g.stroke()}g.strokeRect(-5,-5,10,10);g.strokeRect(-2,-2,4,4)}
 else if(p.kind==='scythe')poly([[-10,-17],[7,-7],[12,1],[7,9],[-10,17],[0,4],[3,0],[0,-4]],'#9fff8a','#e4ffdb');
 else if(p.kind==='horn')poly([[-22,-10],[-2,-8],[16,0],[-2,8],[-22,10],[-9,0]],'#bf8941','#ffe1a0');
 else for(let i=0;i<9;i++){g.fillStyle=i%2?'#c391ff':'#92f8ef';g.fillRect(Math.round(Math.sin(i*2.4+simTime*5)*13),Math.round(Math.cos(i*1.7+simTime*3)*12),3,2)}g.restore();
}
function ring(x,y,r,color,alpha=1){g.save();g.globalAlpha=alpha;g.strokeStyle=color;g.lineWidth=1;g.beginPath();for(let i=0;i<=8;i++){const a=i*Math.PI/4,xx=Math.round(x+Math.cos(a)*r),yy=Math.round(y+Math.sin(a)*r*.4);if(i===0)g.moveTo(xx,yy);else g.lineTo(xx,yy)}g.stroke();g.restore()}
function draw(){
 g.clearRect(0,0,W,H);if(bg.complete&&bg.naturalWidth)g.drawImage(bg,0,0,W,H);else{g.fillStyle='#102238';g.fillRect(0,0,W,H)}
 g.fillStyle='#0310204d';g.fillRect(0,0,W,H);const fog=g.createLinearGradient(0,100,0,H);fog.addColorStop(0,'#05102100');fog.addColorStop(1,'#040d1bc0');g.fillStyle=fog;g.fillRect(0,100,W,H-100);
 for(let n=0;n<28;n++){const x=(n*47+time*(n%2?3:-2)+1000)%480,y=(n*29+time*4)%260;g.fillStyle=n%3?'#57bddc40':'#c2ffff70';g.fillRect(x|0,y|0,1,n%4===0?4:1)}
 g.save();if(screenShake>0)g.translate(Math.round(Math.sin(time*159)*screenShake*.55),Math.round(Math.cos(time*117)*screenShake*.2));
 // Arena foundation and recessed circuitry.
 poly([[11,132],[469,132],[469,249],[11,249]],'#030d1ed9','#213d55');
 const captureFront=Math.max(-1,...Array.from(capturedPanels.keys(),id=>id%6));
 for(let r=0;r<3;r++)for(let c=0;c<6;c++){
  const p=pos(c,r),x=p.x-36,y=p.y-12,friendly=panelOwners[cellId(c,r)]==='zero';
  if(isHole(c,r)){
   const remaining=panelHoles.get(cellId(c,r)),blink=remaining<=3&&Math.floor(simTime*7)%2===0;
   panel(c,r,'#010511',blink?'#ffe6a0':'#405267');
   poly([[x+1,y+1],[x+71,y+1],[x+66,y+8],[x+6,y+8]],'#132238');
   poly([[x+71,y+1],[x+71,y+33],[x+65,y+27],[x+65,y+7]],'#080c1c');
   if(blink){panel(c,r,friendly?'#6ceddc28':'#ff8ea528','#ffd597');textPixel(remaining.toFixed(1),p.x,p.y+11,'#ffdca5',8,'center')}
   continue;
  }
  poly([[x,y+34],[x+72,y+34],[x+72,y+38],[x,y+38]],friendly?'#14384a':'#3e243e','#08121f');
  panel(c,r,friendly?((r+c)%2?'#20526a':'#255d73'):((r+c)%2?'#56344e':'#624055'),friendly?'#43899a':'#9b5b72');
  const capture=capturedPanels.get(cellId(c,r));
  if(capture!==undefined&&c===captureFront&&capture<=5&&Math.floor(simTime*5)%2===0)panel(c,r,'#f5a5a534','#ffbabb');
  g.fillStyle=friendly?'#78c7cc65':'#e596aa50';g.fillRect(x+2,y+2,68,1);
  g.fillStyle=friendly?'#102e46':'#382639';g.fillRect(x+28,y+16,16,2);g.fillRect(x+35,y+12,2,10);
  g.fillStyle=friendly?'#63d4db':'#ce829c';g.fillRect(x+8,y+29,4,1);g.fillRect(x+60,y+29,4,1);
  if(c===col&&r===row){panel(c,r,layer?'#6bedef12':'#6bedef26',layer?'#548d9f':'#a5fff2');g.fillStyle='#c5fff1';g.fillRect(x+24,y+32,24,2)}
  if(state==='battle'&&bugs.some(b=>b.hp>0&&b.type!=='grenade'&&b.tell>0&&b.targetLayer===0&&b.r===r)&&friendly){panel(c,r,Math.floor(simTime*10)%2?'#ed8c474a':'#ed8c4720','#ffc375');for(let k=0;k<3;k++){g.fillStyle='#ffbc7755';g.fillRect(x+8+k*12,y+7,6,2)}}
 }
 if(typeof drawBossTerrain==='function')drawBossTerrain();
 // Exact ground projections keep airborne units readable without air tiles.
 const all=[...(!zeroBound()?[{c:col,r:row,layer,zero:true}]:[]),...bugs.filter(b=>b.hp>0)];
 for(const a of all){
  const p=pos(a.c+((a.widthTiles||1)-1)/2,a.r),color=a.layer?'#80efff':'#ffd096';
  g.fillStyle='#020a16b8';g.beginPath();g.ellipse(p.x,p.y+10,a.layer?9:16,4,0,0,7);g.fill();
  if(a.layer){
   const air=pos(a.c+((a.widthTiles||1)-1)/2,a.r,1);ring(p.x,p.y+10,11,color,.65);ring(air.x,air.y+10,21,color,.85);
   g.fillStyle='#a6f3ff88';for(let yy=p.y;yy>air.y+16;yy-=6)g.fillRect(Math.round(p.x),Math.round(yy),1,3);
   g.strokeStyle=color;g.beginPath();g.moveTo(air.x-4,air.y+16);g.lineTo(air.x,air.y+12);g.lineTo(air.x+4,air.y+16);g.stroke();
  }else{ring(p.x,p.y+11,19,a.zero?'#8ffff0':color,.9)}
 }
 for(const b of bugs)if(b.hp>0&&b.type!=='grenade'&&b.tell>0&&b.targetLayer===1){for(let c=0;c<6;c++){if(panelOwners[cellId(c,b.r)]!=='zero')continue;const p=pos(c,b.r,1);g.globalAlpha=.4+Math.sin(simTime*20)*.2;g.fillStyle='#ffc478';g.fillRect(p.x-18,p.y+8,36,2);g.fillRect(p.x-18,p.y+4,2,4);g.fillRect(p.x+16,p.y+4,2,4);g.globalAlpha=1}}
 if(showRange&&state==='battle'&&equipped.damage){const c=equipped,l=c.target==='up'?1:c.target==='down'?0:layer;for(let r=0;r<3;r++)for(let x=col+1;x<6;x++)if((c.wide||r===row)&&(c.projectile||x<=col+c.range)){const p=pos(x,r,l);ring(p.x,p.y+9,18,'#f9db8b',.8)}}
 drawCommandReceipt();
 const actors=bugs.filter(b=>b.hp>0).map(b=>({bug:b,r:b.r,l:b.layer}));actors.push({zero:true,r:row,l:layer});actors.sort((a,b)=>(a.r*38-a.l*82)-(b.r*38-b.l*82));
 for(const a of actors){if(a.zero){
  drawZeroAnimated();
 }else{
  const b=a.bug,p=bugPosition(b);
  const bob=b.type==='spider'?Math.round(Math.sin(simTime*5)*.6):Math.round(Math.sin(simTime*7+b.c)*2),recoil=b.hit>0?Math.round(b.hit*24):b.tell>0?-Math.round(Math.sin(simTime*30)):0,h=bugTypes[b.type].size;
  drawBugAnimated(b,p.x+recoil,p.y+12+bob,h);
  if(!['target','lock'].includes(state)){
   const yy=Math.min(H-7,p.y+28),label=String(Math.ceil(b.hp));
   g.save();g.font='bold 14px monospace';g.textAlign='center';g.lineWidth=3;g.strokeStyle='#03101b';g.strokeText(label,Math.round(p.x),Math.round(yy));g.fillStyle='#fff8d4';g.fillText(label,Math.round(p.x),Math.round(yy));g.restore();
  }
  if(b.stun>0){textPixel('STUN',p.x,p.y-h,'#c9b1ff',8,'center')}else if(b.tell>0&&b.type!=='grenade'){g.fillStyle='#e8a65e';g.fillRect(p.x-12,p.y-h-7,24,10);textPixel('!',p.x,p.y-h+1,'#1b1721',8,'center')}
 }}
 if(typeof drawBossBinding==='function')drawBossBinding();
 // Projectile trails are pixel rectangles; cross-layer paths begin at the muzzle.
 for(const p of bullets){const origin=p.originC??p.c,travel=p.enemy?Math.min(1,Math.abs(p.c-origin)/Math.max(.5,origin-2)):Math.min(1,Math.abs(p.c-origin)/Math.max(.5,3-origin)),l=p.sourceLayer===undefined?p.layer:p.sourceLayer+(p.layer-p.sourceLayer)*travel,a=pos(p.c,p.r,l),dir=p.dir??(p.enemy?-1:1),color=p.enemy?'#ff8d75':p.charged?'#75ffea':'#ffd881';for(let n=4;n>=1;n--){g.globalAlpha=(5-n)*.11;g.fillStyle=color;g.fillRect(Math.round(a.x-dir*n*5)-3,Math.round(a.y-15),p.charged?10:5,p.charged?5:2)}g.globalAlpha=1;
  if(p.enemy&&p.kind){drawInsectAttack(p,a,dir)}else if(p.pierce){poly([[a.x-7,a.y-29],[a.x+5,a.y-20],[a.x+8,a.y-4],[a.x-2,a.y+2],[a.x+1,a.y-15]],color,'#eafff6')}else{g.fillStyle=color;g.fillRect(Math.round(a.x)-8,Math.round(a.y)-17,p.charged?17:10,p.charged?8:4);g.fillStyle='#fff9e8';g.fillRect(Math.round(a.x)-4,Math.round(a.y)-15,p.charged?11:6,2)}
 }
 for(const e of effects){const a=e.life/e.max,k=1-a;g.save();
  if(e.kind==='slash'){for(let r=0;r<3;r++)if(e.wide||r===e.r)for(let c=1;c<=e.range;c++){const p=pos(e.c+c*(e.dir||1),r,e.layer);g.globalAlpha=a;poly([[p.x-30+k*8,p.y+10],[p.x+24,p.y-56],[p.x+17,p.y-14],[p.x+34,p.y-29],[p.x-3,p.y+18]],'#65f5cd');poly([[p.x-24,p.y+9],[p.x+23,p.y-50],[p.x+6,p.y-5]],'#f5ffe6');}}
  else if(e.kind==='bossBlast'){
   g.save();g.globalAlpha=a;
   for(let i=0;i<9;i++){const angle=i*2.4,r=9+k*25,x=e.x+Math.cos(angle)*r,y=e.y-20+Math.sin(angle)*r-k*20,size=(1-k)*22+7;
    g.fillStyle=k>.55?'#383340':i%2?'#ff6a26':'#ffbd48';g.fillRect(Math.round(x-size/2),Math.round(y-size/2),Math.round(size),Math.round(size));
    if(k<.5){g.fillStyle='#fff3b1';g.fillRect(Math.round(x-size/4),Math.round(y-size/4),Math.round(size/2),Math.round(size/2))}
   }
   ring(e.x,e.y-14,8+k*48,'#ffb45c',a);
   for(let i=0;i<18;i++){const t=i*2.4,r=k*55;g.fillStyle=i%2?'#fff1bd':'#ff752c';g.fillRect(Math.round(e.x+Math.cos(t)*r),Math.round(e.y-20+Math.sin(t)*r+k*k*25),3,3)}g.restore();
  }
  else if(e.kind==='spark'||e.kind==='explode'){const big=e.kind==='explode',count=big?24:10,radius=k*(big?52:26);if(a>.65){g.fillStyle='#fffbe0';poly([[e.x-6,e.y-29],[e.x,e.y-43],[e.x+6,e.y-28],[e.x+19,e.y-23],[e.x+6,e.y-18],[e.x,e.y-4],[e.x-5,e.y-18],[e.x-18,e.y-23]],'#fffbe0')}for(let i=0;i<count;i++){const ang=i*2.4,xx=e.x+Math.cos(ang)*radius,yy=e.y-22+Math.sin(ang)*radius+(big?k*k*22:0);g.globalAlpha=a;g.fillStyle=i%3===0?'#ffda89':i%2?'#77f6db':'#effff0';g.fillRect(Math.round(xx),Math.round(yy),big?3+i%3:2,2+i%3)}if(big){ring(e.x,e.y-18,10+k*42,'#85ffdf',a);}}
  else if(e.kind==='gravityImpact'){ring(e.x,e.y+8,12+k*31,'#d0b2ff',a);ring(e.x,e.y+8,8+k*24,'#ffda8d',a);for(let n=0;n<8;n++){g.globalAlpha=a;g.fillStyle=n%2?'#fff4c2':'#b5a1e5';g.fillRect(Math.round(e.x+Math.cos(n*.785)*k*30),Math.round(e.y-Math.sin(k*Math.PI)*18+Math.sin(n*.785)*8),3,3)}}
  else if(e.kind==='muzzle'){g.globalAlpha=a;const z=e.charged?15:9;poly([[e.x-z,e.y],[e.x+z,e.y-z],[e.x+z/2,e.y],[e.x+z,e.y+z]],'#fff5bb');}
  else if(e.kind==='guard'){g.globalAlpha=a;ring(e.x+17,e.y-23,14+k*20,'#bbfff0');textPixel('GUARD',e.x,e.y-57,'#bcffe7',9,'center')}
  else if(e.kind==='cast'){ring(e.x,e.y+8,10+k*24,e.color,a);for(let n=0;n<5;n++){g.fillStyle=e.color;g.globalAlpha=a;g.fillRect(Math.round(e.x-18+n*8),Math.round(e.y-k*50+n%2*8),1,8)}}
  else if(e.kind==='heal'){g.fillStyle='#a3ffbb';g.globalAlpha=a;for(let i=0;i<3;i++){const x=e.x-15+i*14,y=e.y-20-k*40+i%2*10;g.fillRect(x-1,y-4,3,10);g.fillRect(x-4,y-1,9,3)}}
  g.restore();
 }
 drawFieldEffects();
 for(const f of floaters){g.globalAlpha=Math.min(1,f.life*4);textPixel(f.text,f.x,f.y-42-(1-f.life)*18,f.color,12,'center');g.globalAlpha=1}
 g.restore();if(flash>0){g.fillStyle=`rgba(177,255,234,${flash*.7})`;g.fillRect(0,0,W,H)}if(damageFlash>0){g.strokeStyle=`rgba(255,105,101,${damageFlash*2})`;g.lineWidth=5;g.strokeRect(2,2,W-4,H-4)}
 // Restrained in-world labels, separate from the interactive HUD.

 if(panelHoles.size)textPixel('HOLE '+Math.max(...panelHoles.values()).toFixed(1)+'s',13,H-10,'#ffdf9e',9);
 if(nextAttackPower>1)textPixel('NEXT ATTACK ×'+nextAttackPower,467,H-10,'#ffe091',9,'right');
 if(layer&&flight<3&&!flightPermanent&&state==='battle')textPixel('WING '+flight.toFixed(1)+'s',240,35,Math.floor(simTime*5)%2?'#ffc186':'#ff785f',10,'center');
 drawCommandOverlay();
 presentBattleFrame();
}
