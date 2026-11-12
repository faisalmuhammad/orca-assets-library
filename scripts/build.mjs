import {build} from 'esbuild';
import {mkdir,copyFile,cp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
const manifest=JSON.parse(await readFile('orca-plugin.json','utf8'));
const pluginIcon='data:image/png;base64,'+(await readFile(manifest.icon)).toString('base64');
const common={bundle:true,format:'esm',sourcemap:false};
await mkdir('dist/ui',{recursive:true});await mkdir('runtime/ui',{recursive:true});
await build({...common,entryPoints:['src/worker/index.ts'],outfile:'dist/worker.mjs',platform:'node',target:'node22',banner:{js:"import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"}});
await build({...common,entryPoints:['src/panel/index.ts'],outfile:'dist/ui/app.js',platform:'browser',target:'es2022',define:{LIBRARY_PLUGIN_VERSION:JSON.stringify(manifest.version),LIBRARY_PLUGIN_ICON:JSON.stringify(pluginIcon)}});
await copyFile('src/panel/index.html','dist/ui/index.html');await copyFile('src/panel/styles/library.css','dist/ui/library.css');
await copyFile('dist/worker.mjs','runtime/worker.mjs');await cp('dist/ui','runtime/ui',{recursive:true});
// The worker is fully bundled; browser image decoding needs no external runtime.
await rm('runtime/node_modules',{recursive:true,force:true});await rm('runtime/decoder.mjs',{force:true});await rm('dist/decoder.mjs',{force:true});
await rm('dist/plugin',{recursive:true,force:true});await mkdir('dist/plugin',{recursive:true});
for(const dir of ['runtime','assets','docs','licenses'])await cp(dir,'dist/plugin/'+dir,{recursive:true,filter:file=>!['.DS_Store','Thumbs.db','Desktop.ini'].includes(path.basename(file))&&!path.basename(file).startsWith('._')});
for(const file of ['orca-plugin.json','README.md','CHANGELOG.md','RELEASE.md','COMPATIBILITY.md','LICENSE','THIRD_PARTY_NOTICES.md'])await copyFile(file,'dist/plugin/'+file);
console.log('Built installable runtime and dist/plugin.');
