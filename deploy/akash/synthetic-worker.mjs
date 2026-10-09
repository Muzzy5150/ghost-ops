// Synthetic readiness worker only. No credentials, security gateway, inference or administration.
import {createServer} from "node:http";
const server=createServer((request,response)=>{if(request.method!=="GET"||request.url!=="/health"){response.writeHead(404);response.end();return;}response.writeHead(200,{"content-type":"application/json"});response.end(JSON.stringify({status:"ready",mode:"synthetic-preparation",modelCalls:0,ghostopsAuthority:false}));});
server.listen(8080,"0.0.0.0");
for(const signal of ["SIGTERM","SIGINT"])process.on(signal,()=>server.close(()=>process.exit(0)));
