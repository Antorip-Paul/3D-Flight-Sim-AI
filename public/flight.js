import * as THREE from './vendor/three.module.js';
import {buildFlight,sampleFlight} from './physics.js';
import {ROCKET_BASE,PAD_TOP,PAD_BOTTOM,groundPoint,terrainData} from './world.js';
const $=id=>document.getElementById(id),flight=buildFlight();
let renderer,scene,camera,rocket,booster,upper,flame,upperFlame,earth,sky,cloudLayer,sun,stars,pad,landingPad,light,smoke,strongback,rcsJets,arms=[],clamps=[],legs=[],fins=[];
let running=false,paused=false,missionT=-10,rate=1,last=performance.now(),view='follow',orbit=.42,elevation=.18,zoom=1,dragging=false,oldX=0,oldY=0,lastEvent=-1,lastCount=-1,muted=false;
let sound,noiseGain,windGain,engineFilter;const target=new THREE.Vector3(),camPos=new THREE.Vector3();
const cameraOffset=new THREE.Vector3(53,23,119);
const white=new THREE.MeshStandardMaterial({color:0xe5e8e6,roughness:.47,metalness:.2}),black=new THREE.MeshStandardMaterial({color:0x17202a,roughness:.27,metalness:.48}),metal=new THREE.MeshStandardMaterial({color:0x75808a,roughness:.42,metalness:.8});
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function cylinder(parent,rt,rb,height,y,mat=white){return mesh(new THREE.CylinderGeometry(rt,rb,height,48),mat,parent,0,y,0);}
function beam(parent,a,b,r=.18,mat=metal){const d=new THREE.Vector3().subVectors(b,a),o=mesh(new THREE.CylinderGeometry(r,r,d.length(),8),mat,parent);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
function labelTexture(){const c=document.createElement('canvas');c.width=512;c.height=1024;const ctx=c.getContext('2d');ctx.fillStyle='#e5e8e6';ctx.fillRect(0,0,512,1024);ctx.translate(260,460);ctx.rotate(-Math.PI/2);ctx.fillStyle='#162637';ctx.font='bold 82px Arial';ctx.textAlign='center';ctx.fillText('SPACEX',0,0);ctx.font='24px Arial';ctx.fillText('F A L C O N  9',0,55);return new THREE.CanvasTexture(c);}
function plume(parent,y,size=1){const group=new THREE.Group();parent.add(group);group.position.y=y;const outer=new THREE.MeshBasicMaterial({color:0xff751e,transparent:true,opacity:.46,depthWrite:false,blending:THREE.AdditiveBlending});const inner=new THREE.MeshBasicMaterial({color:0xd5eaff,transparent:true,opacity:.92,depthWrite:false,blending:THREE.AdditiveBlending});const a=mesh(new THREE.ConeGeometry(2.4,27,24,1,true),outer,group,0,-13,0);a.rotation.z=Math.PI;const b=mesh(new THREE.ConeGeometry(1.3,16,24),inner,group,0,-7,0);b.rotation.z=Math.PI;group.scale.setScalar(size);return group;}
function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x08101b);scene.fog=new THREE.FogExp2(0x102233,.00085);
 camera=new THREE.PerspectiveCamera(39,1,.5,6000000);renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;$('scene').appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xadcfff,0x161b20,.28));sun=new THREE.DirectionalLight(0xfff4de,3.5);sun.position.set(-100,180,70);scene.add(sun);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:85,bottom:-60,near:1,far:450});sun.shadow.bias=-.00005;sun.shadow.normalBias=.035;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;light=new THREE.PointLight(0xff8533,0,160,1.5);scene.add(light);

 const terrain=terrainData(),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(terrain.positions,3));geometry.setIndex(terrain.indices);geometry.computeVertexNormals();

 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(terrain.positions.length/3*2),2));
 const loader=new THREE.TextureLoader();
 const loadMap=(name,color=false)=>{const texture=loader.load('/assets/'+name,()=>{},undefined,()=>{console.error('Texture failed: '+name);$('status').textContent='TEXTURE LOAD ERROR';});texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture;};
 const day=loadMap('earth-day-5400.jpg',true),heightMap=loadMap('earth-elevation-5400.jpg'),ocean=loadMap('earth-specular-2048.png'),cloudMap=loadMap('earth-clouds-4096.png');
 const landMaterial=new THREE.MeshPhongMaterial({map:day,bumpMap:heightMap,bumpScale:180,specularMap:ocean,specular:0xaabaca,shininess:75,side:THREE.DoubleSide});
 const geoHeader='uniform float downrange; varying vec2 geoUv;';
 const geoUvCode=`
 float lat=.4993,lon=-1.4068+downrange/(6371000.*cos(lat));
 vec3 up=vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon));
 vec3 east=vec3(-sin(lon),0.,cos(lon));
 vec3 north=vec3(-sin(lat)*cos(lon),cos(lat),-sin(lat)*sin(lon));
 vec3 geo=normalize(up*(position.y+6371000.)+east*position.x+north*position.z);
 geoUv=vec2(atan(geo.z,geo.x)/6.2831853+.5,asin(geo.y)/3.14159265+.5);
 `;
 landMaterial.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{downrange:{value:0},altitude:{value:0},missionTime:{value:0},cloudTexture:{value:cloudMap}});landMaterial.userData.shader=shader;
  shader.vertexShader=geoHeader+'\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n'+geoUvCode+'\n vMapUv=geoUv;vBumpMapUv=geoUv;vSpecularMapUv=geoUv;');
  shader.fragmentShader='varying vec2 geoUv; uniform float altitude; uniform float missionTime; uniform sampler2D cloudTexture;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float regional=smoothstep(1000.,12000.,altitude);
   diffuseColor.rgb=mix(vec3(.19,.23,.14),diffuseColor.rgb,regional);
   float cover=smoothstep(.25,.85,texture2D(cloudTexture,geoUv+vec2(missionTime*.0000002,0.)).r);
   diffuseColor.rgb*=1.-cover*.22*regional;
  `);
 };
 earth=mesh(geometry,landMaterial,scene);earth.castShadow=false;
 cloudLayer=mesh(geometry.clone(),new THREE.MeshPhongMaterial({color:0xffffff,alphaMap:cloudMap,transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide}),scene,0,6000,0);cloudLayer.castShadow=false;cloudLayer.receiveShadow=false;
 cloudLayer.material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{downrange:{value:0},missionTime:{value:0}});cloudLayer.material.userData.shader=shader;
  shader.vertexShader=geoHeader+' uniform float missionTime;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n'+geoUvCode+'\n vAlphaMapUv=geoUv+vec2(missionTime*.0000002,0.);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\n diffuseColor.a=smoothstep(.2,.85,diffuseColor.a)*.85;');
 };
 sky=mesh(new THREE.SphereGeometry(4500000,48,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{altitude:{value:0},sunDirection:{value:new THREE.Vector3(-100,180,70).normalize()}},vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
 precision highp float;
 varying vec3 direction;uniform float altitude;uniform vec3 sunDirection;
 const float R=6371.;const float A=6471.;const float PI=3.14159265;
 const vec3 betaR=vec3(.005802,.013558,.0331);const float betaM=.003;
 float exitDistance(vec3 p,vec3 d){float b=dot(p,d);return max(0.,-b+sqrt(max(0.,b*b-dot(p,p)+A*A)));}
 void main(){
  vec3 ray=normalize(direction),origin=vec3(0.,R+max(0.,altitude)*.001,0.);
  float end=exitDistance(origin,ray),b=dot(origin,ray),disc=b*b-dot(origin,origin)+R*R;
  if(disc>0.&&b<0.)end=min(end,max(0.,-b-sqrt(disc)));
  float stepSize=end/10.,depthR=0.,depthM=0.;vec3 sumR=vec3(0.),sumM=vec3(0.);
  for(int i=0;i<10;i++){
   vec3 point=origin+ray*(float(i)+.5)*stepSize;float h=max(0.,length(point)-R);
   float localR=exp(-h/8.)*stepSize,localM=exp(-h/1.2)*stepSize;depthR+=localR;depthM+=localM;
   float sunStep=exitDistance(point,sunDirection)/4.,sunR=0.,sunM=0.;
   float sb=dot(point,sunDirection),sd=sb*sb-dot(point,point)+R*R;
   if(sb<0.&&sd>0.)continue;
   for(int j=0;j<4;j++){float sh=max(0.,length(point+sunDirection*(float(j)+.5)*sunStep)-R);sunR+=exp(-sh/8.)*sunStep;sunM+=exp(-sh/1.2)*sunStep;}
   vec3 transmission=exp(-(betaR*(depthR+sunR)+vec3(betaM*1.1*(depthM+sunM))));sumR+=localR*transmission;sumM+=localM*transmission;
  }
  float mu=dot(ray,sunDirection),phaseR=3./(16.*PI)*(1.+mu*mu),g=.76;
  float phaseM=(1.-g*g)/(4.*PI*pow(1.+g*g-2.*g*mu,1.5));
  vec3 radiance=18.*(sumR*betaR*phaseR+sumM*betaM*phaseM);
  radiance+=vec3(.15,.35,.65)*(1.-exp(-depthR*.035))*exp(-max(0.,altitude)*.00008);
  gl_FragColor=vec4(vec3(1.)-exp(-radiance),1.);
 }
 `}),scene);sky.renderOrder=-10;sky.castShadow=false;sky.receiveShadow=false;
 const pos=new Float32Array(2400*3);for(let i=0;i<2400;i++){const v=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(4000000);pos.set(v.toArray(),i*3);}const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(pos,3));stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xc8ddff,size:1.3,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));scene.add(stars);
 pad=new THREE.Group();scene.add(pad);
 const concrete=new THREE.MeshStandardMaterial({color:0x929792,roughness:.92,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 mesh(new THREE.CylinderGeometry(27,27,PAD_TOP-PAD_BOTTOM,80),concrete,pad,0,(PAD_TOP+PAD_BOTTOM)/2,0);
 // A low launch mount carries the stage. Its four hold-downs retract at release.
 const cradle=mesh(new THREE.TorusGeometry(2.2,.35,12,48),black,pad,0,ROCKET_BASE+2,0);cradle.rotation.x=Math.PI/2;
 for(let i=0;i<4;i++){const a=i*Math.PI/2;beam(pad,new THREE.Vector3(Math.cos(a)*2.2,0,Math.sin(a)*2.2),new THREE.Vector3(Math.cos(a)*2.2,ROCKET_BASE+2,Math.sin(a)*2.2),.3,black);}
 for(let i=0;i<4;i++){const pivot=new THREE.Group();const a=i*Math.PI/2;pivot.position.set(Math.cos(a)*2.5,3.15,Math.sin(a)*2.5);pivot.rotation.y=-a;pad.add(pivot);mesh(new THREE.BoxGeometry(1.6,.35,.5),metal,pivot,-.5,0,0);clamps.push(pivot);}
 strongback=new THREE.Group();strongback.position.set(-8,0,0);pad.add(strongback);
 for(let j=0;j<4;j++){const xx=j%2?1.35:-1.35,zz=j<2?-1.35:1.35;beam(strongback,new THREE.Vector3(xx,0,zz),new THREE.Vector3(xx,59,zz),.24);}
 for(let y=2;y<59;y+=5){mesh(new THREE.BoxGeometry(3.1,.2,3.1),metal,strongback,0,y,0);beam(strongback,new THREE.Vector3(-1.35,y,1.35),new THREE.Vector3(1.35,Math.min(59,y+5),1.35),.1);}
 // Arm ends meet the body at x=-1.85 with the rocket's base offset included.
 for(const y of [ROCKET_BASE+42,ROCKET_BASE+54]){const arm=new THREE.Group();arm.position.set(0,y,0);strongback.add(arm);beam(arm,new THREE.Vector3(0,0,0),new THREE.Vector3(6.15,0,0),.28);mesh(new THREE.BoxGeometry(.2,.8,1.1),black,arm,6.15,0,0);arms.push(arm);}
 landingPad=new THREE.Group();scene.add(landingPad);
 mesh(new THREE.CylinderGeometry(24,24,PAD_TOP-PAD_BOTTOM,80),concrete,landingPad,0,(PAD_TOP+PAD_BOTTOM)/2,0);
 const ring=mesh(new THREE.RingGeometry(12,12.35,96),new THREE.MeshBasicMaterial({color:0xeee8cf,side:THREE.DoubleSide}),landingPad,0,PAD_TOP+.008,0);ring.rotation.x=-Math.PI/2;
 for(const axis of [0,1]){const line=mesh(new THREE.BoxGeometry(10,.02,.3),white,landingPad,0,PAD_TOP+.01,0);line.rotation.y=axis*Math.PI/2;}
 const curb=mesh(new THREE.TorusGeometry(23.7,.22,8,128),concrete,landingPad,0,PAD_TOP+.05,0);curb.rotation.x=Math.PI/2;
 const targetMaterial=new THREE.MeshStandardMaterial({color:0xece8dc,roughness:.9});
 // Geometric L Z - 1 lettering outside the touchdown circle.
 for(const [x,z,w,d] of [[-5,17,.35,3],[-4,18.3,2.3,.35],[-1,15.7,2.5,.35],[-1,18.3,2.5,.35],[2,17,1.4,.35],[4,17,.35,3]])mesh(new THREE.BoxGeometry(w,.025,d),targetMaterial,landingPad,x,PAD_TOP+.025,z);
 const slash=mesh(new THREE.BoxGeometry(.35,.025,3.7),targetMaterial,landingPad,-1,PAD_TOP+.025,17);slash.rotation.y=.7;
 for(let i=0;i<24;i++){const a=i*Math.PI/12;const dash=mesh(new THREE.BoxGeometry(1,.025,.3),targetMaterial,landingPad,20*Math.cos(a),PAD_TOP+.025,20*Math.sin(a));dash.rotation.y=-a;}
 landingPad.visible=false;
 rocket=new THREE.Group();scene.add(rocket);rocket.position.y=ROCKET_BASE;booster=new THREE.Group();rocket.add(booster);cylinder(booster,1.85,1.85,39,21.5);cylinder(booster,1.85,1.85,4,43,black);cylinder(booster,1.86,1.86,2,3,black);
 const decal=mesh(new THREE.CylinderGeometry(1.856,1.856,15,48,1,true),new THREE.MeshStandardMaterial({map:labelTexture(),roughness:.5}),booster,0,25,0);decal.rotation.y=1.3;
 for(let y of [4,9,16,34,40])cylinder(booster,1.87,1.87,.07,y,metal);
 for(let i=0;i<9;i++){let a=i*Math.PI/4,r=i===8?0:1.15;mesh(new THREE.CylinderGeometry(.25,.47,1.3,16,1,true),black,booster,Math.cos(a)*r,1.1,Math.sin(a)*r);}
 const carbon=new THREE.MeshPhysicalMaterial({color:0x20242a,roughness:.28,metalness:.25,clearcoat:.4,clearcoatRoughness:.25});
 for(let i=0;i<4;i++){
  const azimuth=i*Math.PI/2+Math.PI/4,radial=new THREE.Group();
  radial.position.set(Math.cos(azimuth)*1.65,9,Math.sin(azimuth)*1.65);radial.rotation.y=-azimuth;booster.add(radial);
  const hinge=new THREE.Group(),strut=new THREE.Group();radial.add(hinge);hinge.add(strut);hinge.userData={azimuth,strut};
  beam(strut,new THREE.Vector3(0,0,0),new THREE.Vector3(0,14,0),.27,carbon);
  beam(strut,new THREE.Vector3(.25,1,0),new THREE.Vector3(0,13,0),.10,metal);
  const foot=mesh(new THREE.BoxGeometry(1.2,.16,1.2),black,strut,0,14,0);hinge.userData.foot=foot;legs.push(hinge);
  const fin=new THREE.Group();fin.position.set(Math.cos(azimuth)*1.85,40,Math.sin(azimuth)*1.85);fin.rotation.y=-azimuth;booster.add(fin);
  for(let k=0;k<5;k++){mesh(new THREE.BoxGeometry(2.5,.08,.08),carbon,fin,1.1,0,(k-2)*.35);mesh(new THREE.BoxGeometry(.08,.08,1.5),carbon,fin,k*.52,0,0);}fins.push(fin);
 }
 upper=new THREE.Group();rocket.add(upper);upper.position.y=45;cylinder(upper,1.85,1.85,11,5.5);cylinder(upper,2.6,1.85,3,12.5);cylinder(upper,2.6,2.6,6,17);const nose=mesh(new THREE.SphereGeometry(2.6,48,24,0,Math.PI*2,0,Math.PI/2),white,upper,0,20,0);nose.scale.y=1.8;cylinder(upper,.6,1.4,2,-1,black);
 rcsJets=new THREE.Group();booster.add(rcsJets);
 for(const [x,y,direction] of [[2,39,-1],[-2,5,1]]){const jet=mesh(new THREE.ConeGeometry(.25,3,12),new THREE.MeshBasicMaterial({color:0xc0e7ff,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending}),rcsJets,x+Math.sign(x)*1.5,y,0);jet.rotation.z=direction*Math.PI/2;}
 rcsJets.visible=false;
 flame=plume(booster,.5);flame.visible=false;upperFlame=plume(upper,-2,.6);upperFlame.visible=false;
 const smokeGeometry=new THREE.BufferGeometry(),smokePos=new Float32Array(240*3);for(let i=0;i<240;i++)smokePos.set([0,-100,0],i*3);smokeGeometry.setAttribute('position',new THREE.BufferAttribute(smokePos,3));const cv=document.createElement('canvas');cv.width=cv.height=64;const ctx=cv.getContext('2d'),grad=ctx.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'#cbd3da88');grad.addColorStop(1,'#cbd3da00');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);smoke=new THREE.Points(smokeGeometry,new THREE.PointsMaterial({map:new THREE.CanvasTexture(cv),size:16,transparent:true,depthWrite:false,opacity:.45}));scene.add(smoke);
 const el=renderer.domElement;el.addEventListener('pointerdown',e=>{dragging=true;oldX=e.clientX;oldY=e.clientY;el.setPointerCapture(e.pointerId);});el.addEventListener('pointermove',e=>{if(dragging){orbit-=(e.clientX-oldX)*.006;elevation=Math.max(-.15,Math.min(.8,elevation+(e.clientY-oldY)*.004));oldX=e.clientX;oldY=e.clientY;}});el.addEventListener('pointerup',()=>dragging=false);el.addEventListener('pointercancel',()=>dragging=false);el.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.5,Math.min(3,zoom+e.deltaY*.001));},{passive:false});el.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;$('error').hidden=false;});resize();window.addEventListener('resize',resize);
}
function resize(){const w=$('scene').clientWidth,h=$('scene').clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
function initSound(){if(sound)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;try{sound=new AC();const buffer=sound.createBuffer(1,sound.sampleRate*2,sound.sampleRate),data=buffer.getChannelData(0);let b=0;for(let i=0;i<data.length;i++){b=(b+.02*(Math.random()*2-1))/1.02;data[i]=b*3.5;}const source=sound.createBufferSource();source.buffer=buffer;source.loop=true;engineFilter=sound.createBiquadFilter();engineFilter.type='lowpass';engineFilter.frequency.value=200;noiseGain=sound.createGain();noiseGain.gain.value=0;source.connect(engineFilter).connect(noiseGain).connect(sound.destination);const wind=sound.createBiquadFilter();wind.type='highpass';wind.frequency.value=550;windGain=sound.createGain();windGain.gain.value=0;source.connect(wind).connect(windGain).connect(sound.destination);source.start();}catch{sound=null;}}
function beep(freq=700){if(!sound||muted||!$('audio').checked)return;const osc=sound.createOscillator(),gain=sound.createGain();osc.frequency.value=freq;gain.gain.setValueAtTime(.065,sound.currentTime);gain.gain.exponentialRampToValueAtTime(.001,sound.currentTime+.13);osc.connect(gain).connect(sound.destination);osc.start();osc.stop(sound.currentTime+.15);}
const events=[['Liftoff. Nine engines.','Nine Merlin engines overcome the rocket’s weight. Burning propellant makes the vehicle lighter, so the same thrust produces more acceleration.'],['Through maximum pressure.','The rocket throttles down around the densest part of its high-speed ascent. Dynamic pressure is the balance of air density and speed squared.'],['One vehicle becomes two.','The stages separate. Cold-gas thrusters turn the booster for its return burn. After cutoff, it retains angular momentum while attitude control gradually aligns it engine-first for reentry.'],['Back into the atmosphere.','The booster falls engine-first. A short entry burn reduces speed before denser air produces strong drag. Grid fins help control its attitude.'],['The final burn.','One Merlin engine adjusts thrust to reduce the descent rate. Landing legs deploy as guidance aims for a gentle touchdown on the landing pad.'],['Booster recovered.','Engine cutoff. The first stage is back on the ground after a complete ascent, separation, reentry and controlled landing.']];
function updateEvent(p){if(p===lastEvent)return;lastEvent=p;$('event').hidden=!$('cards').checked;$('event-num').textContent=`0${p+1} / MISSION EVENT`;$('event-title').textContent=events[p][0];$('event-copy').textContent=events[p][1];$('status').textContent=['ASCENT NOMINAL','MAX-Q / THROTTLE','STAGE SEPARATION','ENTRY BURN / DESCENT','LANDING GUIDANCE','MISSION COMPLETE'][p];document.querySelectorAll('[data-phase]').forEach(e=>e.classList.toggle('active',Number(e.dataset.phase)<=p));beep(p===5?1000:500);}
function draw(s,time){

 const separated=time>=155;
 rocket.position.set(0,ROCKET_BASE+s.h,0);
 // Rotation is integrated at the same fixed step as translational motion.
 rocket.rotation.z=-s.attitude;booster.rotation.z=0;
 rcsJets.visible=separated&&Math.abs(s.rcs)>0;rcsJets.scale.set(s.rcs<0?-1:1,1,1);rcsJets.children.forEach(j=>{j.material.opacity=.32+.18*Math.sin(time*24)**2;});
 const sinceSeparation=Math.max(0,time-155);
 if(separated){const sep=sampleFlight(flight,155);upper.position.set(45*Math.sin(sep.attitude)+sinceSeparation*4,45*Math.cos(sep.attitude)+sinceSeparation*3+sinceSeparation**2*.8,0).applyAxisAngle(new THREE.Vector3(0,0,1),-rocket.rotation.z);upper.rotation.z=-sep.attitude-rocket.rotation.z;}else{upper.position.set(0,45,0);upper.rotation.z=0;}upper.visible=!separated||sinceSeparation<35;upperFlame.visible=separated;
 const release=THREE.MathUtils.smoothstep(time,-.8,-.05);
 arms.forEach(arm=>arm.rotation.y=-release*1.3);
 clamps.forEach(clamp=>clamp.position.y=3.15-release*.9);
 strongback.rotation.z=THREE.MathUtils.smoothstep(time,0,6)*.11;
 const burn=running&&(time<0?Math.max(0,(time+3)/3):s.thrust/7607000);flame.visible=burn>0&&time<flight.duration;const fsize=separated?Math.max(.2,burn*2):Math.max(.15,burn);const expansion=1+2.6*(1-Math.pow(Math.max(.000001,s.pressure/101325),.25));flame.scale.set(expansion*(separated?.6:1),fsize*(.93+Math.sin(time*71)*.08),expansion*(separated?.6:1));flame.rotation.z=-s.gimbal;upperFlame.scale.set(2.2,.6,2.2);light.intensity=flame.visible?300*fsize:0;light.position.copy(rocket.position);light.position.y-=3;
 legs.forEach(l=>{const angle=s.phase>=4?THREE.MathUtils.smoothstep(time-flight.landingTime,0,4)*2.59:0;l.rotation.z=-angle;l.userData.strut.scale.y=1-(s.compression||0)/(14*Math.abs(Math.cos(2.59)));l.userData.foot.rotation.z=angle;});fins.forEach(f=>f.visible=separated);

 const launchGround=groundPoint(-s.x),recoveryGround=groundPoint(flight.frames.at(-1).x-s.x);
 pad.position.set(launchGround.x,launchGround.y,0);pad.rotation.z=launchGround.rotation;
 landingPad.position.set(recoveryGround.x,recoveryGround.y,0);landingPad.rotation.z=recoveryGround.rotation;
 pad.visible=time<155;landingPad.visible=separated;
 if(earth.material.userData.shader){const u=earth.material.userData.shader.uniforms;u.downrange.value=s.x;u.altitude.value=Math.max(0,s.h);u.missionTime.value=Math.max(0,time);}
 earth.material.bumpScale=180*THREE.MathUtils.smoothstep(s.h,1000,12000);
 if(cloudLayer.material.userData.shader){cloudLayer.material.userData.shader.uniforms.downrange.value=s.x;cloudLayer.material.userData.shader.uniforms.missionTime.value=Math.max(0,time);}
 sun.target.position.copy(rocket.position);sun.position.copy(rocket.position).add(new THREE.Vector3(-100,180,70));
 scene.fog.color.setHex(0x879eac);scene.fog.density=.000018*Math.exp(-s.h/8500);
 sky.material.uniforms.altitude.value=s.h;stars.material.opacity=THREE.MathUtils.smoothstep(s.h,18000,65000)*.8;
 target.copy(rocket.position).add(new THREE.Vector3(0,separated?23:34,0));
 let distance=(view==='wide'?Math.max(240,Math.min(6000,s.h*.08)):view==='onboard'?20:145)*zoom;
 if(innerWidth<760)distance*=1.12;
 camPos.set(Math.sin(orbit)*distance,Math.sin(elevation)*distance,Math.cos(orbit)*distance);
 if(view==='onboard'){cameraOffset.set(5,8,8);camera.position.copy(rocket.position).add(new THREE.Vector3(5,42,8));target.copy(rocket.position).add(new THREE.Vector3(0,-50,0));}
 else{cameraOffset.lerp(camPos,.12);camera.position.copy(target).add(cameraOffset);}
 camera.position.y=Math.max(2,camera.position.y);sky.material.uniforms.altitude.value=camera.position.y;camera.lookAt(target);sky.position.copy(camera.position);stars.position.copy(camera.position);
 const attr=smoke.geometry.attributes.position;if(flame.visible&&s.h<150){for(let i=0;i<attr.count;i++){const age=((Math.max(0,time)*.7+i/attr.count)%1),a=i*2.4;attr.setXYZ(i,rocket.position.x+Math.cos(a)*age*65,1+age*12,Math.sin(a)*age*45);}attr.needsUpdate=true;smoke.visible=true;}else smoke.visible=false;
 renderer.render(scene,camera);
}
function telemetry(s){$('alt').textContent=(Math.max(0,s.h)/1000).toFixed(2);$('vel').textContent=Math.round(s.v*3.6).toLocaleString();$('acc').textContent=s.acc.toFixed(2);$('thrust').textContent=Math.round(s.thrust/1000).toLocaleString();$('mass').textContent=(s.mass/1000).toFixed(1)+' t';$('q').textContent=(s.q/1000).toFixed(1)+' kPa';$('stage').textContent=missionT<155?'Full stack':'Booster / stage 1';const fuel=Math.round(s.fuel/410900*100);$('fuel').textContent=fuel+'%';$('fuel-bar').style.width=fuel+'%';const secs=Math.abs(Math.floor(missionT));$('clock').textContent=`T${missionT<0?'−':'+'}${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;$('progress').style.width=(Math.max(0,missionT)/flight.duration*100)+'%';
 const ctx=$('chart').getContext('2d');ctx.clearRect(0,0,450,90);ctx.strokeStyle='#bdfb69';ctx.lineWidth=2;ctx.beginPath();const maxH=Math.max(...flight.frames.filter((_,i)=>i%50===0).map(f=>f.h));for(let i=0;i<flight.frames.length&&flight.frames[i].t<=missionT;i+=40){const f=flight.frames[i];ctx.lineTo(f.t/flight.duration*450,87-f.h/maxH*80);}ctx.stroke();
}
function tick(now){requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.1);last=now;
 if(running&&!paused){missionT+=dt*rate*(flight.duration+10)/120;if(missionT>=flight.duration){missionT=flight.duration;running=false;$('pause').disabled=true;}}
 let s=sampleFlight(flight,Math.max(0,missionT));if(missionT<0)s={...s,thrust:0,acc:0};
 if(running&&missionT<0){$('countdown').hidden=false;const n=Math.ceil(-missionT);$('countdown').querySelector('strong').textContent=n;if(n!==lastCount){lastCount=n;beep(n<=3?900:650);}}else{$('countdown').hidden=true;if(missionT>=0)updateEvent(s.phase);}
 draw(s,missionT);telemetry(s);if(sound){const audible=running&&!paused&&!muted&&$('audio').checked;noiseGain.gain.setTargetAtTime(audible?Math.min(.55,s.thrust/7607000*.5+(missionT>-3&&missionT<0?.15:0)):0,sound.currentTime,.08);windGain.gain.setTargetAtTime(audible?Math.min(.3,s.q/100000):0,sound.currentTime,.2);} }
function reset(){running=false;paused=false;missionT=-10;lastEvent=-1;lastCount=-1;$('setup').hidden=false;$('event').hidden=true;$('pause').disabled=true;$('pause').textContent='Pause';$('status').textContent='SYSTEMS READY';document.querySelectorAll('[data-phase]').forEach(e=>e.classList.remove('active'));}
$('launch').onclick=()=>{rate=Number($('speed').value);muted=!$('audio').checked;$('mute').textContent=muted?'Sound off':'Sound on';initSound();sound?.resume();renderer.setPixelRatio($('quality').value==='low'?1:Math.min(devicePixelRatio,2));smoke.geometry.setDrawRange(0,$('quality').value==='low'?60:240);running=true;paused=false;missionT=-10;$('setup').hidden=true;$('pause').disabled=false;$('status').textContent='TERMINAL COUNT';};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';};$('reset').onclick=reset;$('speed').onchange=()=>$('speed-label').textContent=$('speed').value+'× · ~'+(2/Number($('speed').value))+' min';$('mute').onclick=()=>{muted=!muted;$('audio').checked=!muted;$('mute').textContent=muted?'Sound off':'Sound on';if(!muted){initSound();sound?.resume();}};
document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>{view=b.dataset.camera;zoom=1;document.querySelectorAll('[data-camera]').forEach(x=>x.classList.toggle('selected',x===b));});$('info').onclick=()=>$('notes').showModal();$('close-notes').onclick=()=>$('notes').close();document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused){paused=true;$('pause').textContent='Resume';if(sound){noiseGain.gain.value=0;windGain.gain.value=0;}}});
try{init();camera.position.set(62,62,126);requestAnimationFrame(tick);}catch(e){console.error(e);$('error').hidden=false;$('launch').disabled=true;}

if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 const tool={name:'control_falcon_mission',description:'Start, pause, resume or reset the Falcon 9 simulation. Start uses the visible pre-flight settings.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['start','pause','resume','reset']}},required:['action'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){
  if(!input||!['start','pause','resume','reset'].includes(input.action)||Object.keys(input).some(k=>k!=='action'))throw new Error('Use start, pause, resume or reset.');
  if(input.action==='start'){if(running||missionT>=0)throw new Error('Reset before starting another mission.');$('launch').click();}
  if(input.action==='reset')reset();
  if(input.action==='pause'||input.action==='resume'){if(!running)throw new Error('Launch a mission first.');const requested=input.action==='pause';if(paused!==requested)$('pause').click();}
  return {running,paused,missionSeconds:missionT};
 }};
 try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}


