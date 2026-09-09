import fs from 'node:fs';
const html=fs.readFileSync('public/flight.html','utf8'),js=fs.readFileSync('public/flight.js','utf8');
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
const refs=[...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
const missing=refs.filter(x=>!ids.has(x));
if(missing.length)throw new Error(missing.join(','));
console.log('PASS: all control and telemetry element references resolve');
