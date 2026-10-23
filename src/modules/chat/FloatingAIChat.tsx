'use client';
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function FloatingAIChat({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ id: string; from: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const t = useTranslations('AiTutor');
  const tc = useTranslations('Chat');
  const tCommon = useTranslations('Common');

async function send() {
    if (!input || loading) return;
    const text = input;
    setInput('');
    setMessages((m) => [...m, { id: Date.now().toString(), from: 'user', text }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, locale }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'failed');
      const aiText = json.answer || '[NO_ANSWER]';
      setMessages((m) => [...m, {
        id: Date.now().toString() + ':ai',
        from: 'ai',
        text: aiText + (json.mock ? '\n\n' + tc('mockAiNotice') : ''),
      }]);
    } catch {
      setMessages((m) => [...m, { id: Date.now().toString() + ':err', from: 'ai', text: tCommon('error') }]);
    } finally {
      setLoading(false);
    }
  }

return (
    <div className="fixed right-4 bottom-4 z-50">
      <div className="flex flex-col items-end">
        {open && (
          <div className="w-80 h-96 bg-white shadow rounded mb-2 flex flex-col overflow-hidden">
            <div className="p-2 border-b flex items-center justify-between">
              <div className="font-medium">{t('title')}</div>
              <button onClick={() => setOpen(false)} className="text-sm">{t('close')}</button>
            </div>
            <div className="p-2 flex-1 overflow-auto text-sm">
              {messages.length === 0 ? (
                <div className="text-neutral-400">{t('empty')}</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={m.from === 'user' ? 'text-right mb-1' : 'text-left mb-1'}>
                    <div className={m.from === 'user'
                      ? 'inline-block bg-sky-100 text-sky-900 p-2 rounded'
                      : 'inline-block bg-slate-100 text-slate-800 p-2 rounded'}>
                      {m.text}
                    </div>
                  </div>
                ))
              )}
              {loading && <div className="text-neutral-400 text-sm">{tCommon('loading')}</div>}
            </div>
            <div className="p-2 border-t">
              <div className="flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 p-2 border rounded" />
                <button disabled={loading} onClick={send} className="px-3 py-1 bg-sky-500 text-white rounded">{t('ask')}</button>
              </div>
            </div>
          </div>
        )}
        <button onClick={() => setOpen((v) => !v)} className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">AI</button>
      </div>
    </div>
  );
}
