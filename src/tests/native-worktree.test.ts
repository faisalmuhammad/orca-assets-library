import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,realpath,rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { NativeWorktreeAdapter } from '../worker/native-worktree-adapter';
import type { Workspace } from '../shared/types';
const execute=promisify(execFile),quote=(v:string)=>"'"+v.replace(/'/g,"''")+"'";
const workspace=(root='/repo'):Workspace=>({id:"workspace'one",kind:'folder',name:'One',path:root,root,branch:null,hostId:'local'});
test('worktree history accepts only explicit owned absolute file paths',async()=>{
  const w=workspace(),rows=[
    {workspace_id:w.id,session_id:'codex_one',path:'/repo/output.svg',agent:'codex'},
    {workspace_id:'cli-one',session_id:'codex_one',path:'/repo/output.svg',agent:'codex'},
    {workspace_id:'other',session_id:'codex_other',path:'/repo/other.md'},
    {workspace_id:w.id,session_id:'codex_one',path:'/repo/../outside.md'},
    {workspace_id:w.id,session_id:'codex_one',path:'2 files'},
  ];
  const adapter=new NativeWorktreeAdapter(async()=>rows);const assets=await adapter.assets(w,new Map([['cli-one',w.id]]));
  assert.equal(assets.length,1);assert.equal(assets[0].file,'/repo/output.svg');assert.equal(assets[0].event.conversationId,'codex_one');
  assert.deepEqual(await adapter.assets({...w,hostId:'ssh:host'},new Map()),[]);
});
test('journal query reads latest explicit changes and excludes other workspaces, deletions and message text',async t=>{
  try{await execute('sqlite3',['-version']);}catch{t.skip('SQLite CLI is unavailable; optional history adapter is not supported on this host.');return;}
  const root=await realpath(await mkdtemp(path.join(os.tmpdir(),'library-worktree-history-'))),database=path.join(root,'journal.db'),w=workspace(root);
  try{
    const record=(id:string)=>JSON.stringify({schemaVersion:2,location:{executionHostId:'local',workspaceId:id},provider:'codex',prompt:'PRIVATE_PROMPT'});
    const item=(kind:string,file:string)=>JSON.stringify({body:{kind,path:file,text:'PRIVATE_MESSAGE',patch:{head:'PRIVATE_PATCH'}},observedAt:100});
    const sql=[
      'CREATE TABLE agent_session_records(session_id TEXT PRIMARY KEY,record_json TEXT);',
      'CREATE TABLE journal_outcome_epochs(session_id TEXT PRIMARY KEY,generation INTEGER);',
      'CREATE TABLE journal_outcomes(generation INTEGER,seq INTEGER,field TEXT,entry_key TEXT,value_json TEXT,deleted INTEGER);',
      'INSERT INTO agent_session_records VALUES ('+quote('codex_one')+','+quote(record(w.id))+'),('+quote('codex_other')+','+quote(record('other'))+');',
      "INSERT INTO journal_outcome_epochs VALUES ('codex_one',1),('codex_other',2);",
    ];
    for(const [g,seq,id,kind,file,deleted]of [[1,1,'kept','diff','kept.md',0],[1,1,'gone','diff','gone.md',0],[1,2,'gone','diff','gone.md',1],[1,1,'replaced','diff','replaced.md',0],[1,2,'replaced','message','replaced.md',0],[2,1,'other','diff','other.md',0]] as const){
      sql.push('INSERT INTO journal_outcomes VALUES ('+[g,seq,quote('items'),quote(id),quote(item(kind,path.join(root,file))),deleted].join(',')+');');
    }
    await execute('sqlite3',[database,sql.join(' ')]);
    let transport='';const adapter=new NativeWorktreeAdapter(async(db,query)=>{const {stdout}=await execute('sqlite3',['-readonly','-json',db,query]);transport=stdout;return JSON.parse(stdout);},database);
    const assets=await adapter.assets(w,new Map());assert.deepEqual(assets.map(a=>a.file),[path.join(root,'kept.md')]);assert.ok(!transport.includes('PRIVATE_'),'Conversation and patch text never leave the metadata query');
  }finally{await rm(root,{recursive:true,force:true});}
});
test('unavailable or oversized journal results fail instead of broadly scanning files',async()=>{
  const w=workspace();await assert.rejects(new NativeWorktreeAdapter(async()=>({})).assets(w,new Map()),/unavailable/);
  await assert.rejects(new NativeWorktreeAdapter(async()=>Array(5001).fill({})).assets(w,new Map()),/safe metadata limit/);
  await assert.rejects(new NativeWorktreeAdapter(async()=>{throw new Error('Schema unavailable');}).assets(w,new Map()),/Schema unavailable/);
});
