import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,cp,readFile,readdir,lstat,rm,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),dest=path.join(root,'dist/github-upload'),manifest=JSON.parse(await readFile(path.join(root,'orca-plugin.json'),'utf8'));
const entries=['.github','.gitignore','.gitattributes','orca-plugin.json','package.json','package-lock.json','tsconfig.json','playwright.config.mjs','README.md','CHANGELOG.md','RELEASE.md','COMPATIBILITY.md','LICENSE','THIRD_PARTY_NOTICES.md','assets','runtime','docs','licenses','src','checks','tests','scripts'];
const junk=new Set(['.DS_Store','Thumbs.db','Desktop.ini']);
await rm(dest,{recursive:true,force:true});await mkdir(dest,{recursive:true});for(const name of entries)await cp(path.join(root,name),path.join(dest,name),{recursive:true,filter:file=>!junk.has(path.basename(file))&&!path.basename(file).startsWith('._')});
execFileSync(process.execPath,[path.join(root,'scripts/check-release.mjs'),dest],{cwd:root,stdio:'inherit'});
const inventory=[];async function walk(dir){for(const name of (await readdir(dir)).sort()){const file=path.join(dir,name),s=await lstat(file);assert.ok(!s.isSymbolicLink());if(s.isDirectory())await walk(file);else{const data=await readFile(file);inventory.push({path:path.relative(dest,file).replaceAll('\\','/'),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}}
await walk(dest);const archive='github-upload-v'+manifest.version+'.zip',archivePath=path.join(root,'dist',archive);await rm(archivePath,{force:true});execFileSync('zip',['-q','-X','-9',archivePath,...inventory.map(f=>f.path)],{cwd:dest});
const hash=createHash('sha256').update(await readFile(archivePath)).digest('hex');await writeFile(archivePath+'.sha256',hash+'  '+archive+'\n');await writeFile(path.join(root,'dist/github-upload.json'),JSON.stringify({version:manifest.version,archive,files:inventory.length,inventory},null,2)+'\n');
console.log('Prepared dist/github-upload and '+archive+' with SHA-256 verification.');
