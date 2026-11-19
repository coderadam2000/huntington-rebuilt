const SPORTS = [
  { name:'Basketball', action:'Shoot', tip:'Aim toward the basket and adjust the power to send the ball through the rim.', base:'#a95e36', type:'arc' },
  { name:'Mini Golf', action:'Putt', tip:'Use lower power. Roll around the windmill into the cup.', base:'#327755', type:'putt' },
  { name:'Golf', action:'Drive', tip:'Drive toward the green. Balance aim and power to land next to the flag.', base:'#376947', type:'drive' },
  { name:'Tennis', action:'Return', tip:'Return at the strike line, then aim toward either open corner.', base:'#254f80', type:'return' },
  { name:'Baseball', action:'Swing', tip:'Swing when the pitch reaches the plate. Time it cleanly for extra bases.', base:'#326953', type:'bat' },
  { name:'Hockey', action:'Shoot puck', tip:'Aim around the moving keeper and put enough power on the puck.', base:'#3e738a', type:'hockey' },
  { name:'Soccer', action:'Take penalty', tip:'Place a penalty left or right of the goalkeeper. Extra power narrows your shot window.', base:'#287053', type:'soccer' },
  { name:'American Football', action:'Throw', tip:'Lead the receiver across the field. The ball reaches their lane after a short flight.', base:'#487048', type:'football' },
  { name:'Bowling', action:'Roll', tip:'Aim down the lane. A controlled roll into the pocket clears the most pins.', base:'#805536', type:'bowl' }
];
const element = id => document.getElementById(id);
const ctx = element('arena').getContext('2d');
const aim = () => Number(element('aim').value) / 100;
const power = () => Number(element('power').value) / 100;
const readScores = () => { try { return JSON.parse(localStorage.getItem('hgmini_sports_mix') || '{}') || {}; } catch (_) { return {}; } };
let mode = SPORTS[0], startTime, points, attempts, ball, message;
function restart() {
  startTime = performance.now(); points = attempts = 0; ball = null; message = 'Round of 10 attempts.';
  element('sport').textContent = mode.name; element('instructions').textContent = mode.tip; element('play').textContent = mode.action;
  element('aim').parentElement.hidden = mode.type === 'bat';
  element('power').parentElement.hidden = ['bat','return'].includes(mode.type);
  [...element('sports').children].forEach((button, i) => button.setAttribute('aria-pressed', String(SPORTS[i] === mode)));
  paintScore();
}
function paintScore() {
  element('score').textContent = points + ' points · ' + attempts + '/10 · Best ' + (readScores()[mode.name] || 0);
  element('feedback').textContent = message;
  element('play').disabled = attempts >= 10 || !!ball;
}
function conditions(now) {
  const t = (now - startTime) / 1000;
  return { keeper: Math.sin(t * 2.1) * .83, runner: Math.sin(t * 1.3) * .85, future: Math.sin((t + .56) * 1.3) * .85, pitch: (t / 1.35) % 1, wind: Math.sin(t * 1.6) * .22 };
}
function attempt() {
  if (ball || attempts >= 10) return;
  const t = performance.now(), { keeper, future, pitch, wind } = conditions(t);
  const a = aim(), p = power(), accuracy = (error, tolerance) => Math.abs(error) <= tolerance;
  let value = 0, text = 'Missed.', targetX = 360 + a * 265, targetY = 75, releaseX = 360, releaseY = 279, lift = 30;
  switch (mode.type) {
    case 'arc': targetY = 80 + (0.63 - p) * 340; lift = 120; value = accuracy(a, .15) && accuracy(p - .63, .10) ? 2 : 0; text = value ? 'Basket!' : 'Off the rim.'; break;
    case 'putt': targetY = 280 - p * 520; value = accuracy(a - .33, .15) && accuracy(p - .4, .10) && !accuracy(a - wind, .14) ? 3 : 0; text = value ? 'In the cup!' : 'Putt missed the cup.'; break;
    case 'drive': targetY = 280 - p * 260; targetX += wind * 80; lift = 105; value = accuracy(a + wind * .3 + .36, .25) && accuracy(p - .73, .12) ? 3 : 0; text = value ? 'On the green!' : 'Off the green.'; break;
    case 'return': value = accuracy(pitch - .78, .13) ? Math.abs(a) >= .5 ? 2 : 1 : 0; text = value ? 'Return in!' : 'Missed return.'; break;
    case 'bat': value = accuracy(pitch - .84, .035) ? 4 : accuracy(pitch - .84, .12) ? 1 : 0; lift = 125; text = value === 4 ? 'Home run!' : value ? 'Base hit!' : 'Strike.'; break;
    case 'hockey': value = Math.abs(a) < .85 && !accuracy(a - keeper, .24) && p > .35 ? 1 : 0; text = value ? 'Puck in the net!' : 'Saved or wide.'; break;
    case 'soccer': value = Math.abs(a) < .85 && !accuracy(a - keeper, .29) && accuracy(p - .63, .27) ? 1 : 0; text = value ? 'Goal!' : 'Saved or wide.'; break;
    case 'football': value = accuracy(a - future, .2) && accuracy(p - .67, .18) ? 3 : 0; lift = 94; text = value ? 'Pass complete!' : 'Incomplete.'; break;
    case 'bowl': value = Math.max(0, Math.round(10 - Math.abs(a - .11) * 14 - Math.abs(p - .65) * 12)); text = value === 10 ? 'Strike!' : value + ' pins.'; break;
  }
  ball = { t, duration: mode.type === 'football' ? 560 : 550, targetX, targetY, releaseX, releaseY, value, text, lift };
  paintScore();
}
function circle(x, y, r, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
function frame(now) {
  requestAnimationFrame(frame);
  ctx.fillStyle = mode.base; ctx.fillRect(0,0,720,340);
  ctx.strokeStyle='#e8f8ef99'; ctx.lineWidth=2; ctx.strokeRect(24,22,672,296);
  const state = conditions(now);
  if (['hockey','soccer'].includes(mode.type)) {
    ctx.strokeRect(122,44,476,50); ctx.fillStyle='#223549'; ctx.fillRect(336 + state.keeper*265,64,48,22);
  } else if (mode.type === 'arc') {
    ctx.strokeRect(327,44,66,28); ctx.strokeStyle='#ffd287'; ctx.strokeRect(339,74,42,9);
  } else if (mode.type === 'football') {
    for (let x=125;x<690;x+=85) { ctx.beginPath();ctx.moveTo(x,22);ctx.lineTo(x,318);ctx.stroke(); }
    circle(360 + state.runner*265,72,12,'#ffe492');
  } else if (['putt','drive'].includes(mode.type)) {
    const hole = mode.type === 'putt' ? [447,72] : [265,90];
    circle(hole[0],hole[1],30,'#7dbd67'); circle(hole[0],hole[1],7,'#152d29');
    if (mode.type === 'putt') circle(360+state.wind*265,157,16,'#986159');
  } else if (mode.type === 'bowl') {
    ctx.strokeRect(244,37,232,275);
    for(let row=0;row<4;row++) for(let i=0;i<=row;i++) circle(360+(i-row/2)*18,91-row*16,6,'#f9e2cc');
  } else {
    ctx.strokeRect(111,217,498,17);
    if (!ball) circle(360,53 + state.pitch*218,8,'#fff3ba');
  }
  if (!ball) {
    if (!['bat','return'].includes(mode.type)) circle(360,279,9,'#fff3ba');
    ctx.strokeStyle='#ffffffb5'; ctx.setLineDash([5,7]); ctx.beginPath();
    ctx.moveTo(360,274);ctx.lineTo(360+aim()*265,85);ctx.stroke();ctx.setLineDash([]);
    return;
  }
  const progress = Math.min(1,(now-ball.t)/ball.duration);
  circle(ball.releaseX+(ball.targetX-ball.releaseX)*progress,ball.releaseY+(ball.targetY-ball.releaseY)*progress-Math.sin(Math.PI*progress)*ball.lift,8,'#fff3ba');
  if (progress < 1) return;
  points += ball.value; attempts++; message=ball.text; ball=null;
  if (attempts === 10) {
    const scores=readScores();
    scores[mode.name]=Math.max(scores[mode.name]||0,points);
    try { localStorage.setItem('hgmini_sports_mix',JSON.stringify(scores)); } catch (_) {}
    message += ' Round complete.';
  }
  paintScore();
}
SPORTS.forEach(sport => {
  const button=document.createElement('button'); button.textContent=sport.name;
  button.onclick=()=>{ mode=sport; restart(); }; element('sports').appendChild(button);
});
element('play').onclick=attempt;
element('reset').onclick=restart;
window.addEventListener('keydown', event=>{
  if (event.code==='Space' && event.target===document.body && !event.repeat) { event.preventDefault(); attempt(); }
});
restart();
requestAnimationFrame(frame);
window.__sportsMix = { sports: SPORTS, get score() { return points; }, get attempts() { return attempts; } };
