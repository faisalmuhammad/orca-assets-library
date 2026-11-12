import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('the committed worker imports outside the repository without any runtime dependencies',()=>{
 const dir=mkdtempSync(join(tmpdir(),'assets-library-runtime-'));
 try{
  cpSync(join(root,'runtime'),join(dir,'runtime'),{recursive:true});
  const result=execFileSync(process.execPath,['--input-type=module','-e','const worker=await import(process.argv[1]); if(typeof worker.default!=="function")throw new Error("Invalid worker export");',join(dir,'runtime/worker.mjs')],{cwd:dir,encoding:'utf8',env:{...process.env,NODE_PATH:''}});
  assert.equal(result,'');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
