'use client';
import dynamic from 'next/dynamic';
export const Workbench = dynamic(() => import('./recorded-network'), { ssr: false, loading: () => <div className="loading" role="status">Loading recorded investigation canvas…</div> });
