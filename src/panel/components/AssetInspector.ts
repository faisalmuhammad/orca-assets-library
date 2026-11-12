import type { AssetRecord } from '../../shared/types';
import { bytes,button,el,iconButton,assetTypeLabel } from './dom';
import { renderMarkdownPreview } from './MarkdownPreview';
import { scrollFrame } from './ScrollFrame';
export function inspector(a:AssetRecord,back:()=>void,copy:(text:string)=>void,open:()=>void,explorer:()=>void,load:()=>Promise<string>,report:(e:unknown)=>void) {
  const section=el('section','','inspector');section.setAttribute('aria-label','Asset inspector');
  const heading=el('div','','inspector-heading');const backButton=button('All Assets',back,'text-button','back');heading.append(backButton,el('span',assetTypeLabel(a),'micro muted'));
  const stage=el('div','','preview-stage checker');stage.tabIndex=0;stage.setAttribute('aria-label','Asset preview. Use zoom controls, then drag to pan.');
  const isHtml=a.mimeType==='text/html',isDocument=isHtml||a.mimeType==='text/markdown',isVideo=a.mimeType.startsWith('video/'),documentPreview=el('div','','markdown-preview');documentPreview.setAttribute('aria-label',isHtml?'HTML source preview':'Markdown preview');if(isDocument){stage.classList.remove('checker');stage.classList.add('document-stage');stage.setAttribute('aria-label','Document preview');stage.setAttribute('role','region');stage.append(documentPreview);}
  const video=isVideo?el('video'):undefined;if(video){stage.classList.remove('checker');stage.classList.add('video-stage');stage.tabIndex=-1;stage.setAttribute('aria-label','Video preview');video.controls=true;video.playsInline=true;video.preload='metadata';video.setAttribute('aria-label','Video preview for '+a.filename);video.hidden=true;}
  const image=el('img');image.alt=a.filename;image.draggable=false;const status=el('div',a.status==='missing'?'Original file unavailable':isDocument?'Loading document preview…':isVideo?'Loading video preview…':'Loading full preview…','placeholder');stage.append(status,video??image);image.hidden=true;
  const documentScroll=isDocument?scrollFrame(stage,'document-preview-frame'):undefined;
  let scale=1,x=0,y=0,drag:{x:number;y:number}|null=null,url='',disposed=false;
  const update=()=>{image.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';zoomLabel.textContent=Math.round(scale*100)+'%';};
  const controls=el('div','','preview-controls'),zoomLabel=el('span','100%','micro');
  const fit=()=>{scale=1;x=y=0;update();};controls.append(iconButton('Fit to view','fit',fit),iconButton('Zoom out','minus',()=>{scale=Math.max(.5,scale-.25);update();}),zoomLabel,iconButton('Zoom in','zoom',()=>{scale=Math.min(5,scale+.25);update();}),iconButton('Toggle transparency background','grid',()=>stage.classList.toggle('checker')));
  stage.onpointerdown=e=>{if(scale<=1)return;drag={x:e.clientX-x,y:e.clientY-y};stage.setPointerCapture(e.pointerId);};stage.onpointermove=e=>{if(drag){x=e.clientX-drag.x;y=e.clientY-drag.y;update();}};stage.onpointerup=()=>drag=null;
  stage.onkeydown=e=>{if(isDocument||isVideo)return;if(e.key==='0'){fit();return;}if(scale<=1)return;const d=24;if(e.key==='ArrowLeft')x+=d;else if(e.key==='ArrowRight')x-=d;else if(e.key==='ArrowUp')y+=d;else if(e.key==='ArrowDown')y-=d;else return;e.preventDefault();update();};
  const title=el('h2',a.filename),sub=el('p',(a.width&&a.height?a.width+' × '+a.height+' · ':'')+assetTypeLabel(a)+' · '+bytes(a.sizeBytes),'muted');
  const actions=el('div','','inspector-actions');const openButton=button('Open file',open,'primary','open');openButton.disabled=a.status==='missing';actions.append(openButton,button('Copy reference',()=>copy((isDocument||isVideo?'[':'![')+a.filename.replace(/[\[\]]/g,'')+']('+encodeURI(a.relativePath).replace(/[()]/g,c=>'%'+c.charCodeAt(0).toString(16))+')'),'secondary','copy'));
  const details=el('dl','','metadata');
  for(const [label,value]of [['Path',a.relativePath],['Worktree',a.worktreeName],['Agent',a.agent??'Unavailable'],['Tool',a.tool??'Unavailable'],['Updated',new Date(a.updatedAt).toLocaleString()],['Version',String(a.version)],['Status',a.status]]){details.append(el('dt',label),el('dd',value));}
  const paths=el('div','','path-actions');paths.append(button('Copy relative path',()=>copy(a.relativePath),'text-button'),button('Copy absolute path',()=>copy(a.absolutePath),'text-button'),button('Open in Explorer',explorer,'text-button','folder'),button('View original resolution',()=>{scale=Math.min(5,(a.width??stage.clientWidth)/Math.max(1,stage.clientWidth));update();},'text-button','expand'));
  section.append(heading,documentScroll?.element??stage,...(isVideo?[]:isDocument?[el('p',isHtml?'HTML source preview · Open file to view the page.':'Document preview · Open file to read the full document.','note')]:[controls]),title,sub,actions,details,paths);
  if(isDocument||isVideo)paths.lastElementChild?.remove();
  if(a.mimeType==='image/svg+xml')section.append(el('p','SVG preview removes scripts, external resources, styles and unsupported elements. Open the original to inspect its full source.','note'));
  let videoTimer:ReturnType<typeof setTimeout>|undefined;
  const videoUnavailable=()=>{clearTimeout(videoTimer);if(disposed)return;if(video)video.hidden=true;status.hidden=false;status.textContent='Video preview unavailable in this browser. Open file in Orca.';};
  if(video&&a.status!=='missing'&&!video.canPlayType(a.mimeType))videoUnavailable();
  else if(a.status!=='missing')void load().then(value=>{
    if(disposed||!section.isConnected){if(!isDocument)URL.revokeObjectURL(value);return;}
    if(isDocument){
      if(isHtml){
        const pre=el('pre');pre.append(el('code',value.slice(0,3000).split(/\r?\n/).slice(0,64).join('\n')));
        documentPreview.replaceChildren(pre);
      }else renderMarkdownPreview(documentPreview,value);
      status.hidden=true;documentScroll?.update();
    }else if(video){
      url=value;videoTimer=setTimeout(videoUnavailable,8000);video.onloadedmetadata=()=>{clearTimeout(videoTimer);if(disposed)return;if(!video.videoWidth||!video.videoHeight||video.videoWidth*video.videoHeight>40_000_000){videoUnavailable();return;}video.hidden=false;status.hidden=true;};video.onerror=videoUnavailable;video.src=value;
    }else{
      url=value;image.onload=()=>{image.hidden=false;status.hidden=true;};image.onerror=()=>{status.textContent='Preview unavailable. Open the original file.';};image.src=value;
    }
  }).catch(e=>{if(disposed)return;if(video)videoUnavailable();else status.textContent='Preview unavailable. Open the original file.';report(e);});
  return {section,backButton,dispose:()=>{disposed=true;clearTimeout(videoTimer);documentScroll?.dispose();if(video){video.onloadedmetadata=video.onerror=null;video.pause();video.removeAttribute('src');video.load();}if(url)URL.revokeObjectURL(url);}};
}
