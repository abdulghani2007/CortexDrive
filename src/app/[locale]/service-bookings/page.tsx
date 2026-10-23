'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import BackButton from '@/components/BackButton';
import RatingModal from '@/modules/vendor/services/RatingModal';
import BookingActions from '@/modules/vendor/services/BookingActions';

type Booking = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  total_price: number | string;
  address: string | null;
  notes: string | null;
  vendor_services: { title: string; vendor_id: string } | null;
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  booked: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
  in_progress: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30',
  completed: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  cancelled: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30',
};

export default function MyServiceBookingsPage() {
  const t = useTranslations('VendorBooking');
  const tr = useTranslations('VendorRating');
  const ts = useTranslations('VendorServices');
  const supabase = getSupabaseBrowserClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSignedOut(true);
      setLoading(false);
      return;
    }
    const { data, error: dbError } = await supabase
      .from('vendor_bookings')
      .select('id,status,starts_at,ends_at,total_price,address,notes,vendor_services(title,vendor_id)')
      .eq('learner_id', user.id)
      .order('starts_at', { ascending: false })
      .limit(50);
    if (dbError) {
      setError(t('bookingFailed'));
      setBookings([]);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as Booking[];
    setBookings(rows);
    // hide "Rate" for bookings this learner already rated
    const { data: myRatings } = await supabase
      .from('vendor_booking_ratings')
      .select('booking_id')
      .eq('learner_id', user.id);
    setRatedIds(new Set((myRatings ?? []).map((r: { booking_id: string }) => r.booking_id)));
    setLoading(false);
  }, [supabase, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancelBooking(id: string) {
    setError(null);
    const { error: dbError } = await supabase
      .from('vendor_bookings')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (dbError) {
      setError(t('bookingFailed'));
      return;
    }
    void load();
  }

  function statusLabel(s: string) {
    if (s === 'pending') return t('statusPending');
    if (s === 'booked') return t('statusBooked');
    if (s === 'in_progress') return t('statusInProgress');
    if (s === 'completed') return t('statusCompleted');
    return t('statusCancelled');
  }

  if (signedOut) {
    return (
      <main className="p-6 max-w-2xl mx-auto">
        <BackButton />
        <h1 className="mt-2 text-2xl font-semibold text-white">{t('myBookingsTitle')}</h1>
        <div className="mt-4 text-slate-400">{t('loginToBook')}</div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <BackButton />
      <h1 className="mt-2 text-2xl font-semibold text-white">{t('myBookingsTitle')}</h1>

      {loading && <div className="mt-6 text-slate-400">{ts('loading')}</div>}
      {!loading && error && <div className="mt-6 text-red-400">{error}</div>}

      {!loading && !error && bookings.length === 0 && (
        <div className="mt-6 p-6 bg-slate-800 rounded-xl text-center text-slate-400">
          {t('noBookings')}
        </div>
      )}

      {!loading && bookings.length > 0 && (
        <ul className="mt-6 space-y-3">
          {bookings.map((b) => (
            <li key={b.id} className="p-4 bg-slate-800 rounded-xl ring-1 ring-slate-700">
              <div className="flex items-center justify-between gap-2">
                <span className="text-white font-semibold">{b.vendor_services?.title ?? '—'}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_CLASS[b.status] ?? STATUS_CLASS.cancelled
                  }`}
                >
                  {statusLabel(b.status)}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-400">
                {new Date(b.starts_at).toLocaleString()} – {new Date(b.ends_at).toLocaleTimeString()}
                {' · '}
                {ts('currency', { amount: Number(b.total_price).toFixed(2) })}
              </div>
              {b.address && <div className="mt-1 text-sm text-slate-400">{b.address}</div>}
              {b.notes && <div className="mt-1 text-sm text-slate-400">{b.notes}</div>}
              <div className="mt-3 flex gap-2">
                {(b.status === 'pending' || b.status === 'booked') && (
                  <button
                    type="button"
                    onClick={() => void cancelBooking(b.id)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 text-slate-200 hover:bg-red-600 hover:text-white"
                  >
                    {t('cancelBooking')}
                  </button>
                )}
                {b.status === 'completed' && !ratedIds.has(b.id) && (
                  <button
                    type="button"
                    onClick={() => setRating(b)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/90 text-white hover:bg-amber-400"
                  >
                    {tr('rateBooking')}
                  </button>
                )}
                {b.status === 'completed' && ratedIds.has(b.id) && (
                  <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                    {tr('rated')}
                  </span>
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

      {rating && (
        <RatingModal
          bookingId={rating.id}
          serviceTitle={rating.vendor_services?.title ?? '—'}
          onClose={() => setRating(null)}
          onRated={() => {
            setRating(null);
            void load();
          }}
        />
      )}
    </main>
  );
}