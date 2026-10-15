// Usage: node scripts/check-site.mjs [baseUrl]  (default http://localhost:4321) ; add --tools to check external tool URLs
import fs from 'fs';
const base=(process.argv.find(a=>a.startsWith('http'))||'http://localhost:4321').replace(/\/$/,'');
const S=JSON.parse(fs.readFileSync('src/data/scenarios.json'));const H=JSON.parse(fs.readFileSync('data/hot.json'));
const issues=[],ok=[];const UA={'user-agent':'Mozilla/5.0 Chrome/126 ai-nav-check'};
const pages=['/','/hot/','/llms.txt','/llms-full.txt','/robots.txt','/sitemap-index.xml',...S.map(s=>`/s/${s.slug}/`)];
const seen=new Set();const queue=[...pages];
while(queue.length){const p=queue.shift();if(seen.has(p))continue;seen.add(p);
 try{const r=await fetch(base+p,{headers:UA});if(r.status!==200){issues.push(`page ${p} -> ${r.status}`);continue}
  const html=await r.text();
  if(p.endsWith('/')){for(const m of html.matchAll(/href="(\/[^"#?]*)"/g)){const l=m[1];if(!seen.has(l)&&!l.startsWith('/_'))queue.push(l)}
   if(!/<link rel="canonical"/.test(html))issues.push(`no canonical ${p}`);if(!/application\/ld\+json/.test(html))issues.push(`no JSON-LD ${p}`);}
 }catch(e){issues.push(`page ${p} ${e.message}`)}}
ok.push(`pages+internal links checked: ${seen.size}`);
if(process.argv.includes('--tools'))for(const s of S)for(const t of s.tools){try{const r=await fetch(t.url,{headers:UA,redirect:'follow',signal:AbortSignal.timeout(15000)});if(r.status>=400&&r.status!==403)issues.push(`tool ${t.name} ${t.url} -> ${r.status}`);else if(r.status===403)ok.push(`tool ${t.name} 403 (bot protection, treated alive)`)}catch(e){issues.push(`tool ${t.name} ${t.url} ${e.cause?.code||e.message}`)}}
const ageH=(Date.now()-Date.parse(H.generatedAt))/36e5;(ageH<8?ok:issues).push(`hot.json age ${ageH.toFixed(1)}h`);
H.llmError?issues.push(`llmError: ${H.llmError}`):ok.push('llmError: none');
const noIntro=H.items.filter(i=>!i.intro).length;if(noIntro)issues.push(`${noIntro} hot items without intro`);
console.log('OK:\n '+ok.join('\n '));console.log(issues.length?'ISSUES:\n '+issues.join('\n '):'ISSUES: none');process.exit(issues.length?1:0);
