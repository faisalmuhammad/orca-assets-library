import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AssetRecord, Workspace } from '../shared/types';
import { within } from './workspace-resolver';
const execute=promisify(execFile);
export type EditorOpen=(input:{workspaceId:string;path:string})=>Promise<unknown>;
export type BrowserOpen=(file:string,w:Workspace)=>Promise<void>;
export type EditorCopy=(asset:AssetRecord,w:Workspace)=>Promise<string>;
export type BrowserCommand=(cli:string,args:string[],limits:{timeout:number;maxBuffer:number})=>Promise<{stdout:string}>;
export function browserOpener(run:BrowserCommand=execute):BrowserOpen {
  return async(file,w)=>{
    const cli=process.env.ORCA_CLI_COMMAND||(process.env.ORCA_DEV_REPO_ROOT?'orca-dev':process.platform==='linux'?'orca-ide':'orca');
    // SDK folder contexts can carry native worktree IDs. The canonical path
    // selector avoids inventing a folder selector from an SDK identity.
    const {stdout}=await run(cli,['tab','create','--url',pathToFileURL(file).href,'--worktree','path:'+w.root,'--environment','local','--json'],{timeout:10000,maxBuffer:32768});
    const response=JSON.parse(stdout.slice(stdout.indexOf('{')));
    if(response.ok!==true||typeof response.result?.browserPageId!=='string')throw new Error(response.error?.message??'Orca did not open the browser tab');
    const switched=await run(cli,['tab','switch','--page',response.result.browserPageId,'--worktree','path:'+w.root,'--environment','local','--json'],{timeout:10000,maxBuffer:32768});
    const state=JSON.parse(switched.stdout.slice(switched.stdout.indexOf('{')));
    if(state.ok!==true)throw new Error(state.error?.message??'Orca could not show the asset tab');
  };
}
// Callers canonicalize paths and reject escaping symlinks before navigation.
// Every editor request remains relative and inside the workspace.
export async function openOriginal(asset:AssetRecord,w:Workspace,editor:EditorOpen,browser:BrowserOpen=browserOpener(),copy?:EditorCopy,preferred?:AssetRecord){
  const sourceRoot=asset.location==='chat'&&!asset.originalPath?asset.sourceRoot:w.root;
  if(!w.root||!sourceRoot||!path.isAbsolute(asset.absolutePath)||!within(sourceRoot,asset.absolutePath))throw new Error('The original is outside the current worktree or its owned chat folder.');
  const target=preferred??asset;
  if(preferred&&(!path.isAbsolute(preferred.absolutePath)||!within(w.root,preferred.absolutePath)))throw new Error('The matching file is outside the current worktree.');
  const edit=async(file:string)=>{const result=await editor({workspaceId:w.id,path:path.relative(w.root!,file)});if(result&&typeof result==='object'&&'opened' in result&&result.opened!==true)throw new Error('Orca did not open the file');};
  try{
    if(!within(w.root,target.absolutePath))throw new Error('Orca’s editor requires a file inside the worktree');
    if(target.mimeType==='text/html'&&!target.originalPath)await browser(target.absolutePath,w);else await edit(target.absolutePath);
    return target.originalPath?{workingCopy:target.absolutePath}:undefined;
  }catch(originalError){
    // Reuse an existing copy directly; never recursively copy a failed copy.
    if(!copy||target.originalPath)throw originalError;
    try{const file=await copy(target,w);if(!path.isAbsolute(file)||!within(w.root,file))throw new Error('Working copy is outside the worktree');await edit(file);return {workingCopy:file};}
    catch(e){throw new Error('Original could not open: '+(originalError instanceof Error?originalError.message:String(originalError))+'. Working copy could not open: '+(e instanceof Error?e.message:String(e)));}
  }
}
