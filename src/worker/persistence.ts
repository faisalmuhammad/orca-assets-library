import type { OrcaWorkerApi } from 'orca/worker';
import type { AssetRecord } from '../shared/types';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
const SHARDS=64,FORMAT='asset-shard-v2';
const bucket=(id:string)=>createHash('sha256').update(id).digest()[0]%SHARDS;
const valid=(v:unknown):v is AssetRecord=>!!v&&typeof v==='object'&&!Array.isArray(v)&&typeof (v as AssetRecord).id==='string'&&typeof (v as AssetRecord).absolutePath==='string'&&typeof (v as AssetRecord).contentHash==='string'&&['confirmed-agent','chat-output','inferred-agent','discovered'].includes((v as AssetRecord).origin);
function unpack(v:unknown):AssetRecord[] {
  if(valid(v))return [v];
  if(v&&typeof v==='object'&&!Array.isArray(v)&&'format' in v&&v.format===FORMAT&&'data' in v&&typeof v.data==='string'){
    const rows:unknown=JSON.parse(gunzipSync(Buffer.from(v.data,'base64'),{maxOutputLength:32*1024*1024}).toString('utf8'));
    if(Array.isArray(rows)&&rows.every(valid))return rows;
    throw new Error('Invalid saved asset shard');
  }
  return [];
}
function pack(rows:AssetRecord[]) {
  const value={format:FORMAT,data:gzipSync(Buffer.from(JSON.stringify(rows))).toString('base64')};
  if(Buffer.byteLength(JSON.stringify(value))>256*1024)throw new Error('Asset metadata exceeds Orca’s storage value limit');
  return value;
}
export class Persistence {
  private records=new Map<string,AssetRecord>();
  private dirty=new Map<string,AssetRecord>();
  private removed=new Set<string>();
  private timer?: ReturnType<typeof setTimeout>;
  private chain=Promise.resolve();
  constructor(private storage:OrcaWorkerApi['storage'],private report:(e:unknown)=>void) {}
  async load():Promise<AssetRecord[]> {
    const keys=await this.storage.keys(),legacy=keys.filter(k=>k.startsWith('asset.v1.')),current=keys.filter(k=>k.startsWith('asset.v2.'));
    const legacyGroups=new Map<number,string[]>();
    const assetKeys=[...legacy,...current];
    for(let offset=0;offset<assetKeys.length;offset+=16){
      const chunk=assetKeys.slice(offset,offset+16),values=await Promise.all(chunk.map(key=>this.storage.get(key)));
      for(const [i,key]of chunk.entries()){const rows=unpack(values[i]);
      for(const a of rows){if(this.records.size<20000||this.records.has(a.id))this.records.set(a.id,a);}
      if(key.startsWith('asset.v1.')&&rows.length){const shard=bucket(rows[0].id);legacyGroups.set(shard,[...(legacyGroups.get(shard)??[]),key]);}
      }
    }
    // Stage in an existing legacy key before retiring siblings. A full 1,024-key
    // store can migrate without dropping metadata or requiring a spare key.
    for(const [shard,oldKeys]of [...legacyGroups].sort((a,b)=>b[1].length-a[1].length)){
      const rows=[...this.records.values()].filter(a=>bucket(a.id)===shard),value=pack(rows),stage=oldKeys[0];
      try{await this.storage.set(stage,value);for(let i=1;i<oldKeys.length;i+=16)await Promise.all(oldKeys.slice(i,i+16).map(key=>this.storage.delete(key)));await this.storage.set('asset.v2.'+shard,value);await this.storage.delete(stage);}
      catch(e){this.report(e);}
    }
    return [...this.records.values()];
  }
  remove(id:string){this.dirty.delete(id);this.removed.add(id);this.arm();}
  private arm(){if(!this.timer)this.timer=setTimeout(()=>{this.timer=undefined;void this.flush().catch(this.report);},400);}
  put(a:AssetRecord){this.removed.delete(a.id);this.dirty.set(a.id,a);this.arm();}
  flush():Promise<void> {
    const batch=[...this.dirty.values()].map(a=>JSON.parse(JSON.stringify(a)) as AssetRecord);this.dirty.clear();const removed=[...this.removed];this.removed.clear();
    this.chain=this.chain.catch(()=>{}).then(async()=>{
      const groups=new Map<number,AssetRecord[]>();for(const a of batch){const shard=bucket(a.id);groups.set(shard,[...(groups.get(shard)??[]),a]);}
      for(const id of removed)if(!groups.has(bucket(id)))groups.set(bucket(id),[]);
      for(const [shard,updates]of groups){
        const merged=new Map([...this.records.values()].filter(a=>bucket(a.id)===shard).map(a=>[a.id,a]));for(const id of removed)merged.delete(id);for(const a of updates)merged.set(a.id,a);
        try{await this.storage.set('asset.v2.'+shard,pack([...merged.values()]));for(const id of removed)if(bucket(id)===shard)this.records.delete(id);for(const a of updates)this.records.set(a.id,a);}
        catch(e){for(const id of removed)if(!this.dirty.has(id))this.removed.add(id);for(const remaining of [...groups.values()].flat())if(!this.dirty.has(remaining.id))this.dirty.set(remaining.id,remaining);throw e;}
      }
    });return this.chain;
  }
  async close(){clearTimeout(this.timer);await this.flush();}
}
