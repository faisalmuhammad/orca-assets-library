import type { OrcaWorkerApi } from 'orca/worker';
const MAX_CACHE_BYTES=1024*1024,MAX_CACHE_KEYS=128;
export class ThumbnailService {
  private memory=new Map<string,string>();
  private order:string[]=[];
  private sizes=new Map<string,number>();
  private chain=Promise.resolve();
  constructor(private storage:OrcaWorkerApi['storage']) {}
  async init(){
    const v=await this.storage.get('thumbnail.order.v1');this.order=Array.isArray(v)?[...new Set(v.filter((x):x is string=>typeof x==='string'))]:[];
    const retained=new Set(this.order),obsolete=(await this.storage.keys()).filter(key=>key.startsWith('thumb.v1.')&&!retained.has(key.slice(9)));
    for(let i=0;i<obsolete.length;i+=16)await Promise.all(obsolete.slice(i,i+16).map(key=>this.storage.delete(key)));
    for(let i=0;i<this.order.length;i+=16){const keys=this.order.slice(i,i+16),values=await Promise.all(keys.map(key=>this.storage.get('thumb.v1.'+key)));for(const [j,key]of keys.entries())if(typeof values[j]==='string')this.sizes.set(key,Buffer.byteLength(values[j] as string));}
    this.order=this.order.filter(key=>this.sizes.has(key));await this.trim();if(Array.isArray(v)||this.order.length)await this.storage.set('thumbnail.order.v1',this.order);
  }
  async get(key:string):Promise<string|null>{const m=this.memory.get(key);if(m)return m;const v=await this.storage.get('thumb.v1.'+key);if(typeof v==='string'){this.remember(key,v);return v;}return null;}
  private remember(key:string,data:string){this.memory.delete(key);this.memory.set(key,data);if(this.memory.size>80)this.memory.delete(this.memory.keys().next().value!);}
  private async trim(){while(this.order.length>MAX_CACHE_KEYS||[...this.sizes.values()].reduce((n,v)=>n+v,0)>MAX_CACHE_BYTES){const oldest=this.order.shift()!;await this.storage.delete('thumb.v1.'+oldest);this.sizes.delete(oldest);}}
  put(key:string,bytes:Buffer,mimeType='image/webp'):Promise<void>{
    if(bytes.length>144*1024)return Promise.resolve();const data='data:'+mimeType+';base64,'+bytes.toString('base64');
    const task=this.chain.catch(()=>{}).then(async()=>{
      this.order=this.order.filter(k=>k!==key);this.order.push(key);this.sizes.set(key,Buffer.byteLength(data));await this.trim();
      await this.storage.set('thumb.v1.'+key,data);await this.storage.set('thumbnail.order.v1',this.order);this.remember(key,data);
    });this.chain=task;return task;
  }
}
