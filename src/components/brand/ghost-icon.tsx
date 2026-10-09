/** Pixel reduction of the approved terminal-faced mascot. */
export function GhostIcon({size=32}:{size?:number}) {
 return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" shapeRendering="crispEdges" className="pixel-logo">
  <path fill="#7cff5b" d="M12 2h8v2h4v4h2v4h2v16h-4v-2h-4v4h-8v-4H8v2H4V12h2V8h2V4h4Z"/>
  <path fill="#e9efe6" d="M12 4h8v2h4v6h2v14h-2v-2h-6v4h-4v-4H8v2H6V12h2V6h4Z"/>
  <path fill="#0a0d0a" d="M8 12h16v10H8Z"/>
  <path fill="#7cff5b" d="M10 14h2v2h2v2h-2v2h-2v-2h2v-2h-2ZM20 14h2v6h-2ZM15 19h4v1h-4Z"/>
 </svg>;
}
