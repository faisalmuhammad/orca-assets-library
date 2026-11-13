import {uniqueAssets,isGeneratedAsset,assetPathKey} from './asset-identity';
import type { AssetRecord, Query, Workspace } from './types';
export function selectAssets(records: Iterable<AssetRecord>, active: Workspace | null, q: Query): AssetRecord[] {
  if (!active?.libraryProjectId || !active.root) return [];
  const root=assetPathKey(active.root).replace(/\/$/,'')+'/';
  const search = (q.search ?? '').trim().toLocaleLowerCase();
  return uniqueAssets([...records].filter(a => {
    const sourceRoot=a.location==='chat'&&!a.originalPath&&a.sourceRoot?assetPathKey(a.sourceRoot).replace(/[/]$/,'')+'/':root;
    if (a.projectId !== active.libraryProjectId || a.worktreeId !== active.id || !assetPathKey(a.absolutePath).startsWith(sourceRoot)) return false;
    if (q.worktreeId && a.worktreeId !== q.worktreeId) return false;
    if (!isGeneratedAsset(a) || q.includeInferred === false && a.origin === 'inferred-agent') return false;
    return true;
  })).filter(a=>{
    if (a.status === 'missing' && q.includeUnavailable !== true) return false;
    if (search && !(a.filename+' '+a.relativePath).toLocaleLowerCase().includes(search)) return false;
    switch (q.filter) {
      case 'images': return a.mimeType.startsWith('image/');
      case 'videos': return a.mimeType.startsWith('video/');
      case 'markdown': return a.mimeType === 'text/markdown';
      case 'other': return !a.mimeType.startsWith('image/') && !a.mimeType.startsWith('video/') && a.mimeType !== 'text/markdown';
      default: return true;
    }
  }).sort((a,b) => (q.sort === 'filename' ? a.filename.localeCompare(b.filename) : q.sort === 'size' ? b.sizeBytes-a.sizeBytes : q.sort === 'oldest' ? a.updatedAt-b.updatedAt : b.updatedAt-a.updatedAt) || a.id.localeCompare(b.id));
}
