import type { ProjectAppearance } from '../../shared/types';
import { el, icon } from './dom';

const glyphs:Record<string,string>={box:'project-box',sparkles:'project-sparkles',code2:'project-code',codexml:'project-code',folder:'folder',book:'book',layers:'layers',blocks:'blocks',image:'image',video:'video',search:'search',settings:'settings',info:'info',copy:'copy'};
export function projectBadge(appearance?:ProjectAppearance){
  if(!appearance)return;
  const color=appearance.color&&/^#[a-f0-9]{6}$/i.test(appearance.color)?appearance.color:undefined;
  const name=appearance.iconName?.replace(/[-_]/g,'').toLowerCase()??'',glyph=Object.hasOwn(glyphs,name)?glyphs[name]:undefined;
  if(!glyph&&!color)return;
  const badge=glyph?icon(glyph):el('span','','project-color-dot');badge.classList.add('project-badge');badge.setAttribute('aria-hidden','true');
  if(color)badge.style.color=color;
  return badge;
}
