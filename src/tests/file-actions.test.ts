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
