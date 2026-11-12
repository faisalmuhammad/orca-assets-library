import test from 'node:test';import assert from 'node:assert/strict';
import {Persistence} from '../worker/persistence';import {ThumbnailService} from '../worker/thumbnail-service';
import type {AssetRecord} from '../shared/types';import type {OrcaWorkerApi} from 'orca/worker';
function record(i:number):AssetRecord{return{id:String(i),projectId:'project',worktreeId:'worktree',worktreeName:'Design',absolutePath:'/repo/output/clip-'+i+'.mp4',relativePath:'output/clip-'+i+'.mp4',filename:'clip-'+i+'.mp4',extension:'mp4',mimeType:'video/mp4',sizeBytes:4000,createdAt:1,updatedAt:1,origin:'confirmed-agent',contentHash:String(i).padStart(64,'0'),version:1,status:'available'};}
function quotaStore(){
 const map=new Map<string,unknown>();let failure:((key:string)=>boolean)|undefined;
 const storage={keys:async()=>[...map.keys()],get:async(k:string)=>map.get(k)??null,delete:async(k:string)=>{map.delete(k);},set:async(k:string,v:unknown)=>{
  if(failure?.(k))throw new Error('Injected storage failure');const size=Buffer.byteLength(JSON.stringify(v));if(size>256*1024)throw new Error('Value quota');
  if(!map.has(k)&&map.size>=1024)throw new Error('Key quota');const total=[...map].filter(([key])=>key!==k).reduce((n,[,value])=>n+Buffer.byteLength(JSON.stringify(value)),0)+size;if(total>5*1024*1024)throw new Error('Byte quota');map.set(k,structuredClone(v));
 }} as OrcaWorkerApi['storage'];return {map,storage,fail:(f?:typeof failure)=>{failure=f;}};
}
test('20,000 video records persist across restarts within Orca’s real key/value quotas',async()=>{
 const s=quotaStore(),p=new Persistence(s.storage,e=>{throw e;});for(let i=0;i<20000;i++)p.put(record(i));await p.close();assert.ok(s.map.size<=64);
 const restored=await new Persistence(s.storage,e=>{throw e;}).load();assert.equal(restored.length,20000);assert.equal(restored.find(a=>a.id==='19999')?.mimeType,'video/mp4');
});
test('a full 1,024-key legacy index migrates without losing missing-file status or provenance',async()=>{
 const s=quotaStore();for(let i=0;i<1024;i++)s.map.set('asset.v1.'+i,{...record(i),status:i===6?'missing':'available'});
 await new ThumbnailService(s.storage).init();const restored=await new Persistence(s.storage,e=>{throw e;}).load();assert.equal(restored.length,1024);assert.ok(s.map.size<=64);assert.ok([...s.map.keys()].every(k=>k.startsWith('asset.v2.')));
 const again=await new Persistence(s.storage,e=>{throw e;}).load();assert.equal(again.find(a=>a.id==='6')?.status,'missing');assert.equal(again.find(a=>a.id==='6')?.origin,'confirmed-agent');
});
test('an interrupted legacy migration preserves staged records and recovers on retry',async()=>{
 const s=quotaStore();for(let i=0;i<300;i++)s.map.set('asset.v1.'+i,record(i));s.fail(k=>k.startsWith('asset.v2.'));const issues:unknown[]=[];
 assert.equal((await new Persistence(s.storage,e=>issues.push(e)).load()).length,300);assert.ok(issues.length);s.fail();const restored=await new Persistence(s.storage,e=>{throw e;}).load();assert.equal(restored.length,300);assert.equal((await new Persistence(s.storage,e=>{throw e;}).load()).length,300);
});
test('failed record writes retain the last saved version and retry the pending update',async()=>{
 const s=quotaStore(),p=new Persistence(s.storage,()=>{});p.put(record(1));await p.flush();s.fail(()=>true);p.put({...record(1),version:2,status:'modified'});await assert.rejects(p.flush());
 assert.equal((await new Persistence(s.storage,()=>{}).load())[0].version,1);s.fail();await p.close();assert.equal((await new Persistence(s.storage,()=>{}).load())[0].version,2);
});
test('concurrent thumbnail writes stay below a 1 MB budget and remove orphaned caches',async()=>{
 const s=quotaStore();s.map.set('thumb.v1.orphan','unused');const thumbs=new ThumbnailService(s.storage);await thumbs.init();assert.equal(s.map.has('thumb.v1.orphan'),false);
 await Promise.all(Array.from({length:160},(_,i)=>thumbs.put('hash-'+i,Buffer.alloc(40000,i%255))));
 const keys=[...s.map.keys()].filter(k=>k.startsWith('thumb.v1.'));assert.ok(keys.length<=128);assert.ok(keys.reduce((n,k)=>n+Buffer.byteLength(s.map.get(k) as string),0)<=1024*1024);
 assert.equal((await s.storage.get('thumbnail.order.v1') as string[]).length,keys.length);
 await new ThumbnailService(s.storage).init();assert.equal([...s.map.keys()].filter(k=>k.startsWith('thumb.v1.')).length,keys.length);
});
