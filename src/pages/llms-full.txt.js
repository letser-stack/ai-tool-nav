import S from '../data/scenarios.json';import H from '../../data/hot.json';import {SITE} from '../site.config.mjs';
export function GET(){
 const out=[`# ${SITE.name} — 完整内容`,'',`> ${SITE.desc}`,`网站：${SITE.url}/ ；热榜更新时间：${H.generatedAt}（UTC）；定价未核实，以官网为准。`,''];
 for(const s of S){out.push(`## ${s.name}（${SITE.url}/s/${s.slug}/）`,s.desc,'');for(const t of s.tools)out.push(`### ${t.name}`,`- 官网：${t.url}`,`- 简介：${t.intro}`,`- 适合：${t.bestFor}`,'');}
 out.push('## AI 新工具热榜',`来源：GitHub、Hacker News、Hugging Face；地址 ${SITE.url}/hot/`,'');
 H.items.forEach((i,k)=>out.push(`${k+1}. ${i.name} — ${i.url}`,`   热度 ${i.score}｜来源 ${i.source}｜${i.metric} ${i.metricLabel}${i.scenario?'｜场景 '+i.scenario:''}`,`   ${i.intro||i.desc||''}`));
 return new Response(out.join('\n'),{headers:{'content-type':'text/plain; charset=utf-8'}});}
