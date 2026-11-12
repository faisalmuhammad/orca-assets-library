import type { AssetRecord } from '../../shared/types';
import { el,icon,button,matched,bytes,assetTypeLabel } from './dom';
export function assetCard(a:AssetRecord,query:string,project:boolean,actions:{info:()=>void;open:()=>void}) {
  const card=el('article','','asset-card');card.dataset.id=a.id;card.setAttribute('role','gridcell');
  const visual=el('div','','asset-visual'),isVideo=a.mimeType.startsWith('video/');
  const face=el('button','',isVideo?'asset-face':'asset-face checker');face.type='button';face.setAttribute('aria-label','Open '+a.filename+' in editor');face.title=a.relativePath;face.onclick=actions.open;
  card.onclick=e=>{if(!card.closest('.asset-list')||(e.target as Element).closest('button'))return;face.focus({preventScroll:true});actions.open();};
  const img=el('img');img.alt=a.filename;img.draggable=false;img.decoding='async';img.hidden=true;
  const placeholder=el('div','','placeholder');placeholder.append(icon(isVideo?'video':'image'),el('span',a.status==='missing'?'File unavailable':isVideo?assetTypeLabel(a):'','placeholder-label'));face.append(placeholder,img);
  if(a.status==='missing')card.classList.add('missing');else if(Date.now()-a.updatedAt<60000&&a.origin==='confirmed-agent'){const badge=el('span',a.status==='modified'?'Changed':'New','new-indicator');face.append(badge);}
  const actionsRow=el('div','','card-actions');const open=button('Open',actions.open,'card-action'),info=button('Info',actions.info,'card-action');open.setAttribute('aria-label','Open '+a.filename);info.setAttribute('aria-label','Info for '+a.filename);actionsRow.append(open,info);visual.append(face,actionsRow);
  const meta=el('div','','card-meta'),name=el('div','','filename');name.append(matched(a.filename,query));name.title=a.filename;
  const state=a.status==='missing'?'File unavailable':'';
  const summary=a.mimeType.startsWith('image/')?(state||(a.width&&a.height?a.width+' × '+a.height:assetTypeLabel(a))):assetTypeLabel(a)+(state?' · '+state:'');
  const detail=el('span',(project?a.worktreeName+' · ':'')+summary,'micro muted');
  const path=el('div','','asset-path micro');path.append(matched(a.relativePath,query));path.title=a.relativePath;const size=el('span',' · '+bytes(a.sizeBytes),'list-size');detail.append(size);
  meta.append(name,path,detail);card.append(visual,meta);return {card,img,placeholder,face};
}
