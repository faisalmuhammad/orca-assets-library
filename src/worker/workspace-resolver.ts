import path from 'node:path';
import { realpath, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import type { Workspace } from '../shared/types';
const execute = promisify(execFile);
export const stableId = (value: string) => createHash('sha256').update(value).digest('hex').slice(0,32);
export const isLocal = (w: Workspace) => !w.hostId || w.hostId === 'local';
export function within(root: string, file: string): boolean { const rel = path.relative(root,file); return rel === '' || (!rel.startsWith('..'+path.sep) && rel !== '..' && !path.isAbsolute(rel)); }
export async function safePath(root: string, file: string): Promise<string> {
  if (!file || file.includes('\0')) throw new Error('Invalid file path');
  const canonicalRoot = await realpath(root);
  if (!path.isAbsolute(file) && !within(canonicalRoot,path.resolve(canonicalRoot,file))) throw new Error('File is outside this worktree');
  const absolute = path.resolve(root,file);
  const canonical = await realpath(absolute);
  if (!within(canonicalRoot,canonical)) throw new Error('Symlink leaves this worktree');
  return canonical;
}
export async function resolveWorkspace(w: Workspace): Promise<Workspace> {
  if (!isLocal(w)) return {...w, root: undefined, libraryProjectId: undefined, reason: 'Remote assets need a remote filesystem API that this Orca does not expose.'};
  try {
    const root = await realpath(w.path);
    if (!(await stat(root)).isDirectory()) throw new Error('Workspace folder is unavailable');
    let identity = root;
    try { const {stdout} = await execute('git',['-C',root,'rev-parse','--path-format=absolute','--git-common-dir'],{timeout:3000,maxBuffer:16384}); identity = await realpath(stdout.trim()); } catch { /* Folder project. */ }
    return {...w, root, libraryProjectId: w.projectId ? 'host:'+(w.hostId ?? 'local')+':'+w.projectId : stableId('local:'+identity)};
  } catch { return {...w, reason: 'Workspace folder is unavailable on this host.'}; }
}
export function chooseActive(context: { workspaceId?: string; displayName: string; branch: string; terminals: {id:string}[] } | null, workspaces: Workspace[], terminals: Map<string,string>): Workspace | null {
  if (!context) return null;
  if (context.workspaceId) return workspaces.find(w=>w.id===context.workspaceId) ?? null;
  const mapped = [...new Set(context.terminals.map(t=>terminals.get(t.id)).filter((v):v is string=>!!v))];
  if (mapped.length === 1) return workspaces.find(w=>w.id===mapped[0]) ?? null;
  const matches = workspaces.filter(w=>w.name===context.displayName && (w.branch ?? '')===context.branch);
  return matches.length===1 ? matches[0] : null;
}
