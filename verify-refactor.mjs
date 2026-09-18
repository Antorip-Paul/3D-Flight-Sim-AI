import assert from 'node:assert/strict';
import {buildFlight,atmosphere,integrateContact,SUSPENSION_K,G0,DT} from './public/physics.js';
const f=buildFlight();
for(const [h,rho] of [[0,1.225],[11000,.36391],[20000,.08803],[47000,.0014275],[86000,.000006958]])assert(Math.abs(atmosphere(h).rho/rho-1)<1e-9);
let previous=Infinity;
for(let h=0;h<=150000;h+=50){const a=atmosphere(h);assert(a.rho>0&&a.rho<=previous);previous=a.rho;assert(Number.isFinite(a.pressure)&&a.soundSpeed>0);}
for(let i=1;i<f.frames.length;i++){
 const a=f.frames[i-1],b=f.frames[i];assert(Math.abs(b.q-.5*b.rho*b.v**2)<1e-6);
 if(a.t>=155&&!b.contact){const inertia=b.mass*(41**2/12+1.85**2/4);assert(Math.abs((b.angularVelocity-a.angularVelocity)/DT-b.torque/inertia)<1e-8,'Torque must integrate angular acceleration');assert([0,80000,-80000].includes(b.rcs),'Cold gas must use torque pulses');}
}
const contact=f.frames.filter(s=>s.contact);assert(contact.length>60,'Contact must settle over multiple seconds');assert(contact[0].v>.1&&contact[1].v>0,'No instantaneous velocity reset');assert(contact.at(-1).v<.002);assert(Math.abs(contact.at(-1).normal/contact.at(-1).mass-G0)<.001);
let s={h:0,vy:-20/3.6,vx:0,x:0,mass:33599},maximum=0;
for(let i=0;i<1200;i++){s=integrateContact(s,.005);maximum=Math.max(maximum,s.compression);}
assert(maximum<.8&&maximum>.2,'20 km/h impact stays within the suspension stroke');assert(Math.abs(s.vy)<.002);assert(Math.abs(s.compression-s.mass*G0/SUSPENSION_K)<.001);
console.log(`PASS: atmospheric layer anchors, q=½ρv², τ=Iα, pulsed RCS, ${contact.length} contact frames; 20 km/h drop settles with ${maximum.toFixed(3)} m peak compression.`);
