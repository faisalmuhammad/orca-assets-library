import assert from 'node:assert/strict';
import {lstatSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const root=process.argv[2]?resolve(process.argv[2]):fileURLToPath(new URL('../',import.meta.url)),files=new Map();
const ignored=new Set(['.git','.orca','.codex','.agents','AGENTS.md','dist','.cache','.DS_Store','Thumbs.db','Desktop.ini','playwright-report','test-results']);
function collect(dir){for(const name of readdirSync(dir).sort()){
 const file=join(dir,name),key=relative(root,file).replaceAll('\\','/');if(ignored.has(name)||name==='node_modules'&&!key.startsWith('runtime/'))continue;
 const s=lstatSync(file);assert.ok(!s.isSymbolicLink(),'Symlink: '+key);if(s.isDirectory())collect(file);else files.set(key,readFileSync(file));
}}
collect(root);
const manifest=JSON.parse(files.get('orca-plugin.json'));
const required=['README.md','CHANGELOG.md','RELEASE.md','COMPATIBILITY.md','THIRD_PARTY_NOTICES.md','LICENSE','assets/SCREENSHOTS.md','docs/USAGE.md','docs/INTEGRATION.md',manifest.main,...manifest.contributes.panels.map(p=>p.entry),'runtime/ui/app.js','runtime/ui/library.css'];
for(const file of required)assert.ok(files.has(file),'Missing release file: '+file);
assert.equal(manifest.name,'Assets Library');assert.equal(manifest.contributes.panels[0].title,manifest.name);assert.ok(!manifest.publisher,'Publisher comes from the repository owner');assert.ok(manifest.author?.name&&manifest.repository&&manifest.cover?.alt,'Missing listing metadata');
const privatePatterns=[/\/(?:Users|home)\/[A-Za-z0-9_.-]+(?:\/|\b)/i,/\b(?:sk-[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:local\.[A-Za-z_-]+|@orca-local\/[A-Za-z_-]+)\b/];
const decoder=new TextDecoder('utf-8',{fatal:true});let totalBytes=0;
for(const [name,data]of files){
 assert.ok(!/(?:^|\/)\.env(?:$|\.)|\.(?:pem|key|p12|pfx|db|sqlite3?|log|tsbuildinfo|zip|tgz)$/i.test(name),'Private/generated file: '+name);totalBytes+=data.length;
 if(/\.(png|jpe?g|webp)$/.test(name)){const meta=await sharp(data).metadata();assert.ok(!meta.exif&&!meta.xmp&&!meta.iptc,'Image metadata: '+name);continue;}
 assert.ok(!/\.(woff2?|ttf|otf)$/.test(name),'Unexpected font: '+name);const source=decoder.decode(data);assert.ok(!data.includes(0),'Unexpected binary: '+name);
 for(const pattern of privatePatterns)assert.ok(!pattern.test(source),'Sensitive/development text: '+name);
 if(required.includes(name)&&/\.(mjs|js|html)$/.test(name))assert.ok(data.length<=1024*1024,'Entry exceeds 1 MiB: '+name);
}
assert.ok(![...files.keys()].some(f=>f.startsWith('runtime/node_modules/')||f==='runtime/decoder.mjs'||/\.(node|dylib)$/.test(f)),'Native/runtime dependencies must not be packaged');
assert.ok(files.size<=2000,'Orca 2,000-file budget');assert.ok(totalBytes<=50*1024*1024,'Orca 50 MiB budget');assert.ok(manifest.screenshots.length<=6);
let imageBytes=0;const images=[];
for(const [kind,item]of [['icon',{path:manifest.icon}],['cover',manifest.cover],...manifest.screenshots.map(i=>['screenshot',i])]){
 const data=files.get(item.path);assert.ok(data,'Missing listing image: '+item.path);const m=await sharp(data).metadata(),[w,h,limit]=kind==='icon'?[128,128,256*1024]:kind==='cover'?[800,500,1024*1024]:[1280,800,1.5*1024*1024];
 assert.ok(m.format==='png'&&(m.pages??1)===1&&m.width>=w&&m.height>=h&&data.length<=limit,'Image dimensions/size: '+item.path);if(kind==='icon')assert.equal(m.width,m.height);else assert.ok(item.alt&&item.alt.length<=160,'Image alt text: '+item.path);imageBytes+=data.length;images.push({path:item.path,width:m.width,height:m.height,bytes:data.length});
}
assert.ok(imageBytes<=8*1024*1024,'Listing images exceed 8 MiB');const social=await sharp(files.get('assets/social.png')).metadata();assert.equal(social.width,1280);assert.equal(social.height,640);
if(existsSync(join(root,'.git')))for(const file of execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean))assert.ok(!file.split('/').some(p=>ignored.has(p))&&!file.includes('node_modules/'),'Tracked development state: '+file);
console.log(JSON.stringify({ok:true,files:files.size,totalBytes,imageBytes,images},null,2));
