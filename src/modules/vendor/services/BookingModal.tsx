'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import type { ServiceRow } from './types';

type Slot = { id: string; starts_at: string; ends_at: string };

type Props = {
  service: ServiceRow;
  onClose: () => void;
  onBooked: () => void;
};

export default function BookingModal({ service, onClose, onBooked }: Props) {
  const t = useTranslations('VendorBooking');
  const ts = useTranslations('VendorServices');
  const supabase = getSupabaseBrowserClient();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSlots() {
      const { data } = await supabase
        .from('vendor_availability')
        .select('id,starts_at,ends_at')
        .eq('vendor_id', service.vendor_id)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true });
      if (!cancelled) {
        setSlots((data ?? []) as Slot[]);
        setLoading(false);
      }
    }
    void loadSlots();
    return () => {
      cancelled = true;
    };
  }, [supabase, service.vendor_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!slot) {
      setError(t('chooseSlot'));
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t('loginToBook'));
      return;
    }

    const startsAt = slot;
    const duration = Number(service.duration_minutes);
    const endsAt = new Date(new Date(startsAt).getTime() + duration * 60000).toISOString();

    // Friendlier pre-check; the no_provider_overlap constraint is the real guard
    // at provider-confirm time.
    const { data: conflicts } = await supabase
      .from('vendor_bookings')
      .select('id')
      .eq('provider_id', service.vendor_id)
      .in('status', ['booked', 'in_progress'])
      .lt('starts_at', endsAt)
      .gt('ends_at', startsAt);
    if (conflicts && conflicts.length > 0) {
      setError(t('overlapError'));
      return;
    }

    setSubmitting(true);
    const { data: booking, error: insertError } = await supabase
      .from('vendor_bookings')
      .insert({
        service_id: service.id,
        provider_id: service.vendor_id,
        learner_id: user.id,
        status: 'pending',
        starts_at: startsAt,
        ends_at: endsAt,
        total_price: Number(service.price),
        address: address.trim() || null,
        notes: notes.trim() || null,
      })
      .select('id')
      .single();
    if (insertError || !booking) {
      setSubmitting(false);
      setError(t('bookingFailed'));
      return;
    }
    // Best-effort link row (booking already exists if this fails)
    await supabase
      .from('vendor_service_links')
      .insert({ booking_id: booking.id, service_id: service.id });
    setSubmitting(false);
    setDone(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-slate-800 rounded-xl ring-1 ring-slate-600 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t('bookingModalTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
            aria-label="close"
          >
            ×
          </button>
        </div>

        {done ? (
          <div className="mt-4">
            <div className="text-sm text-emerald-300">{t('bookingCreated')}</div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onBooked}
                className="px-3 py-1.5 rounded bg-sky-600 text-white text-sm hover:bg-sky-500"
              >
                OK
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <div>
              <div className="text-white font-medium text-sm">{service.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {service.duration_minutes} {ts('minutes')}
              </div>
              <div className="text-sm text-slate-200 mt-1">
                {t('total')}:{' '}
                {ts('currency', { amount: Number(service.price).toFixed(2) })}
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1" htmlFor="book-slot">
                {t('chooseSlot')}
              </label>
              {loading ? (
                <div className="text-sm text-slate-400">{ts('loading')}</div>
              ) : slots.length === 0 ? (
                <div className="text-sm text-slate-400">{t('noSlotsAvailable')}</div>
              ) : (
                <select
                  id="book-slot"
                  className="w-full p-2 rounded bg-slate-900 text-white border border-slate-600 focus:border-sky-500 focus:outline-none"
                  value={slot}
                  onChange={(e) => setSlot(e.target.value)}
                >
                  <option value="">—</option>
                  {slots.map((s) => (
                    <option key={s.id} value={s.starts_at}>
                      {new Date(s.starts_at).toLocaleString()} –{' '}
                      {new Date(s.ends_at).toLocaleTimeString()}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1" htmlFor="book-address">
                {t('addressLabel')}
              </label>
              <input
                id="book-address"
                className="w-full p-2 rounded bg-slate-900 text-white border border-slate-600 focus:border-sky-500 focus:outline-none"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1" htmlFor="book-notes">
                {t('notesLabel')}
              </label>
              <textarea
                id="book-notes"
                className="w-full p-2 rounded bg-slate-900 text-white border border-slate-600 focus:border-sky-500 focus:outline-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={300}
              />
            </div>

            {error && <div className="text-sm text-red-400">{error}</div>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded bg-slate-700 text-slate-200 text-sm hover:bg-slate-600"
              >
                {ts('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || slots.length === 0}
                className="px-3 py-1.5 rounded bg-sky-600 text-white text-sm hover:bg-sky-500 disabled:opacity-50"
              >
                {t('book')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}