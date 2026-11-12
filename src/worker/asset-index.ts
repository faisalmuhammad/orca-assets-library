import {assetPathKey,mergeAssetRecords} from '../shared/asset-identity';
import path from 'node:path';
import type { AssetOrigin, AssetRecord, ChatSource, ToolEvent, Workspace } from '../shared/types';
import { safePath, stableId } from './workspace-resolver';
import { MAX_ASSETS } from '../shared/constants';
import { extract } from './metadata-extractor';
import type { Persistence } from './persistence';
import type { ThumbnailService } from './thumbnail-service';
export class AssetIndex {
  records=new Map<string,AssetRecord>();revision=0;
  constructor(private persistence:Persistence,private thumbnails:ThumbnailService,private changed:()=>void) {}
  private paths=new Map<string,string>();
  id(w:Workspace,file:string) {const key=assetPathKey(path.resolve(w.root!,file));return this.paths.get(key)??stableId(key);}
  restore(a:AssetRecord){const key=assetPathKey(a.absolutePath),id=this.paths.get(key),old=id?this.records.get(id):undefined,merged=old?mergeAssetRecords(old,a):a;if(old){for(const obsolete of [old.id,a.id])if(obsolete!==merged.id){this.records.delete(obsolete);this.persistence.remove(obsolete);}this.persistence.put(merged);}this.paths.set(key,merged.id);this.records.set(merged.id,merged);}
  async relocate(w:Workspace,asset:AssetRecord,file:string,maxBytes:number) {
    const canonical=await safePath(w.root!,file),result=await extract(w.root!,canonical,maxBytes);
    if(!asset.contentHash||asset.contentHash!==result.contentHash)throw new Error('Relocated asset content does not match its indexed original');
    this.paths.delete(assetPathKey(asset.absolutePath));
    const moved={...asset,absolutePath:canonical,relativePath:path.relative(w.root!,canonical),status:'missing' as const};
    this.restore(moved);
    return this.ingest(w,canonical,asset.origin,maxBytes);
  }
  async ingest(w:Workspace,file:string,origin:AssetOrigin,maxBytes:number,event?:ToolEvent,source?:ChatSource) {
    const root=source?.root??w.root!;
    const result=await extract(root,file,maxBytes), canonical=await import('./workspace-resolver').then(m=>m.safePath(root,file));
    const id=this.id(w,canonical), old=this.records.get(id);
    if(!old&&this.records.size>=MAX_ASSETS)throw new Error('Asset index limit reached (20,000 files)');
    // A discovered/generated collection share file identity, but scanning never rewrites provenance.
    const nextOrigin=origin==='confirmed-agent' ? origin : old?.origin==='confirmed-agent' ? old.origin : origin==='inferred-agent' ? origin : old?.origin ?? origin;
    const changed=!!old&&old.contentHash!==result.contentHash;
    const a:AssetRecord={...old,id,projectId:w.libraryProjectId!,worktreeId:w.id,worktreeName:w.name,absolutePath:canonical,relativePath:path.relative(root,canonical),filename:path.basename(canonical),extension:path.extname(canonical).slice(1).toLowerCase(),mimeType:result.mimeType,sizeBytes:result.size,width:result.width,height:result.height,animated:result.animated,createdAt:old?.createdAt ?? result.birthtime,updatedAt:result.mtime,origin:nextOrigin,contentHash:result.contentHash,version:old ? old.version+(changed?1:0) : 1,status:changed?'modified':'available',previewCacheKey:result.contentHash,...(source?{location:'chat' as const,sourceRoot:source.root,conversationId:source.conversationId,orcaTabId:source.orcaTabId,agent:source.agent}: {})};
    if(origin==='confirmed-agent'&&event){a.agent=event.agent;a.tool=event.tool;if(event.conversationId)a.conversationId=event.conversationId;if(event.orcaTabId)a.orcaTabId=event.orcaTabId;}
    if(old?.contentHash===a.contentHash&&old.updatedAt===a.updatedAt&&old.sizeBytes===a.sizeBytes&&old.status!=='missing'&&old.origin===a.origin&&old.worktreeId===a.worktreeId&&old.projectId===a.projectId){if(result.thumbnail&&!await this.thumbnails.get(a.contentHash))await this.thumbnails.put(a.contentHash,result.thumbnail,result.thumbnailMime);return old;}
    this.paths.set(assetPathKey(canonical),id);this.records.set(id,a);this.persistence.put(a);this.revision++;this.changed();
    if(result.thumbnail)await this.thumbnails.put(result.contentHash,result.thumbnail,result.thumbnailMime);return a;
  }
  missing(id:string) {const a=this.records.get(id);if(a&&a.status!=='missing'){a.status='missing';this.persistence.put(a);this.revision++;this.changed();}}
}
