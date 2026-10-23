'use client';
import { useRouter } from 'next/navigation';
export default function BackButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.back()} aria-label="Go back" title="Go back" className="mb-4 w-10 h-10 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600 transition-colors"> ← </button>
  );
}
