import path from 'node:path';
import { readdir } from 'node:fs/promises';
import type { ChatSource,DiscoverySettings } from '../shared/types';
import { excluded,supported } from './file-watcher';
// Scan only a session-owned output directory, never a repository or all chats.
// Folder ownership confirms chat association, rather than a per-file tool write.
export async function collectChatAssets(source:ChatSource,settings:DiscoverySettings,stopped:()=>boolean,ingest:(file:string)=>Promise<void>) {
  let entries=0;
  async function visit(folder:string,depth:number):Promise<void>{
    if(stopped()||depth>12)return;
    for(const entry of await readdir(folder,{withFileTypes:true})){
      if(stopped())return;
      if(++entries>10000)throw new Error('Chat asset discovery reached its 10,000-entry limit.');
      const file=path.join(folder,entry.name),relative=path.relative(source.root,file);
      if(entry.isSymbolicLink()||excluded(relative,settings.excludedFolders)||relative.split(path.sep).some(p=>['video-tools','site-packages','imageio_ffmpeg'].includes(p)))continue;
      if(entry.isDirectory())await visit(file,depth+1);
      else if(entry.isFile()&&supported(file,settings.extensions))await ingest(file);
    }
  }
  try{await visit(source.root,0);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
}
