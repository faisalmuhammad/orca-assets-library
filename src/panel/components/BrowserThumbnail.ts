import type { AssetRecord } from '../../shared/types';

/** Originals arrive through the worker; browser decoding never reads filesystem URLs. */
export async function browserThumbnail(asset:AssetRecord,loadOriginal:(asset:AssetRecord)=>Promise<string>):Promise<string> {
  const preview=await orca.plugin.request('library.thumbnail',{id:asset.id});
  if(preview.error)throw new Error(preview.error);
  if(preview.data?.startsWith('data:image/webp;base64,'))return preview.data;
  let url='';
  const isVideo=asset.mimeType.startsWith('video/'),image=new Image(),video=isVideo?document.createElement('video'):undefined;image.decoding='async';
  if(video){video.muted=true;video.playsInline=true;video.preload='auto';if(!video.canPlayType(asset.mimeType))throw new Error('Video format is not supported by this browser');}
  try {
    if(preview.needsOriginal)url=await loadOriginal(asset);
    else if(preview.data){
      const match=/^data:(image\/(?:png|jpeg|webp|gif|avif|svg\+xml));base64,([A-Za-z0-9+/]+={0,2})$/.exec(preview.data);
      if(!match)throw new Error('Invalid preview data');
      const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
      url=URL.createObjectURL(new Blob([bytes],{type:match[1]}));
    }else throw new Error('Preview unavailable');
    if(video){
      await new Promise<void>((resolve,reject)=>{
        const finish=(error?:Error)=>{clearTimeout(timer);video.onloadeddata=video.onerror=null;error?reject(error):resolve();};
        const timer=setTimeout(()=>finish(new Error('Video thumbnail timed out')),8000);
        video.onloadeddata=()=>finish();video.onerror=()=>finish(new Error('Video codec is not supported by this browser'));video.src=url;
      });
    }else{image.src=url;await image.decode();}
    const width=video?video.videoWidth:image.naturalWidth,height=video?video.videoHeight:image.naturalHeight;
    if(!width||!height||width*height>40_000_000)throw new Error('Asset exceeds preview dimensions');
    const ratio=Math.min(1,480/width,480/height),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));
    const context=canvas.getContext('2d');if(!context)throw new Error('Browser preview unavailable');
    context.drawImage(video??image,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/webp',.78);canvas.width=canvas.height=0;
    if(data.length>200_000)throw new Error('Thumbnail exceeds cache limit');
    // A cache write is optional; storage failures must not hide a valid preview.
    try{await orca.plugin.request('library.cacheThumbnail',{id:asset.id,contentHash:asset.contentHash,data});}catch{}
    return data;
  }finally{image.src='';if(video){video.pause();video.removeAttribute('src');video.load();}if(url)URL.revokeObjectURL(url);}
}
