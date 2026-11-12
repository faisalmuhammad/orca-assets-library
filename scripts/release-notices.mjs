import {readFile,readdir,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),names=['fast-xml-parser','@nodable/entities','fast-xml-builder','path-expression-matcher','xml-naming','is-unsafe','strnum','anynum','marked','image-size'];
await mkdir(path.join(root,'licenses'),{recursive:true});const rows=[];
for(const name of names){
 const dir=path.join(root,'node_modules',name),pkg=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));
 const license=(await readdir(dir)).find(f=>/^(LICENSE|LICENCE|COPYING)(\..*)?$/i.test(f));
 if(!license){if(name==='@nodable/entities'){rows.push('| '+name+' | '+pkg.version+' | '+pkg.license+' | [License](licenses/nodable-entities-LICENSE) |');continue;}throw new Error('Missing upstream license: '+name);}
 const file=name.replaceAll('/','-').replace('@','')+'-'+license;await copyFile(path.join(dir,license),path.join(root,'licenses',file));
 rows.push('| '+name+' | '+pkg.version+' | '+pkg.license+' | [License](licenses/'+file+') |');
}
const content='# Third-party notices\n\nAssets Library code and original artwork are MIT licensed. Dependencies retain their upstream licenses and copyright notices. This file and licenses/ accompany the installable plugin.\n\n| Dependency | Version | License | Notice |\n| --- | --- | --- | --- |\n'+rows.join('\n')+'\n\n## Artwork\n\nThe book glyph, release compositions and sample vector artwork are original project graphics. Screenshots use controlled fixture assets and the compiled panel. No proprietary fonts or third-party logos are distributed.\n';
await writeFile(path.join(root,'THIRD_PARTY_NOTICES.md'),content);
console.log('Collected bundled JavaScript dependency licenses.');
