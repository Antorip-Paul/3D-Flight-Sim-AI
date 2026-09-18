// SI units throughout; fixed-step integration is independent of display/playback rate.
import {pitchProgram,LANDING_RANGE} from './world.js';
export const G0=9.80665, R=6371000, DT=0.05;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const angularDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
// Log-interpolated standard-atmosphere anchors; each layer is exponential.
export function atmosphere(altitude){
 const h=Math.max(0,altitude),levels=[0,11000,20000,32000,47000,51000,71000,86000,100000,150000];
 const densities=[1.225,.36391,.08803,.01322,.0014275,.0008616,.00006421,.000006958,.00000056,.00000000207];
 const pressures=[101325,22632,5474.9,868.02,110.91,66.94,3.956,.373,.032,.0003];
 let i=0;while(i<levels.length-2&&h>levels[i+1])i++;
 const f=(h-levels[i])/(levels[i+1]-levels[i]);
 const rho=Math.exp(Math.log(densities[i])+(Math.log(densities[i+1])-Math.log(densities[i]))*f);
 const pressure=Math.exp(Math.log(pressures[i])+(Math.log(pressures[i+1])-Math.log(pressures[i]))*f);
 return {rho,pressure,soundSpeed:Math.sqrt(1.4*pressure/rho)};
}
export const SUSPENSION_K=2000000;
export function suspensionForce(h,vy,mass){const compression=Math.max(0,-h),c=1.5*Math.sqrt(SUSPENSION_K*mass);return compression>0?Math.max(0,SUSPENSION_K*compression-c*vy):0;}
export function integrateContact(state,dt){
 let {h,vy,vx,x,mass}=state;const steps=Math.ceil(dt/.005),step=dt/steps;let normal=0;
 for(let j=0;j<steps;j++){normal=suspensionForce(h,vy,mass);vy+=(normal/mass-G0)*step;vx+=(-vx*6)*step;h+=vy*step;x+=vx*step;}
 return {...state,h,vy,vx,x,normal,compression:Math.max(0,-h)};
}
export function buildFlight(){
 let t=0,h=0,x=0,vy=0,vx=0,fuel=410900,dry=138200,phase=0,landed=false,entry=false;
 let attitude=0,angularVelocity=0,returnBurn=0,returnComplete=false,contactTime=null,impactSpeed=0,settledFor=0;
 const frames=[];let maxQ=0,maxQTime=0,entryTime=0,landingTime=0;
 for(let i=0;i<16000;i++){
  if(t>=155&&phase<2){phase=2;dry=25600;}
  const mass=dry+fuel,g=G0*(R/(R+Math.max(0,h)))**2,{rho,pressure,soundSpeed}=atmosphere(h),v=Math.hypot(vx,vy),q=.5*rho*v*v;
  if(contactTime!==null){
   const result=integrateContact({h,vy,vx,x,mass},DT);
   const normal=suspensionForce(h,vy,mass),compression=Math.max(0,-h);
   const groundTorque=-angularDifference(attitude,0)*600000-angularVelocity*900000;
   angularVelocity+=groundTorque/(mass*141)*DT;attitude+=angularVelocity*DT;
   const acc=Math.abs(normal/mass-g)/G0;
   frames.push({t,h,x,vy,vx,v,mass,fuel,q,rho,pressure,thrust:0,acc,phase:4,angle:attitude,attitude,angularVelocity,torque:groundTorque,rcs:0,gimbal:0,g,compression,normal,contact:true,impactSpeed});
   ({h,vy,vx,x}=result);t+=DT;
   settledFor=(Math.abs(vy)<.002&&Math.abs(vx)<.002)?settledFor+DT:0;
   if(settledFor>1.5&&t-contactTime>3){landed=impactSpeed<6&&compression<.8;frames.push({...frames.at(-1),t,h,x,vy,vx,v:Math.hypot(vy,vx),compression:Math.max(0,-h),phase:5,landed});break;}
   continue;
  }
  let thrust=0,angle=0,isp=300,tx=0,ty=0;
  if(t<155){
   phase=t<60?0:1; angle=pitchProgram(t,h);
   const throttle=t>52&&t<78?.70:.80;
   thrust=(7607000+(8227000-7607000)*(1-pressure/101325))*throttle;
   isp=282+29*(1-pressure/101325);tx=thrust*Math.sin(angle);ty=thrust*Math.cos(angle);
  }else{
   if(!returnComplete&&t>=160&&Math.abs(angularDifference(Math.atan2(-.96,-.28),attitude))<.10){thrust=1900000;tx=-thrust*.96;ty=-thrust*.28;returnBurn+=DT;if(vx < (LANDING_RANGE-x)/Math.max(60,(vy+Math.sqrt(vy*vy+2*g*h))/g)*1.08)returnComplete=true;}
   if(vy<0&&h<55000&&!entry){entry=true;entryTime=t;}
   if(entry){phase=3;}
   if(entry&&t-entryTime<16){thrust=1900000;tx=-thrust*vx/Math.max(v,1);ty=-thrust*vy/Math.max(v,1);}
   // A braking-velocity envelope followed by closed-loop vertical guidance.
   if(vy<0&&h<18000&&h<Math.max(1800,vy*vy/(2*6)+500)){
    if(!landingTime)landingTime=t;phase=4;
   }
   if(phase===4||landingTime){
    phase=4;const targetV=-Math.min(220,Math.sqrt(2*7*Math.max(0,h))+.3,Math.max(.35,h*.22));
    const ay=(targetV-vy)*1.4;
    tx=mass*((LANDING_RANGE-x)*.035-vx*.4);ty=mass*(g+ay)+.5*rho*.8*10.75*vy*Math.abs(vy);
    ty=Math.max(0,ty);thrust=Math.hypot(tx,ty);
    const cap=h>1500?2535000:845000; if(thrust>cap){tx*=cap/thrust;ty*=cap/thrust;thrust=cap;}
   }
   angle=Math.atan2(tx,ty);isp=305;
  }
  if(fuel<=0){thrust=tx=ty=0;}
  // Keep attitude and angular momentum through engine cutoff. Rotation requires
  // bounded control torque (cold gas in vacuum, grid fins in air, engine gimbal).
  let torque=0,rcs=0,gimbal=0;
  if(t<155){angularVelocity=(angle-attitude)/DT;attitude=angle;}
  else{
   const retrograde=Math.atan2(-vx,-vy);
   const target=phase===4?clamp(angle,-.5,.5)*clamp((h-20)/80,0,1):thrust>0?angle:!returnComplete?Math.atan2(-.96,-.28):retrograde;
   const error=angularDifference(target,attitude),inertia=mass*(41**2/12+1.85**2/4);
   const aeroAuthority=clamp(q/15000,0,1),engineAuthority=thrust>0?1:0;
   const rcsLimit=80000,aeroLimit=180000*aeroAuthority,engineLimit=Math.min(350000,thrust*.35);
   const requestedAlpha=error*(engineAuthority?.12:.035)-angularVelocity*(engineAuthority?.7:.38);
   let command=inertia*requestedAlpha;
   if(Math.abs(angularVelocity)>.13&&Math.sign(command)===Math.sign(angularVelocity))command=0;
   const continuous=clamp(command,-aeroLimit-engineLimit,aeroLimit+engineLimit);
   const coldGasCommand=clamp(command-continuous,-rcsLimit,rcsLimit);
   const duty=Math.abs(coldGasCommand)/rcsLimit;
   rcs=(t%.4)<duty*.4?Math.sign(coldGasCommand)*rcsLimit:0;
   torque=continuous+rcs;
   const acceleration=torque/inertia;
   angularVelocity+=acceleration*DT;
   attitude+=angularVelocity*DT;

   if(thrust>0){gimbal=clamp(angularDifference(angle,attitude),-.105,.105);const direction=attitude+gimbal;tx=thrust*Math.sin(direction);ty=thrust*Math.cos(direction);}
  }
  const mach=v/soundSpeed,transonic=.12*Math.exp(-(((mach-1)/.3)**2));
  const cd=(t<155?.32:(phase===3?1.15:.8))+transonic,drag=q*cd*10.75;
  const ax=(tx-drag*vx/Math.max(1,v))/mass,ay=(ty-drag*vy/Math.max(1,v))/mass-g;
  if(q>maxQ&&t<155){maxQ=q;maxQTime=t;}
  frames.push({t,h,x,vy,vx,v,mass,fuel,q,thrust,acc:Math.hypot(ax,ay)/G0,phase,angle,attitude,angularVelocity,torque,rcs,gimbal,g,rho,pressure,mach,compression:0,normal:0,contact:false});
  fuel=Math.max(0,fuel-thrust/(isp*G0)*DT);vx+=ax*DT;vy+=ay*DT;x+=vx*DT;h+=vy*DT;t+=DT;
  if(h<=0&&t>160){contactTime=t;impactSpeed=Math.hypot(vy,vx);}
  if(contactTime===null)h=Math.max(0,h);
 }
 return {frames,duration:frames.at(-1).t,maxQ,maxQTime,entryTime,landingTime,landed,contactTime,impactSpeed};
}
export function sampleFlight(flight,t){const index=Math.max(0,Math.min(flight.frames.length-1,Math.floor(t/DT)));const a=flight.frames[index],b=flight.frames[Math.min(index+1,flight.frames.length-1)],f=Math.max(0,Math.min(1,(t-a.t)/DT));const s={...a};for(const k of ['h','x','vy','vx','v','mass','fuel','q','thrust','acc','angle','attitude','angularVelocity','torque','gimbal','compression','normal','pressure','rho'])s[k]=a[k]+(b[k]-a[k])*f;return s;}







