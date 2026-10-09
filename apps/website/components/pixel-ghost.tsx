'use client';
import { useId } from 'react';
export function PixelGhost(){
 const id=useId().replaceAll(':',''),url=(p:string)=>`url(#${id}-${p})`;
 const art=(p:string)=><use href={`#${id}-art`} clipPath={url(p)}/>;
 return <div className="pixel-ghost" data-expression="idle">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img className="ghost-fallback" loading="lazy" src="/brand/ghostops-mascot.png" width="1254" height="1254" alt="Ghost Ops pixel ghost with green terminal face and floating panels"/>
 <svg className="ghost-layered" viewBox="0 0 1254 1254" aria-hidden="true" shapeRendering="crispEdges"><defs>
 <image id={`${id}-art`} href="/brand/ghostops-mascot.webp" width="1254" height="1254"/>
 <clipPath id={`${id}-body`}><path d="M310 50H947V442H1036V714H951V980H299V714H214V442H310Z"/></clipPath>
 <clipPath id={`${id}-left-hand`}><path d="M100 710H335V965H240L100 850Z"/></clipPath>
 <clipPath id={`${id}-right-hand`}><path d="M922 710H1140V850L1000 965H922Z"/></clipPath>
 {([['analytics',30,500,192,230],['terminal',1040,480,205,248],['spark-a',166,349,95,100],['spark-b',238,301,66,68],['spark-c',966,302,112,116],['spark-d',1054,409,66,63],['spark-e',166,452,63,66]] as const).map(([p,x,y,w,h])=><clipPath key={p} id={`${id}-${p}`}><rect x={x} y={y} width={w} height={h}/></clipPath>)}
 {Array.from({length:6},(_,i)=><clipPath key={i} id={`${id}-hem-${i}`}><rect x={234+i*126} y="965" width="127" height="259"/></clipPath>)}
 </defs><g className="ghost-hover"><g className="ghost-body">{art('body')}<rect x="422" y="530" width="420" height="172" fill="#061508"/>
 <g fill="#7cff5b" className="ghost-face">
 <g className="face-expression face-idle"><g className="ghost-eyes"><path d="M442 546H462V566H482V586H502V606H522V626H502V646H482V666H442V646H462V626H482V606H462V586H442Z"/><path d="M772 546H792V566H812V646H792V666H772V646H752V566H772Z"/></g><path d="M562 636H582V656H642V636H662V676H642V696H582V676H562Z"/></g>
 <g className="face-expression face-happy"><g className="ghost-eyes"><path d="M442 586H462V566H482V546H502V566H522V606H502V586H482V566H462V606H442ZM742 586H762V566H782V546H802V566H822V606H802V586H782V566H762V606H742Z"/></g><path d="M562 646H582V666H642V646H662V686H562Z"/></g>
 <g className="face-expression face-alert"><g className="ghost-eyes"><path d="M462 546H502V626H462ZM462 646H502V666H462ZM762 546H802V626H762ZM762 646H802V666H762Z"/></g><path d="M582 676H642V696H582Z"/></g>
 <g className="face-expression face-investigating"><g className="ghost-eyes"><path d="M442 546H462V566H482V586H502V606H482V626H462V646H442V626H462V606H442ZM762 566H802V606H762Z"/></g><rect className="ghost-cursor" x="562" y="666" width="80" height="20"/></g>
 </g></g><g className="ghost-hand hand-left">{art('left-hand')}</g><g className="ghost-hand hand-right">{art('right-hand')}</g><g className="ghost-hem">{Array.from({length:6},(_,i)=><g className={`hem-strip hem-${i}`} key={i}>{art(`hem-${i}`)}</g>)}</g></g>
 <g className="ghost-object ghost-analytics">{art('analytics')}</g><g className="ghost-object ghost-terminal">{art('terminal')}</g>{['a','b','c','d','e'].map((s,i)=><g className={`ghost-sparkle sparkle-${i}`} key={s}>{art(`spark-${s}`)}</g>)}</svg></div>;
}
