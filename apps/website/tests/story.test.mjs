import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

test('approved mascot is preserved and optimized without losing transparency',async()=>{
 const original=readFileSync('../../design-reference/ghostops-mascot.png');
 assert.equal(createHash('sha256').update(original).digest('hex'),createHash('sha256').update(readFileSync('public/brand/ghostops-mascot.png')).digest('hex'));
 const source=await sharp(original).ensureAlpha().raw().toBuffer();
 const optimized=await sharp('public/brand/ghostops-mascot.webp').ensureAlpha().raw().toBuffer();
 const metadata=await sharp('public/brand/ghostops-mascot.webp').metadata();
 assert.equal(metadata.width,1254);assert.equal(metadata.height,1254);assert.equal(metadata.hasAlpha,true);
 assert.equal(source.length,optimized.length);
 for(let i=0;i<source.length;i+=4){assert.equal(source[i+3],optimized[i+3]);if(source[i+3])for(let c=0;c<3;c++)assert.equal(source[i+c],optimized[i+c]);}
 assert(readFileSync('public/brand/ghostops-mascot.webp').length<original.length);
});
test('story includes all nine sections and terminal has its own static route',()=>{
 const home=readFileSync('app/page.tsx','utf8');
 for(const id of ['problem','agentdna','shadowwatch','memoryguard','ghosttrap','hunt','gateway','sentinel','evidence'])assert(home.includes(`['${id}',`),id);
 assert(home.includes('data-enter-terminal'));assert(home.includes('PUBLIC WORKSTATION: RECORDED DATA ONLY'));
 assert(readFileSync('out/terminal/index.html','utf8').includes('ops-workbench'));
 assert(readFileSync('out/index.html','utf8').includes('YOUR AGENTS'));
});
test('mascot parts are distinct and motion has scoped cleanup and reduced-motion handling',()=>{
 const art=readFileSync('components/pixel-ghost.tsx','utf8'),css=readFileSync('app/story.css','utf8');
 assert(art.includes('ghost-body'));assert(css.includes('ghost-hover'));
 for(const part of ['hand-left','hand-right','hem-strip','ghost-analytics','ghost-terminal','ghost-sparkle','ghost-eyes'])assert(art.includes(part)&&css.includes(part),part);
 for(const expression of ['idle','happy','alert','investigating'])assert(art.includes(`face-${expression}`));
 const shell=readFileSync('components/story-shell.tsx','utf8'),motion=readFileSync('lib/story-motion.ts','utf8');
 assert(shell.includes('disposed=true'));assert(shell.includes("removeEventListener('change'"));assert(motion.includes('media.revert();context.revert()'));
 assert(css.includes('steps(4,end)'));assert(css.includes('prefers-reduced-motion'));assert(!motion.includes('setState'));
});
