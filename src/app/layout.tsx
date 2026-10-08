import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Ghost Ops · Agent Counterintelligence", description: "Detect the rogue. Trace the behavior. Protect the memory. Local autonomous-agent security operations." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
