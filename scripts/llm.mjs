import fs from 'fs';
const CACHE='data/llm-cache.json';
export const SC={
 'vibe-coding':'AI 编程：代码编辑器、编码助手/编码Agent、代码审查与生成、开发者工具。例：Cursor、代码 lint、编码模型',
 'no-code-apps':'一句话建应用：用自然语言生成网站/App/原型的无代码平台。例：Lovable、Bolt、v0。普通App本身不算',
 'agents':'AI Agent/自动化：智能体框架、浏览器/电脑操控Agent、工作流自动化、MCP 服务器、Agent 记忆/评测基础设施',
 'game-dev':'游戏开发：游戏美术/3D资产生成、NPC、游戏引擎插件、AI 生成游戏',
 'pm':'产品经理工作流：PRD/需求文档、原型与线框图、用户调研与访谈、会议纪要、路线图、竞品分析、数据看板、项目管理与任务管理',
 'content':'内容创作：写作、文案、社媒运营、小说、翻译、通用对话助手',
 'image-design':'图像与设计：文生图模型、图像编辑、UI/设计系统、Logo/海报',
 'video':'视频与数字人：文生视频、剪辑、字幕、数字人',
 'audio':'音频：TTS 语音合成、配音、音乐生成、语音转写、语音助手',
 'research':'搜索与研究：AI 搜索、论文/文献工具、知识库问答、通用/多模态基础模型、模型评测基准',
 'productivity':'效率/其他：个人效率、记账理财、待办、本地模型运行器、桌面工具、教育学习等不属于以上的'};
const SYS=`你是 AI 工具分类员。只输出 JSON：{"isAITool":bool,"unsafe":bool,"intro":string,"scenario":string}
- isAITool：可使用的 AI 工具/模型/开源项目为 true；新闻、观点、纯演示视频、与 AI 无关为 false。
- unsafe：去审查(uncensored/abliterated)模型、NSFW/成人内容、换脸/深度伪造、绕过安全限制等为 true。
- intro：1-2 句简体中文简介（必须是简体中文，不要照抄英文/韩文/日文原文；只陈述输入中能看出的事实，不确定的不写，不要自相矛盾；除非输入明确写了本地/离线，否则不要声称“本地运行”）。
- scenario：从下列 key 中选最贴切的一个：
${Object.entries(SC).map(([k,v])=>`  ${k}: ${v}`).join('\n')}`;
const cjkOk=s=>{if(!s)return false;const c=(s.match(/[\u4e00-\u9fff]/g)||[]).length;const l=(s.match(/[A-Za-z\uac00-\ud7af\u3040-\u30ff]/g)||[]).length;return c>0&&c>=l*0.5&&!/[\uac00-\ud7af\u3040-\u30ff]/.test(s)};
export async function enrich(items){
  const key=process.env.XAI_API_KEY, model=process.env.XAI_MODEL||'grok-4.20-0309-non-reasoning';
  const cache=fs.existsSync(CACHE)?JSON.parse(fs.readFileSync(CACHE)):{};
  let calls=0,err=null,rejected=0,usage={prompt:0,completion:0};
  const ask=async(i,extra='')=>{const r=await fetch('https://api.x.ai/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000),
     body:JSON.stringify({model,temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:SYS},{role:'user',content:`${i.name}\n${i.desc||''}\n${i.url}\n来源:${i.source}${extra}`}]})});
    if(!r.ok)throw new Error('xAI '+r.status+' '+(await r.text()).slice(0,120));
    const j=await r.json();calls++;usage.prompt+=j.usage?.prompt_tokens||0;usage.completion+=j.usage?.completion_tokens||0;return JSON.parse(j.choices[0].message.content);};
  for(const i of items){const id=i.source+':'+i.url;
    const retry=cache[id]&&cache[id].isAITool&&!cjkOk(cache[id].intro)&&(cache[id].tries||1)<3;
    if((!cache[id]||cache[id].v!==2||retry)&&key&&!err){try{
      let o=await ask(i);
      if(o.isAITool&&!cjkOk(o.intro)){rejected++;o=await ask(i,'\n注意：上次简介不是简体中文，请务必用简体中文重写。');if(!cjkOk(o.intro))o.intro='';}
      cache[id]={...o,v:2,...(o.isAITool&&!o.intro?{tries:(cache[id]?.tries||0)+1}:{})};
    }catch(e){err=String(e)}}
    const c=cache[id];if(c)Object.assign(i,{isAITool:c.isAITool,unsafe:!!c.unsafe,intro:cjkOk(c.intro)?c.intro:'',scenario:SC[c.scenario]?c.scenario:'productivity'});
  }
  const OV=fs.existsSync('data/intro-overrides.json')?JSON.parse(fs.readFileSync('data/intro-overrides.json')):{};
  for(const i of items)if(OV[i.url])Object.assign(i,OV[i.url]);
  fs.writeFileSync(CACHE,JSON.stringify(cache,null,1));
  console.log('llm usage',JSON.stringify({model,calls,rejectedNonCJK:rejected,...usage}));
  return {calls,usage,rejected,err:key?err:'XAI_API_KEY missing; LLM enrichment skipped'};
}
