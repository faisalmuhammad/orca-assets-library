import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,realpath,writeFile,readFile,rm,symlink,stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { AssetRecord,Workspace } from '../shared/types';
import type { OrcaWorkerApi } from 'orca/worker';
import { EditorCopies } from '../worker/editor-copies';
import { chatDirectory } from '../shared/chat-source';
async function setup(){
  const base=await realpath(await mkdtemp(path.join(os.tmpdir(),'library-editor-copy-'))),root=path.join(base,'repo'),sourceRoot=chatDirectory(base,'codex_one');
  await mkdir(root);await mkdir(sourceRoot,{recursive:true});
  const values=new Map<string,unknown>(),storage={get:async(k:string)=>values.get(k)??null,set:async(k:string,v:unknown)=>{values.set(k,v);}} as OrcaWorkerApi['storage'];
  const w={id:'one',root,path:root,hostId:'local'} as Workspace;
  const asset=async(name:string,text:string)=>{const file=path.join(sourceRoot,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,text);return{id:name,absolutePath:file,sourceRoot,conversationId:'codex_one',location:'chat',contentHash:createHash('sha256').update(text).digest('hex')} as AssetRecord;};
  return{base,root,sourceRoot,w,asset,storage};
}
test('editor copies deduplicate concurrent opens, refresh unchanged copies and survive restart',async()=>{
  const f=await setup();try{
    const copies=new EditorCopies(f.storage),a=await f.asset('notes.md','# Original');
    const [one,two]=await Promise.all([copies.materialize(f.w,a,1024),copies.materialize(f.w,a,1024)]);assert.equal(one,two);assert.match(one,/opened[/]codex_one[/]notes.md$/);assert.equal(await readFile(one,'utf8'),'# Original');
    const before=(await stat(one)).mtimeMs;await copies.materialize(f.w,a,1024);assert.equal((await stat(one)).mtimeMs,before);
    const changed=await f.asset('notes.md','# Agent update');await copies.materialize(f.w,changed,1024);assert.equal(await readFile(one,'utf8'),'# Agent update');
    const restarted=new EditorCopies(f.storage);assert.equal(await restarted.materialize(f.w,changed,1024),one);assert.equal(await readFile(changed.absolutePath,'utf8'),'# Agent update');
    const nested=await f.asset('nested/notes.md','# Nested');assert.notEqual(await copies.materialize(f.w,nested,1024),one);
  }finally{await rm(f.base,{recursive:true,force:true});}
});
test('agent updates and restarts preserve user-edited and empty working copies',async()=>{
  const f=await setup();try{
    const copies=new EditorCopies(f.storage),a=await f.asset('notes.md','# Original'),file=await copies.materialize(f.w,a,1024);
    await writeFile(file,'# My local edits');const changed=await f.asset('notes.md','# Agent update');
    await copies.materialize(f.w,changed,1024);assert.equal(await readFile(file,'utf8'),'# My local edits');assert.equal(await readFile(a.absolutePath,'utf8'),'# Agent update');
    await new EditorCopies(f.storage).materialize(f.w,changed,1024);assert.equal(await readFile(file,'utf8'),'# My local edits');
    await writeFile(file,'');await copies.materialize(f.w,changed,1024);assert.equal(await readFile(file,'utf8'),'');
  }finally{await rm(f.base,{recursive:true,force:true});}
});
test('editor copies reject symlinked destinations without changing the outside file',async()=>{
  const f=await setup();try{
    const a=await f.asset('notes.md','# Original'),outside=path.join(f.base,'outside');await mkdir(outside);await writeFile(path.join(outside,'notes.md'),'Private');
    await symlink(outside,path.join(f.root,'.orca'));await assert.rejects(new EditorCopies(f.storage).materialize(f.w,a,1024),/unsafe/);
    assert.equal(await readFile(path.join(outside,'notes.md'),'utf8'),'Private');
  }finally{await rm(f.base,{recursive:true,force:true});}
});
test('a rejected worktree original can be copied without changing its source or recursively copying',async()=>{
  const f=await setup();try{
    const original=await f.asset('notes.md','# Worktree original');await writeFile(path.join(f.root,'notes.md'),'# Worktree original');
    const a={...original,absolutePath:path.join(f.root,'notes.md'),location:undefined,sourceRoot:undefined,conversationId:undefined};
    const file=await new EditorCopies(f.storage).materialize(f.w,a,1024);assert.equal(file,path.join(f.root,'.orca/assets-library/opened/worktree/notes.md'));
    assert.equal(await readFile(file,'utf8'),'# Worktree original');assert.equal(await readFile(a.absolutePath,'utf8'),'# Worktree original');
    await assert.rejects(new EditorCopies(f.storage).materialize(f.w,{...a,absolutePath:file,originalPath:a.absolutePath},1024),/Invalid working-copy request/);
  }finally{await rm(f.base,{recursive:true,force:true});}
});
