import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildFlight} from './public/physics.js';
import {LANDING_RANGE,LANDING_LAT,LANDING_LON,LAUNCH_LAT,LAUNCH_LON,geographicPosition} from './public/world.js';
const f=buildFlight(),end=f.frames.at(-1),peak=f.frames.reduce((a,b)=>a.x>b.x?a:b);
assert(peak.x>LANDING_RANGE+20000,'Mission must travel offshore');
assert(f.frames.some(s=>s.vx<-100),'Boostback must reverse range');
assert(Math.abs(end.x-LANDING_RANGE)<1,'Touchdown must hit the fixed LZ-1 target, not move the pad');
for(const [range,lat,lon] of [[0,LAUNCH_LAT,LAUNCH_LON],[LANDING_RANGE,LANDING_LAT,LANDING_LON]]){const p=geographicPosition(range);assert(Math.abs(p.lat-lat)<1e-10&&Math.abs(p.lon-lon)<1e-10);}
let previous=geographicPosition(0);
for(const frame of f.frames){const p=geographicPosition(frame.x);assert(Math.abs(p.lat-previous.lat)<.0001&&Math.abs(p.lon-previous.lon)<.0001,'Geography must stay continuous');previous=p;}
const scene=fs.readFileSync('public/flight.js','utf8');
assert(!scene.slice(scene.indexOf('function plume('),scene.indexOf('function init(')).includes('ConeGeometry'));
for(const file of ['earth-day-8192.jpg','cape-canaveral-2048.jpg','florida-atlantic-4096.jpg',...['sand','grass','asphalt','concrete'].flatMap(n=>['diffuse','normal','roughness'].map(m=>`${n}-${m}.jpg`))])assert(fs.statSync(`public/assets/${file}`).size>10000,`Missing ${file}`);
assert(scene.includes('gl_PointCoord')&&scene.includes('AdditiveBlending'));
assert(scene.includes('groundPoint(LANDING_RANGE-s.x)'));
console.log(`PASS: fixed coastal target; ${(peak.x/1000).toFixed(1)} km offshore excursion; return to within ${Math.abs(end.x-LANDING_RANGE).toFixed(2)} m; continuous geographic coordinates; 15 material maps bundled; nozzle particle shaders.`);
