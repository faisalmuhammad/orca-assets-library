import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {validateHtml,htmlThumbnail} from '../worker/html';
import {extract} from '../worker/metadata-extractor';
import {selectAssets} from '../shared/query';
import type {AssetRecord,Workspace} from '../shared/types';

test('HTML accepts documents and fragments but rejects disguised, binary and oversized files',()=>{
  for(const source of ['<!DOCTYPE html><html><body>Page</body></html>','<!-- Output -->\n<main>Fragment</main>','<HTML lang="en"><BODY>Page</BODY></HTML>'])assert.equal(validateHtml(Buffer.from(source)),source);
  for(const bytes of [Buffer.from('ordinary text named page.html'),Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from('<html>binary\0</html>'),Buffer.alloc(2*1024*1024+1,32)])assert.throws(()=>validateHtml(bytes));
});

test('HTML thumbnail escapes executable markup and keeps the HTML type label',()=>{
  const thumb=htmlThumbnail('<!DOCTYPE html>\n<script>run()</script>\n<iframe src="https://example.invalid"></iframe>').toString();
  assert.ok(thumb.includes('>HTML</text>'));assert.match(thumb,/&lt;script&gt;/);assert.doesNotMatch(thumb,/<script|<iframe|<foreignObject/);
});

test('HTML and HTM metadata belongs to Other, with ordinary repo HTML still excluded',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'library-html-'));
  try{
    const workspace:Workspace={id:'one',kind:'folder',name:'One',path:root,root,branch:null,hostId:'local',libraryProjectId:'project'};
    for(const extension of ['html','htm']){
      const file=path.join(root,'page.'+extension);await writeFile(file,'<!doctype html><html><body><h1>Generated page</h1></body></html>');
      const metadata=await extract(root,file,1e6);assert.equal(metadata.mimeType,'text/html');assert.equal(metadata.width,undefined);assert.equal(metadata.thumbnailMime,'image/svg+xml');
      const generated:AssetRecord={id:extension,projectId:'project',worktreeId:'one',worktreeName:'One',absolutePath:file,relativePath:'page.'+extension,filename:'page.'+extension,extension,mimeType:metadata.mimeType,sizeBytes:metadata.size,createdAt:metadata.birthtime,updatedAt:metadata.mtime,origin:'confirmed-agent',contentHash:metadata.contentHash,version:1,status:'available'};
      assert.equal(selectAssets([generated],workspace,{scope:'worktree',mode:'generated',filter:'other'}).length,1);
      for(const filter of ['images','videos','markdown'] as const)assert.equal(selectAssets([generated],workspace,{scope:'worktree',mode:'generated',filter}).length,0);
      assert.equal(selectAssets([{...generated,origin:'inferred-agent'},{...generated,id:'ordinary',origin:'discovered'}],workspace,{scope:'worktree',mode:'discovered',filter:'other'}).length,0);
    }
  }finally{await rm(root,{recursive:true,force:true});}
});
