import {readFileSync} from 'node:fs';
const sampleVideo=JSON.parse(readFileSync(new URL('./fixtures/sample-video.json',import.meta.url),'utf8')).base64;
import {test,expect} from '@playwright/test';
const errors=new WeakMap();test.beforeEach(async({page})=>{errors.set(page,[]);page.on('pageerror',e=>errors.get(page).push(e.message));});test.afterEach(async({page})=>{expect(errors.get(page)).toEqual([]);});
async function mock(page,{count=1000,theme='dark',remote=false}={}) {
  await page.addInitScript(({count,theme,remote,sampleVideo})=>{
    const colors=theme==='dark'?{bg:'#18191c',fg:'#e4e5e8',muted:'#a1a4ab',primary:'#8dbbb0',border:'#303238'}:{bg:'#fafafa',fg:'#292b30',muted:'#676b75',primary:'#287d6c',border:'#dedfe3'};
    document.addEventListener('DOMContentLoaded',()=>{document.documentElement.className=theme;for(const [k,v]of Object.entries({'--orca-background':colors.bg,'--orca-foreground':colors.fg,'--orca-muted-foreground':colors.muted,'--orca-primary':colors.primary,'--orca-border':colors.border,'--orca-primary-foreground':theme==='dark'?'#18191c':'#ffffff'}))document.documentElement.style.setProperty(k,v);});
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#eee9df"/><circle cx="280" cy="144" r="100" fill="#287d6c"/><circle cx="160" cy="235" r="84" fill="#b0bcab"/><path d="M0 290L160 220 320 300 480 160V360H0Z" fill="#394d47"/></svg>',data='data:image/svg+xml;base64,'+btoa(svg);
    const records=Array.from({length:count},(_,i)=>({id:'asset-'+i,projectId:'p',worktreeId:i%3===0?'two':'one',worktreeName:i%3===0?'Brand exploration':'Current worktree',filename:i===1?'landing-page-very-long-filename-with-a-design-iteration.svg':'composition-'+i+'.svg',relativePath:'output/composition-'+i+'.svg',absolutePath:'/repo/output/composition-'+i+'.svg',extension:'svg',mimeType:'image/svg+xml',sizeBytes:2345,width:i===2?120:480,height:i===2?900:360,createdAt:Date.now()-i*1000,updatedAt:Date.now()-i*1000,origin:i===3?'inferred-agent':i===4?'discovered':'confirmed-agent',contentHash:'hash-'+i,version:1,status:i===5?'missing':'available'}));
    const w={projectAppearance:{color:'#00d7ff',iconName:'Box'},id:'one',kind:'worktree',name:'Current worktree',path:'/repo',branch:'main',hostId:remote?'ssh:server':'local',root:remote?undefined:'/repo',libraryProjectId:'p',reason:remote?'Remote assets need a remote filesystem API.':undefined};
    const context={active:w,workspaces:[w,{...w,id:'two',name:'Brand exploration',projectAppearance:{color:'#8b5cf6',iconName:'Sparkles'}}],reason:w.reason,warnings:[],refreshing:false,settings:{includedFolders:[],excludedFolders:[],maxSizeMB:32,extensions:['png','svg','gif'],includeIgnored:false,includeUnavailable:false},canOpen:true,watching:2};
    const listeners={},storage=new Map(JSON.parse(sessionStorage.getItem('library-test-storage')??'[]'));context.settings=storage.get('discovery.settings.v1')??context.settings;window.orca={storage:{get:async key=>storage.get(key)??null,set:async(key,value)=>{storage.set(key,value);sessionStorage.setItem('library-test-storage',JSON.stringify([...storage]));}},plugin:{on:(event,fn)=>{listeners[event]=fn;return{dispose(){}};},request:async(name,input={})=>{(window.libraryTestRequests??=[]).push({name,input});if(name==='library.context')return context;if(name==='library.list'){window.libraryTestQuery=input;window.libraryTestListCalls=(window.libraryTestListCalls??0)+1;if(count>10){Object.assign(records.find(a=>a.id==='asset-7'),{filename:'design-notes.md',relativePath:'output/design-notes.md',extension:'md',mimeType:'text/markdown',width:undefined,height:undefined});}const items=remote?[]:records.filter(a=>(input.scope==='project'||a.worktreeId===context.active.id)&&(a.origin==='confirmed-agent'&&a.location!=='chat')&&(context.settings.includeUnavailable===true||a.status!=='missing')&&(!input.search||a.filename.includes(input.search)||a.relativePath.includes(input.search))&&(!input.worktreeId||a.worktreeId===input.worktreeId)&&(!input.filter||input.filter==='all'||input.filter==='images'&&a.mimeType.startsWith('image/')||input.filter==='videos'&&a.mimeType.startsWith('video/')||input.filter==='markdown'&&a.mimeType==='text/markdown'||input.filter==='other'&&!a.mimeType.startsWith('image/')&&!a.mimeType.startsWith('video/')&&a.mimeType!=='text/markdown'));return{assets:items.slice(input.offset??0,(input.offset??0)+(input.limit??100)),total:items.length,revision:1};}if(name==='library.thumbnail'){if(input.id==='asset-video')return{mimeType:'video/webm',needsOriginal:true};const tall='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="900"><rect width="120" height="900" fill="#287d6c"/></svg>';return{mimeType:'image/svg+xml',data:input.id==='asset-2'?'data:image/svg+xml;base64,'+btoa(tall):data};}if(name==='library.documentPreview')return{text:('# Design notes\n\nA **compact preview** with _rendered text_ and '+String.fromCharCode(96)+'inline code'+String.fromCharCode(96)+'.\n\n## Decisions\n\n- Keep previews small.\n- Open file for the full document.\n\n| Format | State |\n| --- | --- |\n| Markdown | Ready |\n\n<script>window.markdownExecuted=true</script>\n\n![External](https://example.invalid/image.png)\n\n'+('More document content.\n'.repeat(400))+'MARKDOWN_FULL_END').slice(0,3000)};if(name==='library.preview'){if(input.id==='asset-video')return{mimeType:'video/webm',contentHash:input.contentHash,data:sampleVideo,totalBytes:atob(sampleVideo).length};if(input.id==='asset-7'){const markdown='# Design notes\n\nSample Markdown with <script>window.markdownExecuted=true</script>.\n\n![External](https://example.invalid/image.png)';return{mimeType:'text/markdown',contentHash:input.contentHash,data:btoa(markdown),totalBytes:markdown.length};}return{mimeType:'image/svg+xml',contentHash:input.contentHash,data:btoa(svg),totalBytes:svg.length};}if(name==='library.detail')return records.find(a=>a.id===input.id);if(name==='library.refresh'){window.libraryTestRefreshCalls=(window.libraryTestRefreshCalls??0)+1;return{ok:true};}if(name==='library.action'){window.lastAction=input;return{ok:true};}if(name==='library.settings'){context.settings=input;await window.orca.storage.set('discovery.settings.v1',input);return input;}return{ok:true};}},on:()=>({dispose(){}})};
    window.libraryTestAddVideo=()=>{records.unshift({...records[1],id:'asset-video',filename:'agent-demo.webm',relativePath:'output/agent-demo.webm',absolutePath:'/repo/output/agent-demo.webm',mimeType:'video/webm',extension:'webm',width:undefined,height:undefined,worktreeId:'one',origin:'confirmed-agent',contentHash:'video-hash',sizeBytes:3145728,updatedAt:Date.now()});listeners['library.changed']?.({});};
    window.libraryTestAddHtml=()=>{const html={...records[1],id:'asset-html',filename:'generated-page.htm',relativePath:'output/generated-page.htm',absolutePath:'/repo/output/generated-page.htm',mimeType:'text/html',extension:'htm',width:undefined,height:undefined,worktreeId:'one',origin:'confirmed-agent',contentHash:'html-hash',updatedAt:Date.now()};records.unshift(html,{...html,id:'ordinary-html',origin:'discovered',filename:'ordinary.html',absolutePath:'/repo/ordinary.html',relativePath:'ordinary.html'});listeners['library.changed']?.({});};
    window.libraryTestEmit=event=>listeners[event]?.({});
    window.libraryTestSwitchWorktree=()=>{context.active=context.workspaces[1];listeners['library.contextChanged']?.({});};
    window.libraryTestAddGenerated=()=>{records.unshift({...records[1],id:'asset-live',filename:'live-generated.png',relativePath:'output/live-generated.png',absolutePath:'/repo/output/live-generated.png',mimeType:'image/png',extension:'png',worktreeId:'one',origin:'confirmed-agent',contentHash:'live-hash',updatedAt:Date.now()});listeners['library.changed']?.({});};
  },{count,theme,remote,sampleVideo});
  await page.goto('/');await expect(page.getByRole('heading',{name:'Assets Library',exact:true})).toBeVisible();
}
for(const width of [240,280,360,520])for(const theme of ['light','dark'])test('gallery '+width+' '+theme,async({page})=>{await page.setViewportSize({width,height:900});await mock(page,{theme});await expect(page.locator('.asset-face img:not([hidden])').first()).toBeVisible();await expect(page.getByRole('searchbox',{name:'Search assets'})).toBeVisible();const filterBounds=await page.locator('.filters').boundingBox(),countBounds=await page.locator('.asset-count').boundingBox();expect(countBounds.x).toBeGreaterThanOrEqual(filterBounds.x+filterBounds.width);expect(Math.abs(countBounds.y+countBounds.height/2-filterBounds.y-filterBounds.height/2)).toBeLessThan(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await expect.poll(()=>page.locator('.grid-row').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(width<280?1:width>480?3:2);const cards=await page.locator('.asset-card').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();const img=n.querySelector('img').getBoundingClientRect();return {bottom:r.bottom,imageBottom:img.bottom};}));for(const card of cards)expect(card.imageBottom).toBeLessThanOrEqual(card.bottom);await page.screenshot({path:'.orca/shots/browser-gallery-'+width+'-'+theme+'.png'});});
test('inspector, native action and keyboard return',async({page})=>{await mock(page);await page.locator('.asset-face').first().focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');expect(await page.evaluate(()=>window.lastAction.action)).toBe('open');await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Enter');await expect(page.getByRole('region',{name:'Asset inspector'})).toBeVisible();await expect(page.locator('.preview-stage img:not([hidden])')).toBeVisible();await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Toggle transparency background'}).click();await page.getByRole('button',{name:'Open file',exact:true}).click();expect(await page.evaluate(()=>window.lastAction.action)).toBe('open');await page.screenshot({path:'.orca/shots/browser-inspector.png'});await page.keyboard.press('Escape');await expect(page.locator('.asset-grid')).toBeVisible();});
test('persistent search, filter-row refresh and generated-only worktree gallery',async({page})=>{
  await mock(page);const input=page.getByRole('searchbox',{name:'Search assets'}),count=page.locator('.asset-count');
  await expect(input).toBeVisible();await expect(count).toHaveText('664 assets');await expect(page.getByRole('button',{name:'Search assets',exact:true})).toHaveCount(0);
  await expect(page.getByRole('group',{name:'Asset type'}).getByRole('button')).toHaveText(['All','Images','Videos','Markdown','Other']);
  await page.getByRole('button',{name:'Images',exact:true}).click();await expect(page.locator('.filename')).not.toContainText(['design-notes.md']);
  await page.getByRole('button',{name:'Videos',exact:true}).click();await expect(count).toHaveText('0 assets');await expect(page.locator('.empty')).toContainText('Try another search or asset type.');
  await page.getByRole('button',{name:'Markdown',exact:true}).click();await expect(page.locator('.filename')).toHaveText(['design-notes.md']);await expect(count).toHaveText('1 asset');
  await page.getByRole('button',{name:'Other',exact:true}).click();await expect(page.locator('.asset-card')).toHaveCount(0);
  await page.getByRole('button',{name:'All',exact:true}).click();
  expect((await input.boundingBox()).x).toBeLessThan((await page.getByRole('group',{name:'Gallery view'}).boundingBox()).x);
  await input.fill('very-long');await expect(page.locator('.filename')).toHaveCount(1);await expect(input).toBeFocused();await expect(count).toHaveText('1 asset');
  await page.keyboard.press('Escape');await expect(input).toBeVisible();await expect(input).toBeFocused();await expect(input).toHaveValue('');await expect(count).toHaveText('664 assets');
  await page.locator('.asset-face').first().focus();await page.locator('.card-actions').first().getByRole('button',{name:/^Info for /}).click();
  await page.keyboard.press('Control+f');await expect(input).toBeFocused();await expect(page.locator('.asset-grid')).toBeVisible();
  await input.fill('very-long');await expect(page.locator('.filename')).toHaveCount(1);await expect(input).toBeFocused();
  await page.keyboard.press('Control+f');expect(await input.evaluate(e=>e.selectionStart===0&&e.selectionEnd===e.value.length)).toBe(true);
  await input.fill('');await expect(count).toHaveText('664 assets');
  await expect(page.getByRole('button',{name:'Project',exact:true})).toHaveCount(0);await expect(page.getByLabel('Filter worktree')).toHaveCount(0);
  await expect(page.locator('.worktree-context')).toHaveText('Current worktree');
  await expect(page.getByLabel('Collection')).toHaveCount(0);await expect(page.getByRole('button',{name:'Discover All Assets',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Refresh generated assets',exact:true}).click();expect(await page.evaluate(()=>window.libraryTestRefreshCalls)).toBe(1);expect(await page.evaluate(()=>window.libraryTestQuery.mode)).toBe('generated');
});
test('virtualized hundreds of assets have bounded DOM and page on scroll',async({page})=>{await mock(page);await expect(page.locator('.asset-face').first()).toBeVisible();await page.locator('#scroller').evaluate(e=>e.scrollTop=e.scrollHeight-500);await expect(page.locator('.asset-face').last()).toBeVisible();expect(await page.locator('.asset-card').count()).toBeLessThan(40);});
for(const width of [240,520])for(const theme of ['light','dark'])test('project icon follows worktree identity and appearance updates '+width+' '+theme,async({page})=>{
  await page.setViewportSize({width,height:900});await mock(page,{theme});const strip=page.locator('.worktree-context'),badge=strip.locator('.project-badge'),label=strip.locator('.worktree-name');
  await expect(badge).toHaveCount(1);await expect(badge).toHaveCSS('color','rgb(0, 215, 255)');expect(await badge.evaluate(e=>e.tagName.toLowerCase())).toBe('svg');
  const badgeBounds=await badge.boundingBox(),nameBounds=await label.boundingBox();expect(badgeBounds.x+badgeBounds.width).toBeLessThan(nameBounds.x);
  await page.screenshot({path:'.orca/shots/browser-project-icon-'+width+'-'+theme+'.png'});
  await page.evaluate(()=>window.libraryTestSwitchWorktree());await expect(label).toHaveText('Brand exploration');await expect(badge).toHaveCSS('color','rgb(139, 92, 246)');
  await expect(badge.locator('path')).toHaveAttribute('d',/^m12 3/);
  await page.evaluate(async()=>{const ctx=await window.orca.plugin.request('library.context');ctx.active.projectAppearance={color:'#ec4899',iconName:'Code2'};ctx.active.name='feature/a-very-long-worktree-name-that-must-stay-inside-the-rounded-strip';window.libraryTestEmit('library.contextChanged');});
  await expect(badge).toHaveCSS('color','rgb(236, 72, 153)');await expect(badge.locator('path')).toHaveAttribute('d',/^m18 16/);await expect(label).toHaveCSS('text-overflow','ellipsis');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.evaluate(async()=>{const ctx=await window.orca.plugin.request('library.context');ctx.active.projectAppearance={color:'#ec4899',iconName:'UnsupportedIcon'};window.libraryTestEmit('library.contextChanged');});
  await expect(badge).toHaveClass(/project-color-dot/);await expect(badge).toHaveCSS('color','rgb(236, 72, 153)');
  await page.evaluate(async()=>{const ctx=await window.orca.plugin.request('library.context');delete ctx.active.projectAppearance;window.libraryTestEmit('library.contextChanged');});await expect(badge).toHaveCount(0);
});
for(const width of [240,520])for(const theme of ['light','dark'])for(const layout of ['cards','list'])test('gallery fade and hover scrollbar '+width+' '+theme+' '+layout,async({page})=>{
  await page.setViewportSize({width,height:700});await mock(page,{theme});
  if(layout==='list')await page.getByRole('button',{name:'List view',exact:true}).click();
  const scroller=page.locator('#scroller'),frame=page.locator('.assets-scroll-frame'),scrollbar=frame.locator('>.scrollbar'),thumb=scrollbar.locator('.scroll-thumb');
  await page.mouse.move(1,1);await expect(frame).toHaveClass(/is-scrollable/);await expect(frame).toHaveClass(/can-scroll-down/);
  await expect.poll(()=>frame.evaluate(e=>getComputedStyle(e,'::after').opacity)).toBe('1');await expect(scrollbar).toHaveCSS('opacity','0');
  const originalWidth=await scroller.evaluate(e=>e.clientWidth);await scroller.hover();await expect(scrollbar).toHaveCSS('opacity','1');
  expect(await scroller.evaluate(e=>e.clientWidth)).toBe(originalWidth);expect(await scroller.evaluate(e=>e.scrollTop)).toBe(0);
  await page.screenshot({path:'.orca/shots/browser-gallery-scroll-'+width+'-'+theme+'-'+layout+'.png'});
  const bounds=await thumb.boundingBox();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2+40);await page.mouse.up();await expect.poll(()=>scroller.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator('.asset-card').count()).toBeLessThan(40);
  await scroller.evaluate(e=>e.scrollTop=0);await page.locator('.asset-face').first().focus();await page.mouse.move(1,1);await expect(scrollbar).toHaveCSS('opacity','1');
  await page.keyboard.press('End');await expect(page.locator('.asset-face:focus')).toHaveAttribute('aria-label','Open composition-998.svg in editor');
  await scroller.evaluate(e=>e.scrollTop=e.scrollHeight);await expect(frame).not.toHaveClass(/can-scroll-down/);await expect.poll(()=>frame.evaluate(e=>getComputedStyle(e,'::after').opacity)).toBe('0');
  await page.screenshot({path:'.orca/shots/browser-gallery-scroll-bottom-'+width+'-'+theme+'-'+layout+'.png'});
  await page.getByRole('searchbox',{name:'Search assets'}).fill('design-notes');await expect(page.locator('.asset-count')).toHaveText('1 asset');
  await expect(frame).not.toHaveClass(/is-scrollable/);await expect(scrollbar).toHaveCSS('opacity','0');await expect(frame).not.toHaveClass(/can-scroll-down/);
  await page.getByRole('searchbox',{name:'Search assets'}).fill('no-such-output');await expect(page.locator('.asset-count')).toHaveText('0 assets');await expect(frame).not.toHaveClass(/is-scrollable/);
});
test('empty and remote states remain purposeful',async({page})=>{await mock(page,{count:0});await expect(page.getByRole('heading',{name:'Nothing generated yet'})).toBeVisible();await page.screenshot({path:'.orca/shots/browser-empty.png'});});
for(const theme of ['light','dark'])test('unavailable files are an opt-in saved discovery setting '+theme,async({page})=>{
  await page.setViewportSize({width:240,height:900});await mock(page,{count:10,theme});
  await expect(page.locator('.asset-count')).toHaveText('4 assets');
  const search=page.getByRole('searchbox',{name:'Search assets'});await search.fill('composition-5');
  await expect(page.locator('.asset-count')).toHaveText('0 assets');await expect(page.locator('[data-id=asset-5]')).toHaveCount(0);
  await search.fill('');await page.getByRole('button',{name:'Discovery settings',exact:true}).click();
  const toggle=page.getByRole('checkbox',{name:'Include unavailable files'});await expect(toggle).not.toBeChecked();
  await toggle.focus();await page.keyboard.press('Space');await expect(toggle).toBeChecked();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(240);
  await page.screenshot({path:'.orca/shots/browser-unavailable-settings-240-'+theme+'.png'});
  await page.getByRole('button',{name:'Save settings',exact:true}).click();await expect(page.locator('.asset-count')).toHaveText('5 assets');
  await expect(page.locator('[data-id=asset-5]')).toHaveClass(/missing/);
  await page.getByRole('button',{name:'List view',exact:true}).click();await expect(page.locator('[data-id=asset-5]')).toHaveClass(/missing/);
  await page.reload();await expect(page.locator('.asset-count')).toHaveText('5 assets');await expect(page.locator('[data-id=asset-5]')).toHaveClass(/missing/);
  await page.getByRole('button',{name:'Discovery settings',exact:true}).click();await expect(toggle).toBeChecked();
  await toggle.uncheck();await page.getByRole('button',{name:'Save settings',exact:true}).click();await expect(page.locator('.asset-count')).toHaveText('4 assets');
  await expect(page.locator('[data-id=asset-5]')).toHaveCount(0);await page.reload();await expect(page.locator('.asset-count')).toHaveText('4 assets');
});
test('remote never displays a local asset',async({page})=>{await mock(page,{remote:true});await expect(page.getByRole('heading',{name:'Remote assets unavailable'})).toBeVisible();await expect(page.locator('.asset-card')).toHaveCount(0);});
test('reduced motion disables transitions',async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await mock(page);await expect(page.locator('.asset-card').first()).toBeVisible();expect(await page.locator('.asset-card').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');expect(await page.locator('.card-actions').first().evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');});

test('Markdown filter shows a compact safe rendered preview',async({page})=>{const remoteRequests=[];page.on('request',r=>{if(r.url().includes('example.invalid'))remoteRequests.push(r.url());});await mock(page);await page.getByRole('button',{name:'Markdown',exact:true}).click();await expect(page.locator('.filename')).toHaveText(['design-notes.md']);await page.locator('.asset-face').first().focus();await page.getByRole('button',{name:'Info for design-notes.md',exact:true}).click();await expect(page.getByLabel('Markdown preview').getByRole('heading',{name:'Design notes',exact:true})).toBeVisible();await expect(page.locator('.markdown-preview strong')).toHaveText('compact preview');await expect(page.locator('.markdown-preview em')).toHaveText('rendered text');await expect(page.locator('.markdown-preview li')).toHaveCount(2);await expect(page.locator('.markdown-preview table')).toHaveCount(1);await expect(page.getByLabel('Markdown preview')).not.toContainText('MARKDOWN_FULL_END');await expect(page.locator('.markdown-preview script,.markdown-preview img,.markdown-preview a')).toHaveCount(0);expect(await page.locator('.document-stage').evaluate(e=>e.getBoundingClientRect().height)).toBeLessThanOrEqual(240);expect(await page.evaluate(()=>window.markdownExecuted)).toBeUndefined();expect(remoteRequests).toEqual([]);await expect(page.getByRole('button',{name:'Zoom in',exact:true})).toHaveCount(0);await page.screenshot({path:'.orca/shots/browser-markdown-inspector.png'});});

for(const width of [240,280,360,520])for(const theme of ['light','dark'])test('list '+width+' '+theme,async({page})=>{
  await page.setViewportSize({width,height:900});await mock(page,{theme});
  await page.getByRole('button',{name:'List view',exact:true}).click();
  await expect(page.locator('.asset-grid')).toHaveClass(/asset-list/);
  await expect(page.getByRole('button',{name:'List view',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.locator('.grid-row').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(1);
  await expect(page.locator('.asset-path').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const bounds=await page.locator('.gallery-tools').evaluate(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right};});expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(width);
  const first=page.locator('.asset-card').first(),metadata=first.locator('.card-meta>.muted'),actions=first.locator('.card-actions');
  await first.hover();await expect(actions).toHaveCSS('opacity','1');await expect(actions).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
  await expect(metadata).toHaveCSS('opacity','1');await expect(first.locator('.list-size')).toBeVisible();
  const actionBounds=await actions.boundingBox(),rowBounds=await first.boundingBox(),metadataBounds=await metadata.boundingBox();
  expect(actionBounds.x).toBeGreaterThan(rowBounds.x+rowBounds.width/2);expect(actionBounds.x+actionBounds.width).toBeLessThanOrEqual(rowBounds.x+rowBounds.width);
  expect(metadataBounds.y+metadataBounds.height).toBeLessThanOrEqual(actionBounds.y);
  await actions.getByRole('button',{name:/^Info for /}).focus();await expect(metadata).toHaveCSS('opacity','1');
  await page.screenshot({path:'.orca/shots/browser-list-'+width+'-'+theme+'.png'});
  await page.locator('#scroller').evaluate(e=>e.scrollTop=e.scrollHeight-500);
  await expect(page.locator('.asset-face').last()).toBeVisible();expect(await page.locator('.asset-card').count()).toBeLessThan(40);
});
test('thumbnail opens editor; two sliding actions open or show info',async({page})=>{
  await page.setViewportSize({width:360,height:900});await mock(page);
  const first=page.locator('.asset-card').first(),actions=first.locator('.card-actions');
  await expect(actions.locator('button')).toHaveCount(2);
  expect(await actions.evaluate(e=>getComputedStyle(e).opacity)).toBe('0');
  expect(await actions.evaluate(e=>getComputedStyle(e).transform)).not.toBe('none');
  await first.hover();await expect(actions).toHaveCSS('opacity','1');
  await actions.getByRole('button',{name:/^Open /}).click();
  expect(await page.evaluate(()=>window.lastAction)).toEqual({id:'asset-1',action:'open'});
  await first.locator('.asset-face').click();
  await expect(page.getByRole('region',{name:'Asset inspector'})).toHaveCount(0);
  await actions.getByRole('button',{name:/^Info for /}).click();
  await expect(page.getByRole('region',{name:'Asset inspector'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(first.locator('.asset-face')).toBeFocused();
  await first.hover();await expect(actions).toHaveCSS('opacity','1');await expect(actions).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');await page.screenshot({path:'.orca/shots/browser-card-actions.png'});
});
test('view choice persists and supports Markdown info in list',async({page})=>{
  await mock(page);await page.getByRole('button',{name:'List view',exact:true}).click();
  await expect(page.getByRole('button',{name:'List view',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.reload();await expect(page.locator('.asset-grid')).toHaveClass(/asset-list/);
  await page.getByRole('button',{name:'Markdown',exact:true}).click();await page.locator('.asset-face').focus();
  await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Enter');
  await expect(page.getByLabel('Markdown preview')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.locator('.asset-grid')).toHaveClass(/asset-list/);
  await page.getByRole('button',{name:'Cards view',exact:true}).click();await expect(page.locator('.asset-grid')).not.toHaveClass(/asset-list/);
});
test('list keyboard navigation pages to the end without moving selection on a live update',async({page})=>{
  await mock(page);await page.getByRole('button',{name:'List view',exact:true}).click();await page.locator('.asset-face').first().focus();
  await page.keyboard.press('End');await expect(page.locator('.asset-face:focus')).toHaveAttribute('aria-label','Open composition-998.svg in editor');
  await page.keyboard.press('ArrowUp');await expect(page.locator('.asset-face:focus')).toHaveAttribute('aria-label','Open composition-997.svg in editor');
  const requests=await page.evaluate(()=>window.libraryTestListCalls);
  await page.evaluate(()=>window.libraryTestEmit('library.changed'));
  await expect.poll(()=>page.evaluate(()=>window.libraryTestListCalls)).toBeGreaterThan(requests);
  await expect(page.locator('[data-id=asset-997]')).toHaveAttribute('aria-selected','true');
});
for(const markdown of [false,true])test('inspector header stays visible while scrolling '+(markdown?'Markdown':'image'),async({page})=>{
  await page.setViewportSize({width:360,height:600});await mock(page);
  if(markdown)await page.getByRole('button',{name:'Markdown',exact:true}).click();
  await page.locator('.asset-face').first().focus();await page.locator('.card-actions').first().getByRole('button',{name:/^Info for /}).click();
  if(markdown)await expect(page.getByLabel('Markdown preview')).toContainText('Design notes');
  await page.locator('#scroller').evaluate(e=>e.scrollTop=e.scrollHeight);
  await expect(page.getByRole('button',{name:'All Assets',exact:true})).toBeVisible();
  const top=await page.locator('#scroller').evaluate(e=>e.getBoundingClientRect().top);
  expect(await page.locator('.inspector-heading').evaluate(e=>e.getBoundingClientRect().top)).toBeCloseTo(top,0);
  await page.screenshot({path:'.orca/shots/browser-sticky-'+(markdown?'markdown':'image')+'.png'});
  await page.getByRole('button',{name:'All Assets',exact:true}).click();await expect(page.locator('.asset-grid')).toBeVisible();
});
for(const theme of ['light','dark'])test('compact Markdown at 240 '+theme,async({page})=>{
  await page.setViewportSize({width:240,height:900});await mock(page,{theme});
  await page.getByRole('button',{name:'Markdown',exact:true}).click();await page.locator('.asset-face').first().focus();
  await page.getByRole('button',{name:'Info for design-notes.md',exact:true}).click();
  await expect(page.getByLabel('Markdown preview')).toContainText('compact preview');
  const stage=page.locator('.document-stage'),frame=page.locator('.document-preview-frame');
  await page.mouse.move(1,1);await expect(frame).toHaveClass(/can-scroll-down/);
  await expect.poll(()=>frame.evaluate(e=>getComputedStyle(e,'::after').opacity)).toBe('1');
  const scrollbar=frame.locator('.scrollbar'),thumb=frame.locator('.scroll-thumb');
  await expect(scrollbar).toHaveCSS('opacity','0');
  const previewWidth=await stage.evaluate(e=>e.clientWidth);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(240);
  await expect(page.getByRole('button',{name:'Open file',exact:true})).toBeVisible();
  await page.screenshot({path:'.orca/shots/browser-markdown-240-'+theme+'.png'});
  await stage.hover();await expect(scrollbar).toHaveCSS('opacity','1');
  expect(await stage.evaluate(e=>e.clientWidth)).toBe(previewWidth);
  await page.screenshot({path:'.orca/shots/browser-markdown-hover-240-'+theme+'.png'});
  const thumbBounds=await thumb.boundingBox();await page.mouse.move(thumbBounds.x+thumbBounds.width/2,thumbBounds.y+thumbBounds.height/2);
  await page.mouse.down();await page.mouse.move(thumbBounds.x+thumbBounds.width/2,thumbBounds.y+thumbBounds.height/2+40);await page.mouse.up();
  await expect.poll(()=>stage.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);await stage.evaluate(e=>e.scrollTop=0);
  await page.keyboard.press('Tab');await expect(stage).toBeFocused();await page.mouse.move(1,1);
  await expect(scrollbar).toHaveCSS('opacity','1');
  const outerScroll=await page.locator('#scroller').evaluate(e=>e.scrollTop);
  await page.keyboard.press('PageDown');await expect.poll(()=>stage.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator('#scroller').evaluate(e=>e.scrollTop)).toBe(outerScroll);
  await stage.evaluate(e=>e.scrollTop=e.scrollHeight);await expect(frame).not.toHaveClass(/can-scroll-down/);
  await expect.poll(()=>frame.evaluate(e=>getComputedStyle(e,'::after').opacity)).toBe('0');
  await page.screenshot({path:'.orca/shots/browser-markdown-bottom-240-'+theme+'.png'});
});


test('Generated Assets updates live and ignores the obsolete opt-in preference',async({page})=>{
  await page.addInitScript(()=>sessionStorage.setItem('library-test-storage',JSON.stringify([['panel.preferences.v1',{scope:'worktree',mode:'generated',includeInferred:false}]])));
  await mock(page);
  expect(await page.evaluate(()=>window.libraryTestQuery.mode)).toBe('generated');
  await expect(page.locator('.asset-count')).toContainText('664 assets');
  await page.evaluate(()=>window.libraryTestAddGenerated());
  await expect(page.locator('.filename').first()).toHaveText('live-generated.png');
  await expect(page.locator('.asset-count')).toContainText('665 assets');
  expect(await page.evaluate(()=>window.libraryTestQuery.mode)).toBe('generated');
  expect(await page.evaluate(()=>window.libraryTestDiscoverCalls??0)).toBe(0);
  await expect(page.locator('[data-id=asset-live]')).toBeVisible();
  await expect(page.locator('[data-id=asset-3]')).toHaveCount(0);
  await expect(page.locator('[data-id=asset-4]')).toHaveCount(0);
  await page.getByRole('button',{name:'Discovery settings',exact:true}).click();
  await expect(page.getByLabel('Include uncertain agent activity')).toHaveCount(0);
});

for(const [width,theme]of [[240,'light'],[360,'dark']])test('automatic and on-demand refresh stays in the count row '+width+' '+theme,async({page})=>{
  await page.setViewportSize({width,height:900});await mock(page,{theme});const refresh=page.getByRole('button',{name:'Refresh generated assets',exact:true}),count=page.locator('.asset-count'),loader=refresh.locator('.refresh-loader');
  await expect(count).toHaveText('664 assets');const galleryTop=await page.locator('#scroller').evaluate(e=>e.getBoundingClientRect().top);
  await page.evaluate(async()=>{const ctx=await window.orca.plugin.request('library.context');ctx.collectionProgress={status:'running',found:0,scanned:0,skipped:0};window.libraryTestEmit('library.changed');});
  await expect(count).toHaveText('Refreshing');await expect(loader).toBeVisible();await expect(refresh.locator('svg:not(.refresh-loader)')).toBeHidden();await expect(refresh).toBeDisabled();await expect(page.locator('#progress')).toHaveCount(0);
  expect(await page.locator('#scroller').evaluate(e=>e.getBoundingClientRect().top)).toBe(galleryTop);
  await page.evaluate(()=>window.libraryTestAddGenerated());await expect(page.locator('.filename').first()).toHaveText('live-generated.png');await expect(count).toHaveText('Refreshing');
  await page.getByRole('button',{name:'Markdown',exact:true}).click();await expect(page.locator('.filename')).toHaveText(['design-notes.md']);await expect(count).toHaveText('Refreshing');
  await page.getByRole('button',{name:'All',exact:true}).click();await expect(page.locator('.filename').first()).toHaveText('live-generated.png');await expect(count).toHaveText('Refreshing');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.screenshot({path:'.orca/shots/browser-refreshing-'+width+'-'+theme+'.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await expect(loader).toHaveCSS('animation-name','none');
  await page.evaluate(async()=>{const ctx=await window.orca.plugin.request('library.context');ctx.refreshing=true;ctx.collectionProgress.status='complete';window.libraryTestEmit('library.changed');});
  await expect(count).toHaveText('Refreshing');await expect(refresh).toHaveAttribute('aria-busy','true');await expect(loader).toBeVisible();
  await page.evaluate(async()=>{const ctx=await window.orca.plugin.request('library.context');ctx.refreshing=false;window.libraryTestEmit('library.changed');});
  await expect(count).toHaveText('665 assets');await expect(refresh).toBeEnabled();await expect(loader).toBeHidden();await expect(refresh.locator('svg:not(.refresh-loader)')).toBeVisible();
  await page.evaluate(async()=>{const request=window.orca.plugin.request,ctx=await request('library.context');window.orca.plugin.request=async(name,input)=>{if(name==='library.refresh'){ctx.refreshing=true;await new Promise(resolve=>{window.libraryTestFinishRefresh=()=>{ctx.refreshing=false;resolve();};});}return request(name,input);};});
  await refresh.click();await expect(count).toHaveText('Refreshing');await expect(loader).toBeVisible();await expect(refresh).toBeDisabled();
  await page.evaluate(()=>window.libraryTestFinishRefresh());await expect(count).toHaveText('665 assets');await expect(refresh).toBeEnabled();expect(await page.evaluate(()=>window.libraryTestRefreshCalls)).toBe(1);
  await expect(page.getByLabel('Collection')).toHaveCount(0);await expect(page.getByRole('button',{name:'Discover All Assets',exact:true})).toHaveCount(0);
});
test('failed original opening keeps the gallery and Info references the worktree-relative path',async({page})=>{
  await mock(page);await page.evaluate(()=>{const request=window.orca.plugin.request;window.orca.plugin.request=async(name,input)=>{const result=await request(name,input);if(name==='library.list')for(const a of result.assets)Object.assign(a,{absolutePath:'/repo/'+a.filename});if(name==='library.action'&&input.action==='open')return{ok:false,message:'Could not open composition-1.svg in Orca: path must be inside the workspace.'};return result;};window.libraryTestEmit('library.changed');});
  await expect.poll(()=>page.locator('.asset-card').first().getAttribute('data-id')).toBe('asset-1');
  await page.waitForTimeout(250);await page.locator('.asset-face').first().click();await expect(page.locator('#toast')).toContainText('Could not open');await expect(page.getByRole('region',{name:'Asset inspector'})).toHaveCount(0);await expect(page.locator('.asset-grid')).toBeVisible();await page.locator('.card-actions').first().getByRole('button',{name:/^Info for /}).click();await expect(page.getByRole('region',{name:'Asset inspector'})).toBeVisible();await expect(page.getByRole('button',{name:'Copy relative path',exact:true})).toBeVisible();
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.libraryCopiedText=t;}}});});await page.getByRole('button',{name:'Copy reference',exact:true}).click();expect(await page.evaluate(()=>window.libraryCopiedText)).toContain('output/composition-1.svg');
});
test('Info clearly identifies fallback copies and references the editable worktree file',async({page})=>{
  await mock(page,{count:3});
  await page.evaluate(()=>{const request=window.orca.plugin.request;window.orca.plugin.request=async(name,input)=>{const result=await request(name,input);if(name==='library.detail')return {...result,location:'chat',sourceRoot:'/chat/owned',conversationId:'codex_one',originalPath:'/chat/owned/image.svg',absolutePath:'/repo/.orca/assets-library/opened/codex_one/image.svg',relativePath:'.orca/assets-library/opened/codex_one/image.svg'};return result;};Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.libraryCopiedText=text}});});
  await page.locator('.asset-face').first().focus();
  await page.locator('.card-actions').first().getByRole('button',{name:/^Info for /}).click();
  await page.evaluate(()=>window.libraryTestEmit('library.changed'));
  await expect(page.getByText('Working copy · Edits affect this file; its original stays unchanged.',{exact:true})).toBeVisible();
  await expect(page.getByText('/chat/owned/image.svg',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Copy reference',exact:true}).click();
  expect(await page.evaluate(()=>window.libraryCopiedText)).toContain('.orca/assets-library/opened/codex_one/image.svg');
  expect(await page.evaluate(()=>window.libraryCopiedText)).not.toContain('/chat/owned/');
  await page.screenshot({path:'.orca/shots/fallback-copy-info.png'});
});

test('Info keeps keyboard focus through gallery resize and a live collection update',async({page})=>{
  await mock(page);const info=page.getByRole('button',{name:'Info for composition-2.svg',exact:true});await page.locator('[data-id="asset-2"] .asset-face').focus();await page.keyboard.press('Tab');await page.keyboard.press('Tab');await expect(info).toBeFocused();
  await page.setViewportSize({width:520,height:900});await expect(info).toBeFocused();const calls=await page.evaluate(()=>window.libraryTestListCalls);await page.evaluate(()=>window.libraryTestEmit('library.changed'));await expect.poll(()=>page.evaluate(()=>window.libraryTestListCalls)).toBeGreaterThan(calls);await expect(info).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('region',{name:'Asset inspector'})).toBeVisible();
});


test('legacy project and discovered preferences migrate to generated assets in the current worktree',async({page})=>{
  await page.addInitScript(()=>sessionStorage.setItem('library-test-storage',JSON.stringify([['panel.preferences.v1',{scope:'project',mode:'discovered'}]])));
  await mock(page);await expect(page.locator('.asset-count')).toContainText('664 assets');
  expect(await page.evaluate(()=>window.libraryTestQuery.scope)).toBe('worktree');
  await expect(page.getByRole('button',{name:'Project',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Refresh generated assets',exact:true}).click();
  expect(await page.evaluate(()=>window.libraryTestQuery)).toMatchObject({scope:'worktree',mode:'generated'});
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('library-test-storage'))[0][1].scope)).toBe('worktree');
});

test('switching worktree clears previous details and shows only the newly active worktree',async({page})=>{
  await mock(page);await page.locator('.asset-face').first().focus();
  await page.locator('.card-actions').first().getByRole('button',{name:/^Info for /}).click();
  await expect(page.getByRole('region',{name:'Asset inspector'})).toBeVisible();
  await page.evaluate(()=>window.libraryTestSwitchWorktree());
  await expect(page.getByRole('region',{name:'Asset inspector'})).toHaveCount(0);
  await expect(page.locator('.worktree-context')).toHaveText('Brand exploration');
  await expect(page.locator('.asset-count')).toContainText('333 assets');
  await expect(page.locator('[data-id=asset-3]')).toHaveCount(0); // Activity-only repository fixture stays excluded.
  expect(await page.evaluate(()=>window.libraryTestQuery.scope)).toBe('worktree');
  await expect(page.locator('.filename')).not.toContainText(['landing-page-very-long-filename-with-a-design-iteration.svg']);
});

test('browser image decoding builds cached thumbnails and releases original Blob URLs',async({page})=>{
  await mock(page);await expect(page.locator('.asset-face img:not([hidden])').first()).toBeVisible();
  await page.evaluate(()=>{
    const originalRequest=window.orca.plugin.request,create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
    window.browserUrlsCreated=0;window.browserUrlsRevoked=0;window.browserCachedThumbnails=[];
    URL.createObjectURL=b=>{window.browserUrlsCreated++;return create(b);};URL.revokeObjectURL=u=>{window.browserUrlsRevoked++;revoke(u);};
    window.orca.plugin.request=async(name,input)=>{
      if(name==='library.thumbnail')return{mimeType:'image/svg+xml',needsOriginal:true};
      if(name==='library.cacheThumbnail'){window.browserCachedThumbnails.push(input);return{stored:true};}
      const result=await originalRequest(name,input);if(name==='library.list')for(const a of result.assets)a.contentHash=a.id+'-browser';return result;
    };window.libraryTestEmit('library.changed');
  });
  await expect.poll(()=>page.evaluate(()=>window.browserCachedThumbnails.length)).toBeGreaterThan(0);
  await expect.poll(()=>page.evaluate(()=>window.browserUrlsRevoked)).toBeGreaterThan(0);
  await expect.poll(()=>page.evaluate(()=>window.browserUrlsCreated-window.browserUrlsRevoked)).toBe(0);
  const thumbnail=await page.evaluate(()=>window.browserCachedThumbnails[0]);expect(thumbnail.data).toMatch(/^data:image\/webp;base64,/);expect(thumbnail.contentHash).toContain('-browser');
  await expect(page.locator('.asset-face img:not([hidden])').first()).toBeVisible();
  await page.locator('.asset-face').first().focus();await page.locator('.card-actions').first().getByRole('button',{name:/^Info for /}).click();
  await expect(page.locator('.preview-stage img:not([hidden])')).toBeVisible();await page.keyboard.press('Escape');
  await expect.poll(()=>page.evaluate(()=>window.browserUrlsCreated-window.browserUrlsRevoked)).toBe(0);
});

test('browser decoder failure shows an unavailable preview without hiding the file',async({page})=>{
  await mock(page);await expect(page.locator('.asset-face').first()).toBeVisible();
  await page.evaluate(()=>{
    const request=window.orca.plugin.request;
    window.orca.plugin.request=async(name,input)=>{
      if(name==='library.thumbnail')return{mimeType:'image/png',needsOriginal:true};
      if(name==='library.preview')return{mimeType:'image/png',contentHash:input.contentHash,data:btoa('invalid image content'),totalBytes:21};
      const r=await request(name,input);if(name==='library.list')for(const a of r.assets)a.contentHash=a.id+'-invalid';return r;
    };window.libraryTestEmit('library.changed');
  });
  await expect(page.locator('.asset-card').first().locator('.placeholder')).toHaveText('Preview unavailable');
  await expect(page.locator('.filename').first()).toBeVisible();
  await page.locator('.asset-face').first().focus();await page.locator('.card-actions').first().getByRole('button',{name:/^Info for /}).click();
  await expect(page.locator('.preview-stage .placeholder')).toContainText('Preview unavailable. Open the original file.');
});

test('chunked preview pins the selected version and rejects changes between chunks',async({page})=>{
  await mock(page,{count:3});await expect(page.locator('.asset-face img:not([hidden])').first()).toBeVisible();
  await page.evaluate(()=>{
    const request=window.orca.plugin.request;window.versionPreviewCalls=[];window.versionCacheWrites=[];
    window.orca.plugin.request=async(name,input)=>{
      if(name==='library.thumbnail'&&input.id==='asset-1')return{mimeType:'image/png',needsOriginal:true};
      if(name==='library.preview'&&input.id==='asset-1'){window.versionPreviewCalls.push(input);return{mimeType:'image/png',contentHash:input.offset===0?input.contentHash:'different-version',data:btoa(input.offset===0?'x'.repeat(128*1024):'y'),totalBytes:128*1024+1};}
      if(name==='library.cacheThumbnail')window.versionCacheWrites.push(input);
      const result=await request(name,input);if(name==='library.list')for(const a of result.assets)a.contentHash=a.id+'-version';return result;
    };window.libraryTestEmit('library.changed');
  });
  await expect(page.locator('[data-id=asset-1] .placeholder')).toHaveText('Preview unavailable');
  expect(await page.evaluate(()=>window.versionPreviewCalls)).toEqual([{id:'asset-1',offset:0,contentHash:'asset-1-version'},{id:'asset-1',offset:128*1024,contentHash:'asset-1-version'}]);
  expect(await page.evaluate(()=>window.versionCacheWrites.filter(a=>a.id==='asset-1'))).toEqual([]);
});

for(const width of [240,360,520])for(const theme of ['light','dark'])test('native video thumbnails, player and file actions '+width+' '+theme,async({page})=>{
  await page.setViewportSize({width,height:900});await mock(page,{theme});await page.getByRole('button',{name:'Videos',exact:true}).click();
  await page.evaluate(()=>{window.libraryTestRequests=[];window.libraryTestAddVideo();});
  await expect(page.locator('.filename')).toHaveText(['agent-demo.webm']);await expect(page.locator('.placeholder-label')).toHaveText('WebM');
  await expect(page.locator('.asset-face')).not.toHaveClass(/checker/);await expect(page.locator('.asset-face img')).toBeVisible();
  await page.locator('.asset-face').click();expect(await page.evaluate(()=>window.lastAction)).toEqual({id:'asset-video',action:'open'});
  await page.getByRole('button',{name:'List view',exact:true}).click();await expect(page.locator('.card-meta>.muted')).toHaveText('WebM · 3.0 MB');
  await page.locator('.asset-card').hover();await page.getByRole('button',{name:'Info for agent-demo.webm',exact:true}).click();
  await expect(page.getByRole('heading',{name:'agent-demo.webm',exact:true})).toBeVisible();await expect(page.locator('.inspector>p.muted')).toHaveText('WebM · 3.0 MB');
  await expect(page.locator('.preview-stage video')).toBeVisible();await expect.poll(()=>page.locator('.preview-stage video').evaluate(v=>v.videoWidth)).toBe(160);await expect(page.getByRole('button',{name:'Zoom in',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'View original resolution',exact:true})).toHaveCount(0);
  await page.evaluate(()=>{document.execCommand=()=>{window.libraryCopiedText=document.querySelector('textarea')?.value;return true;};Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.libraryCopiedText=text;}}});});
  await page.getByRole('button',{name:'Copy reference',exact:true}).click();expect(await page.evaluate(()=>window.libraryCopiedText)).toBe('[agent-demo.webm](output/agent-demo.webm)');
  await page.getByRole('button',{name:'Open file',exact:true}).click();expect(await page.evaluate(()=>window.lastAction.action)).toBe('open');
  const requests=await page.evaluate(()=>window.libraryTestRequests);expect(requests.some(r=>r.name==='library.cacheThumbnail'&&r.input.id==='asset-video')).toBe(true);expect(requests.some(r=>r.name==='library.preview'&&r.input.id==='asset-video')).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await page.screenshot({path:'.orca/shots/browser-video-info-'+width+'-'+theme+'.png'});
  await page.getByRole('button',{name:'All Assets',exact:true}).click();await page.screenshot({path:'.orca/shots/browser-video-list-'+width+'-'+theme+'.png'});
});

test('video playback stops and Blob resources are released when leaving Info',async({page})=>{
  await mock(page);await page.getByRole('button',{name:'Videos',exact:true}).click();await page.evaluate(()=>window.libraryTestAddVideo());
  await expect(page.locator('.asset-face img')).toBeVisible();await page.locator('.asset-card').hover();await page.getByRole('button',{name:'Info for agent-demo.webm',exact:true}).click();
  const player=page.locator('.preview-stage video');await expect(player).toBeVisible();
  await player.evaluate(async video=>{window.testVideo=video;window.testVideoURL=video.src;window.revokedVideoURLs=[];const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=url=>{window.revokedVideoURLs.push(url);revoke(url);};await video.play();});
  await expect.poll(()=>player.evaluate(video=>video.currentTime)).toBeGreaterThan(.1);
  await page.getByRole('button',{name:'All Assets',exact:true}).click();
  expect(await page.evaluate(()=>({paused:window.testVideo.paused,source:window.testVideo.getAttribute('src'),released:window.revokedVideoURLs.includes(window.testVideoURL)}))).toEqual({paused:true,source:null,released:true});
});

test('unsupported video decoding keeps file actions and shows a graceful fallback',async({page})=>{
  await mock(page);await page.getByRole('button',{name:'Videos',exact:true}).click();
  await page.evaluate(()=>{const request=window.orca.plugin.request;window.orca.plugin.request=async(name,input)=>{if(name==='library.preview'&&input.id==='asset-video')return{mimeType:'video/webm',contentHash:input.contentHash,data:btoa('not a video'),totalBytes:11};return request(name,input);};window.libraryTestAddVideo();});
  await expect(page.locator('.asset-face .placeholder')).toBeVisible();await expect(page.locator('.asset-face .placeholder')).toHaveAttribute('title','Video preview unavailable in this browser');
  await page.locator('.asset-card').hover();await page.getByRole('button',{name:'Info for agent-demo.webm',exact:true}).click();await expect(page.locator('.video-stage .placeholder')).toHaveText('Video preview unavailable in this browser. Open file in Orca.');await expect(page.locator('.video-stage video')).toBeHidden();
  await page.getByRole('button',{name:'Open file',exact:true}).click();expect(await page.evaluate(()=>window.lastAction)).toEqual({id:'asset-video',action:'open'});
});

for(const [width,theme] of [[240,'light'],[360,'dark']])test('generated HTML appears in Other with inert source preview '+width+' '+theme,async({page})=>{
  await page.setViewportSize({width,height:900});await mock(page,{theme});const external=[];page.on('request',r=>{if(r.url().includes('example.invalid'))external.push(r.url());});
  await page.evaluate(()=>{
    const request=window.orca.plugin.request;window.orca.plugin.request=async(name,input)=>{
      if(name==='library.documentPreview'&&input.id==='asset-html')return{text:'<!doctype html>\n<html><body><h1>Generated HTML</h1>\n<script>window.htmlExecuted=true</script>\n<img src="https://example.invalid/image.png" onerror="window.htmlExecuted=true">\n<iframe src="https://example.invalid/frame"></iframe>\n'+('<!-- Source details -->\n'.repeat(200))+'HTML_FULL_END</body></html>'};
      return request(name,input);
    };window.libraryTestAddHtml();
  });
  await page.getByRole('button',{name:'Other',exact:true}).click();await expect(page.locator('.asset-count')).toHaveText('1 asset');await expect(page.locator('.filename')).toHaveText(['generated-page.htm']);await expect(page.locator('.card-meta')).toContainText('HTML');
  await page.getByRole('button',{name:'List view',exact:true}).click();await expect(page.locator('.card-meta')).toContainText('HTML');await expect(page.locator('.list-size')).toBeVisible();
  await page.locator('.asset-face').click();expect(await page.evaluate(()=>window.lastAction)).toEqual({id:'asset-html',action:'open'});
  await page.locator('.asset-face').focus();await page.getByRole('button',{name:'Info for generated-page.htm',exact:true}).click();
  const preview=page.getByLabel('HTML source preview');await expect(preview).toContainText('<h1>Generated HTML</h1>');await expect(preview).not.toContainText('HTML_FULL_END');
  await expect(preview.locator('script,img,iframe,h1')).toHaveCount(0);expect(await page.evaluate(()=>window.htmlExecuted)).toBeUndefined();expect(external).toEqual([]);
  await expect(page.getByRole('button',{name:'Zoom in',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'View original resolution',exact:true})).toHaveCount(0);
  expect(await page.locator('.document-stage').evaluate(e=>e.scrollHeight)).toBeGreaterThan(await page.locator('.document-stage').evaluate(e=>e.clientHeight));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.screenshot({path:'.orca/shots/browser-html-'+width+'-'+theme+'.png'});
});
