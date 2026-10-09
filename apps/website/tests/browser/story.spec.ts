import {test,expect} from '@playwright/test';

test('story routes, all sections and accessible terminal entry',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toContainText('YOUR AGENTS');
 await expect(page.locator('[data-ghost-scene]')).toHaveCount(11);
 await expect(page.locator('.ghost-story')).toHaveAttribute('data-motion','scroll');
 await expect(page.locator('.traveling-ghost')).toHaveCount(1);
 await page.getByRole('link',{name:'EXPLORE THE SYSTEM',exact:false}).click();await expect(page).toHaveURL(/#problem$/);
 await expect(page.locator('#problem')).toBeInViewport();
 await page.getByRole('link',{name:'Ghost Ops home',exact:true}).click();
 await page.getByRole('link',{name:'ENTER GHOST OPS',exact:false}).last().click();await expect(page).toHaveURL(/\/terminal\/$/);
 await expect(page.locator('.react-flow__node').first()).toBeVisible();expect(errors).toEqual([]);
 await page.goto('/#memoryguard');await expect(page.locator('#memoryguard')).toBeInViewport();
});
test('persistent character travels through scenes with independent parts and changing expressions',async({page})=>{
 await page.goto('/');await expect(page.locator('.ghost-story')).toHaveAttribute('data-motion','scroll');
 const initial=await page.locator('.traveling-ghost').getAttribute('style');
 await page.locator('#shadowwatch .mascot-slot').scrollIntoViewIfNeeded();
 await expect(page.locator('.ghost-story')).toHaveAttribute('data-scene','shadowwatch');
 await expect(page.locator('.pixel-ghost')).toHaveAttribute('data-expression','alert');
 expect(await page.locator('.traveling-ghost').getAttribute('style')).not.toEqual(initial);
 const parts=await page.locator('.ghost-layered').evaluate(e=>Object.fromEntries(['.hem-0','.hem-1','.hand-left','.hand-right','.ghost-analytics','.ghost-terminal','.sparkle-1','.ghost-eyes'].map(s=>{const c=getComputedStyle(e.querySelector(s)!);return [s,{name:c.animationName,duration:c.animationDuration,delay:c.animationDelay}];})));
 expect(parts['.hem-0'].name).toBe('hem-wave');expect(parts['.hem-0'].delay).not.toBe(parts['.hem-1'].delay);expect(parts['.hand-left'].duration).not.toBe(parts['.hand-right'].duration);expect(parts['.ghost-analytics'].duration).not.toBe(parts['.ghost-terminal'].duration);expect(parts['.ghost-eyes'].name).toBe('ghost-blink');
 await page.locator('#enter .mascot-slot').scrollIntoViewIfNeeded();await expect(page.locator('.pixel-ghost')).toHaveAttribute('data-expression','happy');
});
test('reduced motion is static, preference changes clean up motion, navigation remounts one character',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('.ghost-fallback')).toBeVisible();await expect(page.locator('.ghost-layered')).toBeHidden();
 await expect(page.locator('.ghost-story')).toHaveAttribute('data-motion','reduced');
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.locator('.ghost-story')).toHaveAttribute('data-motion','scroll');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.ghost-story')).toHaveAttribute('data-motion','reduced');
 await page.getByRole('link',{name:'ENTER GHOST OPS',exact:false}).last().click();await expect(page).toHaveURL(/\/terminal\/$/);
 await page.getByRole('link',{name:'Home',exact:true}).click();await expect(page.locator('.traveling-ghost')).toHaveCount(1);
});
test('responsive menu, mascot lane and mobile terminal entry',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('.ghost-story')).toHaveAttribute('data-motion','scroll');
 await page.getByRole('button',{name:'MENU +',exact:true}).click();await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();await page.getByRole('link',{name:'THE SYSTEM',exact:true}).click();await expect(page.getByRole('button',{name:'MENU +',exact:true})).toBeVisible();
 await page.locator('#memoryguard .mascot-slot').scrollIntoViewIfNeeded();
 const bounds=await page.evaluate(()=>{const copy=document.querySelector('#memoryguard .scene-copy')!;return {width:innerWidth,scroll:document.documentElement.scrollWidth,ghost:document.querySelector('.traveling-ghost')!.getBoundingClientRect().toJSON(),textRight:copy.getBoundingClientRect().right-parseFloat(getComputedStyle(copy).paddingRight)};});
 expect(bounds.scroll).toBeLessThanOrEqual(bounds.width);expect(bounds.ghost.left).toBeGreaterThanOrEqual(bounds.textRight);
 await page.getByRole('link',{name:'OPEN GHOST OPS',exact:false}).click();await expect(page).toHaveURL(/\/terminal\/$/);await expect(page.getByLabel('Mobile active tool')).toBeVisible();
});
test('assets load, shared theme continues into terminal and initial layout stays stable',async({page})=>{
 await page.addInitScript(()=>{(window as unknown as {storyCLS:number}).storyCLS=0;new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!(entry as PerformanceEntry&{hadRecentInput:boolean}).hadRecentInput)(window as unknown as {storyCLS:number}).storyCLS+=(entry as PerformanceEntry&{value:number}).value;}).observe({type:'layout-shift',buffered:true});});
 await page.goto('/');await expect(page.locator('.ghost-story')).toHaveAttribute('data-motion','scroll');
 for(const path of ['/brand/ghostops-mascot.webp','/brand/ghostops-mascot.png','/brand/ghost-icon.svg'])expect((await page.request.get(path)).status()).toBe(200);
 expect(await page.evaluate(()=>(window as unknown as {storyCLS:number}).storyCLS)).toBeLessThan(.05);
 await page.goto('/terminal/');await expect(page.locator('.react-flow__node').first()).toBeVisible();expect(await page.locator('.ops-workbench').evaluate(e=>getComputedStyle(e).getPropertyValue('--green').trim())).toBe('#7cff5b');
});
