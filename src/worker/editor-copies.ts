import path from 'node:path';
import { mkdir,lstat,realpath,open,rename,unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash,randomUUID } from 'node:crypto';
import type { OrcaWorkerApi } from 'orca/worker';
import type { AssetRecord,Workspace } from '../shared/types';
import { readAsset } from './metadata-extractor';
import { safePath,within } from './workspace-resolver';
type CopyRecord={sourceHash:string;copyPath:string};
export class EditorCopies {
  private records=new Map<string,CopyRecord>();
  private pending=new Map<string,Promise<string>>();
  private initialized?:Promise<void>;
  private saves=Promise.resolve();
  constructor(private storage:OrcaWorkerApi['storage']){}
  private init(){return this.initialized??=(async()=>{
    const value=await this.storage.get('editor.copies.v1');
    if(Array.isArray(value))for(const entry of value.slice(-1000)){
      if(entry&&typeof entry==='object'&&!Array.isArray(entry)&&'id' in entry&&typeof entry.id==='string'&&'sourceHash' in entry&&typeof entry.sourceHash==='string'&&'copyPath' in entry&&typeof entry.copyPath==='string')this.records.set(entry.id,{sourceHash:entry.sourceHash,copyPath:entry.copyPath});
    }
  })();}
  async materialize(w:Workspace,a:AssetRecord,maxBytes:number):Promise<string>{
    await this.init();
    const sourceRoot=a.location==='chat'?a.sourceRoot:w.root;
    if(!w.root||!sourceRoot||!within(sourceRoot,a.absolutePath)||a.originalPath||(a.location==='chat'&&(!a.conversationId||!/^[A-Za-z0-9_-]{1,200}$/.test(a.conversationId))))throw new Error('Invalid working-copy request');
    const key=w.id+':'+a.id,existing=this.pending.get(key);if(existing)return existing;
    const task=this.copy(w,a,key,maxBytes).finally(()=>this.pending.delete(key));this.pending.set(key,task);return task;
  }
  private async copy(w:Workspace,a:AssetRecord,key:string,maxBytes:number):Promise<string>{
    const sourceRoot=a.location==='chat'?a.sourceRoot!:w.root!,root=await realpath(w.root!),relative=path.relative(sourceRoot,a.absolutePath);
    const target=path.join(root,'.orca','assets-library','opened',a.location==='chat'?a.conversationId!:'worktree',relative);
    if(!relative||!within(root,target))throw new Error('Working copy would leave the worktree');
    const saved=this.records.get(key);
    if((saved?.sourceHash===a.contentHash&&saved.copyPath===target)||a.originalContentHash===a.contentHash){
      try{const info=await lstat(target);if(info.isFile()&&!info.isSymbolicLink())return await safePath(root,target);}
      catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    }
    const data=await readAsset(sourceRoot,a.absolutePath,maxBytes),sourceHash=createHash('sha256').update(data.bytes).digest('hex');
    if(sourceHash!==a.contentHash)throw new Error('Asset changed while preparing its copy; retry after writes settle');
    let folder=root;
    for(const part of path.relative(root,path.dirname(target)).split(path.sep)){
      folder=path.join(folder,part);
      await safePath(root,path.dirname(folder));
      try{await mkdir(folder,{mode:0o700});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}
      const info=await lstat(folder);if(!info.isDirectory()||info.isSymbolicLink()||!within(root,await realpath(folder)))throw new Error('Working-copy folder is unsafe');
    }
    let copyHash:string|undefined;
    try{const info=await lstat(target);if(!info.isFile()||info.isSymbolicLink())throw new Error('Working-copy destination is unsafe');if(info.size===0||info.size>maxBytes)return await safePath(root,target);const copy=await readAsset(root,target,maxBytes);copyHash=createHash('sha256').update(copy.bytes).digest('hex');}
    catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    const previous=this.records.get(key);
    // Reuse edited copies. Only refresh a copy that still matches our last write.
    const lastWriteHash=previous?.copyPath===target?previous.sourceHash:a.originalContentHash;
    if(copyHash&&copyHash!==sourceHash&&copyHash!==lastWriteHash)return await safePath(root,target);
    if(copyHash!==sourceHash){
      const temporary=path.join(path.dirname(target),'.library-copy-'+randomUUID());
      const handle=await open(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|(constants.O_NOFOLLOW??0),0o600);
      try{await handle.writeFile(data.bytes);await handle.utimes(new Date(data.mtime),new Date(data.mtime));await handle.close();await safePath(root,path.dirname(target));await rename(temporary,target);}
      finally{await handle.close().catch(()=>{});await unlink(temporary).catch(()=>{});}
    }
    this.records.delete(key);this.records.set(key,{sourceHash,copyPath:target});
    const values=()=>[...this.records].map(([id,v])=>({id,...v}));
    while(this.records.size>256||Buffer.byteLength(JSON.stringify(values()))>128*1024)this.records.delete(this.records.keys().next().value!);
    const snapshot=values(),save=this.saves.catch(()=>{}).then(()=>this.storage.set('editor.copies.v1',snapshot));this.saves=save;await save;
    return await safePath(root,target);
  }
}
