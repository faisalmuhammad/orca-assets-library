import test from 'node:test';
import assert from 'node:assert/strict';
import { NativeWorkspaceAdapter } from '../worker/native-workspace-adapter';
import type { Workspace } from '../shared/types';
const workspace=(id:string,root:string):Workspace=>({id,name:id,kind:'folder',path:root,root,branch:null,hostId:'local',libraryProjectId:id});
const row=(w:Workspace)=>({path:w.path,hostId:'local',worktreeId:'cli-'+w.id,address:{environment:'local',worktree:'folder:'+w.id},isActive:true,agents:[{paneKey:'structured-agent-session-codex_'+w.id+':tab-1',mainAgent:{state:'done',stateStartedAt:100},prompt:'PRIVATE_PROMPT',lastAssistantMessage:'PRIVATE_TRANSCRIPT'}]});
test('CLI maps only workspace/session metadata and never retains conversation text or scratch roots',async()=>{
  const w=workspace('one','/repo'),adapter=new NativeWorkspaceAdapter(async()=>({ok:true,result:{worktrees:[row(w)],truncated:false}}));
  assert.equal(await adapter.sync([w]),undefined);assert.equal(adapter.aliases.get('cli-one'),'one');assert.equal(adapter.activeWorkspaceId,'one');assert.equal(adapter.activities[0].state,'done');assert.ok(!JSON.stringify(adapter).includes('PRIVATE_'));assert.ok(!('roots' in adapter));
});
test('CLI rejects remote, missing-address, orphan and ambiguous workspace mappings',async()=>{
  const one=workspace('one','/one'),two=workspace('two','/two');let rows:unknown[]=[];
  const adapter=new NativeWorkspaceAdapter(async()=>({ok:true,result:{worktrees:rows,truncated:false}}));
  rows=[row(one),{...row(one),worktreeId:'duplicate'}];await adapter.sync([one]);assert.equal(adapter.aliases.size,0);
  rows=[row(one)];await adapter.sync([one,{...one,id:'duplicate-sdk'}]);assert.equal(adapter.aliases.size,0);
  rows=[{...row(one),hostId:'ssh:remote'},{...row(two),address:{environment:'server',worktree:'folder:two'}}];await adapter.sync([one,two]);assert.equal(adapter.aliases.size,0);
  rows=[row(workspace('orphan','/orphan')),{...row(one),address:null}];await adapter.sync([one]);assert.equal(adapter.aliases.size,0);
  rows=[row(one),row(two)];await adapter.sync([one,two]);assert.equal(adapter.activeWorkspaceId,undefined,'Several active rows cannot select a worktree');
});
test('CLI failure and malformed responses revoke stale metadata, and truncation is reported',async()=>{
  const one=workspace('one','/one');let fail=false,malformed=false;
  const adapter=new NativeWorkspaceAdapter(async()=>{if(fail)throw new Error('CLI unavailable');return malformed?{ok:false}:{ok:true,result:{worktrees:[row(one)],truncated:true}};});
  assert.match((await adapter.sync([one]))!,/truncated/);assert.equal(adapter.aliases.size,1);
  malformed=true;await assert.rejects(adapter.sync([one]),/inventory/);assert.equal(adapter.aliases.size,0);assert.equal(adapter.activities.length,0);
  malformed=false;await adapter.sync([one]);fail=true;await assert.rejects(adapter.sync([one]),/CLI unavailable/);assert.equal(adapter.aliases.size,0);assert.equal(adapter.activeWorkspaceId,undefined);
});
test('project appearance joins by repository ownership and updates without changing asset identity',async()=>{
  const one=workspace('one','/one'),two=workspace('two','/two'),child=workspace('child','/child');
  let projects=[{displayName:'Same name',sourceRepoIds:['repo-one'],badgeColor:'#00d7ff',repoIcon:{type:'lucide',name:'Box'}},{displayName:'Same name',sourceRepoIds:['repo-two'],badgeColor:'#8b5cf6',repoIcon:{type:'lucide',name:'Sparkles'}}];
  const rows=[{...row(one),repoId:'repo-one'},{...row(two),repoId:'repo-two'},{...row(child),repoId:'repo-one'}];
  const adapter=new NativeWorkspaceAdapter(async()=>({ok:true,result:{worktrees:rows,projects}}));
  await adapter.sync([one,two,child]);assert.deepEqual(one.projectAppearance,{color:'#00d7ff',iconName:'Box'});assert.deepEqual(two.projectAppearance,{color:'#8b5cf6',iconName:'Sparkles'});assert.deepEqual(child.projectAppearance,one.projectAppearance);
  assert.equal(one.projectId,undefined);assert.equal(one.libraryProjectId,'one','Presentation metadata cannot change asset identity');
  projects=[{...projects[0],badgeColor:'#ec4899',repoIcon:{type:'lucide',name:'Code2'}}];await adapter.sync([one,two,child]);
  assert.deepEqual(one.projectAppearance,{color:'#ec4899',iconName:'Code2'});assert.equal(two.projectAppearance,undefined,'Removed project metadata cannot leave a stale badge');
});
test('appearance rejects ambiguous ownership, remote rows and unsafe metadata while old inventories work',async()=>{
  const one=workspace('one','/one');let projects:unknown=[{sourceRepoIds:['repo'],badgeColor:'#00d7ff',repoIcon:{type:'lucide',name:'Box'}}],rows:unknown[]=[{...row(one),repoId:'repo'}],fail=false;
  const adapter=new NativeWorkspaceAdapter(async()=>{if(fail)throw Error('Offline');return {ok:true,result:{worktrees:rows,projects}};});
  await adapter.sync([one]);assert.ok(one.projectAppearance);
  projects=[{sourceRepoIds:['repo'],badgeColor:'url(https://invalid)',repoIcon:{type:'lucide',name:'<svg/>'}}];await adapter.sync([one]);assert.equal(one.projectAppearance,undefined);assert.equal(adapter.aliases.get('cli-one'),'one');
  projects=[{sourceRepoIds:['repo'],badgeColor:'#00d7ff',repoIcon:{type:'image',url:'https://invalid'}}];await adapter.sync([one]);assert.deepEqual(one.projectAppearance,{color:'#00d7ff'});
  projects=[{sourceRepoIds:['repo'],badgeColor:'#00d7ff'},{sourceRepoIds:['repo'],badgeColor:'#8b5cf6'}];await adapter.sync([one]);assert.equal(one.projectAppearance,undefined);
  projects=[{sourceRepoIds:['repo'],badgeColor:'#00d7ff'}];rows=[{...row(one),repoId:'repo',hostId:'ssh:remote'}];await adapter.sync([one]);assert.equal(one.projectAppearance,undefined);
  rows=[{...row(one),repoId:'repo'}];projects=undefined;await adapter.sync([one]);assert.equal(one.projectAppearance,undefined);assert.equal(adapter.aliases.get('cli-one'),'one');
  projects=[{sourceRepoIds:['repo'],badgeColor:'#00d7ff'}];await adapter.sync([one]);fail=true;await assert.rejects(adapter.sync([one]),/Offline/);assert.equal(one.projectAppearance,undefined);
});
