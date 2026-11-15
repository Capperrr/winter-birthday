const byId=id=>document.getElementById(id);
try {const {startGame}=await import('./game.mjs');await startGame();}
catch(error){console.error('Shenzhen sample initialization failed',error);byId('start-screen').hidden=true;byId('fatal').hidden=false;byId('fatal-message').textContent='三维资源或 WebGL 2 初始化失败。样章没有启动，请重新载入，或换支持 WebGL 2 的浏览器。';}
byId('retry-button').addEventListener('click',()=>location.reload());
