'use strict';
let introAge=0,introCommands=[],introDebug=false,scoreStarted=false;
function beginBattleIntro(){introAge=0;introCommands=[];introDebug=false;scoreStarted=false;state='intro';primeBattleScore();msg('');commandFeedback('接続中')}
function tickBattleIntro(dt){introAge+=dt;if(introAge>=.68&&!scoreStarted){scoreStarted=true;startBattleScore()}if(introAge>=.94&&!introDebug){introDebug=true;sfx('debug')}if(introAge>=2.15){beginTarget();for(const command of introCommands.splice(0))runCommand(command)}}
function presentBattleFrame(){
 ctx.imageSmoothingEnabled=false;if(state!=='intro'&&!(state==='paused'&&beforePause==='intro')){ctx.drawImage(buffer,0,0,canvas.width,canvas.height);return}
 const sx=canvas.width/W,sy=canvas.height/H,t=introAge;ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);if(t<.12)return;
 const power=Math.max(0,1-t/.95);ctx.save();ctx.globalAlpha=Math.min(1,(t-.12)/.56);
 for(let y=0;y<H;y+=3){const dx=Math.round((Math.sin(y*.14+t*42)*21+Math.sin(y*.4-t*90)*7)*power);ctx.drawImage(buffer,0,y,W,3,dx*sx,y*sy,W*sx,3*sy)}ctx.restore();
 if(t<.95){ctx.fillStyle='#b9ffe5';for(let n=0;n<30;n++){ctx.globalAlpha=(.04+n%4*.04)*power;ctx.fillRect(((n*73+Math.floor(t*110)*17)%W)*sx,((n*47+Math.floor(t*120)*13)%H)*sy,(3+n%9)*sx,sy)}ctx.globalAlpha=1}
 if(t>=.94&&t<1.96){ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,(t-.94)/.12,(1.96-t)/.18));ctx.fillStyle='#061218d9';ctx.fillRect(0,111*sy,canvas.width,46*sy);ctx.textAlign='center';ctx.font='900 '+Math.round(32*sy)+'px monospace';ctx.fillStyle='#90ffe4';ctx.fillText('DEBUG',canvas.width/2,145*sy);ctx.fillStyle='#c6ffee';ctx.fillRect(174*sx,153*sy,132*sx,sy);ctx.restore()}
}
