'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import BookingActions from './BookingActions';

type Booking = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  total_price: number | string;
  address: string | null;
  notes: string | null;
  vendor_services: { title: string } | null;
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  booked: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
  in_progress: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30',
  completed: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  cancelled: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30',
};

export default function VendorBookingsCard({ vendorId }: { vendorId: string }) {
  const t = useTranslations('VendorBooking');
  const ts = useTranslations('VendorServices');
  const supabase = getSupabaseBrowserClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vendor_bookings')
      .select('id,status,starts_at,ends_at,total_price,address,notes,vendor_services(title)')
      .eq('provider_id', vendorId)
      .order('starts_at', { ascending: false })
      .limit(30);
    setBookings((data ?? []) as Booking[]);
    setLoading(false);
  }, [supabase, vendorId]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  async function setStatus(id: string, status: string) {
    setActionError(null);
    const { error } = await supabase.from('vendor_bookings').update({ status }).eq('id', id);
    if (error) {
      // 23P01 = exclusion violation from no_provider_overlap (double-booking)
      setActionError((error as any).code === '23P01' ? t('overlapError') : t('bookingFailed'));
      return;
    }
    void loadBookings();
  }

  function statusLabel(s: string) {
    if (s === 'pending') return t('statusPending');
    if (s === 'booked') return t('statusBooked');
    if (s === 'in_progress') return t('statusInProgress');
    if (s === 'completed') return t('statusCompleted');
    return t('statusCancelled');
  }

  return (
    <div className="mt-3 p-4 bg-slate-700/60 rounded-xl ring-1 ring-slate-600/60">
      <div className="text-white font-semibold text-sm">{t('incomingTitle')}</div>

      {loading && <div className="mt-3 text-sm text-slate-400">{ts('loading')}</div>}

      {!loading && bookings.length === 0 && (
        <div className="mt-3 text-sm text-slate-400">{t('noBookings')}</div>
      )}

      {actionError && <div className="mt-2 text-sm text-red-400">{actionError}</div>}

      {!loading && bookings.length > 0 && (
        <ul className="mt-3 space-y-2">
          {bookings.map((b) => (
            <li key={b.id} className="p-3 bg-slate-800 rounded-lg ring-1 ring-slate-700/60">
              <div className="flex items-center justify-between gap-2">
                <span className="text-white font-medium text-sm">{b.vendor_services?.title ?? '—'}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    STATUS_CLASS[b.status] ?? STATUS_CLASS.cancelled
                  }`}
                >
                  {statusLabel(b.status)}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {new Date(b.starts_at).toLocaleString()} – {new Date(b.ends_at).toLocaleTimeString()}
                {' · '}
                {ts('currency', { amount: Number(b.total_price).toFixed(2) })}
              </div>
              {b.address && <div className="text-xs text-slate-400 mt-0.5">{b.address}</div>}
              {b.notes && <div className="text-xs text-slate-400 mt-0.5">{b.notes}</div>}
              <div className="mt-2 flex gap-1.5">
                {b.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => void setStatus(b.id, 'booked')}
                      className="px-2 py-1 rounded text-xs bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      {t('confirm')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void setStatus(b.id, 'cancelled')}
                      className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-200 hover:bg-slate-600"
                    >
                      {t('cancelBooking')}
                    </button>
                  </>
                )}
                {b.status === 'booked' && (
                  <>
                    <button
                      type="button"
                      onClick={() => void setStatus(b.id, 'in_progress')}
                      className="px-2 py-1 rounded text-xs bg-sky-600 text-white hover:bg-sky-500"
                    >
                      {t('startBooking')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void setStatus(b.id, 'cancelled')}
                      className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-200 hover:bg-slate-600"
                    >
                      {t('cancelBooking')}
                    </button>
                  </>
                )}
                {b.status === 'in_progress' && (
                  <button
                    type="button"
                    onClick={() => void setStatus(b.id, 'completed')}
                    className="px-2 py-1 rounded text-xs bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    {t('completeBooking')}
                  </button>
                )}
              </div>
              <BookingActions
                bookingId={b.id}
                status={b.status}
                startsAt={b.starts_at}
                durationMinutes={Math.round(
                  (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 60000
                )}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}