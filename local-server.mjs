import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.txt':'text/plain','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png'};
const port=Number(process.env.PORT||4173);
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const name=decodeURIComponent(url.pathname)==='/'?'flight.html':decodeURIComponent(url.pathname).slice(1);
  const file=path.resolve(root,name),relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end('Forbidden');return;}
  if(!(await stat(file)).isFile())throw new Error('Not a file');
  const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is in use. Set PORT to another port or close the existing server.`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Falcon 9 is ready: http://127.0.0.1:${port}\nKeep this window open. Press Ctrl+C to stop.`));
