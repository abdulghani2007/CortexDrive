'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import BackButton from '@/components/BackButton';

type Escalation = {
  id: string;
  booking_id: string;
  raised_by: string;
  reason: string;
  status: string;
  resolution: string | null;
  created_at: string;
  vendor_bookings: {
    id: string;
    starts_at: string;
    status: string;
    vendor_services: { title: string } | null;
  } | null;
};

export default function VendorEscalationsPage() {
  const t = useTranslations('VendorEscalation');
  const ts = useTranslations('VendorServices');
  const supabase = getSupabaseBrowserClient();
  const [rows, setRows] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: me } = await supabase.rpc('is_admin_current_user');
    let isAdmin = false;
    if (me !== null && me !== undefined) {
      isAdmin = Boolean(me);
    }
    if (!isAdmin) {
      setDenied(true);
      setLoading(false);
      return;
    }
    const { data, error: dbError } = await supabase
      .from('vendor_booking_escalations')
      .select('id,booking_id,raised_by,reason,status,resolution,created_at,vendor_bookings(id,starts_at,status,vendor_services(title))')
      .order('created_at', { ascending: false })
      .limit(50);
    if (dbError) {
      setError(t('loadFailed'));
      setRows([]);
    } else {
      setRows((data ?? []) as Escalation[]);
    }
    setLoading(false);
  }, [supabase, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(id: string, status: 'resolved' | 'dismissed') {
    setError(null);
    if (status === 'resolved' && !resolution.trim()) {
      setError(t('resolutionRequired'));
      return;
    }
    const { error: dbError } = await supabase
      .from('vendor_booking_escalations')
      .update({ status, resolution: resolution.trim() || null })
      .eq('id', id);
    if (dbError) {
      setError(t('loadFailed'));
      return;
    }
    setResolvingId(null);
    setResolution('');
    void load();
  }

  if (denied) {
    return (
      <main className="p-6 max-w-2xl mx-auto">
        <BackButton />
        <h1 className="mt-2 text-2xl font-semibold text-white">{t('title')}</h1>
        <div className="mt-4 text-red-400">{t('notAuthorized')}</div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <BackButton />
      <h1 className="mt-2 text-2xl font-semibold text-white">{t('title')}</h1>

      {loading && <div className="mt-6 text-slate-400">{ts('loading')}</div>}
      {!loading && error && <div className="mt-6 text-red-400">{error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div className="mt-6 p-6 bg-slate-800 rounded-xl text-center text-slate-400">
          {t('empty')}
        </div>
      )}

      {!loading && rows.length > 0 && (
        <ul className="mt-6 space-y-3">
          {rows.map((e) => (
            <li key={e.id} className="p-4 bg-slate-800 rounded-xl ring-1 ring-slate-700">
              <div className="flex items-center justify-between gap-2">
                <span className="text-white font-semibold">{e.vendor_bookings?.vendor_services?.title ?? '—'}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    e.status === 'open'
                      ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                      : e.status === 'resolved'
                        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30'
                  }`}
                >
                  {e.status === 'open' ? t('statusOpen') : e.status === 'resolved' ? t('statusResolved') : t('statusDismissed')}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-300">{e.reason}</div>
              <div className="mt-1 text-xs text-slate-400">
                {e.vendor_bookings
                  ? `${new Date(e.vendor_bookings.starts_at).toLocaleString()} · ${e.vendor_bookings.status}`
                  : ''}
              </div>
              {e.resolution && (
                <div className="mt-2 text-xs text-emerald-300">
                  {t('resolutionLabel')}: {e.resolution}
                </div>
              )}

              {e.status === 'open' && (
                <div className="mt-3">
                  {resolvingId === e.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={resolution}
                        onChange={(ev) => setResolution(ev.target.value)}
                        rows={2}
                        maxLength={400}
                        placeholder={t('resolutionPlaceholder')}
                        className="w-full p-2 rounded bg-slate-900 text-white border border-slate-600 focus:border-sky-500 focus:outline-none text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void resolve(e.id, 'resolved')}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                          {t('resolve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void resolve(e.id, 'dismissed')}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600"
                        >
                          {t('dismiss')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResolvingId(null);
                            setResolution('');
                          }}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600"
                        >
                          {ts('cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setResolvingId(e.id);
                        setError(null);
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-500"
                    >
                      {t('resolve')}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}