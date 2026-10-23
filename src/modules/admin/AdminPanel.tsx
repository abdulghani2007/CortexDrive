'use client';
import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations, useLocale } from 'next-intl';

export default function AdminPanel() {
  const supabase = getSupabaseBrowserClient();
  const t = useTranslations('Admin');
  const locale = useLocale();
  const [tab, setTab] = useState<'verifications' | 'bookings' | 'wallet' | 'sos' | 'escalated'>('verifications');
  const [verifs, setVerifs] = useState<any[]>([]);
  const [sosLogs, setSosLogs] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [escalated, setEscalated] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
    setLoading(true);
    Promise.allSettled([fetchVerifications(), fetchBookings(), fetchWalletTransactions(), fetchSos(), fetchEscalated()])
      .then((results) => {
        const failed = results.find((r) => r.status === 'rejected');
        if (failed) setError(String((failed as PromiseRejectedResult).reason));
      })
      .finally(() => setLoading(false));

const channel = supabase
      .channel('public:sos_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_logs' }, (payload) => {
        setSosLogs((s) => [payload.new, ...s]);
      })
      .subscribe();

const ch2 = supabase
      .channel('public:conversations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload) => {
        if (payload.new && payload.new.escalated) {
          setEscalated((e) => (e.some((c) => c.id === payload.new.id) ? e : [payload.new, ...e]));
        }
      })
      .subscribe();

return () => { channel.unsubscribe(); ch2.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

async function fetchVerifications() {
    const { data, error } = await supabase.from('verifications').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    setVerifs(data || []);
  }

async function fetchBookings() {
    const { data, error } = await supabase.from('bookings').select('id,learner_id,instructor_id,slot_start,status,created_at').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    setBookings(data || []);
  }

async function fetchEscalated() {
    // conversations has only id/pair_key/created_at/last_message_at/escalated —
    // no user columns, so resolve participant names via participants + profiles.
    const { data: convs, error } = await supabase
      .from('conversations')
      .select('id,last_message_at,escalated')
      .eq('escalated', true)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) throw error;
    const list: any[] = convs || [];
    if (list.length === 0) { setEscalated([]); return; }

const ids = list.map((c) => c.id);
    const { data: parts, error: perr } = await supabase
      .from('conversation_participants')
      .select('conversation_id,user_id')
      .in('conversation_id', ids);
    if (perr) throw perr;

const userIds = Array.from(new Set((parts || []).map((p: any) => p.user_id)));
    const namesByUser: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id,full_name').in('id', userIds);
      (profiles || []).forEach((p: any) => { namesByUser[p.id] = p.full_name ?? '—'; });
    }

const namesByConv: Record<string, string[]> = {};
    (parts || []).forEach((p: any) => {
      namesByConv[p.conversation_id] = namesByConv[p.conversation_id] || [];
      namesByConv[p.conversation_id].push(namesByUser[p.user_id] || '—');
    });

setEscalated(list.map((c) => ({ ...c, participantNames: namesByConv[c.id] || [] })));
  }

async function fetchWalletTransactions() {
    const { data, error } = await supabase.from('transactions').select('id,kind,amount,created_at,wallets(id,user_id,balance)').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    setTransactions(data || []);
  }

async function fetchSos() {
    const { data, error } = await supabase.from('sos_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    setSosLogs(data || []);
  }

async function act(id: string, action: 'approve' | 'reject') {
    await supabase.from('verifications').update({ status: action === 'approve' ? 'verified' : 'rejected' }).eq('id', id);
    await fetchVerifications();
  }

// --- presentation helpers (pure styling, no logic) ---
  const tabs: { key: typeof tab; label: string; badge?: number }[] = [
    { key: 'verifications', label: t('tabs.verifications'), badge: verifs.filter((v) => v.status === 'pending' || v.status === 'needs_review').length },
    { key: 'bookings', label: t('tabs.bookings') },
    { key: 'wallet', label: t('tabs.wallet') },
    { key: 'sos', label: t('tabs.sos') },
    { key: 'escalated', label: t('tabs.escalatedChats') },
  ];

  function statusChip(status: string): string {
    switch (status) {
      case 'verified':
      case 'booked':
      case 'completed':
        return 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30';
      case 'needs_review':
        return 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30';
      case 'pending':
        return 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30';
      case 'rejected':
      case 'refunded':
        return 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30';
    }
  }

  function emptyCard(message: string) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center py-12 text-center bg-slate-800/40 rounded-xl ring-1 ring-slate-700/60">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-slate-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h8m-4-8h.01M9 12h.01m3 .01h.01M15 15v6m3-3h-6" />
        </svg>
        <div className="mt-3 text-sm text-slate-500">{message}</div>
      </div>
    );
  }

return (
    <div className="mt-6">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-800/70 rounded-2xl ring-1 ring-slate-700/60">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === tb.key
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/70'
            }`}
          >
            {tb.label}
            {typeof tb.badge === 'number' && tb.badge > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
                {tb.badge}
              </span>
            )}
          </button>
        ))}
      </div>

{loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <span className="w-4 h-4 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
          {t('loading')}
        </div>
      )}
      {error && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-sm text-red-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>{t('error')}: {error}</span>
        </div>
      )}

{tab === 'verifications' && (
        <div className="mt-4 space-y-2">
          {verifs.length === 0 ? (
            emptyCard(t('emptyVerifications'))
          ) : (
            verifs.map((v) => (
              <div key={v.id} className="group flex justify-between items-center gap-4 p-4 rounded-xl bg-slate-800 ring-1 ring-slate-700/60 hover:ring-slate-600 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${statusChip(v.status)}`}>
                      {v.status}
                    </span>
                    <span className="text-sm text-slate-400">{v.type}</span>
                    {v.face_match_score !== null && v.face_match_score !== undefined && (
                      <span className="text-xs text-slate-500">{t('colAiScore')}: <span className="text-sky-400 font-medium tabular-nums">{Number(v.face_match_score).toFixed(2)}</span></span>
                    )}
                  </div>
                  <div className="mt-1 font-medium text-white truncate">{v.doc_url}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{new Date(v.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {(v.status === 'pending' || v.status === 'needs_review') && (
                    <button onClick={() => act(v.id, 'approve')} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow shadow-emerald-600/25 transition-colors">
                      {t('approve')}
                    </button>
                  )}
                  {(v.status === 'pending' || v.status === 'needs_review') && (
                    <button onClick={() => act(v.id, 'reject')} className="px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-sm font-medium transition-colors">
                      {t('reject')}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

{tab === 'bookings' && (
        <div className="mt-4 space-y-2">
          {bookings.length === 0 ? (
            emptyCard(t('emptyBookings'))
          ) : (
            bookings.map((b) => (
              <div key={b.id} className="p-4 rounded-xl bg-slate-800 ring-1 ring-slate-700/60 hover:ring-slate-600 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-white">Booking <span className="text-slate-500">{b.id}</span></div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${statusChip(b.status)}`}>
                    {b.status}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div><span className="text-slate-500">Learner:</span> <span className="break-all">{b.learner_id}</span></div>
                  <div><span className="text-slate-500">Instructor:</span> <span className="break-all">{b.instructor_id}</span></div>
                  <div className="col-span-2"><span className="text-slate-500">Slot:</span> {b.slot_start}</div>
                  <div className="col-span-2"><span className="text-slate-500">{new Date(b.created_at).toLocaleString()}</span></div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

{tab === 'wallet' && (
        <div className="mt-4 space-y-2">
          {transactions.length === 0 ? (
            emptyCard(t('emptyTransactions'))
          ) : (
            transactions.map((trow) => (
              <div key={trow.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-800 ring-1 ring-slate-700/60 hover:ring-slate-600 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${statusChip(trow.kind)}`}>
                      {trow.kind}
                    </span>
                    <span className="text-xs text-slate-500">{new Date(trow.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-400 truncate">Wallet: <span className="text-slate-300">{trow.wallet?.id ?? '—'}</span> · Owner: <span className="text-slate-300 break-all">{trow.wallet?.user_id ?? '—'}</span></div>
                </div>
                <div className="font-semibold text-white tabular-nums shrink-0">{trow.amount} PKR</div>
              </div>
            ))
          )}
        </div>
      )}

{tab === 'sos' && (
        <div className="mt-4 space-y-2">
          {sosLogs.length === 0 ? (
            emptyCard(t('emptySos'))
          ) : (
            sosLogs.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/5 ring-1 ring-red-500/20 hover:ring-red-500/40 transition-colors">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/15 text-red-400 shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{s.note || 'SOS'}</div>
                  <div className="text-xs text-slate-500 break-all">{s.user_id} · {new Date(s.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

{tab === 'escalated' && (
        <div className="mt-4 space-y-2">
          {escalated.length === 0 ? (
            emptyCard(t('emptyEscalated'))
          ) : (
            escalated.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-slate-800 ring-1 ring-slate-700/60 hover:ring-slate-600 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-white truncate">
                    {(c.participantNames || []).join(' · ') || c.id}
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : '—'}
                  </span>
                </div>
                <a className="mt-2 inline-flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300 transition-colors" href={`/${locale}/chat/${c.id}`}>
                  {t('openChat')}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}