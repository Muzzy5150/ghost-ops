'use client';
import Link from 'next/link';
import { useEffect,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { GhostIcon } from '@/components/brand/ghost-icon';
import { PixelGhost } from './pixel-ghost';
export function StoryShell({children}:{children:React.ReactNode}){
 const root=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),router=useRouter();
 const [menu,setMenu]=useState(false);
 useEffect(()=>{
 let disposed=false,cleanup:(()=>void)|undefined;const element=root.current!,preference=matchMedia('(prefers-reduced-motion:reduce)');
 const placeStatic=()=>{if(element.dataset.motion==='scroll')return;const slot=element.querySelector<HTMLElement>('#hero .mascot-slot')!,character=element.querySelector<HTMLElement>('.traveling-ghost')!,r=slot.getBoundingClientRect(),origin=element.getBoundingClientRect().top;character.style.left='0px';character.style.top='0px';character.style.transform=`translate(${r.left+r.width/2}px,${r.top-origin+r.height/2}px) scale(${Math.min(r.width,r.height)/420})`;};
 const load=()=>{placeStatic();if(preference.matches){element.dataset.motion='reduced';return;}void import('../lib/story-motion').then(module=>{if(!disposed&&!cleanup)cleanup=module.mountGhostStory(element);}).catch(()=>{if(!disposed){element.dataset.motion='stable';placeStatic();}});};
 const changed=()=>{cleanup?.();cleanup=undefined;load();};preference.addEventListener('change',changed);load();
 window.addEventListener('resize',placeStatic);
 return()=>{disposed=true;cleanup?.();preference.removeEventListener('change',changed);window.removeEventListener('resize',placeStatic);clearTimeout(timer.current);};
 },[]);
 return <div ref={root} className="ghost-story" data-motion="stable" data-scene="hero" onClickCapture={event=>{
 const target=(event.target as Element).closest<HTMLAnchorElement>('a[data-enter-terminal]');
 if(!target||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 event.preventDefault();if(root.current!.dataset.entering==='true')return;root.current!.dataset.entering='true';timer.current=setTimeout(()=>router.push('/terminal/'),280);
 }}>
 <a href="#story-main" className="story-skip">Skip to content</a><header className="story-nav"><Link href="/" className="story-brand" aria-label="Ghost Ops home"><GhostIcon size={30}/>GHOST OPS<span>COUNTERINTELLIGENCE / 13</span></Link><button className="story-menu" aria-expanded={menu} aria-controls="story-navigation" onClick={()=>setMenu(!menu)}>{menu?'CLOSE −':'MENU +'}</button><nav id="story-navigation" className={menu?'open':''} aria-label="Main navigation" onClick={()=>setMenu(false)}><a href="#agentdna" data-scene-link="agentdna">THE SYSTEM</a><a href="#gateway" data-scene-link="gateway">THE BOUNDARY</a><Link href="/docs/">DOCS</Link><Link href="/terminal/" className="story-nav-cta" data-enter-terminal>ENTER GHOST OPS ↗</Link></nav></header>
 <div className="traveling-ghost" role="img" aria-label="Ghost Ops pixel mascot with green terminal face and floating panels"><PixelGhost/></div>{children}
 <footer className="story-footer"><Link href="/" className="story-brand"><GhostIcon/>GHOST OPS</Link><p>Autonomous AI counterintelligence.<br/>Evidence before conclusions. Authority before effects.</p><nav aria-label="Footer navigation"><Link href="/terminal/">TERMINAL ↗</Link><Link href="/docs/">DEVELOPER DOCS ↗</Link><Link href="/demo/">RECORDED INVESTIGATION ↗</Link></nav><span>PUBLIC DEMONSTRATION / NO LIVE BACKEND</span></footer></div>;
}
