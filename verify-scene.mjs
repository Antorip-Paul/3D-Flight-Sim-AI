import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as Three from './public/vendor/three.module.js';
import {buildFlight,sampleFlight} from './public/physics.js';
import {ROCKET_BASE,groundPoint,terrainData} from './public/world.js';
const drawContext=new Proxy({createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]??(()=>{})});
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{id,hidden:true,checked:true,value:'1',style:{},dataset:{},classList:{toggle(){},remove(){}},clientWidth:1280,clientHeight:660,textContent:'',appendChild(){},addEventListener(){},setPointerCapture(){},getContext:()=>drawContext,querySelector:()=>element(id+'child'),click(){this.onclick?.();},showModal(){},close(){}});return elements.get(id);}
class Renderer {constructor(){this.domElement=element('canvas');}setPixelRatio(){}setSize(){}render(){}}
let failed=false;
const context=vm.createContext({THREE:{...Three,WebGLRenderer:Renderer},buildFlight,sampleFlight,ROCKET_BASE,groundPoint,terrainData,document:{getElementById:element,createElement:()=>element('generated'),querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},performance:{now:()=>0},requestAnimationFrame(){},devicePixelRatio:1,innerWidth:1280,console:{error:(e)=>{failed=true;throw e;}},Math,Number,String});
const source=fs.readFileSync('public/flight.js','utf8').replace(/^import .*;\r?\n/gm,'');
vm.runInContext(source,context);
assert(!failed);
vm.runInContext(`
 if(arms.length!==2||clamps.length!==4)throw Error('Launch connection missing');
 draw(sampleFlight(flight,0),-10);
 rocket.updateMatrixWorld(true);strongback.updateMatrixWorld(true);
 const end=new THREE.Vector3(6.15,0,0);arms[0].localToWorld(end);
 if(Math.abs(end.x+1.85)>1e-8)throw Error('Tower arm does not touch rocket');
 for(const t of [0,5,15,60,155,175,250,flight.entryTime,flight.landingTime,flight.duration]){
  const s=sampleFlight(flight,t);draw(s,t);telemetry(s);
  if(Math.abs(rocket.position.y-s.h-ROCKET_BASE)>1e-8)throw Error('Altitude scale mismatch');
  if(!Number.isFinite(camera.position.y))throw Error('Invalid camera');
 }
 const s=sampleFlight(flight,flight.duration);draw(s,flight.duration);
 if(Math.abs(landingPad.position.y)>1e-6||Math.abs(landingPad.position.x)>1e-6)throw Error('Landing pad misplaced');
 rocket.updateMatrixWorld(true);
 for(const leg of legs){const tip=leg.localToWorld(new THREE.Vector3(0,14,0));if(Math.abs(tip.y)>.01)throw Error('Leg misses ground');}
 reset();draw(sampleFlight(flight,0),-10);
 if(!upper.visible||Math.abs(strongback.rotation.z)>1e-8||arms.some(a=>a.rotation.y!==0))throw Error('Reset failed');
`,context);
console.log('PASS: scene initialization, arm contact, all flight phases, metre-scale altitude, camera tracking, grounded landing legs, and reset. Renderer mocked; no browser visual QA.');
