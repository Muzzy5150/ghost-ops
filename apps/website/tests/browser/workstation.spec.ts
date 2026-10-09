import { test, expect } from '@playwright/test';
test('real graph, readable nodes, selection and network controls',async({page})=>{
 const failures:string[]=[];page.on('pageerror',e=>failures.push(e.message));
 await page.goto('/terminal/');await expect(page.getByText('RECORDED SESSION',{exact:true})).toBeVisible();
 await expect(page.locator('.react-flow__node').first()).toBeVisible();
 await expect(page.locator('[data-window="inspector"]')).toBeVisible();
 await expect(page.locator('[data-window="events"]')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>{const flow=document.querySelector('.flow-surface')!.getBoundingClientRect();return Array.from(document.querySelectorAll('.react-flow__node')).some(node=>{const n=node.getBoundingClientRect();return n.top>=flow.top-1&&n.bottom<=flow.bottom+1&&n.left>=flow.left-1&&n.right<=flow.right+1;});})).toBe(true);
 const node=page.locator('.react-flow__node').first();await expect(node).toHaveCSS('width','304px');await expect(node).toHaveCSS('height','218px');
 await page.getByLabel('Find network entity').fill('Research');await page.getByLabel('Focus search result').click();
 await page.locator('.react-flow__node').filter({has:page.getByText('Research Agent',{exact:true})}).first().click();await expect(page.locator('[data-window="inspector"]')).toBeVisible();
 await page.getByLabel('Network entity filter').selectOption('deception');await expect(page.locator('.react-flow__node').first()).toBeVisible();
 expect(failures).toEqual([]);
 await page.screenshot({path:'test-results/workstation.png'});
});
test('window movement, resize, drag, minimize and saved layout',async({page})=>{
 await page.goto('/terminal/');const title=page.locator('[data-window="network"] .window-title');await expect(title).toBeVisible();await expect(page.locator('.react-flow__node').first()).toBeVisible();
 await title.focus();const win=page.locator('[data-window="network"]');const before=await win.boundingBox();await title.press('Alt+Shift+ArrowLeft');
 await expect.poll(async()=> (await win.boundingBox())!.width).toBeLessThan(before!.width);await title.press('Alt+ArrowRight');
 const box=await title.boundingBox();await page.mouse.move(box!.x+110,box!.y+15);await page.mouse.down();await page.mouse.move(box!.x+150,box!.y+45,{steps:8});await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('ghostops.workspace.v2'))).not.toBeNull();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ghostops.workspace.v2')!).windows.find((w:{id:string})=>w.id==='network'));
 await page.reload();await expect.poll(()=>win.getAttribute('style')).toContain(`width: ${saved.width}px`);
 await page.getByLabel('Minimize Agent network',{exact:true}).click();await expect(win).toHaveCount(0);await page.getByLabel('Restore Agent network',{exact:true}).click();await expect(win).toBeVisible();
});
test('engine navigation, memory versions, incident evidence and disabled authority',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push(r.url());});
 await page.goto('/terminal/');
 await expect(page.locator('.react-flow__node').first()).toBeVisible();
 for(const [name,content] of [['AgentDNA','Behavioral fingerprint'],['ShadowWatch','Identity & containment'],['MemoryGuard','Version history'],['GhostTrap','Deception topology'],['Ghost Hunt','Ghost Hunt + Ghost Response'],['Security Lab','Security Lab'],['Web Sentinel','Web Sentinel'],['Sponsor Integrations','Sponsor Integrations'],['Runtime sessions','Developer Integrations']]){
  await page.getByRole('button',{name:`Open ${name}`,exact:true}).click();await expect(page.locator('.window-content').getByText(content,{exact:true}).first()).toBeVisible();
 }
 await page.getByRole('button',{name:'Open MemoryGuard',exact:true}).click();await page.getByRole('button',{name:/Version 1/}).click();await expect(page.locator('.memory-content')).toContainText('Illustrative policy: read approved');await expect(page.getByRole('button',{name:'Restore this snapshot',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Incident Room',exact:true}).click();await expect(page.locator('.case-timeline')).toBeVisible();await expect(page.getByRole('button',{name:'Contain actor',exact:true})).toBeDisabled();
 expect(requests).toEqual([]);
});
test('recorded playback steps, seeks and plays without backend requests',async({page})=>{
 await page.goto('/demo/');await expect(page.locator('.react-flow__node').first()).toBeVisible();await page.getByRole('button',{name:'Open Recorded playback',exact:true}).click();
 await page.getByRole('button',{name:'Restart recording',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Recorded event 1 / 9'})).toBeVisible();
 await page.getByRole('button',{name:'Next recorded event',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Recorded event 2 / 9'})).toBeVisible();
 await page.getByLabel('Recording position').fill('4');await expect(page.getByRole('status').filter({hasText:'Recorded event 4 / 9'})).toBeVisible();
 await page.getByRole('button',{name:'Play recording',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Recorded event 5 / 9'})).toBeVisible();
});
test('phone navigation preserves accessible workstation tools',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/terminal/');await expect(page.getByLabel('Mobile active tool')).toBeVisible();await expect(page.locator('.react-flow__node').first()).toBeVisible();await page.getByLabel('Mobile active tool').selectOption('memory');await expect(page.getByText('Version history',{exact:true})).toBeVisible();
});
