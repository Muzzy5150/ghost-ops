import type { Metadata } from 'next';
import '../generated/styles/globals.css';
import '@xyflow/react/dist/style.css';
import '../generated/styles/workspace.css';
import '../generated/styles/phase5.css';
import './hosted.css';
export const metadata: Metadata = { title: 'Ghost Ops · Agent Counterintelligence', description: 'The Ghost Ops interactive workstation with clearly labeled simulated identities and recorded synthetic evidence. No privileged backend runs here.' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
