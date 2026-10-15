import S from '../data/scenarios.json';import H from '../../data/hot.json';import {SITE} from '../site.config.mjs';
export function GET(){
 const t=[`# ${SITE.name}`,'',`> ${SITE.desc}`,'',`热榜更新时间：${H.generatedAt}（UTC）`,'','## 主要页面',`- [AI 新工具热榜](${SITE.url}/hot/)：每 6 小时自动更新`,`- [完整内容](${SITE.url}/llms-full.txt)`,'','## 场景',...S.map(s=>`- [${s.name}](${SITE.url}/s/${s.slug}/)：${s.desc} 推荐：${s.tools.map(x=>x.name).join('、')}`),'','## 热榜前 10',...H.items.slice(0,10).map((i,k)=>`${k+1}. [${i.name}](${i.url})：${i.intro||i.desc||''}`)].join('\n');
 return new Response(t,{headers:{'content-type':'text/plain; charset=utf-8'}});}
