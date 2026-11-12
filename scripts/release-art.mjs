import {chromium} from '@playwright/test';
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {screenshotArtwork,coverArtwork,socialArtwork,iconArtwork} from './artwork-composer.mjs';
import {markdownThumbnail,validateMarkdown} from '../src/worker/markdown.ts';
const root=fileURLToPath(new URL('../',import.meta.url)),at=file=>path.join(root,file);
const manifest=JSON.parse(await readFile(at('orca-plugin.json'),'utf8'));
const coverOnly=process.argv.includes('--cover-only');
const socialOnly=process.argv.includes('--social-only');
if(coverOnly&&socialOnly)throw new Error('Choose either --cover-only or --social-only.');
const singleImage=coverOnly||socialOnly;
const colors={dark:{bg:'#18191c',fg:'#e4e5e8',muted:'#a1a4ab',accent:'#8dbbb0',border:'#303238'},light:{bg:'#fafafa',fg:'#292b30',muted:'#676b75',accent:'#287d6c',border:'#dedfe3'}};
const records=[],previews={},thumbnails={},documents={};
const filenames=['forest-study.svg','editorial-banner.svg','orbit-mark.svg','mobile-composition.svg','visual-review.md','asset-catalog.md','design-notes.md'];
for(const [i,file] of filenames.entries()){
 const bytes=await readFile(at('assets/samples/'+file)),md=file.endsWith('.md'),input=md?markdownThumbnail(validateMarkdown(bytes)):bytes;
 const metadata=await sharp(input).metadata(),thumb=await sharp(input).resize({width:480,height:480,fit:'inside'}).webp({quality:84}).toBuffer(),id='sample-'+i,mimeType=md?'text/markdown':'image/svg+xml';
 records.push({id,projectId:'sample-project',worktreeId:'sample-worktree',worktreeName:'Design exploration',filename:file,relativePath:'assets/'+file,absolutePath:'/sample-worktree/assets/'+file,extension:file.split('.').pop(),mimeType,sizeBytes:bytes.length,...(!md?{width:metadata.width,height:metadata.height}:{}),createdAt:1767225600000-i*1000,updatedAt:1767225600000-i*1000,origin:'confirmed-agent',agent:'codex',tool:'write_file',contentHash:createHash('sha256').update(bytes).digest('hex'),version:1,status:'available'});
 previews[id]={mimeType,contentHash:records.at(-1).contentHash,data:bytes.toString('base64'),totalBytes:bytes.length};thumbnails[id]='data:image/webp;base64,'+thumb.toString('base64');if(md)documents[id]=bytes.toString('utf8').slice(0,3000);
}
function fixture({theme,colors,records,previews,thumbnails,documents,layout}){
 document.addEventListener('DOMContentLoaded',()=>{const c=colors[theme];document.documentElement.className=theme;for(const [k,v]of Object.entries({'--orca-background':c.bg,'--orca-foreground':c.fg,'--orca-muted-foreground':c.muted,'--orca-primary':c.accent,'--orca-border':c.border,'--orca-primary-foreground':theme==='dark'?'#18191c':'#ffffff'}))document.documentElement.style.setProperty(k,v);});
 const w={id:'sample-worktree',name:'Design exploration',kind:'worktree',path:'/sample-worktree',root:'/sample-worktree',branch:'design-exploration',hostId:'local',libraryProjectId:'sample-project',projectAppearance:{color:'#a855f7',iconName:'Sparkles'}},storage=new Map([['panel.preferences.v1',{scope:'worktree',mode:'generated',filter:'all',filterVersion:2,sort:'newest',galleryLayout:layout}]]);
 const context={active:w,workspaces:[w],warnings:[],refreshing:false,settings:{includedFolders:[],excludedFolders:[],maxSizeMB:32,extensions:['svg','png','md'],includeIgnored:false},canOpen:true,watching:1};
 window.orca={storage:{get:async k=>storage.get(k)??null,set:async(k,v)=>storage.set(k,v)},on:()=>({dispose(){}}),plugin:{on:()=>({dispose(){}}),request:async(name,input={})=>{
 if(name==='library.context')return context;if(name==='library.list'){const items=records.filter(a=>(!input.search||a.filename.includes(input.search))&&(!input.filter||input.filter==='all'||input.filter==='images'&&a.mimeType.startsWith('image/')||input.filter==='markdown'&&a.mimeType==='text/markdown'));return{assets:items.slice(input.offset??0,(input.offset??0)+(input.limit??100)),total:items.length,revision:1};}
 if(name==='library.thumbnail')return{mimeType:'image/webp',data:thumbnails[input.id]};if(name==='library.preview')return previews[input.id];if(name==='library.documentPreview')return{text:documents[input.id]};if(name==='library.detail')return records.find(a=>a.id===input.id);return{ok:true};}}};
}
const html=await readFile(at('runtime/ui/index.html')),js=await readFile(at('runtime/ui/app.js')),css=await readFile(at('runtime/ui/library.css'));
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});await mkdir(at('.orca/shots'),{recursive:true});await mkdir(at('assets'),{recursive:true});
const captures={};
try{
 for(const [key,theme,layout,markdown]of (singleImage?[['dark','dark','cards',false]]:[['dark','dark','cards',false],['light','light','cards',false],['list','dark','list',false],['markdown','light','cards',true]])){
  const page=await browser.newPage({viewport:{width:420,height:800},deviceScaleFactor:2});
  await page.route('**/*',async route=>{const p=new URL(route.request().url()).pathname;const data=p==='/'?html:p==='/app.js'?js:p==='/library.css'?css:null;await route.fulfill({status:data?200:404,body:data??'',contentType:p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'});});
  await page.addInitScript(fixture,{theme,colors,records,previews,thumbnails,documents,layout});await page.goto('http://assets-library.preview/');await page.getByRole('heading',{name:'Assets Library',exact:true}).waitFor();await page.locator('.asset-face img:not([hidden])').first().waitFor();
  if(markdown){await page.getByRole('button',{name:'Markdown',exact:true}).click();await page.locator('.asset-face').first().focus();await page.getByRole('button',{name:'Info for visual-review.md',exact:true}).click();await page.getByLabel('Markdown preview').getByRole('heading').first().waitFor();}
  await page.waitForTimeout(280);if(await page.evaluate(()=>document.documentElement.scrollWidth)>420)throw new Error('Preview controls overflow');
  captures[key]=await page.screenshot();await writeFile(at('.orca/shots/release-'+key+'.png'),captures[key]);await page.close();
 }
 async function render(file,source,width=1600,height=1000){const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});await page.setContent('<!doctype html><style>body{margin:0}svg{display:block}</style>'+source);await page.evaluate(()=>document.fonts.ready);const png=await page.screenshot();await sharp(png).png({compressionLevel:9}).toFile(at('assets/'+file));await page.close();}
 const t=colors.dark;
 if(!socialOnly)await render('cover.png',coverArtwork(t,captures.dark));
 if(!coverOnly)await render('social.png',socialArtwork(t,captures.dark),1280,640);
 if(!singleImage){
  for(const [key,theme]of [['dark','dark'],['light','light'],['list','dark'],['markdown','light']])await render('screenshot-'+key+'.png',screenshotArtwork(key,colors[theme],captures[key]));
  await render('icon.png',iconArtwork(t),512,512);
 }
}finally{await browser.close();}
await writeFile(at('assets/SCREENSHOTS.md'),'# Assets Library artwork\n\nGenerated with npm run release:art to illustrate automatic generated asset discovery, using the compiled panel, controlled Orca bridge fixtures and original assets/samples vectors and Markdown. No live workspaces, transcripts, filesystem paths, credentials or external images are captured. The icon retains the product’s book glyph.\n\n- icon.png: 512 × 512 original book mark with an orange gradient and purple glyph.\n- cover.png: 1600 × 1000 current compiled Library panel, an orange/purple frame, a brighter backdrop and bold product title.\n- screenshot-dark.png and screenshot-light.png: actual compiled card galleries within listing compositions.\n- screenshot-list.png: actual compiled List view.\n- screenshot-markdown.png: actual compact rendered Markdown inspector.\n- social.png: 1280 × 640 GitHub social preview featuring the current compiled panel in the same orange/purple frame as the cover.\n\nArtwork uses deterministic SVG compositions rendered by Chromium and Sharp, following the sibling plugins’ screenshot-based release-art approach. Bright orange/purple frames, a brighter plum backdrop and bold product names follow the sibling Sidequest cover’s strong visual direction; panel captures keep their native appearance. No generative image API, proprietary fonts, borrowed brand logos or resource downloads are used. System/browser fonts are rasterized; none are distributed. Raw fixture captures remain in ignored development storage.\n');
console.log(coverOnly?'Generated panel cover for '+manifest.name+'.':socialOnly?'Generated panel social image for '+manifest.name+'.':'Generated icon, cover, four listing previews and social image for '+manifest.name+'.');
