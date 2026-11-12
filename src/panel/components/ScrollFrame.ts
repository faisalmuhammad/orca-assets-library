import { el } from './dom';

// Shared by document previews and the main panel: the native scrolling element
// keeps wheel, touch and keyboard behavior while the overlay avoids layout shifts.
export function scrollFrame(scroller:HTMLElement,className:string) {
  const element=el('div','','scroll-frame '+className),scrollbar=el('div','','scrollbar'),thumb=el('div','','scroll-thumb');
  scrollbar.setAttribute('aria-hidden','true');scrollbar.append(thumb);element.append(scroller,scrollbar);
  let frame=0,disposed=false,drag:{clientY:number;scrollTop:number}|undefined;
  const update=()=>{
    if(disposed)return;
    const overflow=Math.max(0,scroller.scrollHeight-scroller.clientHeight),top=Math.max(0,Math.min(overflow,scroller.scrollTop));
    element.classList.toggle('can-scroll-down',overflow-top>1);element.classList.toggle('is-scrollable',overflow>1);
    const height=Math.min(scrollbar.clientHeight,Math.max(24,scrollbar.clientHeight*scroller.clientHeight/Math.max(1,scroller.scrollHeight)));
    thumb.style.height=height+'px';thumb.style.transform='translateY('+(overflow>0?top/overflow*(scrollbar.clientHeight-height):0)+'px)';
  };
  const schedule=()=>{if(disposed||frame)return;frame=requestAnimationFrame(()=>{frame=0;update();});};
  scrollbar.onpointerdown=e=>{
    if(e.button!==0)return;e.preventDefault();
    const travel=scrollbar.clientHeight-thumb.clientHeight;
    if(e.target!==thumb&&travel>0){const y=e.clientY-scrollbar.getBoundingClientRect().top-thumb.clientHeight/2;scroller.scrollTop=Math.max(0,Math.min(1,y/travel))*(scroller.scrollHeight-scroller.clientHeight);update();}
    drag={clientY:e.clientY,scrollTop:scroller.scrollTop};element.classList.add('is-dragging');scrollbar.setPointerCapture(e.pointerId);
  };
  scrollbar.onpointermove=e=>{if(!drag)return;const travel=scrollbar.clientHeight-thumb.clientHeight;if(travel>0)scroller.scrollTop=drag.scrollTop+(e.clientY-drag.clientY)/travel*(scroller.scrollHeight-scroller.clientHeight);};
  scrollbar.onpointerup=scrollbar.onpointercancel=scrollbar.onlostpointercapture=()=>{drag=undefined;element.classList.remove('is-dragging');};
  const resize=new ResizeObserver(schedule);
  const observe=()=>{resize.disconnect();resize.observe(scroller);for(const child of scroller.children)resize.observe(child);schedule();};
  // Only observe direct children; virtualized row redraws do not trigger a DOM scan.
  const mutation=new MutationObserver(observe);mutation.observe(scroller,{childList:true});
  scroller.addEventListener('scroll',schedule,{passive:true});observe();
  return {element,update,dispose:()=>{disposed=true;cancelAnimationFrame(frame);resize.disconnect();mutation.disconnect();scroller.removeEventListener('scroll',schedule);scrollbar.onpointerdown=scrollbar.onpointermove=scrollbar.onpointerup=scrollbar.onpointercancel=scrollbar.onlostpointercapture=null;}};
}
