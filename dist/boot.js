'use strict';
// This must be the final script: cold connections can yield between script
// downloads. No frame or start action may run against a partially built game.
runtimeReady=true;
if(typeof updateOpeningGate==='function')updateOpeningGate();
syncLoadingGauge();
updateHud();
// TOUCH activates the shared output before the prologue or title can play.
requestAnimationFrame(frame);
startWhenReady();
