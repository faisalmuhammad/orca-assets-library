// Small structural containers for header validation; these fixtures contain no encoded frames.
export function box(type:string,...parts:Buffer[]):Buffer {
  const payload=Buffer.concat(parts),header=Buffer.alloc(8);header.writeUInt32BE(payload.length+8);header.write(type,4,'latin1');return Buffer.concat([header,payload]);
}
export function mp4Fixture(handler='vide'):Buffer {
  const h=Buffer.alloc(24);h.write(handler,8,'latin1');
  return Buffer.concat([box('ftyp',Buffer.from('isom'),Buffer.alloc(4),Buffer.from('mp42')),box('moov',box('trak',box('mdia',box('hdlr',h)))),box('mdat')]);
}
export function ebml(id:number,payload:Buffer):Buffer {
  const hex=id.toString(16),tag=Buffer.from(hex.length%2?'0'+hex:hex,'hex'),n=payload.length;
  if(n>=16383)throw new Error('Fixture too large');
  const size=n<127?Buffer.from([128|n]):Buffer.from([64|(n>>8),n&255]);return Buffer.concat([tag,size,payload]);
}
export function webmFixture({track=1,codec='V_VP9',docType='webm',streaming=false}={}):Buffer {
  const header=ebml(0x1a45dfa3,ebml(0x4282,Buffer.from(docType))),tracks=ebml(0x1654ae6b,ebml(0xae,Buffer.concat([ebml(0x83,Buffer.from([track])),ebml(0x86,Buffer.from(codec))])));
  return Buffer.concat([header,streaming?Buffer.concat([Buffer.from([0x18,0x53,0x80,0x67,0xff]),tracks,Buffer.from([0x1f,0x43,0xb6,0x75,0xff])]):ebml(0x18538067,tracks)]);
}
