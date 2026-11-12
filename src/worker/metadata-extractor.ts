import path from 'node:path';
import { videoMetadata } from './video-metadata';
import { validateMarkdown, markdownThumbnail } from './markdown';
import { validateHtml, htmlThumbnail } from './html';
import { imageSize } from 'image-size';
import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { sanitizeSvg } from './svg';
import { safePath } from './workspace-resolver';
export async function readAsset(root:string,file:string,maxBytes:number):Promise<{bytes:Buffer;mtime:number;birthtime:number;size:number}> {
  const canonical=await safePath(root,file);
  const handle=await open(canonical,constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const s=await handle.stat(); if(!s.isFile()||s.size>maxBytes||s.size===0) throw new Error('File is empty, unsupported or above the size limit');
    const bytes=await handle.readFile(), after=await handle.stat();
    if(after.size!==s.size||after.mtimeMs!==s.mtimeMs||bytes.length!==s.size) throw new Error('File is still being written');
    if(await safePath(root,file)!==canonical) throw new Error('Path changed while reading');
    return {bytes,mtime:s.mtimeMs,birthtime:s.birthtimeMs,size:s.size};
  } finally { await handle.close(); }
}
export function validatedInput(bytes:Buffer):Buffer {
  const lead=bytes.subarray(0,2048).toString('utf8').replace(/^\uFEFF/,'').trimStart();
  if(lead.startsWith('<svg') || lead.startsWith('<?xml') || lead.startsWith('<!--')) return Buffer.from(sanitizeSvg(bytes.toString('utf8')));
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const gif=/^GIF8[79]a$/.test(bytes.subarray(0,6).toString());
  const webp=bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  const avif=bytes.subarray(4,8).toString()==='ftyp'&&/avif|avis/.test(bytes.subarray(8,64).toString());
  if(!png&&!jpg&&!gif&&!webp&&!avif) throw new Error('Unsupported file signature');
  return bytes;
}
export function imageMetadata(input:Buffer) {
  const metadata=imageSize(input),mimes:Record<string,string>={png:'image/png',jpg:'image/jpeg',webp:'image/webp',gif:'image/gif',avif:'image/avif',heif:'image/avif',svg:'image/svg+xml'};
  const mimeType=mimes[metadata.type??''];
  if(!mimeType||!Number.isFinite(metadata.width)||!Number.isFinite(metadata.height)||metadata.width<1||metadata.height<1||metadata.width*metadata.height>40_000_000)throw new Error('Invalid or oversized image dimensions');
  return {mimeType,width:metadata.width,height:metadata.height,animated:metadata.type==='gif'};
}
export async function extract(root:string,file:string,maxBytes:number) {
  const data=await readAsset(root,file,maxBytes),contentHash=createHash('sha256').update(data.bytes).digest('hex');
  if(['.md','.markdown'].includes(path.extname(file).toLowerCase())){const text=validateMarkdown(data.bytes);return {...data,mimeType:'text/markdown',width:undefined,height:undefined,animated:false,contentHash,thumbnail:markdownThumbnail(text),thumbnailMime:'image/svg+xml'};}
  if(['.html','.htm'].includes(path.extname(file).toLowerCase())){const text=validateHtml(data.bytes);return {...data,mimeType:'text/html',width:undefined,height:undefined,animated:false,contentHash,thumbnail:htmlThumbnail(text),thumbnailMime:'image/svg+xml'};}
  if(['.mp4','.webm'].includes(path.extname(file).toLowerCase()))return {...data,...videoMetadata(data.bytes,path.extname(file).toLowerCase()),width:undefined,height:undefined,animated:false,contentHash,thumbnail:undefined,thumbnailMime:undefined};
  const input=validatedInput(data.bytes),metadata=imageMetadata(input);
  return {...data,...metadata,contentHash,thumbnail:undefined,thumbnailMime:undefined};
}
