'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function BackButton() {
  const router = useRouter();
  const locale = useLocale();

  function handleClick() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/${locale}`);
    }
  }

  return (
    <div className="group relative inline-block mb-3">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Go back"
        className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap rounded bg-slate-950 text-slate-100 text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700">
        Go back
      </span>
    </div>
  );
}