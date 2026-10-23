'use client';
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function AiWidgetClient() {
  const t = useTranslations('AiTutor');
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');

  async function ask(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: q }) });
      const json = await res.json();
      setReply(json.answer ?? 'No answer');
    } catch (err) {
      setReply('AI error');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white/90 p-2 rounded shadow-lg w-80">
        <div className="flex items-center justify-between">
          <strong>{t('title')}</strong>
          <button onClick={()=>setOpen(!open)}>{open? t('close') : t('open')}</button>
        </div>
        {open && (
          <form onSubmit={ask} className="mt-2">
            <input className="w-full p-2 rounded" value={q} onChange={e=>setQ(e.target.value)} />
            <button className="mt-2 px-3 py-1 bg-sky-500 text-white rounded" disabled={loading}>{t('ask')}</button>
            {reply && <div className="mt-2 p-2 bg-slate-100 rounded text-sm">{reply}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
