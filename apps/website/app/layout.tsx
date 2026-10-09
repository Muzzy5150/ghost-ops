import type { Metadata } from 'next';
import '../generated/styles/globals.css';
import '@xyflow/react/dist/style.css';
import '../generated/styles/workspace.css';
import '../generated/styles/phase5.css';
import './hosted.css';
import '../generated/styles/brand.css';
import './story.css';
export const metadata: Metadata = { title: 'Ghost Ops · Autonomous AI Counterintelligence', description: 'Agent behavior, identity, memory and evidence. Explore the system and enter the interactive recorded Ghost Ops terminal.', icons:{icon:'/brand/ghost-icon.svg',apple:'/brand/ghost-icon.svg'} };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
