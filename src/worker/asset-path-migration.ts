import path from 'node:path';
import { stat } from 'node:fs/promises';
import type { Workspace } from '../shared/types';
import type { AssetIndex } from './asset-index';
import { safePath, within } from './workspace-resolver';

// Repair already attributed originals affected by Library's folder rename.
// This checks exact replacement paths and content hashes; it never scans a repo.
export async function repairRenamedPluginPaths(workspaces:Workspace[],index:AssetIndex,maxBytes:number) {
  for(const asset of [...index.records.values()]) {
    if(asset.location==='chat'||asset.origin!=='confirmed-agent')continue;
    const w=workspaces.find(w=>w.id===asset.worktreeId);if(!w?.root||w.reason)continue;
    const previousRoot=path.join(w.root,'library');
    if(!within(previousRoot,asset.absolutePath))continue;
    try{await stat(await safePath(w.root,asset.absolutePath));continue;}catch{}
    const target=path.join(w.root,'assets-library',path.relative(previousRoot,asset.absolutePath));
    try{await index.relocate(w,asset,target,maxBytes);}catch{ /* Missing or mismatched files retain their original record. */ }
  }
}
