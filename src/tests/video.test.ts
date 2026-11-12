import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {videoMetadata} from '../worker/video-metadata';import {extract} from '../worker/metadata-extractor';
import {box,ebml,mp4Fixture,webmFixture} from './fixtures/video';

test('MP4 identifies video tracks and rejects audio-only or disguised files',()=>{
  assert.equal(videoMetadata(mp4Fixture(),'.mp4').mimeType,'video/mp4');
  for(const input of [mp4Fixture('soun'),Buffer.from('not a movie'),box('ftyp',Buffer.from('avif'),Buffer.alloc(4))])assert.throws(()=>videoMetadata(input,'.mp4'));
  const mixed=Buffer.concat([mp4Fixture('soun'),mp4Fixture()]);assert.equal(videoMetadata(mixed,'.mp4').mimeType,'video/mp4');
});
test('MP4 bounds truncated, oversized, extended and zero-sized boxes',()=>{
  const input=mp4Fixture();for(const n of [1,7,15,input.length-1])assert.throws(()=>videoMetadata(input.subarray(0,n),'.mp4'));
  const oversized=Buffer.from(input);oversized.writeUInt32BE(input.length+1);assert.throws(()=>videoMetadata(oversized,'.mp4'));
  const extended=Buffer.alloc(16);extended.writeUInt32BE(1);extended.write('free',4);extended.writeBigUInt64BE(16n,8);
  assert.equal(videoMetadata(Buffer.concat([extended,input]),'.mp4').mimeType,'video/mp4');
  extended.writeBigUInt64BE(2n**63n,8);assert.throws(()=>videoMetadata(Buffer.concat([extended,input]),'.mp4'));
  const zero=Buffer.from(input);zero.writeUInt32BE(0,input.length-8);assert.equal(videoMetadata(zero,'.mp4').mimeType,'video/mp4');
  assert.throws(()=>videoMetadata(Buffer.concat([input,...Array.from({length:4096},()=>box('free'))]),'.mp4'));
});
test('WebM accepts supported video tracks and streaming containers',()=>{
  for(const codec of ['V_VP8','V_VP9','V_AV1'])for(const streaming of [false,true])assert.equal(videoMetadata(webmFixture({codec,streaming}),'.webm').mimeType,'video/webm');
  for(const options of [{track:2,codec:'A_OPUS'},{docType:'matroska'},{codec:'V_UNKNOWN'}])assert.throws(()=>videoMetadata(webmFixture(options),'.webm'));
});
test('WebM rejects malformed IDs, sizes, unknown-size leaves and invalid payload bounds',()=>{
  const input=webmFixture();for(const n of [0,1,4,10,input.length-1])assert.throws(()=>videoMetadata(input.subarray(0,n),'.webm'));
  for(const input of [Buffer.from([0,128]),Buffer.from([0x1a,0x45,0xdf,0xa3,0]),Buffer.from([0x1a,0x45,0xdf,0xa3,0xfe]),ebml(0x1a45dfa3,Buffer.from([0x42,0x82,0xff]))])assert.throws(()=>videoMetadata(input,'.webm'));
  assert.throws(()=>videoMetadata(Buffer.concat([input,...Array.from({length:4096},()=>ebml(0xec,Buffer.alloc(0)))]),'.webm'));
});
test('video extraction produces bounded metadata without image previews',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'library-video-'));
  try{for(const [ext,input]of [['mp4',mp4Fixture()],['webm',webmFixture()]] as const){const file=path.join(root,'clip.'+ext);await writeFile(file,input);const result=await extract(root,file,1024);assert.equal(result.mimeType,'video/'+ext);assert.equal(result.size,input.length);assert.equal(result.width,undefined);assert.equal(result.thumbnail,undefined);assert.equal(result.contentHash.length,64);await assert.rejects(()=>extract(root,file,input.length-1));await writeFile(file,Buffer.from('disguised text'));await assert.rejects(()=>extract(root,file,1024));}}
  finally{await rm(root,{recursive:true,force:true});}
});
