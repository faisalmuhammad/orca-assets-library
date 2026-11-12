import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,realpath,rename,writeFile,symlink,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {repairRenamedPluginPaths} from '../worker/asset-path-migration';
import {assetPathKey,uniqueAssets} from '../shared/asset-identity';import {selectAssets} from '../shared/query';
import {AssetIndex} from '../worker/asset-index';import {Persistence} from '../worker/persistence';import {ThumbnailService} from '../worker/thumbnail-service';
import type {AssetRecord,Workspace} from '../shared/types';import type {OrcaWorkerApi} from 'orca/worker';
const a:AssetRecord={id:'original',projectId:'p',worktreeId:'one',worktreeName:'One',absolutePath:'/repo/assets/output.svg',relativePath:'assets/output.svg',filename:'output.svg',extension:'svg',mimeType:'image/svg+xml',sizeBytes:200,width:20,height:20,createdAt:1,updatedAt:1,origin:'confirmed-agent',contentHash:'same-content',version:1,status:'available',agent:'codex'};
const w:Workspace={id:'one',kind:'folder',name:'One',path:'/repo',root:'/repo',branch:null,hostId:'local',libraryProjectId:'p'};
function store(){const values=new Map<string,unknown>();return{get:async(k:string)=>values.get(k)??null,set:async(k:string,v:unknown)=>{values.set(k,structuredClone(v));},keys:async()=>[...values.keys()],delete:async(k:string)=>{values.delete(k);}} as OrcaWorkerApi['storage'];}
test('identity uses the whole normalized file path without merging different names or case-sensitive paths',()=>{
 assert.equal(assetPathKey('/repo/assets/../assets/output.svg'),a.absolutePath);assert.equal(assetPathKey('c:\\repo\\assets\\output.svg'),'C:/repo/assets/output.svg');
 assert.notEqual(assetPathKey('/repo/A.svg'),assetPathKey('/repo/a.svg'));
 const other={...a,id:'another',absolutePath:'/repo/elsewhere/output.svg'};assert.equal(uniqueAssets([a,other]).length,2);assert.equal(uniqueAssets([a,{...a,id:'renamed',absolutePath:'/repo/assets/other.svg'}]).length,2);
});
test('duplicate paths merge current metadata and strongest provenance before pagination',()=>{
 const duplicate={...a,id:'duplicate',createdAt:2,absolutePath:'/repo/assets/./output.svg',updatedAt:2,width:40,origin:'inferred-agent' as const,version:2};
 const other={...a,id:'other',absolutePath:'/repo/other/output.svg'};
 const merged=uniqueAssets([a,duplicate]);assert.equal(merged[0].width,40);assert.equal(merged[0].origin,'confirmed-agent');
 const rows=selectAssets([a,{...duplicate,origin:'confirmed-agent'},other],w,{scope:'worktree',mode:'generated'});assert.equal(rows.length,2);assert.equal(rows[0].id,a.id);assert.equal(rows[0].width,40);assert.equal(rows[0].origin,'confirmed-agent');assert.equal(rows[0].agent,'codex');
});
test('persisted duplicates are consolidated and removed from storage without losing attribution',async()=>{
 const storage=store(),legacy=new Persistence(storage,e=>{throw e;});legacy.put(a);legacy.put({...a,id:'duplicate',createdAt:2,updatedAt:2,version:2,origin:'inferred-agent',width:40});await legacy.close();
 const persistence=new Persistence(storage,e=>{throw e;}),index=new AssetIndex(persistence,new ThumbnailService(storage),()=>{});for(const row of await persistence.load())index.restore(row);assert.equal(index.records.size,1);await persistence.close();
 const rows=await new Persistence(storage,e=>{throw e;}).load();assert.equal(rows.length,1);assert.equal(rows[0].id,a.id);assert.equal(rows[0].width,40);assert.equal(rows[0].origin,'confirmed-agent');
});
test('repeated writes, symlink aliases and changed workspace IDs keep one file identity',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'library-identity-'));try{
  const storage=store(),persistence=new Persistence(storage,e=>{throw e;}),index=new AssetIndex(persistence,new ThumbnailService(storage),()=>{}),workspace={...w,root,path:root};
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>',file=path.join(root,'output.svg');await writeFile(file,svg);const first=await index.ingest(workspace,file,'confirmed-agent',1e6);await symlink(file,path.join(root,'alias.svg'));
  const alias=await index.ingest({...workspace,id:'new-sdk-id'},path.join(root,'alias.svg'),'inferred-agent',1e6);assert.equal(alias.id,first.id);assert.equal(alias.worktreeId,'new-sdk-id');assert.equal(alias.origin,'confirmed-agent');assert.equal(index.records.size,1);
  await writeFile(path.join(root,'other.svg'),svg);await index.ingest(workspace,path.join(root,'other.svg'),'confirmed-agent',1e6);assert.equal(index.records.size,2,'Equal file contents at distinct paths remain distinct');await persistence.close();
 }finally{await rm(root,{recursive:true,force:true});}
});

test('ordinary repository records stay excluded even with legacy discovered queries and recent timestamps',()=>{
 const ordinary=[{...a,id:'unknown',origin:'discovered' as const},{...a,id:'timed',origin:'inferred-agent' as const,updatedAt:Date.now()}];
 assert.deepEqual(selectAssets(ordinary,w,{scope:'worktree',mode:'discovered',includeInferred:true}),[]);
});
test('folder rename repairs only matching indexed originals and preserves identity across refresh and restart',async()=>{
 const root=await realpath(await mkdtemp(path.join(os.tmpdir(),'library-rename-'))),storage=store(),persistence=new Persistence(storage,e=>{throw e;}),index=new AssetIndex(persistence,new ThumbnailService(storage),()=>{}),workspace={...w,root,path:root};
 try{
  await mkdir(path.join(root,'library'));await writeFile(path.join(root,'library','notes.md'),'# Generated notes');
  await writeFile(path.join(root,'library','different.md'),'# Original bytes');
  const original=await index.ingest(workspace,path.join(root,'library','notes.md'),'confirmed-agent',1e6);
  const different=await index.ingest(workspace,path.join(root,'library','different.md'),'confirmed-agent',1e6);
  await rename(path.join(root,'library'),path.join(root,'assets-library'));
  await writeFile(path.join(root,'assets-library','different.md'),'# Unrelated replacement');
  await writeFile(path.join(root,'assets-library','ordinary.md'),'# Ordinary file');
  index.missing(original.id);await repairRenamedPluginPaths([workspace],index,1e6);
  const moved=index.records.get(original.id)!;assert.equal(moved.absolutePath,path.join(root,'assets-library','notes.md'));assert.equal(moved.status,'available');assert.equal(moved.origin,original.origin);assert.equal(moved.createdAt,original.createdAt);assert.equal(moved.version,original.version);
  assert.equal(index.records.get(different.id)?.absolutePath,different.absolutePath,'A different file at the replacement path cannot inherit attribution');
  assert.equal(index.records.size,2,'Ordinary neighbors are not discovered');
  assert.equal((await index.ingest(workspace,moved.absolutePath,'confirmed-agent',1e6)).id,original.id);
  await repairRenamedPluginPaths([workspace],index,1e6);await persistence.close();
  const restoredPersistence=new Persistence(storage,e=>{throw e;}),resumed=new AssetIndex(restoredPersistence,new ThumbnailService(storage),()=>{});for(const row of await restoredPersistence.load())resumed.restore(row);
  assert.equal(resumed.id(workspace,moved.absolutePath),original.id);assert.equal(resumed.records.size,2);
 }finally{await persistence.close();await rm(root,{recursive:true,force:true});}
});
