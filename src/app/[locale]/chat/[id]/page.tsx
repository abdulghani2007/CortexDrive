'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

export default function ChatPage() {
  const params = useParams();
  const id = params?.id as string;
  const supabase = getSupabaseBrowserClient();
  const t = useTranslations('Chat');
  const tCommon = useTranslations('Common');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const seen = useRef<Set<string>>(new Set());

function upsertMessage(msg: any) {
    if (!msg || !msg.id) return;
    if (seen.current.has(msg.id)) return; // dedupe POST echo vs realtime INSERT
    seen.current.add(msg.id);
    setMessages((m) => [...m, msg]);
  }

useEffect(() => {
    if (!id) return;
    let mounted = true;
    seen.current = new Set();
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/chat/messages?conversation_id=${id}`);
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        if (!mounted) return;
        (json.items || []).forEach(upsertMessage);
      } catch (e: any) {
        setError(String(e));
      }
      setLoading(false);
    })();

const ch = supabase
      .channel(`conversation:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, (payload) => {
        if (payload.new && payload.new.conversation_id === id) upsertMessage(payload.new);
      })
      .subscribe();

return () => { ch.unsubscribe(); mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

async function send() {
    if (!input || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversation_id: id, body: input }),
      });
      if (!res.ok) throw new Error('send failed');
      const json = await res.json();
      upsertMessage(json.message);
      setInput('');
      setError(null);
    } catch {
      setError(t('sendError'));
    } finally {
      setSending(false);
    }
  }

async function escalate() {
    try {
      const res = await fetch('/api/chat/escalate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversation_id: id }),
      });
      if (!res.ok) throw new Error('escalate failed');
      alert(t('escalatedOk'));
    } catch {
      alert(t('escalatedFail'));
    }
  }

return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">{t('title')}</h2>
        <button onClick={escalate} className="px-3 py-1 bg-amber-500 text-white rounded">{t('connectAdmin')}</button>
      </div>
      <div className="border rounded p-3 mb-3 h-96 overflow-auto">
        {loading ? (
          <div className="text-neutral-400">{tCommon('loading')}</div>
        ) : messages.length === 0 ? (
          <div className="text-neutral-400">{t('empty')}</div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="mb-2">
              <div className="text-sm text-neutral-500">{m.sender?.full_name ?? m.sender_id}</div>
              <div className="p-2 bg-slate-100 rounded inline-block">{m.body}</div>
            </div>
          ))
        )}
      </div>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
        <button onClick={send} disabled={sending} className="px-3 py-1 bg-sky-500 text-white rounded">{t('send')}</button>
      </div>
    </div>
  );
}
