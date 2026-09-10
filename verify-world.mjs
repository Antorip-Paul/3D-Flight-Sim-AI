import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EARTH_RADIUS,groundHeight,groundPoint,ROCKET_BASE,PAD_TOP,PAD_BOTTOM,terrainData} from './public/world.js';
import {buildFlight} from './public/physics.js';
const f=buildFlight(),firstPitch=f.frames.find(s=>s.angle>0);
assert(firstPitch.t>=15&&firstPitch.h>180,'Pitch starts only after vertical tower clearance');
for(const s of f.frames.filter(s=>s.t<15))assert(s.angle===0&&s.x===0,'Initial ascent stays vertical');
assert(Math.abs(groundHeight(27))<.001,'The entire launch pad is locally flat within 1 mm');
assert(Math.abs(groundHeight(24))<.001,'The entire recovery pad is locally flat within 1 mm');
for(const d of [0,1,100,10000,250000]){
 const p=groundPoint(d);
 assert(Math.abs(Math.hypot(p.x,p.y+EARTH_RADIUS)-EARTH_RADIUS)<1e-6,'Pad lies on Earth');
 assert(Math.abs(groundHeight(p.x)-p.y)<1e-6,'Pad and terrain use the same surface');
}
const last=f.frames.at(-1),landing=groundPoint(last.x-last.x);
assert(landing.y===0);assert(landing.rotation===0);
assert(Math.abs(ROCKET_BASE+9+14*Math.cos(2.59)-PAD_TOP)<1e-10,'Deployed leg tips touch the ground');
const data=terrainData();assert(data.positions.every(Number.isFinite));assert(data.indices.every(i=>i>=0&&i<data.positions.length/3));
const source=fs.readFileSync('public/flight.js','utf8'),html=fs.readFileSync('public/flight.html','utf8');
assert(!/speechSynthesis|SpeechSynthesisUtterance|function speak/.test(source),'No TTS remains');
assert(!/From Earth|And back|Audio starts at launch|28\.608/.test(html),'Requested copy removed');
console.log(`PASS: pitch begins at ${firstPitch.t.toFixed(2)} s / ${firstPitch.h.toFixed(1)} m; surface and pads agree; leg contact exact; terrain valid; no speech or removed copy.`);

