'use strict';
// This must be the final script: cold connections can yield between script
// downloads. No frame or start action may run against a partially built game.
runtimeReady=true;
syncLoadingGauge();
updateHud();
attemptHomeAutoplay();
requestAnimationFrame(frame);
startWhenReady();
