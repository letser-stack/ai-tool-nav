import fs from 'fs';
import {enrich} from './llm.mjs';
import {clean} from './quality.mjs';
const AI=/\b(ai|llm|gpt|agent|agents|agentic|rag|diffusion|transformer|mcp|claude|openai|gemini|llama|copilot|ml|neural|vlm|embedding|inference|prompt)\b/i;
const now=Date.now(),day=864e5;
const get=async(u,h={})=>{const r=await fetch(u,{headers:{'user-agent':'ai-nav-bot',...h},signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(u+' '+r.status);return r.json();};
const items=[];const errors=[];
// HN
try{const since=Math.floor((now-7*day)/1000);
 const j=await get(`https://hn.algolia.com/api/v1/search?tags=show_hn&numericFilters=created_at_i>${since},points>15&hitsPerPage=200`);
 for(const h of j.hits){const t=h.title||'';if(!AI.test(t))continue;
  items.push({source:'HN',name:t,url:h.url||`https://news.ycombinator.com/item?id=${h.objectID}`,discuss:`https://news.ycombinator.com/item?id=${h.objectID}`,metric:h.points,metricLabel:'points',created:h.created_at});}
}catch(e){errors.push(String(e))}
// GitHub
try{const d=new Date(now-14*day).toISOString().slice(0,10);
 const h=process.env.GITHUB_TOKEN?{authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{};
 const j=await get(`https://api.github.com/search/repositories?q=created:>${d}+topic:llm&sort=stars&order=desc&per_page=50`,h);
 for(const r of j.items){const ageDays=Math.max(1,(now-Date.parse(r.created_at))/day);
  items.push({source:'GitHub',name:r.full_name,desc:r.description,url:r.html_url,metric:Math.round(r.stargazers_count/ageDays),metricLabel:`stars/天（共${r.stargazers_count}）`,created:r.created_at});}
}catch(e){errors.push(String(e))}
// HF models + spaces
for(const kind of ['models','spaces']){try{
 const j=await get(`https://huggingface.co/api/${kind}?sort=trendingScore&direction=-1&limit=30`);
 for(const m of j){items.push({source:'HF-'+kind,name:m.id,url:`https://huggingface.co/${kind==='spaces'?'spaces/':''}${m.id}`,metric:m.trendingScore??0,metricLabel:`trending（likes ${m.likes}）`,created:m.createdAt});}
}catch(e){errors.push(String(e))}}
// Product Hunt: API v2 requires token
if(process.env.PH_TOKEN){try{
 const r=await fetch('https://api.producthunt.com/v2/api/graphql',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${process.env.PH_TOKEN}`},body:JSON.stringify({query:'{posts(topic:"artificial-intelligence",order:VOTES,first:30,postedAfter:"'+new Date(now-2*day).toISOString()+'"){edges{node{name tagline url votesCount createdAt}}}}'})});
 const j=await r.json();for(const {node:n} of j.data.posts.edges)items.push({source:'PH',name:n.name,desc:n.tagline,url:n.url,metric:n.votesCount,metricLabel:'votes',created:n.createdAt});
}catch(e){errors.push('PH '+e)}}else errors.push('Product Hunt skipped: no PH_TOKEN');
// score: z within source, freshness decay
const W={HN:.20,GitHub:.20,'HF-models':.075,'HF-spaces':.075,PH:.25};
const by={};for(const i of items)(by[i.source]??=[]).push(i);
for(const [s,arr] of Object.entries(by)){const v=arr.map(i=>Math.log1p(i.metric));const m=v.reduce((a,b)=>a+b,0)/v.length;const sd=Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/v.length)||1;
 arr.forEach((i,k)=>{const z=(v[k]-m)/sd;const age=Math.max(0,(now-Date.parse(i.created))/day);i.score=+((z+3)*W[s]*Math.exp(-age/7)*10).toFixed(2);});}
items.sort((a,b)=>b.score-a.score);
const stats={raw:items.length,unsafeKeyword:0,merged:0,capped:0,unsafeLLM:0,nonAI:0};
let top=clean(items,stats).slice(0,130);const L=await enrich(top);const llmError=L.err;console.log('llm calls',L.calls);
top=top.filter(i=>{if(i.isAITool===false){stats.nonAI++;return false}if(i.unsafe){stats.unsafeLLM++;return false}return true}).slice(0,100);
stats.final=top.length;stats.tokens=L.usage;console.log('stats',JSON.stringify(stats));
fs.writeFileSync('data/hot.json',JSON.stringify({generatedAt:new Date().toISOString(),errors,llmError,stats,count:top.length,items:top},null,1));
console.log(items.length,'items',errors);items.slice(0,5).forEach(i=>console.log(i.score,i.source,i.name,i.metric,i.metricLabel));
