import fs from 'fs';
const data=JSON.parse(fs.readFileSync('src/data/scenarios.json'));
const UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const rows=[];
for(const s of data)for(const t of s.tools){
  let st='ERR',final='',note='';
  try{const r=await fetch(t.url,{redirect:'follow',headers:{'user-agent':UA},signal:AbortSignal.timeout(15000)});st=r.status;final=r.url;}catch(e){note=e.cause?.code||e.message}
  rows.push({scenario:s.slug,name:t.name,url:t.url,status:st,final,note});console.log(st,t.url,final!==t.url?'-> '+final:'',note);
}
fs.writeFileSync('data/link-report.json',JSON.stringify(rows,null,1));
