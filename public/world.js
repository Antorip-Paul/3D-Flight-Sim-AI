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
// Geographic frame follows the great circle from LC-39A toward LZ-1.
export const LAUNCH_LAT=28.608389*Math.PI/180, LAUNCH_LON=-80.604333*Math.PI/180;
export const LANDING_LAT=28.485833*Math.PI/180, LANDING_LON=-80.544444*Math.PI/180;
const dl=LANDING_LON-LAUNCH_LON;
export const FLIGHT_BEARING=Math.atan2(Math.sin(dl)*Math.cos(LANDING_LAT),Math.cos(LAUNCH_LAT)*Math.sin(LANDING_LAT)-Math.sin(LAUNCH_LAT)*Math.cos(LANDING_LAT)*Math.cos(dl));
export const LANDING_RANGE=EARTH_RADIUS*Math.acos(Math.sin(LAUNCH_LAT)*Math.sin(LANDING_LAT)+Math.cos(LAUNCH_LAT)*Math.cos(LANDING_LAT)*Math.cos(dl));
export function geographicPosition(range){const a=range/EARTH_RADIUS,lat=Math.asin(Math.sin(LAUNCH_LAT)*Math.cos(a)+Math.cos(LAUNCH_LAT)*Math.sin(a)*Math.cos(FLIGHT_BEARING));const lon=LAUNCH_LON+Math.atan2(Math.sin(FLIGHT_BEARING)*Math.sin(a)*Math.cos(LAUNCH_LAT),Math.cos(a)-Math.sin(LAUNCH_LAT)*Math.sin(lat));return {lat,lon};}
export function pitchProgram(t,h){
 if(t<=15||h<=180)return 0;
 const elapsed=t-15,u=Math.min(1,elapsed/12),blend=u*u*(3-2*u);
 return Math.min(.55,elapsed*.0035*blend);
}
