// SI units throughout; fixed-step integration is independent of display/playback rate.
import {pitchProgram} from './world.js';
export const G0=9.80665, R=6371000, DT=0.05;
export function buildFlight(){
 let t=0,h=0,x=0,vy=0,vx=0,fuel=410900,dry=138200,phase=0,landed=false,entry=false;
 const frames=[];let maxQ=0,maxQTime=0,entryTime=0,landingTime=0;
 for(let i=0;i<16000;i++){
  if(t>=155&&phase<2){phase=2;dry=25600;}
  const mass=dry+fuel,g=G0*(R/(R+h))**2,rho=1.225*Math.exp(-h/8500),v=Math.hypot(vx,vy),q=.5*rho*v*v;
  let thrust=0,angle=0,isp=300,tx=0,ty=0;
  if(t<155){
   phase=t<60?0:1; angle=pitchProgram(t,h);
   const throttle=t>52&&t<78?.70:.88;
   thrust=(7607000+(8227000-7607000)*(1-Math.exp(-h/8500)))*throttle;
   isp=282+29*(1-Math.exp(-h/8500));tx=thrust*Math.sin(angle);ty=thrust*Math.cos(angle);
  }else{
   if(t>=160&&t<190){thrust=1900000;tx=-thrust*.96;ty=-thrust*.28;}
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
    tx=-vx*mass*.8;ty=mass*(g+ay)+.5*rho*.8*10.75*vy*Math.abs(vy);
    ty=Math.max(0,ty);thrust=Math.hypot(tx,ty);
    const cap=845000; if(thrust>cap){tx*=cap/thrust;ty*=cap/thrust;thrust=cap;}
   }
   angle=Math.atan2(tx,ty);isp=305;
  }
  if(fuel<=0){thrust=tx=ty=0;}
  const cd=t<155?.32:(phase===3?1.15:.8),drag=q*cd*10.75;
  const ax=(tx-drag*vx/Math.max(1,v))/mass,ay=(ty-drag*vy/Math.max(1,v))/mass-g;
  if(q>maxQ&&t<155){maxQ=q;maxQTime=t;}
  frames.push({t,h,x,vy,vx,v,mass,fuel,q,thrust,acc:Math.hypot(ax,ay)/G0,phase,angle,g});
  fuel=Math.max(0,fuel-thrust/(isp*G0)*DT);vx+=ax*DT;vy+=ay*DT;x+=vx*DT;h+=vy*DT;t+=DT;
  if(h<=0&&t>160){landed=Math.abs(vy)<5;frames.push({...frames.at(-1),t,h:0,v:0,vx:0,vy:0,thrust:0,acc:0,phase:5,impactSpeed:Math.abs(vy),landed});break;}
  h=Math.max(0,h);
 }
 return {frames,duration:frames.at(-1).t,maxQ,maxQTime,entryTime,landingTime,landed};
}
export function sampleFlight(flight,t){const index=Math.max(0,Math.min(flight.frames.length-1,Math.floor(t/DT)));const a=flight.frames[index],b=flight.frames[Math.min(index+1,flight.frames.length-1)],f=Math.max(0,Math.min(1,(t-a.t)/DT));const s={...a};for(const k of ['h','x','vy','vx','v','mass','fuel','q','thrust','acc','angle'])s[k]=a[k]+(b[k]-a[k])*f;return s;}



