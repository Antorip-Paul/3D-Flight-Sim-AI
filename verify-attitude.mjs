import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildFlight,sampleFlight,DT} from './public/physics.js';
import {PAD_TOP,PAD_BOTTOM,groundHeight} from './public/world.js';
const f=buildFlight();let cutoffs=0,controlledCoast=0;
for(let i=1;i<f.frames.length-1;i++){
 const a=f.frames[i-1],b=f.frames[i];if(b.t<155)continue;
 assert(Math.abs(b.attitude-a.attitude)<=.13*DT+1e-8,'Angular rate must bound every rotation step');
 assert(Math.abs(b.angularVelocity-a.angularVelocity)<=.06*DT+1e-6,'Angular momentum cannot reset');
 assert(Math.abs(b.gimbal)<=.105+1e-8,'Engine gimbal limit');
 if(a.thrust>0&&b.thrust===0){cutoffs++;assert(Math.abs(b.attitude-a.attitude)<.007);}
 if(b.rcs!==0&&b.thrust===0&&Math.abs(b.angularVelocity)>.001)controlledCoast++;
 const s=sampleFlight(f,b.t+.025);assert(Number.isFinite(s.attitude)&&Number.isFinite(s.angularVelocity));
}
assert(cutoffs>=3&&controlledCoast>100,'Validate multiple engine cutoffs and controlled coasting');
const approach=f.frames.at(-2);assert(Math.abs(approach.vx)<.3&&Math.abs(approach.vy)<.5,'Low horizontal and vertical touchdown velocity');
assert(Math.abs(approach.attitude)<.001,'Vehicle upright before leg contact');
assert(PAD_TOP>0&&PAD_BOTTOM<groundHeight(27),'Pads have visible tops and buried foundations');
const src=fs.readFileSync('public/flight.js','utf8');assert(!src.includes('float detail='),'No repeating terrain pattern');assert(src.includes('rocket.rotation.z=-s.attitude'),'Rendering reads integrated attitude');
console.log(`PASS: ${cutoffs} engine cutoffs preserve rotation; ${controlledCoast} controlled coast samples; touchdown ${(approach.vx).toFixed(2)} m/s lateral, ${Math.abs(approach.vy).toFixed(2)} m/s vertical; pad foundations embedded.`);
