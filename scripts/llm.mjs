import fs from 'fs';
const CACHE='data/llm-cache.json';
const SC=['vibe-coding','no-code-apps','agents','game-dev','pm','content','image-design','video','audio','research'];
export async function enrich(items){
  const key=process.env.XAI_API_KEY, model=process.env.XAI_MODEL||'grok-4.20-0309-non-reasoning';
  const cache=fs.existsSync(CACHE)?JSON.parse(fs.readFileSync(CACHE)):{};
  let calls=0,err=null,usage={prompt:0,completion:0};
  for(const i of items){const id=i.source+':'+i.url;
    if(!cache[id]&&key&&!err){try{
      const r=await fetch('https://api.x.ai/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000),
        body:JSON.stringify({model,temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:`判断条目是否为可使用的AI工具/模型/开源项目（新闻、观点文章不算）。只输出JSON：{"isAITool":bool,"intro":"1-2句简体中文简介（必须用简体中文，不得照抄原文语言；不确定的事实不要写）","scenario":"${SC.join('|')}"}`},{role:'user',content:`${i.name}\n${i.desc||''}\n${i.url}`}]})});
      if(!r.ok)throw new Error('xAI '+r.status+' '+(await r.text()).slice(0,120));
      const j=await r.json();usage.prompt+=j.usage?.prompt_tokens||0;usage.completion+=j.usage?.completion_tokens||0;cache[id]=JSON.parse(j.choices[0].message.content);calls++;
    }catch(e){err=String(e)}}
    if(cache[id])Object.assign(i,{isAITool:cache[id].isAITool,intro:cache[id].intro,scenario:SC.includes(cache[id].scenario)?cache[id].scenario:null});
  }
  fs.writeFileSync(CACHE,JSON.stringify(cache,null,1));
  console.log('llm usage',JSON.stringify({model,calls,...usage}));return {calls,usage,err:key?err:'XAI_API_KEY missing; LLM enrichment skipped'};
}
