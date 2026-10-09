'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Workspace } from '@/components/workspace/workspace';
import type { WindowId } from '@/lib/workspace-model';
import type { SectionProps } from '@/components/console';
import { Panel, time } from '@/components/ui';
import { playbackEvents, playbackState, provenance } from '../data/workstation-state';
import { RecordedRuntime, BackendBoundary } from './hosted-panels';

function RecordedPlayback({step,setStep,playing,setPlaying,navigate}:{step:number;setStep:(n:number)=>void;playing:boolean;setPlaying:(v:boolean)=>void;navigate:SectionProps['navigate']}) {
 const event=playbackEvents[step-1];
 return <div className="recorded-panel"><Panel title="Recorded investigation playback" eyebrow="DISPLAY ONLY / NO TOOL EXECUTION"><p>{provenance}</p><div className="recorded-controls"><button className="button" onClick={()=>{setStep(1);setPlaying(false);}}>Restart recording</button><button className="button" onClick={()=>{if(step===playbackEvents.length)setStep(1);setPlaying(!playing);}}>{playing?'Pause playback':'Play recording'}</button><button className="button" disabled={step===playbackEvents.length} onClick={()=>{setPlaying(false);setStep(step+1);}}>Next recorded event</button><input aria-label="Recording position" type="range" min={1} max={playbackEvents.length} value={step} onChange={e=>{setPlaying(false);setStep(Number(e.target.value));}} /></div><p role="status">Recorded event {step} / {playbackEvents.length} · {event.kind} · {time(event.createdAt)}</p><button className="button" onClick={()=>navigate('Evidence',event.id)}>Inspect this recorded event</button><BackendBoundary /></Panel></div>;
}
export function HostedWorkstation({guided=false}:{guided?:boolean}) {
 const [step,setStep]=useState(playbackEvents.length),[playing,setPlaying]=useState(false);
 useEffect(()=>{if(!playing||step>=playbackEvents.length)return;const timer=setTimeout(()=>setStep(n=>n+1),1200);return()=>clearTimeout(timer);},[playing,step]);
 const running=playing&&step<playbackEvents.length;
 const renderTool=(id:WindowId,props:SectionProps)=>{
  if(id==='demo')return <RecordedPlayback step={step} setStep={setStep} playing={running} setPlaying={setPlaying} navigate={props.navigate} />;
  if(id==='runtime')return <RecordedRuntime />;
  if(id==='overview')return <div className="recorded-panel"><Panel title="Recorded workstation overview"><p>{provenance}</p><BackendBoundary /><p>Three illustrative identities. One recorded synthetic investigation. No live requests, inference or remote services.</p></Panel></div>;
  return undefined;
 };
 return <div className="hosted-shell"><div className="hosted-banner"><strong>RECORDED / SIMULATED DEMONSTRATION</strong><span>No live agents or backend execution.</span><nav aria-label="Website navigation"><Link href="/">Home</Link><Link href="/terminal/">Terminal</Link><Link href="/about/">About</Link><Link href="/docs/">Docs</Link><Link href="/demo/">Guided recording</Link></nav></div><div className="hosted-description">Illustrative identities, profiles and memory; recorded synthetic timeline. Privileged controls are disabled. {guided?'Open Demo Control to play or step through the recording.':''}</div><Workspace state={playbackState(step)} connected={false} busy recorded initialTool={guided ? "demo" : undefined} control={async()=>{throw Error('Local authenticated backend required');}} result={null} setResult={()=>{}} renderRecordedTool={renderTool} /></div>;
}
