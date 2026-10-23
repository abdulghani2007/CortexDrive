'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

type Slot = { id: string; starts_at: string; ends_at: string };

export default function VendorAvailabilityCard({ vendorId }: { vendorId: string }) {
  const t = useTranslations('VendorBooking');
  const ts = useTranslations('VendorServices');
  const supabase = getSupabaseBrowserClient();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vendor_availability')
      .select('id,starts_at,ends_at')
      .eq('vendor_id', vendorId)
      .order('starts_at', { ascending: true });
    setSlots((data ?? []) as Slot[]);
    setLoading(false);
  }, [supabase, vendorId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  async function addSlot() {
    setError(null);
    if (!start || !end) {
      setError(t('slotInvalid'));
      return;
    }
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) {
      setError(t('slotInvalid'));
      return;
    }
    setBusy(true);
    const { error: dbError } = await supabase
      .from('vendor_availability')
      .insert({ vendor_id: vendorId, starts_at: s.toISOString(), ends_at: e.toISOString() });
    setBusy(false);
    if (dbError) {
      setError((dbError as any).code === '23505' ? t('slotExists') : t('slotInvalid'));
      return;
    }
    setStart('');
    setEnd('');
    void loadSlots();
  }

  async function removeSlot(id: string) {
    await supabase.from('vendor_availability').delete().eq('id', id);
    void loadSlots();
  }

  return (
    <div className="mt-3 p-4 bg-slate-700/60 rounded-xl ring-1 ring-slate-600/60">
      <div className="text-white font-semibold text-sm">{t('availabilityTitle')}</div>
      <div className="text-xs text-slate-400 mt-0.5">{t('availabilityHint')}</div>

      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1" htmlFor="avail-start">
            {t('slotStart')}
          </label>
          <input
            id="avail-start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full p-2 rounded bg-slate-900 text-white border border-slate-600 focus:border-sky-500 focus:outline-none text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1" htmlFor="avail-end">
            {t('slotEnd')}
          </label>
          <input
            id="avail-end"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full p-2 rounded bg-slate-900 text-white border border-slate-600 focus:border-sky-500 focus:outline-none text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void addSlot()}
          disabled={busy}
          className="self-end px-3 py-2 rounded-lg text-xs font-medium bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {t('addSlot')}
        </button>
      </div>

      {error && <div className="mt-2 text-sm text-red-400">{error}</div>}

      {loading && <div className="mt-3 text-sm text-slate-400">{ts('loading')}</div>}

      {!loading && slots.length === 0 && (
        <div className="mt-3 text-sm text-slate-400">{t('noSlots')}</div>
      )}

      {!loading && slots.length > 0 && (
        <ul className="mt-3 space-y-2">
          {slots.map((s) => (
            <li
              key={s.id}
              className="p-2.5 bg-slate-800 rounded-lg ring-1 ring-slate-700/60 flex items-center justify-between gap-2"
            >
              <div className="text-sm text-slate-200">
                {new Date(s.starts_at).toLocaleString()} – {new Date(s.ends_at).toLocaleTimeString()}
              </div>
              <button
                type="button"
                onClick={() => void removeSlot(s.id)}
                className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-200 hover:bg-red-600 hover:text-white shrink-0"
              >
                {t('remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}