import { stat } from 'node:fs/promises';
import type { AssetOrigin, AssetRecord, DiscoverySettings, Workspace } from '../shared/types';
import { safePath } from './workspace-resolver';

// Refresh explicitly attributed repository files. Ordinary files are never scanned
// or promoted based on agent activity. Include ready chat copies in the worktree.
export async function reconcileWorkspace(
  workspaces: Workspace[], records: AssetRecord[], settings: DiscoverySettings,
  signal: AbortSignal,
  ingest: (w: Workspace, file: string, origin: AssetOrigin) => Promise<void>,
  missing: (id: string) => void,
  report: (error: unknown) => void = () => {},
) {
  const roots = new Map(workspaces.filter(w => w.root && !w.reason).map(w => [w.id, w]));
  for (const asset of records) {
    if (signal.aborted) return;
    if ((asset.location === 'chat' && !asset.originalPath) || !['confirmed-agent','chat-output'].includes(asset.origin)) continue;
    const w = roots.get(asset.worktreeId); if (!w?.root) continue;
    let s;
    try { s = await stat(await safePath(w.root, asset.absolutePath)); }
    catch { if (!signal.aborted) missing(asset.id); continue; }
    if (!s.isFile()) { missing(asset.id); continue; }
    if (asset.status === 'missing' || asset.updatedAt !== s.mtimeMs || asset.sizeBytes !== s.size) {
      try { await ingest(w, asset.absolutePath, asset.origin); } catch (error) { report(error); }
    }
  }
}
