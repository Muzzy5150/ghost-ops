import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
// Shopipad's measured persistent character architecture, scoped to Ghost Ops.
export function mountGhostStory(root:HTMLElement){
 const media=gsap.matchMedia(),character=root.querySelector<HTMLElement>('.traveling-ghost')!,face=root.querySelector<HTMLElement>('.pixel-ghost')!;
 const context=gsap.context(()=>{
 media.add({desktop:'(min-width:901px)',mobile:'(max-width:900px)',motion:'(prefers-reduced-motion:no-preference)'},match=>{
 if(!match.conditions?.motion){root.dataset.motion='reduced';return;}
 root.dataset.motion='scroll';
 const desktop=Boolean(match.conditions.desktop),scenes=Array.from(root.querySelectorAll<HTMLElement>('[data-ghost-scene]'));
 let origin=0,stops:{y:number;x:number;scale:number;name:string;expression:string}[]=[];
 const geometry=()=>{origin=root.getBoundingClientRect().top+window.scrollY;stops=scenes.map(section=>{const r=section.querySelector<HTMLElement>('.mascot-slot')!.getBoundingClientRect();return {y:r.top+window.scrollY-origin+r.height/2,x:r.left+r.width/2,scale:Math.min(r.width,r.height)/420,name:section.dataset.ghostScene!,expression:section.dataset.expression??'idle'};});};
 const move=()=>{
 if(root.dataset.entering==='true')return;
 const y=gsap.utils.clamp(stops[0].y,stops.at(-1)!.y,window.scrollY-origin+innerHeight*(desktop ? .56 : .36));
 const next=Math.max(1,stops.findIndex(s=>s.y>=y)),a=stops[next-1],b=stops[next];
 const t=gsap.utils.clamp(0,1,(y-a.y)/(b.y-a.y)),ease=t*t*(3-2*t);
 gsap.set(character,{x:a.x+(b.x-a.x)*ease,y,scale:a.scale+(b.scale-a.scale)*ease,rotation:desktop?(b.x-a.x)/root.clientWidth*3:0});
 const scene=t<.5?a:b;
 if(root.dataset.scene!==scene.name){root.dataset.scene=scene.name;face.dataset.expression=scene.expression;root.querySelectorAll<HTMLElement>('[data-scene-link]').forEach(link=>{if(link.dataset.sceneLink===scene.name)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}
 };
 geometry();ScrollTrigger.create({id:'ghost-story',trigger:root,start:'top top',end:'bottom bottom',onUpdate:move,onRefresh:()=>{geometry();move();}});move();
 scenes.forEach(scene=>{const h=scene.querySelector('h2');if(h)gsap.from(h,{y:24,duration:.7,ease:'power2.out',scrollTrigger:{trigger:h,start:'top 92%',once:true}});ScrollTrigger.create({trigger:scene,start:'top 65%',end:'bottom 35%',toggleClass:'scene-active'});});
 return()=>{root.dataset.motion='stable';root.dataset.scene='hero';face.dataset.expression='idle';};
 });
 },root);
 return()=>{media.revert();context.revert();character.style.removeProperty('transform');};
}
