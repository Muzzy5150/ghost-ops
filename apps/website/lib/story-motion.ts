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
 const followX=gsap.quickTo(character,'x',{duration:.24,ease:'power3.out'}),followY=gsap.quickTo(character,'y',{duration:.24,ease:'power3.out'}),followScale=gsap.quickTo(character,'scale',{duration:.24,ease:'power3.out'});
 const layers=['left-hand','right-hand','analytics','terminal'].map(name=>root.querySelector<SVGGElement>(`[data-travel-layer="${name}"]`)!);
 const inertia=layers.map((layer,i)=>({y:gsap.quickTo(layer,'y',{duration:.32+i*.05,ease:'power3.out'}),rotation:gsap.quickTo(layer,'rotation',{duration:.4,ease:'power3.out'})}));
 let settling:gsap.core.Tween|undefined,previousY=window.scrollY,previousTime=performance.now(),first=true;
 const geometry=()=>{origin=root.getBoundingClientRect().top+window.scrollY;stops=scenes.map(section=>{const r=section.querySelector<HTMLElement>('.mascot-slot')!.getBoundingClientRect();return {y:r.top+window.scrollY-origin+r.height/2,x:r.left+r.width/2,scale:Math.min(r.width,r.height)/420,name:section.dataset.ghostScene!,expression:section.dataset.expression??'idle'};});};
 const move=()=>{
 if(root.dataset.entering==='true')return;
 const y=gsap.utils.clamp(stops[0].y,stops.at(-1)!.y,window.scrollY-origin+innerHeight*(desktop ? .56 : .36));
 const next=Math.max(1,stops.findIndex(s=>s.y>=y)),a=stops[next-1],b=stops[next];
 const t=gsap.utils.clamp(0,1,(y-a.y)/(b.y-a.y)),ease=t*t*(3-2*t);
 const x=a.x+(b.x-a.x)*ease,scale=a.scale+(b.scale-a.scale)*ease;
 if(first){gsap.set(character,{x,y,scale});first=false;}else if(desktop){followX(x);followY(y);followScale(scale);}else{gsap.set(character,{x,scale});followY(y);}
 const now=performance.now(),speed=gsap.utils.clamp(-1,1,(window.scrollY-previousY)/Math.max(16,now-previousTime)/2);previousY=window.scrollY;previousTime=now;
 inertia.forEach((part,i)=>{part.y(-speed*(i<2?36:18)*(i%2? .7:1));part.rotation(speed*(i%2?-3:4));});
 settling?.kill();settling=gsap.delayedCall(.16,()=>inertia.forEach(part=>{part.y(0);part.rotation(0);}));
 gsap.set(character,{rotation:desktop?(b.x-a.x)/root.clientWidth*3:0});
 const scene=t<.5?a:b;
 if(root.dataset.scene!==scene.name){root.dataset.scene=scene.name;face.dataset.expression=scene.expression;root.querySelectorAll<HTMLElement>('[data-scene-link]').forEach(link=>{if(link.dataset.sceneLink===scene.name)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}
 };
 geometry();ScrollTrigger.create({id:'ghost-story',trigger:root,start:'top top',end:'bottom bottom',onUpdate:move,onRefresh:()=>{geometry();move();}});move();
 scenes.forEach(scene=>{const h=scene.querySelector('h2');if(h)gsap.from(h,{y:24,duration:.7,ease:'power2.out',scrollTrigger:{trigger:h,start:'top 92%',once:true}});ScrollTrigger.create({trigger:scene,start:'top 65%',end:'bottom 35%',toggleClass:'scene-active'});});
 return()=>{settling?.kill();root.dataset.motion='stable';root.dataset.scene='hero';face.dataset.expression='idle';};
 });
 },root);
 return()=>{media.revert();context.revert();character.style.removeProperty('transform');};
}
