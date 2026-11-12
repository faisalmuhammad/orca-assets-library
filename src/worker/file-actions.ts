import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AssetRecord, Workspace } from '../shared/types';
import { within } from './workspace-resolver';
const execute=promisify(execFile);
export type EditorOpen=(input:{workspaceId:string;path:string})=>Promise<unknown>;
export type BrowserOpen=(file:string,w:Workspace)=>Promise<void>;
export type BrowserCommand=(cli:string,args:string[],limits:{timeout:number;maxBuffer:number})=>Promise<{stdout:string}>;
export function browserOpener(run:BrowserCommand=execute):BrowserOpen {
  return async(file,w)=>{
    const cli=process.env.ORCA_CLI_COMMAND||(process.env.ORCA_DEV_REPO_ROOT?'orca-dev':process.platform==='linux'?'orca-ide':'orca');
    // SDK folder contexts can carry native worktree IDs. The canonical path
    // selector avoids inventing a folder selector from an SDK identity.
    const {stdout}=await run(cli,['tab','create','--url',pathToFileURL(file).href,'--worktree','path:'+w.root,'--environment','local','--json'],{timeout:10000,maxBuffer:32768});
    const response=JSON.parse(stdout.slice(stdout.indexOf('{')));
    if(response.ok!==true||typeof response.result?.browserPageId!=='string')throw new Error(response.error?.message??'Orca did not open the browser tab');
  };
}
// Callers canonicalize paths and reject escaping symlinks before navigation.
// Every editor request remains relative and inside the workspace.
export async function openOriginal(asset:AssetRecord,w:Workspace,editor:EditorOpen,browser:BrowserOpen=browserOpener()){
  if(!w.root||!path.isAbsolute(asset.absolutePath)||!within(w.root,asset.absolutePath)||asset.location==='chat')throw new Error('The original is outside the current worktree.');
  if(asset.mimeType==='text/html'){await browser(asset.absolutePath,w);return;}
  await editor({workspaceId:w.id,path:path.relative(w.root,asset.absolutePath)});
}
