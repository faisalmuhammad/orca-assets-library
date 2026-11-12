import { watch, type FSWatcher } from 'node:fs';
import { readdir,stat } from 'node:fs/promises';
import path from 'node:path';
import { EXCLUDED, EXTENSIONS } from '../shared/constants';
import type { Workspace } from '../shared/types';
export function excluded(relative:string,custom:string[]=[]):boolean {const parts=relative.split(/[\/\\]/);if(parts.some(p=>EXCLUDED.has(p)))return true;return custom.some(p=>relative===p||relative.startsWith(p.replace(/[\/\\]$/,'')+path.sep));}
export function supported(file:string,extensions:string[]=EXTENSIONS) {return extensions.includes(path.extname(file).slice(1).toLowerCase())&&!/(?:\.tmp|\.temp|~)$/.test(file);}
export class FileWatcher {
  watchers=new Map<string,FSWatcher[]>();private directories=new Set<string>();private stopped=false;private warned=false;private contexts=new Map<string,Workspace>();
  constructor(private change:(w:Workspace,file:string,removed:boolean)=>void,private error:(e:unknown)=>void,private custom:()=>string[]) {}
  async sync(workspaces:Workspace[]) {
    this.stopped=false;const roots=workspaces.filter(w=>w.root&&!w.reason).slice(0,24),ids=new Set(roots.map(w=>w.id));
    for(const [id,list]of this.watchers)if(!ids.has(id)||this.contexts.get(id)?.root!==roots.find(w=>w.id===id)?.root){for(const watcher of list)watcher.close();this.watchers.delete(id);}
    this.contexts=new Map(roots.map(w=>[w.id,w]));
    for(const w of roots)if(!this.watchers.has(w.id)) {
      this.watchers.set(w.id,[]);
      if(process.platform==='darwin'||process.platform==='win32') {
        try {const watcher=watch(w.root!,{recursive:true},(_,filename)=>{if(filename)this.event(w,path.join(w.root!,filename.toString()));});watcher.on('error',e=>{watcher.close();this.error(e);});this.watchers.get(w.id)!.push(watcher);}catch(e){this.error(e);}
      }else await this.directory(w,w.root!,0);
    }
  }
  private event(w:Workspace,file:string){const current=this.contexts.get(w.id);if(!current||current.root!==w.root)return;w=current;if(this.stopped||excluded(path.relative(w.root!,file),this.custom()))return;if(supported(file))void stat(file).then(()=>this.change(w,file,false),()=>this.change(w,file,true));else if(process.platform!=='darwin'&&process.platform!=='win32')void stat(file).then(s=>{if(s.isDirectory())void this.directory(w,file,path.relative(w.root!,file).split(path.sep).length);}).catch(()=>{});}
  private async directory(w:Workspace,folder:string,depth:number) {
    if(this.stopped||depth>16||this.directories.has(folder)||excluded(path.relative(w.root!,folder),this.custom()))return;
    if(this.directories.size>=128){if(!this.warned){this.warned=true;this.error(new Error('Directory watcher limit reached; explicit tool evidence still collects assets. Use discovery for unwatched folders.'));}return;}
    this.directories.add(folder);
    try {const watcher=watch(folder,(_,filename)=>{if(filename)this.event(w,path.join(folder,filename.toString()));});watcher.on('error',e=>{watcher.close();this.error(e);});this.watchers.get(w.id)?.push(watcher);for(const entry of await readdir(folder,{withFileTypes:true}))if(entry.isDirectory()&&!entry.isSymbolicLink())await this.directory(w,path.join(folder,entry.name),depth+1);}catch(e){this.error(e);}
  }
  async close(){this.stopped=true;for(const list of this.watchers.values())for(const watcher of list)watcher.close();this.watchers.clear();this.directories.clear();this.contexts.clear();}
}
