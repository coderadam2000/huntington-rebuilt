import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const CUP = ['Coast Cup', 'Frontier Cup', 'Summit Cup'];
const TRACKS = [
    ['Seabreeze', .26, 1, 0x57c9b4], ['Harbor Loop', .21, 2, 0x559cb8], ['Boardwalk', .19, 3, 0xf5af78], ['Coral Drift', .34, 1, 0x8ae2d4],
    ['Red Canyon', .16, 2, 0xd78261], ['Dust Basin', .39, 1, 0xccad77], ['Rail Junction', .21, 4, 0xa7816c], ['Starfield Mesa', .29, 3, 0x876ac1],
    ['Pine Ridge', .20, 3, 0x789c88], ['Icecap Run', .37, 2, 0xb3dcf3], ['Aurora Peak', .27, 4, 0x81a9e4], ['Cloudline', .13, 5, 0xac83d1]
];
const RIDES = [
    ['Circuit Kart', 48, 33, 1.12], ['Turbo Kart', 55, 27, .86], ['Trail Kart', 46, 34, 1.26], ['Glide Kart', 51, 31, 1],
    ['Sprint Bike', 57, 33, .83], ['Street Bike', 52, 36, 1.06], ['Rally Bike', 49, 39, 1.13], ['Apex Bike', 55, 30, .95]
];
const COLORS = [0x68dded, 0xffa160, 0xac8cff, 0x6ce3a6, 0xef7bab, 0xfbd769];
const MODES = ['Sprint', 'Grand Prix', 'Time Trial'];
const ITEMS = ['Boost', 'Turbo', 'Shield', 'Oil', 'Pulse', 'Repair', 'Draft', 'Double boost'];
const el = id => document.getElementById(id);
const input = { gas:false, brake:false, left:false, right:false };
const clips = (value, max) => Math.max(-max, Math.min(value, max));
const vec = () => new THREE.Vector3();
let renderer, camera, scene, road, game, localRide = 0, localColor = 0, controlsAt = 0, frameAt = 0, sentAt = 0, random;
const meshes = new Map();
const renderPosition = new THREE.Vector3();
const light = () => new THREE.HemisphereLight(0xf3f7ff, 0x505788, 2.4);
function option(id, limit) { return Math.max(0, Math.min(limit - 1, Number(el(id).value) | 0)); }
function path(track) {
    const [, wave, folds] = TRACKS[track];
    return new THREE.CatmullRomCurve3(Array.from({length:16}, (_, i) => {
        const angle = i * Math.PI / 8;
        const r = 46 * (1 + wave * Math.cos(folds * angle + track / 5));
        return new THREE.Vector3(Math.sin(angle) * r * (1 + track % 3 * .08), 2.5 * Math.sin(2 * angle + track) + 3, Math.cos(angle) * r);
    }), true);
}
function trackPoint(distance, offset, output) {
    const t = ((distance / game.length) % 1 + 1) % 1;
    road.getPointAt(t, output);
    const forward = road.getTangentAt(t);
    output.x += forward.z * offset; output.z -= forward.x * offset;
    return forward;
}
function point(distance, offset) {
    const result = vec();
    trackPoint(distance, offset, result);
    return result;
}
function makeRoad() {
    scene = new THREE.Scene();
    const terrain = new THREE.Color(TRACKS[game.track][3]);
    scene.background = terrain.clone().lerp(new THREE.Color(0x17253e), .48);
    scene.fog = new THREE.FogExp2(scene.background, .006);
    scene.add(light());
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(650,650), new THREE.MeshLambertMaterial({ color:terrain, side:THREE.DoubleSide }));
    ground.rotation.x = -Math.PI/2; ground.position.y = -1; scene.add(ground);
    const v = [], color = [];
    const palette = [0x566879,0x668095].map(value => new THREE.Color(value));
    for (let i=0;i<216;i++) {
        const left = point(i * game.length / 216, -6);
        const right = point(i * game.length / 216, 6);
        const nextLeft = point((i+1) * game.length / 216, -6);
        const nextRight = point((i+1) * game.length / 216, 6);
        for (const p of [left,right,nextLeft,right,nextRight,nextLeft]) {
            v.push(p.x,p.y,p.z);
            const c = palette[i%2]; color.push(c.r,c.g,c.b);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v,3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(color,3));
    geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true, side:THREE.DoubleSide})));
    const start = new THREE.Mesh(new THREE.BoxGeometry(12,.07,.8), new THREE.MeshBasicMaterial({color:0xfef4c7}));
    const tangent = trackPoint(0,0,start.position); start.rotation.y = Math.atan2(tangent.x,tangent.z); start.position.y += .06; scene.add(start);
    for (let i=0;i<12;i++) {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(.8,.8,.8),new THREE.MeshBasicMaterial({color:i%2 ? 0x77ffea : 0xffdc89}));
        trackPoint(game.length*(i+.5)/12,(i%2 ? -1 : 1)*2.5,marker.position);
        marker.position.y += .65; scene.add(marker);
    }
}
function makeCar(driver) {
    const bike = driver.ride >= 4, width = bike ? .75 : 1.7;
    const model = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(width,.5,2.05),new THREE.MeshLambertMaterial({color:COLORS[driver.color]}));
    body.position.y=.52; model.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(width*.6,.47,.85),new THREE.MeshLambertMaterial({color:0xe2effe}));
    cabin.position.set(0,.87,-.11); model.add(cabin);
    for (const z of [-.68,.68]) for (const x of bike ? [0] : [-.69,.69]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,.28,10),new THREE.MeshLambertMaterial({color:0x263343}));
        wheel.rotation.z=Math.PI/2; wheel.position.set(x,.31,z); model.add(wheel);
    }
    scene.add(model); meshes.set(driver.id,{ model, key:driver.ride + ':' + driver.color });
}
function clearScene() {
    if (!scene) return;
    scene.traverse(node => { if (node.geometry) node.geometry.dispose(); if (node.material) node.material.dispose(); });
    meshes.clear(); scene=null;
}
function begin(config) {
    clearScene();
    road=path(config.track);
    game={...config,length:road.getLength(),clock:0,done:false};
    const viewport=el('viewport');
    if (!renderer) {
        try { renderer=new THREE.WebGLRenderer({antialias:true}); }
        catch (_) { MG.leave(); el('race').hidden=true; mgSay('Zoom needs WebGL on this device.',true); game=null; return; }
        renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
        viewport.appendChild(renderer.domElement);
        camera=new THREE.PerspectiveCamera(66,1,.12,340);
    }
    el('race').hidden=false; el('track-name').textContent=TRACKS[game.track][0] + ' · ' + MODES[game.mode];
    resize(); makeRoad();
}
function resize() {
    if (!renderer || !game) return;
    const v=el('viewport'), w=v.clientWidth, h=v.clientHeight;
    if (w && h) { renderer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix(); }
}
function useItem(driver) {
    const item=driver.item, pos=driver.dist;
    if (item==null) return;
    driver.item=null;
    if (item===2) driver.shield=6;
    else if (item===3 || item===4) {
        for (const other of game.drivers) if (other!==driver && !other.shield && Math.abs(other.dist-pos)<(item===3 ? 24 : 35)) {
            other.slow=2; other.speed*=.65;
        }
    } else if (item===5) { driver.slow=0; driver.shield=2; }
    else driver.boost=[2,3.7,0,0,0,0,2.6,5][item];
}
function drive(dt) {
    game.clock+=dt;
    for (const d of game.drivers) {
        if (d.finish!==null) continue;
        const spacing = game.length / 12;
        const target = d.gate % 2 ? -2.5 : 2.5;
        const ride = RIDES[d.ride];
        const did = d.bot ? { gas:true, brake:false, left:d.lane > target + .35, right:d.lane < target - .35 } : d.input;
        d.slow=Math.max(0,d.slow-dt); d.boost=Math.max(0,d.boost-dt); d.shield=Math.max(0,d.shield-dt);
        d.lane=clips(d.lane+(Number(did.right)-Number(did.left))*6.6*ride[3]*dt,7.3);
        const off=Math.abs(d.lane)>5.25, max=ride[1]*(off ? .58 : d.slow ? .66 : d.boost ? 1.34 : 1);
        d.speed=Math.max(0, Math.min(max,d.speed+(did.brake ? -54 : did.gas ? ride[2] : -13)*dt));
        d.dist+=d.speed*dt;
        const crossed = Math.floor(d.dist / spacing + .5);
        if (crossed>d.gate) {
            d.gate=crossed;
            if (game.mode!==2 && d.item==null && Math.abs(d.lane - target)<=2) d.item=Math.floor(random()*ITEMS.length);
            if (d.bot && d.item!=null) useItem(d);
        }
        if (d.dist >= game.length * game.laps) d.finish=game.clock;
    }
    if (game.drivers.every(d=>d.finish!==null) || game.clock>=180) {
        game.done=true;
        const scores=game.drivers.slice().sort((a,b)=>(a.finish??Infinity)-(b.finish??Infinity)||b.dist-a.dist);
        MG.end('<h2>Race results</h2><ol>'+scores.map(d=>'<li>'+mgEsc(d.name)+' · '+(d.finish===null ? 'DNF' : d.finish.toFixed(2)+'s')+'</li>').join('')+'</ol>');
    }
}
function draw(now) {
    requestAnimationFrame(draw);
    const dt=Math.min(.06,(now-(frameAt||now))/1000); frameAt=now;
    if (!game || !MG.started || game.done) return;
    const me=game.drivers.find(d=>d.id===MG.me);
    if (now-controlsAt>60) { controlsAt=now; MG.toHost({kind:'drive',input}); }
    if (MG.isHost()) {
        drive(dt);
        if (!game) return;
        if (now-sentAt>75) { sentAt=now; MG.toAll({kind:'tick',drivers:game.drivers,clock:game.clock}); }
    }
    for (const d of game.drivers) {
        const current=meshes.get(d.id);
        if (!current || current.key!==d.ride+':'+d.color) {
            if (current) { scene.remove(current.model); current.model.traverse(o=>{ if(o.geometry)o.geometry.dispose(); if(o.material)o.material.dispose(); }); }
            makeCar(d);
        }
        const car=meshes.get(d.id).model, forward=trackPoint(d.dist,d.lane,car.position);
        car.rotation.y=Math.atan2(forward.x,forward.z);
    }
    if (me) {
        const forward=trackPoint(me.dist,me.lane,renderPosition);
        const target=renderPosition.clone().addScaledVector(forward,7);
        camera.position.lerp(renderPosition.clone().addScaledVector(forward,-13).add(new THREE.Vector3(0,7,0)),.19);
        camera.lookAt(target);
        const lap=Math.min(game.laps,Math.floor(me.dist/game.length)+1);
        el('race-status').textContent='Lap '+lap+'/'+game.laps+' · '+Math.round(me.speed*3.6)+' km/h · '+game.clock.toFixed(1)+'s';
        el('use').textContent=ITEMS[me.item]||'Item';
        el('use').disabled=me.item==null;
    }
    renderer.render(scene,camera);
}
const bindings={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'gas',KeyW:'gas',ArrowDown:'brake',KeyS:'brake'};
for(const type of ['keydown','keyup']) window.addEventListener(type,e=>{
    if(!game) return;
    if(bindings[e.code]) { e.preventDefault();input[bindings[e.code]]=type==='keydown'; }
    if(type==='keydown'&&e.code==='Space'&&!e.repeat) { e.preventDefault();MG.toHost({kind:'item'}); }
});
window.addEventListener('blur',()=>Object.keys(input).forEach(k=>input[k]=false));
document.querySelectorAll('[data-drive]').forEach(button=>{
    const key=button.dataset.drive;
    button.onpointerdown=e=>{ button.setPointerCapture(e.pointerId);input[key]=true; };
    button.onpointerup=button.onpointercancel=()=>input[key]=false;
});
el('use').onclick=()=>MG.toHost({kind:'item'});
addEventListener('resize',resize);
el('race-leave').onclick=()=>MG.leave();
MG.init({
    id:'Minigames/Zoom',title:'Zoom',max:6,min:2,bots:5,defBots:3,color:'#82c7ff',
    sub:'Race your friends or take on the bots.',
    howto:'WASD or arrow keys to drive. Space uses an item.',
    onStart(roster,seed) {
        localRide=option('zoom-ride',RIDES.length); localColor=option('zoom-color',COLORS.length);
        if(!MG.isHost()) { MG.toHost({kind:'ride',ride:localRide,color:localColor}); return; }
        const track=option('zoom-track',TRACKS.length),mode=option('zoom-mode',MODES.length);
        random=mgRng(seed);
        const drivers=roster.filter(d=>mode!==2||!d.bot).map((d,i)=>({...d,ride:d.id===MG.me?localRide:i%RIDES.length,color:d.id===MG.me?localColor:i%COLORS.length,
            lane:(i%3-1)*2.6,dist:Math.floor(i/3)*-3, speed:0,item:null,slow:0,boost:0,shield:0,gate:0,finish:null,input:{...input}}));
        const config={track,mode,laps:mode===0?1:3,drivers};
        begin(config); if(game) MG.toAll({kind:'start',config});
    },
    onMsg(peer,m) {
        if(!m) return;
        if(!MG.isHost() && peer===0 && m.kind==='start'){ begin(m.config); return; }
        if(!game) return;
        if(!MG.isHost() && peer===0 && m.kind==='tick'){game.drivers=m.drivers;game.clock=m.clock;return;}
        if(!MG.isHost())return;
        const driver=game.drivers.find(d=>d.id===peer);
        if(!driver||driver.bot||driver.finish!==null) return;
        if(m.kind==='ride'&&game.clock<4) {driver.ride=Math.max(0,Math.min(7,Number(m.ride)|0));driver.color=Math.max(0,Math.min(5,Number(m.color)|0));}
        if(m.kind==='drive'&&m.input) for(const key of Object.keys(input)) driver.input[key]=m.input[key]===true;
        if(m.kind==='item')useItem(driver);
    },
    onEnd(){game=null;clearScene();el('race').hidden=true;},
    onQuit(){game=null;clearScene();el('race').hidden=true;},
    onLeave(id){ const driver=game?.drivers.find(d=>d.id===id); if(driver)driver.bot=true; }
});
const prefs=document.createElement('div');
prefs.id='race-prefs';
prefs.innerHTML='<label>Track <select id="zoom-track">'+CUP.map((name,i)=>'<optgroup label="'+name+'">'+TRACKS.slice(i*4,i*4+4).map((track,n)=>'<option value="'+(i*4+n)+'">'+track[0]+'</option>').join('')+'</optgroup>').join('')+'</select></label>'+
    '<label>Mode <select id="zoom-mode">'+MODES.map((mode,i)=>'<option value="'+i+'">'+mode+'</option>').join('')+'</select></label>'+
    '<label>Vehicle <select id="zoom-ride">'+RIDES.map((ride,i)=>'<option value="'+i+'">'+ride[0]+'</option>').join('')+'</select></label>'+
    '<label>Paint <select id="zoom-color">'+['Ice','Flame','Violet','Mint','Rose','Gold'].map((name,i)=>'<option value="'+i+'">'+name+'</option>').join('')+'</select></label>';
el('mg-lobby').querySelector('.mg-sub').after(prefs);
requestAnimationFrame(draw);
window.__zoomGame={tracks:TRACKS,rides:RIDES,cups:CUP,get state(){return game;}};
