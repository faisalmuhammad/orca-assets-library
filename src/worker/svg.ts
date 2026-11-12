import { XMLParser, XMLValidator } from 'fast-xml-parser';
const elements=new Set('svg g defs title desc path rect circle ellipse line polyline polygon text tspan linearGradient radialGradient stop clipPath mask pattern use symbol'.split(' '));
const attrs=new Set('xmlns width height viewBox preserveAspectRatio id x y x1 y1 x2 y2 cx cy r rx ry d points transform opacity fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset clip-path clip-rule mask gradientUnits gradientTransform offset stop-color stop-opacity font-family font-size font-weight text-anchor dominant-baseline href xlink:href xmlns:xlink patternUnits patternContentUnits'.split(' '));
const escape=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function sanitizeSvg(source:string):string {
  if (source.length>2*1024*1024 || /<!DOCTYPE|<!ENTITY/i.test(source) || XMLValidator.validate(source)!==true) throw new Error('Unsafe or invalid SVG');
  const tree=new XMLParser({preserveOrder:true,ignoreAttributes:false,parseTagValue:false,processEntities:false}).parse(source) as Record<string,unknown>[];
  if(!tree.some(n=>'svg' in n)) throw new Error('Not an SVG document');
  let count=0;
  function nodes(list: Record<string,unknown>[], depth=0):string {
    if(depth>64) throw new Error('SVG nesting limit exceeded');
    return list.map(n=>{
      if(++count>25000) throw new Error('SVG complexity limit exceeded');
      if('#text' in n) return escape(String(n['#text']));
      const tag=Object.keys(n).find(k=>k!==':@'); if(!tag || !elements.has(tag)) return '';
      const a=(n[':@'] ?? {}) as Record<string,unknown>;
      const properties=Object.entries(a).flatMap(([key,v])=>{
        const k=key.replace(/^@_/,''), value=String(v);
        if(!attrs.has(k) || (k.endsWith('href')&&!/^#[\w.-]+$/.test(value))) return [];
        if (/url\(/i.test(value) && !/^url\(\s*#[\w.-]+\s*\)$/.test(value)) return [];
        if (/javascript:|data:|https?:|file:|expression\(|@import/i.test(value) && !k.startsWith('xmlns')) return [];
        if(k==='xmlns'&&value!=='http://www.w3.org/2000/svg') return [];
        if(k==='xmlns:xlink'&&value!=='http://www.w3.org/1999/xlink') return [];
        return [' '+k+'="'+escape(value)+'"'];
      }).join('');
      return '<'+tag+properties+'>'+nodes(n[tag] as Record<string,unknown>[] ?? [],depth+1)+'</'+tag+'>';
    }).join('');
  }
  return nodes(tree);
}
