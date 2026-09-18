import assert from 'node:assert/strict';
import {buildFlight,sampleFlight,G0} from './public/physics.js';
const f=buildFlight();
assert(f.landed,'Guidance must achieve a controlled landing');
assert(f.impactSpeed<1,'Touchdown must be below 1 m/s');
assert(f.frames.at(-1).fuel>0,'Booster must retain propellant');
assert(f.entryTime>155&&f.landingTime>f.entryTime);
assert.equal(f.frames[0].mass,549100);
const separation=f.frames.findIndex(s=>s.phase===2);
assert(Math.abs(f.frames[separation-1].mass-f.frames[separation].mass-112600)<200);
assert(f.frames.some(s=>s.vy<0));
assert(f.frames.some(s=>s.g<G0*.98));
assert(f.maxQ>10000&&f.maxQ<60000);
for(let i=1;i<f.frames.length;i++){
 const a=f.frames[i-1],b=f.frames[i];
 for(const key of ['mass','fuel','v','thrust','q'])assert(Number.isFinite(b[key])&&b[key]>=0,`${key} at ${b.t}`);
 assert(b.fuel<=a.fuel+1e-6,'Fuel cannot increase');
 assert(b.mass<=a.mass+1e-6,'Mass cannot increase');
}
for(const rate of [.5,1,2,4]){
 const wallSeconds=120/rate;
 assert(Math.abs(-10+wallSeconds*rate*(f.duration+10)/120-f.duration)<1e-6);
 const s=sampleFlight(f,155.025);assert(Number.isFinite(s.h));
}
console.log(`PASS: ${f.frames.length} physics samples; ${f.duration.toFixed(1)} s mission; ${f.frames.at(-1).impactSpeed.toFixed(2)} m/s touchdown; ${(f.frames.at(-1).fuel/1000).toFixed(2)} t reserve; all playback rates preserve pacing.`);

for(let phase=1;phase<f.eventTimes.length;phase++){const t=f.eventTimes[phase];assert.equal(sampleFlight(f,t-1e-7).phase,phase-1);assert.equal(sampleFlight(f,t).phase,phase);}
assert.equal(f.separationTime,f.frames.find(s=>s.phase===2).t);
assert.equal(f.separationAltitude,sampleFlight(f,f.separationTime).physicalAltitude);
console.log('PASS: every event changes exactly at its timeline marker, never before.');

assert.equal(sampleFlight(f,f.separationTime).h,100000);
let previousAltitude=f.displaySeparationAltitude;for(let t=f.separationTime;t<f.contactTime;t+=.05){const h=sampleFlight(f,t).h;assert(h<=previousAltitude+1e-6,'Booster must descend immediately and never climb after separation');previousAltitude=h;}
