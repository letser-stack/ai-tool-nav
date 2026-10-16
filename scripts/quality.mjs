// Content safety blocklist, dedupe across sources, cap base-model derivatives.
export const BLOCK=/(uncensor|nsfw|abliterat|nud(e|ity)|porn|hentai|erotic|adult|18\+|face[-_ ]?swap|faceswap|deep[-_ ]?fake|undress|\bnsfw\b|lewd|jailbreak)/i;
const strip=s=>s.toLowerCase().replace(/^show hn:\s*/,'').replace(/[-_ ]?(gguf|comfy|quantized|demo|mlx|awq|gptq|fp8|int4|int8)$/g,'');
export function key(i){
  const u=i.url.toLowerCase().replace(/\/$/,'');
  const gh=u.match(/github\.com\/[^/]+\/([^/#?]+)/);if(gh)return 'n:'+strip(gh[1]);
  if(i.source.startsWith('HF'))return 'n:'+strip(i.name.split('/').pop());
  const hn=strip(i.name).split(/\s[–—-]\s|,|:/)[0].trim();
  return hn.split(/\s+/).length<=3?'n:'+hn.replace(/\s+/g,'-'):'u:'+u.replace(/^https?:\/\/(www\.)?/,'');
}
export function family(i){
  if(!i.source.startsWith('HF'))return null;
  const t=i.name.split('/').pop().toLowerCase().split(/[-_.]/).filter(x=>x&&!/^\d+$/.test(x)&&!/^v\d/.test(x)).filter((x,k,a)=>x!==a[k-1]);
  return t.slice(0,2).join('-');
}
export function clean(items,stats){
  const out=[],seen=new Map(),fam={};
  for(const i of items){ // items sorted by score desc
    const text=`${i.name} ${i.desc||''} ${i.url}`;
    if(BLOCK.test(text)){stats.unsafeKeyword++;continue}
    const k=key(i);
    if(seen.has(k)){const m=seen.get(k);if(!m.alsoOn.includes(i.source))m.alsoOn.push(i.source);m.mergedUrls.push(i.url);stats.merged++;continue}
    const f=family(i);if(f){fam[f]=(fam[f]||0)+1;if(fam[f]>2){stats.capped++;continue}}
    i.alsoOn=[];i.mergedUrls=[];seen.set(k,i);out.push(i);
  }
  return out;
}
