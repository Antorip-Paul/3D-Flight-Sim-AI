// Metres, with the observer's subpoint as the floating origin.
export const EARTH_RADIUS=6371000;
// Concrete foundation penetrates the terrain; its top is 16 cm above grade.
export const PAD_TOP=.16, PAD_BOTTOM=-.34;
export const ROCKET_BASE=PAD_TOP-(9+14*Math.cos(2.59));
export function groundPoint(distance){
 const a=distance/EARTH_RADIUS;
 return {x:EARTH_RADIUS*Math.sin(a),y:-2*EARTH_RADIUS*Math.sin(a/2)**2,rotation:-a};
}
export function groundHeight(radius){return -(radius*radius)/(EARTH_RADIUS+Math.sqrt(EARTH_RADIUS**2-radius**2));}
export function terrainData(){
 const rings=150,segments=256,positions=[],indices=[];
 // Logarithmic rings retain centimetre-scale local curvature and a distant limb.
 for(let j=0;j<=rings;j++){
  const r=j===0?0:Math.exp(Math.log(3000000)*(j-1)/(rings-1));
  for(let k=0;k<=segments;k++){const a=k/segments*Math.PI*2;positions.push(r*Math.cos(a),groundHeight(r),r*Math.sin(a));}
 }
 for(let j=0;j<rings;j++)for(let k=0;k<segments;k++){const a=j*(segments+1)+k,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
 return {positions,indices};
}
export function pitchProgram(t,h){
 if(t<=15||h<=180)return 0;
 const elapsed=t-15,u=Math.min(1,elapsed/12),blend=u*u*(3-2*u);
 return Math.min(1.12,elapsed*.0082*blend);
}
