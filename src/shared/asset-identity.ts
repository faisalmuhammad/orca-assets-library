import type {AssetRecord} from './types';
// Indexed paths come from realpath. Normalize legacy separators/dot segments
// without conflating case-sensitive filenames or files with equal contents.
export function assetPathKey(value:string):string {
  const windows=/^[a-z]:[\\/]|^\\\\/i.test(value),input=windows?value.replace(/\\/g,'/'):value;
  const prefix=input.startsWith('//')?'//':input.startsWith('/')?'/':'',parts:string[]=[];
  for(const part of input.split('/')){if(!part||part==='.')continue;if(part==='..'&&parts.length&&parts.at(-1)!=='..')parts.pop();else if(part!=='..'||!prefix)parts.push(part);}
  if(windows&&/^[a-z]:$/i.test(parts[0]??''))parts[0]=parts[0].toUpperCase();return prefix+parts.join('/');
}
export const isGeneratedAsset=(a:AssetRecord)=>a.location==='chat'
  ? ['confirmed-agent','chat-output'].includes(a.origin)&&typeof a.sourceRoot==='string'&&typeof a.conversationId==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(a.conversationId)
  : a.origin==='confirmed-agent';
const confidence={discovered:0,'inferred-agent':1,'chat-output':2,'confirmed-agent':3};
export function mergeAssetRecords(a:AssetRecord,b:AssetRecord):AssetRecord {
  const newest=a.updatedAt>b.updatedAt?a:a.updatedAt<b.updatedAt?b:a.id.localeCompare(b.id)<=0?a:b;
  const provenance=confidence[a.origin]>confidence[b.origin]?a:confidence[a.origin]<confidence[b.origin]?b:newest;
  const survivor=a.createdAt<b.createdAt?a:a.createdAt>b.createdAt?b:a.id.localeCompare(b.id)<=0?a:b;
  return {...newest,id:survivor.id,createdAt:Math.min(a.createdAt,b.createdAt),version:Math.max(a.version,b.version),origin:provenance.origin,agent:provenance.agent??newest.agent,tool:provenance.tool??newest.tool};
}
export function uniqueAssets(records:Iterable<AssetRecord>):AssetRecord[] {
  const paths=new Map<string,AssetRecord>();for(const a of records){const key=assetPathKey(a.absolutePath),old=paths.get(key);paths.set(key,old?mergeAssetRecords(old,a):a);}return [...paths.values()];
}
