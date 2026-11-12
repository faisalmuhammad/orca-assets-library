/** Bounded container inspection only. Video bitstreams are never decoded or executed. */
type Element = {type:number; start:number; end:number};
const invalid=()=>new Error('Invalid or unsupported video container');
const LIMIT=4096;

function mp4(bytes:Buffer):boolean {
  let count=0;
  function boxes(start:number,end:number):{type:string;start:number;end:number}[] {
    const result=[];
    while(start<end){
      if(++count>LIMIT||end-start<8)throw invalid();
      let size=bytes.readUInt32BE(start),header=8;
      if(size===1){if(end-start<16)throw invalid();const wide=bytes.readBigUInt64BE(start+8);if(wide>BigInt(end-start))throw invalid();size=Number(wide);header=16;}
      else if(size===0)size=end-start;
      if(size<header||size>end-start)throw invalid();
      result.push({type:bytes.toString('latin1',start+4,start+8),start:start+header,end:start+size});start+=size;
    }
    return result;
  }
  const top=boxes(0,bytes.length),ftyp=top.find(b=>b.type==='ftyp');
  if(!ftyp||ftyp.end-ftyp.start<8||(ftyp.end-ftyp.start)%4!==0||ftyp.end-ftyp.start>LIMIT*4)throw invalid();
  const brands=[bytes.toString('latin1',ftyp.start,ftyp.start+4)];
  for(let p=ftyp.start+8;p<ftyp.end;p+=4)brands.push(bytes.toString('latin1',p,p+4));
  if(!brands.some(b=>['isom','iso2','iso3','iso4','iso5','iso6','iso8','iso9','mp41','mp42','avc1','M4V ','dash','MSNV'].includes(b)))throw invalid();
  let video=false;
  for(const moov of top.filter(b=>b.type==='moov'))for(const trak of boxes(moov.start,moov.end).filter(b=>b.type==='trak'))for(const mdia of boxes(trak.start,trak.end).filter(b=>b.type==='mdia'))for(const handler of boxes(mdia.start,mdia.end).filter(b=>b.type==='hdlr')){
    if(handler.end-handler.start<12)throw invalid();
    if(bytes.toString('latin1',handler.start+8,handler.start+12)==='vide')video=true;
  }
  return video;
}

function webm(bytes:Buffer):boolean {
  let count=0;
  function elements(start:number,end:number):Element[] {
    const result=[];
    while(start<end){
      if(++count>LIMIT)throw invalid();
      const first=bytes[start];let idWidth=1,marker=128;
      while(idWidth<=4&&!(first&marker)){idWidth++;marker>>=1;}
      if(idWidth>4||start+idWidth>=end)throw invalid();
      let type=0;for(let p=0;p<idWidth;p++)type=type*256+bytes[start+p];start+=idWidth;
      const sizeFirst=bytes[start];let sizeWidth=1;marker=128;
      while(sizeWidth<=8&&!(sizeFirst&marker)){sizeWidth++;marker>>=1;}
      if(sizeWidth>8||start+sizeWidth>end)throw invalid();
      let size=BigInt(sizeFirst&(marker-1));for(let p=1;p<sizeWidth;p++)size=size*256n+BigInt(bytes[start+p]);
      const unknown=size===(1n<<BigInt(7*sizeWidth))-1n;start+=sizeWidth;
      // Streaming Segments and Clusters may have unknown size; leaf payloads may not.
      if(unknown&&type!==0x18538067&&type!==0x1f43b675)throw invalid();
      if(!unknown&&size>BigInt(end-start))throw invalid();
      const finish=unknown?end:start+Number(size);result.push({type,start,end:finish});start=finish;
    }
    return result;
  }
  const top=elements(0,bytes.length),header=top[0];
  if(!header||header.type!==0x1a45dfa3)throw invalid();
  const docType=elements(header.start,header.end).find(e=>e.type===0x4282);
  if(!docType||bytes.toString('latin1',docType.start,docType.end)!=='webm')throw invalid();
  let video=false;
  for(const segment of top.filter(e=>e.type===0x18538067))for(const tracks of elements(segment.start,segment.end).filter(e=>e.type===0x1654ae6b))for(const entry of elements(tracks.start,tracks.end).filter(e=>e.type===0xae)){
    const fields=elements(entry.start,entry.end),kind=fields.find(e=>e.type===0x83),codec=fields.find(e=>e.type===0x86);
    if(kind&&kind.end-kind.start===1&&bytes[kind.start]===1&&codec&&['V_VP8','V_VP9','V_AV1'].includes(bytes.toString('latin1',codec.start,codec.end)))video=true;
  }
  return video;
}

export function videoMetadata(bytes:Buffer,extension:string):{mimeType:string} {
  const video=extension==='.mp4'?mp4(bytes):extension==='.webm'?webm(bytes):false;
  if(!video)throw invalid();
  return {mimeType:extension==='.mp4'?'video/mp4':'video/webm'};
}
