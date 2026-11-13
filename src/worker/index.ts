import type { OrcaWorkerApi } from 'orca/worker';
import type { JsonValue, PluginRequests, PluginRequestInput, PluginRequestOutput } from 'orca/host';
import '../shared/protocol';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { CHUNK_SIZE, DEFAULT_SETTINGS, EXTENSIONS } from '../shared/constants';
import type { AssetOrigin, AssetRecord, ChatSource, DiscoverySettings, LibraryContext, Progress, Query, ToolEvent, Workspace } from '../shared/types';
import {isGeneratedAsset} from '../shared/asset-identity';
import { selectAssets } from '../shared/query';
import { chooseActive, resolveWorkspace, safePath, within } from './workspace-resolver';
import { AgentObserver, evidence } from './agent-observer';
import { AssetIndex } from './asset-index';
import { FileWatcher, excluded, supported } from './file-watcher';
import { Persistence } from './persistence';
import { ThumbnailService } from './thumbnail-service';
import { validateMarkdown, markdownThumbnail } from './markdown';
import { validateHtml, htmlThumbnail } from './html';
import { extract, readAsset, validatedInput, imageMetadata } from './metadata-extractor';
import { reconcileWorkspace } from './workspace-reconciler';
import { NativeWorkspaceAdapter } from './native-workspace-adapter';
import { repairRenamedPluginPaths } from './asset-path-migration';
import { openOriginal, type BrowserOpen } from './file-actions';
import { EditorCopies } from './editor-copies';
import { NativeWorktreeAdapter } from './native-worktree-adapter';
import { collectChatAssets } from './chat-asset-discovery';
import { videoMetadata } from './video-metadata';
let shutdown:(()=>Promise<void>)|undefined;
const message=(e:unknown)=>e instanceof Error?e.message:String(e);
const invalid=(text:string)=>Object.assign(new Error(text),{code:'invalid_params'});
export function settingsInput(input:unknown):DiscoverySettings {
  if(!input||typeof input!=='object')throw invalid('Invalid discovery settings');const v=input as DiscoverySettings;
  if(v.includeUnavailable!==undefined&&typeof v.includeUnavailable!=='boolean')throw invalid('Include unavailable files must be enabled or disabled');
  if(!Array.isArray(v.includedFolders)||!Array.isArray(v.excludedFolders)||!Array.isArray(v.extensions)||typeof v.includeIgnored!=='boolean'||!Number.isFinite(v.maxSizeMB)||v.maxSizeMB<1||v.maxSizeMB>64)throw invalid('Use a file-size limit from 1 to 64 MB');
  for(const f of [...v.includedFolders,...v.excludedFolders])if(typeof f!=='string'||f.length>500||path.isAbsolute(f)||f.split(/[\/\\]/).includes('..'))throw invalid('Folders must be relative paths inside the worktree');
  if(v.includedFolders.length>32||v.excludedFolders.length>64||!v.extensions.length||v.extensions.some(e=>!EXTENSIONS.includes(e)))throw invalid('Choose supported asset extensions');
  return {includedFolders:v.includedFolders.filter(Boolean),excludedFolders:v.excludedFolders.filter(Boolean),extensions:[...new Set(v.extensions)],maxSizeMB:v.maxSizeMB,includeIgnored:v.includeIgnored,includeUnavailable:v.includeUnavailable??false};
}
export default async function activate(orca:OrcaWorkerApi,options?:{nativeWorkspaces?:NativeWorkspaceAdapter;generatedHistory?:NativeWorktreeAdapter|false;openBrowser?:BrowserOpen}) {
  let stopped=false,workspaces:Workspace[]=[],active:Workspace|null=null,settings={...DEFAULT_SETTINGS};let refreshTask:Promise<void>|undefined;
  const subscriptions:{dispose():void}[]=[],terminals=new Map<string,string>(),aliases=new Map<string,string>(),warnings=new Set<string>();
  const report=(e:unknown)=>{const s=message(e);if(warnings.has(s))return;warnings.add(s);while(warnings.size>8)warnings.delete(warnings.values().next().value!);orca.log('Assets Library: '+s);};
  let postTimer:ReturnType<typeof setTimeout>|undefined;
  const changed=()=>{if(stopped||postTimer)return;postTimer=setTimeout(()=>{postTimer=undefined;if(!stopped)orca.panels.post('library.changed',{revision:index.revision});},120);};
  const persistence=new Persistence(orca.storage,report),thumbs=new ThumbnailService(orca.storage),index=new AssetIndex(persistence,thumbs,changed),observer=new AgentObserver();
  const editorCopies=new EditorCopies(orca.storage);
  let chain=Promise.resolve();
  const queue=<T>(task:()=>Promise<T>):Promise<T>=>{const next=chain.then(task);chain=next.then(()=>{},report);return next;};
  let loadedContext='',reconcileController:AbortController|undefined;
  const reconciliations=new Set<Promise<void>>();
  const nativeWorkspaces=options?.nativeWorkspaces??new NativeWorkspaceAdapter();
  const generatedHistory=options?.generatedHistory===false?undefined:options?.generatedHistory??new NativeWorktreeAdapter();
  let historyRunning=false,historyWorkspace='';
  const chatSources=new Map<string,{worktreeId:string;source:ChatSource}>();
  function sourceFor(a:AssetRecord){
    const owner=a.sourceRoot?chatSources.get(a.sourceRoot):undefined;
    return owner?.worktreeId===a.worktreeId&&owner.source.conversationId===a.conversationId&&within(owner.source.root,a.originalPath??a.absolutePath)?owner.source:undefined;
  }
  let collectionProgress:Progress={status:'idle',found:0,scanned:0,skipped:0};
  function collectWorktreeHistory(){
    const w=active;if(!generatedHistory||!w?.root||historyRunning||stopped)return;historyRunning=true;
    const current:Progress={status:'running',found:0,scanned:0,skipped:0};
    if(historyWorkspace!==w.id+':'+w.root){historyWorkspace=w.id+':'+w.root;collectionProgress=current;changed();}
    const task=(async()=>{
      const stoppedHere=()=>stopped||active?.id!==w.id;
      const ingest=async(file:string,event?:ToolEvent,source?:ChatSource)=>{
        current.scanned++;if(stoppedHere())return;
        const root=source?.root??w.root!;
        if(!supported(file,settings.extensions)||excluded(path.relative(root,file),settings.excludedFolders))return;
        try{
          const canonical=await safePath(root,file),s=await stat(canonical),known=index.records.get(index.id(w,canonical));
          if(known?.originalPath===canonical){
            // Keep copies already opened/edited, but never create or update one
            // during discovery. If absent, recover the chat original in place.
            try{const copy=await safePath(w.root!,known.absolutePath),cs=await stat(copy);
              if(known.status==='missing'||known.updatedAt!==cs.mtimeMs||known.sizeBytes!==cs.size)await queue(()=>index.ingest(w,copy,known.origin,settings.maxSizeMB*1024*1024));
              return;
            }catch{ /* Fall through to the original; no copy is written. */ }
          }
          if(known?.absolutePath===canonical&&known.worktreeId===w.id&&known.projectId===w.libraryProjectId&&known.status!=='missing'&&known.updatedAt===s.mtimeMs&&known.sizeBytes===s.size)return;
          await queue(async()=>{if(!stoppedHere()){
            await index.ingest(w,canonical,source?'chat-output':'confirmed-agent',settings.maxSizeMB*1024*1024,event,source);
            current.found++;
          }});
        }catch(e){
          if((e as NodeJS.ErrnoException).code==='EACCES')report('Could not read asset '+path.basename(file)+': '+message(e));
        }
      };
      try{
        const sources=await generatedHistory.sources(w,nativeWorkspaces.aliases);
        if(stoppedHere())return;
        for(const [root,owner]of chatSources)if(owner.worktreeId===w.id)chatSources.delete(root);
        for(const source of sources)chatSources.set(source.root,{worktreeId:w.id,source});
        for(const source of sources){
          await collectChatAssets(source,settings,stoppedHere,file=>ingest(file,undefined,source));
          for(const a of index.records.values())if(a.worktreeId===w.id&&a.sourceRoot===source.root){
            try{await stat(await safePath(a.originalPath?w.root!:source.root,a.absolutePath));}catch{index.missing(a.id);}
          }
        }
      }catch(e){for(const [root,owner]of chatSources)if(owner.worktreeId===w.id)chatSources.delete(root);report('Chat output discovery unavailable: '+message(e));}
      for(const candidate of await generatedHistory.assets(w,nativeWorkspaces.aliases)){
        if(stoppedHere())return;await ingest(candidate.file,candidate.event);
      }
    })().then(()=>{current.status='complete';},e=>{current.status='failed';current.message=message(e);report('Worktree chat file history unavailable: '+message(e));}).finally(()=>{historyRunning=false;if(collectionProgress===current)changed();});
    reconciliations.add(task);void task.finally(()=>reconciliations.delete(task));
  }
  let nativePanes=new Map<string,string>();
  const pending=new Map<string,{w:Workspace;file:string;origin:AssetOrigin;event?:ToolEvent;timer:ReturnType<typeof setTimeout>}>();
  function schedule(w:Workspace,file:string,origin:AssetOrigin,event?:ToolEvent) {
    const root=w.root;
    if(stopped||!root||!supported(file,settings.extensions)||excluded(path.relative(root,file),settings.excludedFolders))return;
    const k=w.id+':'+file,prev=pending.get(k);if(prev)clearTimeout(prev.timer);
    const candidate={w,file,origin:prev?.origin==='confirmed-agent'?prev.origin:origin,event:event??prev?.event,timer:setTimeout(()=>{pending.delete(k);void queue(async()=>{if(stopped)return;await index.ingest(w,file,candidate.origin,settings.maxSizeMB*1024*1024,candidate.event);}).catch(e=>{if(candidate.origin==='confirmed-agent')report(e);});},550)};
    if(pending.size>=2048&&!prev){report('Too many pending filesystem changes; reopen the worktree or refresh generated assets after writes settle.');clearTimeout(candidate.timer);return;}
    pending.set(k,candidate);
  }
  const watcher=new FileWatcher((w,file,removed)=>{
    const known=index.records.get(index.id(w,file));
    if(known&&path.resolve(file)!==known.absolutePath)return;
    if(removed){if(known)index.missing(known.id);return;}
    if(known&&isGeneratedAsset(known))schedule(w,file,known.origin);
  },report,()=>settings.excludedFolders);
  async function refreshNativeWorkspaces(){
    if(stopped)return;
    const previousAppearance=JSON.stringify(workspaces.map(w=>w.projectAppearance));
    try{const warning=await nativeWorkspaces.sync(workspaces);if(warning)report(warning);}catch(e){report('Native workspace inventory unavailable: '+message(e));}
    if(previousAppearance!==JSON.stringify(workspaces.map(w=>w.projectAppearance)))changed();
    for(const [alias,id]of nativeWorkspaces.aliases)aliases.set(alias,id);
    const currentPanes=new Map(nativeWorkspaces.activities.map(a=>[a.paneKey,a.workspaceId]));
    for(const [pane,workspaceId]of nativePanes)if(!currentPanes.has(pane))observer.set(workspaceId,pane,'done',Date.now());
    for(const a of nativeWorkspaces.activities)observer.set(a.workspaceId,a.paneKey,a.state,a.startedAt);nativePanes=currentPanes;
    if(!active&&nativeWorkspaces.activeWorkspaceId)active=workspaces.find(w=>w.id===nativeWorkspaces.activeWorkspaceId)??null;
    collectWorktreeHistory();
  }
  const initialized=(async()=>{
    await thumbs.init();
    // Retire ordinary records saved by earlier broad/timing-based discovery.
    for(const a of await persistence.load()){
      if(isGeneratedAsset(a))index.restore(a);
      else persistence.remove(a.id);
    }
    const v=await orca.storage.get('discovery.settings.v1');if(v)try{settings=settingsInput(v);}catch{report('Saved settings were invalid; using defaults.');}if(await orca.storage.get('discovery.formats.v2')!==true){const previousDefaults=['png','jpg','jpeg','webp','svg','gif','avif'];if(settings.extensions.length===previousDefaults.length&&previousDefaults.every(e=>settings.extensions.includes(e))){settings={...settings,extensions:[...settings.extensions,'md','markdown']};await orca.storage.set('discovery.settings.v1',settings as unknown as JsonValue);}await orca.storage.set('discovery.formats.v2',true);}if(await orca.storage.get('discovery.formats.v3')!==true){const previousDefaults=EXTENSIONS.filter(e=>!['mp4','webm','html','htm'].includes(e));if(settings.extensions.length===previousDefaults.length&&previousDefaults.every(e=>settings.extensions.includes(e))){settings={...settings,extensions:[...settings.extensions,'mp4','webm']};await orca.storage.set('discovery.settings.v1',settings as unknown as JsonValue);}await orca.storage.set('discovery.formats.v3',true);}
    if(await orca.storage.get('discovery.formats.v4')!==true){
      const previousDefaults=EXTENSIONS.filter(e=>!['html','htm'].includes(e));
      if(settings.extensions.length===previousDefaults.length&&previousDefaults.every(e=>settings.extensions.includes(e))){
        settings={...settings,extensions:[...settings.extensions,'html','htm']};
        await orca.storage.set('discovery.settings.v1',settings as unknown as JsonValue);
      }
      await orca.storage.set('discovery.formats.v4',true);
    }
  })();
  function context():LibraryContext {return {active,workspaces,reason:active?.reason ?? (!active?'Orca could not identify the active worktree unambiguously. Open a local workspace with a unique name.':undefined),warnings:[...warnings],refreshing:!!refreshTask,collectionProgress,settings,canOpen:orca.host.has('editor.open'),watching:watcher.watchers.size};}
  async function refreshContext() {
    await initialized;if(stopped)return;
    if(!orca.host.has('workspace.list'))throw new Error('This Orca does not expose workspace.list.');
    const listed=await orca.host.call('workspace.list');
    const next:Workspace[]=[];
    for(const w of listed.workspaces)next.push(await resolveWorkspace(w));
    if(!listed.truncated){for(const w of workspaces)if(!next.some(n=>n.id===w.id)){observer.remove(w.id);for(const a of index.records.values())if(a.worktreeId===w.id)index.missing(a.id);}}
    else warnings.add('Orca truncated its workspace list; project coverage may be incomplete.');
    workspaces=next;await repairRenamedPluginPaths(workspaces,index,settings.maxSizeMB*1024*1024);active=chooseActive(await orca.host.call('workspace.readContext'),workspaces,terminals);
    await refreshNativeWorkspaces();
    // Prioritize current project without excluding evidence from other listed roots.
    const priority=(w:Workspace)=>w.id===active?.id?2:w.libraryProjectId===active?.libraryProjectId?1:0;
    const prioritized=[...workspaces].sort((a,b)=>priority(b)-priority(a));
    await watcher.sync(prioritized);if(prioritized.filter(w=>w.root).length>24)warnings.add('Watching 24 local workspaces; explicit tool evidence still indexes other listed worktrees.');
    if(active){const agents=await orca.host.call('agents.list');for(const a of agents.agents)if(a.terminalId){terminals.set(a.terminalId,active.id);observer.set(active.id,a.terminalId,a.state,a.stateStartedAt);}}
    const targets=workspaces.filter(w=>w.root&&!w.reason&&w.id===active?.id);
    const loadKey=active?.root?active.id+':'+active.libraryProjectId+':'+targets.map(w=>w.id+':'+w.root).sort().join('|'):'';
    if(loadKey!==loadedContext){
      loadedContext=loadKey;reconcileController?.abort();reconcileController=undefined;
      if(loadKey){
        const controller=new AbortController();reconcileController=controller;
        const task=reconcileWorkspace(targets,[...index.records.values()],{...settings},controller.signal,async(w,file,origin)=>{
          await queue(async()=>{if(stopped||controller.signal.aborted||!workspaces.some(current=>current.id===w.id&&current.root===w.root))return;await index.ingest(w,file,origin,settings.maxSizeMB*1024*1024);});
        },id=>{if(!stopped&&!controller.signal.aborted)index.missing(id);},report).catch(e=>{if(!controller.signal.aborted)report(e);});
        reconciliations.add(task);void task.finally(()=>reconciliations.delete(task));
      }
    }
    orca.panels.post('library.contextChanged',{revision:index.revision});
  }
  function workspaceFor(e:{workspaceId:string|null;terminalId?:string;workspaceListId?:string}):Workspace|undefined {const id=e.workspaceListId ?? (e.workspaceId ? aliases.get(e.workspaceId) ?? e.workspaceId : undefined);let w=workspaces.find(w=>w.id===id);if(!w&&e.terminalId){const mapped=terminals.get(e.terminalId);w=workspaces.find(w=>w.id===mapped);if(w&&e.workspaceId)aliases.set(e.workspaceId,w.id);}return w;}
  const before=new Map<string,{at:number;fingerprints:Promise<Map<string,string|null>>}>();
  const key=(e:ToolEvent)=>[e.agent,e.workspaceId,e.terminalId,e.callId??e.tool].join(':');
  async function fingerprint(w:Workspace,file:string):Promise<string|null> {try{const {bytes}=await readAsset(w.root!,file,settings.maxSizeMB*1024*1024);return createHash('sha256').update(bytes).digest('hex');}catch{return null;}}
  subscriptions.push(orca.hooks.on('agent.tool.before',(event,next)=>{
    const e=event as ToolEvent,w=workspaceFor(e),ev=evidence(e);
    if(w?.root&&ev){const at=Date.now();before.set(key(e),{at,fingerprints:Promise.all(ev.paths.slice(0,128).map(async p=>[p,await fingerprint(w,p)] as const)).then(pairs=>new Map(pairs))});if(before.size>512)before.delete(before.keys().next().value!);}
    return next(event);
  }));
  subscriptions.push(orca.hooks.on('agent.tool.after',event=>{
    const e=event as ToolEvent,snapshot=before.get(key(e));before.delete(key(e));
    void queue(async()=>{
      await initialized;const w=workspaceFor(e),ev=evidence(e);if(!w?.root||!ev)return;
      if(e.terminalId)terminals.set(e.terminalId,w.id);
      const fingerprints=await snapshot?.fingerprints;
      for(const file of ev.paths.slice(0,128)) {
        if(!supported(file))continue;
        const current=await fingerprint(w,file);if(!current)continue;
        const hasBefore=fingerprints?.has(file), old=fingerprints?.get(file);
        // Explicit output paths are affirmative evidence. Input paths need observed change.
        if(ev.kind==='output'||(hasBefore&&current!==old))schedule(w,file,'confirmed-agent',e);
      }
    }).catch(report);
  }));
  subscriptions.push(orca.hooks.on('agent.launch.before',(e,next)=>{const w=workspaceFor(e);if(w&&e.terminalId)terminals.set(e.terminalId,w.id);return next(e);}));
  subscriptions.push(orca.events.on('agent.status.changed',e=>{
    const w=workspaceFor(e);if(w){if(e.terminalId)terminals.set(e.terminalId,w.id);observer.set(w.id,e.terminalId??e.paneKey,e.state,e.receivedAt);}changed();
  }));
  for(const event of ['workspace.created','workspace.removed'] as const)subscriptions.push(orca.events.on(event,e=>{const match=workspaces.find(w=>w.path===e.path);if(match)aliases.set(e.workspaceId,match.id);void queue(async()=>{await refreshContext();const listed=workspaces.find(w=>w.path===e.path);if(listed)aliases.set(e.workspaceId,listed.id);}).catch(report);}));
  subscriptions.push(orca.events.on('workspace.changed',()=>{void queue(refreshContext).catch(report);}));
  async function record(id:string) {await initialized;const a=index.records.get(id);if(!a)throw invalid('Unknown asset');const w=workspaces.find(w=>w.id===a.worktreeId);if(!w?.root||w.reason)throw new Error('Asset worktree is unavailable');const source=a.location==='chat'&&!a.originalPath?sourceFor(a):undefined,root=a.location==='chat'&&!a.originalPath?source?.root:w.root;if(!isGeneratedAsset(a)||!root||!within(root,a.absolutePath))throw invalid('Asset is not owned by this worktree or its chats');await safePath(root,a.absolutePath);return {a,w,root,source};}
  function handle<K extends keyof PluginRequests>(name:K,handler:(input:PluginRequestInput<K>)=>PluginRequestOutput<K>|Promise<PluginRequestOutput<K>>) {subscriptions.push(orca.panels.handle(name,async input=>JSON.parse(JSON.stringify(await handler(input)))));}
  handle('library.context',async()=>{await initialized;if(!workspaces.length)await queue(refreshContext);return context();});
  handle('library.list',async q=>{
    await initialized;if(!q||!['project','worktree'].includes(q.scope)||!['generated','discovered'].includes(q.mode))throw invalid('Invalid gallery query');
    const assets=selectAssets([...index.records.values()].filter(a=>a.location!=='chat'||a.originalPath||sourceFor(a)),active,{...q,scope:'worktree',mode:'generated',includeUnavailable:settings.includeUnavailable}), offset=Math.max(0,Math.floor(q.offset??0)),limit=Math.min(100,Math.max(1,Math.floor(q.limit??80)));
    return {assets:assets.slice(offset,offset+limit),total:assets.length,revision:index.revision};
  });
  handle('library.detail',async({id})=>{await initialized;const a=index.records.get(id);if(!a)throw invalid('Unknown asset');return a;});
  handle('library.thumbnail',async({id})=>{
    try{const {a,root}=await record(id);const cached=await thumbs.get(a.contentHash);if(cached)return {mimeType:cached.slice(5,cached.indexOf(';')),data:cached};
      if(a.mimeType==='text/markdown'){const {bytes}=await readAsset(root,a.absolutePath,Math.min(2,settings.maxSizeMB)*1024*1024),data=markdownThumbnail(validateMarkdown(bytes));return {mimeType:'image/svg+xml',data:'data:image/svg+xml;base64,'+data.toString('base64')};}
      if(a.mimeType==='text/html'){const {bytes}=await readAsset(root,a.absolutePath,Math.min(2,settings.maxSizeMB)*1024*1024),data=htmlThumbnail(validateHtml(bytes));return {mimeType:'image/svg+xml',data:'data:image/svg+xml;base64,'+data.toString('base64')};}
      return {mimeType:a.mimeType,needsOriginal:true};
    }catch(e){return {mimeType:'image/webp',error:message(e)};}
  });
  handle('library.cacheThumbnail',async({id,contentHash,data})=>{
    const {a}=await record(id);if(a.contentHash!==contentHash)return {stored:false};
    if(typeof data!=='string'||data.length>200_000||!/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(data))throw invalid('Invalid thumbnail');
    const bytes=Buffer.from(data.slice(data.indexOf(',')+1),'base64'),metadata=imageMetadata(validatedInput(bytes));
    if(metadata.mimeType!=='image/webp'||metadata.width>480||metadata.height>480||bytes.length>144*1024)throw invalid('Thumbnail exceeds bounds');
    await thumbs.put(contentHash,bytes);return {stored:true};
  });
  const originals=new Map<string,{bytes:Buffer;hash:string;at:number}>();
  handle('library.documentPreview',async({id})=>{
    const {a,root}=await record(id);if(!['text/markdown','text/html'].includes(a.mimeType))throw invalid('Not a supported text document');
    const data=await readAsset(root,a.absolutePath,Math.min(2,settings.maxSizeMB)*1024*1024);
    return {text:(a.mimeType==='text/html'?validateHtml(data.bytes):validateMarkdown(data.bytes)).slice(0,3000).split(/\r?\n/).slice(0,64).join('\n')};
  });
  handle('library.preview',async({id,offset,contentHash})=>{
    if(!Number.isInteger(offset)||offset<0||offset%CHUNK_SIZE!==0)throw invalid('Invalid preview offset');
    try {
      const {a,root,w,source}=await record(id);if(contentHash&&contentHash!==a.contentHash)throw new Error('Asset changed while loading. Retry the preview.');let original=originals.get(id);
      if(!original||original.hash!==a.contentHash||Date.now()-original.at>30000){const data=await readAsset(root,a.absolutePath,Math.min(16,settings.maxSizeMB)*1024*1024);if(createHash('sha256').update(data.bytes).digest('hex')!==a.contentHash){await queue(()=>index.ingest(w,a.absolutePath,a.origin,settings.maxSizeMB*1024*1024,undefined,source));throw new Error('Asset changed while loading. Retry the preview.');}const isDocument=['text/markdown','text/html'].includes(a.mimeType),isVideo=a.mimeType.startsWith('video/'),bytes=isDocument?Buffer.from(a.mimeType==='text/html'?validateHtml(data.bytes):validateMarkdown(data.bytes)):isVideo?data.bytes:validatedInput(data.bytes);if(isVideo)videoMetadata(bytes,'.'+a.extension);else if(!isDocument)imageMetadata(bytes);original={bytes,hash:a.contentHash,at:Date.now()};originals.delete(id);originals.set(id,original);while(originals.size>4||[...originals.values()].reduce((n,v)=>n+v.bytes.length,0)>32*1024*1024)originals.delete(originals.keys().next().value!);}
      return {mimeType:a.mimeType,contentHash:original.hash,totalBytes:original.bytes.length,data:original.bytes.subarray(offset,offset+CHUNK_SIZE).toString('base64')};
    }catch(e){return {mimeType:'image/webp',error:message(e)};}
  });
  handle('library.settings',async input=>{settings=settingsInput(input);await orca.storage.set('discovery.settings.v1',settings as unknown as JsonValue);await watcher.close();await watcher.sync(workspaces);loadedContext='';historyWorkspace='';await queue(refreshContext);return settings;});
  handle('library.refresh',async()=>{
    await initialized;if(refreshTask)return {ok:true};if(!active?.root)throw invalid('Open a local worktree first');
    const workspaceId=active.id;
    const run=async()=>{
      historyWorkspace='';loadedContext='';await queue(refreshContext);
      await Promise.all([...reconciliations]);
      for(const a of [...index.records.values()]){
        if(stopped||active?.id!==workspaceId)return;
        if(a.worktreeId!==workspaceId||!isGeneratedAsset(a))continue;
        try{const {w,root,source}=await record(a.id),s=await stat(await safePath(root,a.absolutePath));if(a.status==='missing'||a.updatedAt!==s.mtimeMs||a.sizeBytes!==s.size)await queue(()=>index.ingest(w,a.absolutePath,a.origin,settings.maxSizeMB*1024*1024,undefined,source));}
        catch(e){index.missing(a.id);report(e);}
      }
    };
    refreshTask=run().catch(report).finally(()=>{refreshTask=undefined;changed();});changed();return {ok:true};
  });
  handle('library.action',async({id,action})=>{
    const {a,w}=await record(id);
    if(action==='open'){
      try{
        // A chat history entry may have an explicitly attributed worktree file
        // at the same relative path. Verify current bytes before preferring it.
        let preferred:AssetRecord|undefined;
        if(a.location==='chat'&&!a.originalPath){
          for(const candidate of index.records.values()){
            if(candidate.id===a.id||candidate.worktreeId!==w.id||candidate.projectId!==w.libraryProjectId||candidate.location==='chat'||candidate.originalPath||candidate.origin!=='confirmed-agent'||candidate.relativePath!==a.relativePath)continue;
            try{const current=await extract(w.root!,candidate.absolutePath,settings.maxSizeMB*1024*1024);const source=await extract(a.sourceRoot!,a.absolutePath,settings.maxSizeMB*1024*1024);if(current.contentHash===source.contentHash||candidate.conversationId===a.conversationId){preferred=candidate;break;}}catch{ /* A missing or changed candidate cannot replace the original. */ }
          }
        }
        const result=await openOriginal(a,w,input=>orca.host.call('editor.open',input),options?.openBrowser,async(asset,workspace)=>{
          const root=asset.location==='chat'?asset.sourceRoot!:workspace.root!,source=asset.location==='chat'?sourceFor(asset):undefined;
          if(asset.location==='chat'&&!source)throw invalid('Chat source ownership is unavailable');
          const metadata=await extract(root,asset.absolutePath,settings.maxSizeMB*1024*1024);
          const file=await editorCopies.materialize(workspace,{...asset,contentHash:metadata.contentHash},settings.maxSizeMB*1024*1024);
          await queue(()=>index.ingest(workspace,file,asset.origin,settings.maxSizeMB*1024*1024,undefined,source,{path:asset.absolutePath,contentHash:metadata.contentHash,updatedAt:metadata.mtime,sizeBytes:metadata.size}));
          originals.delete(asset.id);
          return file;
        },preferred);
        return {ok:true,...(result?.workingCopy?{message:'Opened a working copy. Edits affect the copy; its original stays unchanged.'}:{})};
      }catch(e){return {ok:false,message:'Could not open '+a.filename+' in Orca: '+message(e)};}
    }
    if(action==='explorer'){
      if(a.location==='chat'&&!a.originalPath)return {ok:false,message:'This historical file is stored with its chat. Copy its absolute path, or use Open to prepare an editor copy when needed.'};
      await orca.host.call('workspace.open',{workspaceId:w.id});await orca.host.call('commands.run',{action:'sidebar.explorer.toggle'});return {ok:true,message:'Opened native Explorer. Locate '+a.relativePath+'.'};
    }
    throw invalid('Unknown file action');
  });
  await initialized;await queue(refreshContext).catch(report);
  const timer=setInterval(()=>{void queue(refreshContext).catch(report);},30000);timer.unref();
  const inventoryTimer=setInterval(()=>{void queue(refreshNativeWorkspaces).catch(report);},5000);inventoryTimer.unref();
  shutdown=async()=>{stopped=true;clearInterval(timer);clearInterval(inventoryTimer);clearTimeout(postTimer);reconcileController?.abort();for(const c of pending.values())clearTimeout(c.timer);pending.clear();for(const s of subscriptions)s.dispose();await watcher.close();await refreshTask;await Promise.all([...reconciliations]);await chain;await persistence.close();originals.clear();};
}
export async function deactivate(){await shutdown?.();shutdown=undefined;}
