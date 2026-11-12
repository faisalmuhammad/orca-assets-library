import { readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { DiscoverySettings, Progress, Workspace } from '../shared/types';
import { MAX_SCAN_ENTRIES } from '../shared/constants';
import { excluded, supported } from './file-watcher';
import { safePath } from './workspace-resolver';
const execute=promisify(execFile);
// Git supplies authoritative ignore semantics, including nested .gitignore and global excludes.
async function ignored(root:string,files:string[]):Promise<Set<string>> {
  if(!files.length)return new Set();
  try {const stdout=await new Promise<string>((resolve,reject)=>{const child=execFile('git',['-C',root,'check-ignore','-z','--stdin'],{timeout:5000,maxBuffer:256*1024},(error,stdout,stderr)=>{if(error)reject(Object.assign(error,{stdout,stderr}));else resolve(stdout);});child.stdin?.end(files.join('\0')+'\0');});return new Set(stdout.split('\0').filter(Boolean));}
  catch(e) {const error=e as {code?:number;stdout?:string;stderr?:string};if(error.code===1)return new Set((error.stdout??'').split('\0').filter(Boolean));if(error.stderr?.includes('not a git repository'))return new Set();throw new Error('Cannot read Git ignore rules; discovery stopped.');}
}
export async function discover(workspaces:Workspace[],settings:DiscoverySettings,signal:AbortSignal,progress:Progress,ingest:(w:Workspace,p:string)=>Promise<void>,notify:()=>void) {
  for(const w of workspaces) {
    if(!w.root||w.reason)continue;
    const starts=settings.includedFolders.length ? await Promise.all(settings.includedFolders.map(f=>safePath(w.root!,f))) : [w.root];
    const stack=starts.map(p=>({p,depth:0}));const visited=new Set<string>();
    while(stack.length&&!signal.aborted) {
      const {p,depth}=stack.pop()!;if(visited.has(p))continue;visited.add(p);
      if(progress.scanned>=MAX_SCAN_ENTRIES)throw new Error('Discovery reached its 100,000-entry limit. Narrow included folders.');
      let entries;try{entries=await readdir(p,{withFileTypes:true});}catch{progress.skipped++;continue;}
      const candidates=entries.filter(e=>!e.isSymbolicLink()&&!excluded(path.relative(w.root!,path.join(p,e.name)),settings.excludedFolders));
      const skip=new Set<string>();
      if(!settings.includeIgnored)for(let i=0;i<candidates.length;i+=128){const paths=candidates.slice(i,i+128).map(e=>path.relative(w.root!,path.join(p,e.name))+(e.isDirectory()?'/':''));for(const f of await ignored(w.root!,paths))skip.add(f);}
      for(const e of candidates) {
        if(signal.aborted)break;
        progress.scanned++;const file=path.join(p,e.name),rel=path.relative(w.root!,file)+(e.isDirectory()?'/':'');
        if(skip.has(rel)){progress.skipped++;continue;}
        if(e.isDirectory()){if(depth<16)stack.push({p:file,depth:depth+1});else progress.skipped++;continue;}
        if(!e.isFile()||!supported(file,settings.extensions))continue;
        try {if((await lstat(file)).size>settings.maxSizeMB*1024*1024){progress.skipped++;continue;}await ingest(w,file);progress.found++;} catch{progress.skipped++;}
        if(progress.found%8===0)notify();
      }
      notify();
    }
  }
}
