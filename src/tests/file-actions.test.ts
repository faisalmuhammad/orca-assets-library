import test from 'node:test';
import assert from 'node:assert/strict';
import type { AssetRecord, Workspace } from '../shared/types';
import { openOriginal,browserOpener } from '../worker/file-actions';
const w={id:'one',kind:'worktree',root:'/repo'} as Workspace;
const asset=(file:string,mimeType='image/png')=>({absolutePath:file,mimeType} as AssetRecord);
test('images, SVG, Markdown and videos all use canonical worktree-relative editor paths',async()=>{
  const actions:unknown[]=[];
  for(const [file,mime]of [['image.png','image/png'],['drawing.svg','image/svg+xml'],['notes.md','text/markdown'],['video.mp4','video/mp4'],['clip.webm','video/webm']])await openOriginal(asset('/repo/output/'+file,mime),w,async input=>{actions.push(input);},async()=>{throw new Error('Unexpected browser fallback');});
  assert.deepEqual(actions,['image.png','drawing.svg','notes.md','video.mp4','clip.webm'].map(file=>({workspaceId:'one',path:'output/'+file})));
});
test('HTML opens the original in Orca browser and propagates opening failures',async()=>{
  const files:string[]=[];await openOriginal(asset('/repo/output/page.htm','text/html'),w,async()=>{throw new Error('Unexpected editor call');},async file=>{files.push(file);});assert.deepEqual(files,['/repo/output/page.htm']);
  await assert.rejects(openOriginal(asset('/repo/page.html','text/html'),w,async()=>{},async()=>{throw new Error('Browser unavailable');}),/Browser unavailable/);
});
test('external and escaping paths are rejected for every format without navigation',async()=>{
  for(const [file,mime]of [['/chat/image.png','image/png'],['/chat/page.html','text/html'],['/chat/video.webm','video/webm'],['/chat/notes.md','text/markdown'],['/repo-neighbor/image.png','image/png'],['/repo/../outside.png','image/png']])await assert.rejects(openOriginal(asset(file,mime),w,async()=>{assert.fail('Invalid editor call');},async()=>{assert.fail('Invalid browser call');}),/outside the current worktree/);
});
test('browser CLI encodes special path characters, chooses an exact local workspace, and validates acceptance',async()=>{
  const commands:string[][]=[];const open=browserOpener(async(_cli,args)=>{commands.push(args);return{stdout:JSON.stringify({ok:true,result:{browserPageId:'page-1'}})};});
  await open('/repo/a b/#notes?.html',w);await open('/repo/page.html',{...w,id:'repo-id::/repo',kind:'folder'});
  assert.deepEqual(commands[0],['tab','create','--url','file:///repo/a%20b/%23notes%3F.html','--worktree','path:/repo','--environment','local','--json']);assert.ok(commands[1].includes('path:/repo'),'SDK folder kind does not imply a native folder ID');
  for(const response of [{ok:false,error:{message:'Renderer unavailable'}},{ok:true,result:{}}])await assert.rejects(browserOpener(async()=>({stdout:JSON.stringify(response)}))('/repo/page.html',w),/Renderer unavailable|did not open/);
});
test('owned chat files use worktree-relative editor paths for their working copies',async()=>{
  const opened:unknown[]=[];
  for(const [name,mimeType]of [['clip.mp4','video/mp4'],['image.png','image/png'],['notes.md','text/markdown'],['page.html','text/html']]){
    const copy={...asset('/repo/.orca/assets-library/opened/codex_one/'+name,mimeType),originalPath:'/chat/owned/'+name,location:'chat' as const,sourceRoot:'/chat/owned',conversationId:'codex_one'};
    await openOriginal(copy,w,async input=>{opened.push(input);},async()=>assert.fail('Unexpected browser call'));
  }
  assert.deepEqual(opened,['clip.mp4','image.png','notes.md','page.html'].map(name=>({workspaceId:'one',path:'.orca/assets-library/opened/codex_one/'+name})));
  await assert.rejects(openOriginal({...asset('/chat/owned/image.png'),location:'chat',sourceRoot:'/chat/owned',conversationId:'codex_one'},w,async()=>assert.fail('Original must not open')),/requires a file inside the worktree/);
});
test('a successful original or matched worktree open never invokes copying',async()=>{
  const original=asset('/repo/output/image.png'),calls:unknown[]=[];
  const editor=async(input:unknown)=>{calls.push(input);return {opened:true};},copy=async()=>assert.fail('Unexpected copy');
  await openOriginal(original,w,editor,undefined,copy);
  const historical={...asset('/chat/owned/output/image.png'),location:'chat' as const,sourceRoot:'/chat/owned',conversationId:'codex_one'};
  await openOriginal(historical,w,editor,undefined,copy,original);
  assert.deepEqual(calls,[{workspaceId:'one',path:'output/image.png'},{workspaceId:'one',path:'output/image.png'}]);
});
test('failed original opens and unsupported chat paths fall back to a copy inside the worktree',async()=>{
  for(const chat of [false,true]){
    const original={...asset(chat?'/chat/owned/image.png':'/repo/image.png'),...(chat?{location:'chat' as const,sourceRoot:'/chat/owned',conversationId:'codex_one'}:{})},steps:string[]=[];
    const result=await openOriginal(original,w,async input=>{steps.push(input.path);if(input.path==='image.png')throw new Error('Original rejected');return {opened:true};},undefined,async a=>{assert.equal(a,original);steps.push('copy');return '/repo/.orca/assets-library/opened/image.png';});
    assert.deepEqual(steps,chat?['copy','.orca/assets-library/opened/image.png']:['image.png','copy','.orca/assets-library/opened/image.png']);assert.equal(result?.workingCopy,'/repo/.orca/assets-library/opened/image.png');
  }
});
test('fallback reports failures, validates the copy path, and cannot recursively copy a copy',async()=>{
  let copies=0;const copy=async()=>{copies++;return '/repo/copy.png';};
  await assert.rejects(openOriginal(asset('/repo/image.png'),w,async()=>({opened:false}),undefined,copy),/Original could not open.*Working copy could not open/);assert.equal(copies,1);
  await assert.rejects(openOriginal(asset('/repo/image.png'),w,async()=>{throw new Error('Rejected');},undefined,async()=>'/outside/copy.png'),/Working copy is outside the worktree/);
  await assert.rejects(openOriginal({...asset('/repo/copy.png'),originalPath:'/repo/image.png'},w,async()=>{throw new Error('Copy rejected');},undefined,copy),/Copy rejected/);assert.equal(copies,1);
  await assert.rejects(openOriginal(asset('/outside/image.png'),w,async()=>{},undefined,copy),/outside the current worktree/);assert.equal(copies,1);
});
