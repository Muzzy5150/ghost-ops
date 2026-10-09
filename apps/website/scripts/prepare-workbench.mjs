// Export an explicit presentation-only dependency closure. src remains authoritative.
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../../..');
const destination = resolve(import.meta.dirname, '../generated');
const components = ['ui', 'memory-diff', 'overview', 'sections', 'investigations', 'demo-story', 'live-sessions', 'developer-integrations', 'workspace/workspace', 'workspace/window', 'workspace/network', 'workspace/security-node', 'workspace/inspectors', 'workspace/behavior', 'workspace/event-terminal', 'workspace/incident-desk'];
const libraries = ['workspace-model', 'workspace-graph', 'graph-explorer', 'memory-diff', 'schemas'];
function emit(path, content) { const file = resolve(destination, path); mkdirSync(dirname(file), {recursive:true}); writeFileSync(file, content); }
for (const name of components) {
  const content = readFileSync(resolve(root, `src/components/${name}.tsx`), 'utf8');
  if (/fetch\(|from\s+["'][^"']*(?:server\/|runtime\/|generated\/prisma)|use server/.test(content)) throw Error(`Presentation boundary violated: ${name}`);
  emit(`components/${name}.tsx`, content);
}
for (const name of libraries) emit(`lib/${name}.ts`, readFileSync(resolve(root, `src/lib/${name}.ts`), 'utf8'));
emit('lib/view-types.ts', readFileSync(resolve(destination, '../data/view-types.ts'), 'utf8'));
emit('components/console.tsx', `import type { State } from '@/lib/view-types';
import type { ManagementCommand } from '@/lib/schemas';
export type RunControl = (action: ManagementCommand['action'], targetId?: string, expectedStep?: number) => Promise<unknown>;
export type SectionProps = {state: State; control: RunControl; busy: boolean; recorded?: boolean; focusId?: string; navigate: (name: string, focusId?: string) => void; inspectEvent?: (id: string) => void; focusIncident?: (id: string) => void};`);
for (const [name, component] of Object.entries({'security-lab':'RecordedLab', 'threat-hunt':'RecordedHunt', 'sponsor-integrations':'RecordedSponsors', 'web-sentinel':'RecordedSentinel'})) emit(`components/workspace/${name}.tsx`, `import { ${component} } from '../../../components/hosted-panels';
export default function HostedPanel(props: Record<string, unknown>${component==='RecordedHunt'?` & {navigate: (name: string, id?: string) => void}`:''}) { ${component==='RecordedHunt'?`return <RecordedHunt navigate={props.navigate}/>;`:`void props; return <${component}/>;`} }`);
emit('components/workspace/lab-benchmarks.tsx', `export async function downloadEvidence(kind: string, id: string) { void kind; void id; throw Error('Authenticated forensic exports require the local backend. See /docs/.'); }`);
for (const name of ['globals', 'workspace', 'phase5']) { mkdirSync(resolve(destination, 'styles'), {recursive:true}); copyFileSync(resolve(root, `src/app/${name}.css`), resolve(destination, `styles/${name}.css`)); }
