'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import BackButton from '@/components/BackButton';

export default function BookingsPage() {
  const supabase = getSupabaseBrowserClient();
  const t = useTranslations('Booking');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();

  const [bookings, setBookings] = React.useState<any[] | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return void router.push(`/${locale}/signin`);
      setUserId(user.id);

      const { data: rows, error: bErr } = await supabase.from('bookings').select('*').eq('learner_id', user.id).order('created_at', { ascending: false });
      if (bErr) {
        setError(bErr.message);
        setBookings([]);
        return;
      }

      setBookings(rows || []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setBookings([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  function formatPKR(n: number | string | null) {
    const num = Number(n || 0);
    return num.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' });
  }

  async function handleCancel(booking: any) {
    if (!booking) return;
    setError(null);
    setSuccess(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return void router.push(`/${locale}/signin`);

      // Defensive ownership check (RLS also restricts rows; this is for UI only)
      if (booking.learner_id !== user.id) {
        setError(t('cancelFailed'));
        setConfirmingId(null);
        return;
      }

      // Amount comes from the live bookings schema column: instructor_rate
      const amount = Number(booking.instructor_rate ?? 0);
      if (!booking.instructor_rate || amount <= 0) {
        setError(t('missingAmountColumn'));
        setConfirmingId(null);
        return;
      }

      // platform_settings is a key-value table (key = 'platform_fee_percent', value = '10')
      const { data: ps, error: psErr } = await supabase.from('platform_settings').select('value').eq('key', 'platform_fee_percent').maybeSingle();
      let feePercent = 0;
      if (!psErr && ps && ps.value != null) {
        feePercent = Number(ps.value) || 0;
      }

      const fee = Math.round((amount * feePercent) / 100);
      const refund = amount - fee;

      // Step 1: mark booking refunded (NO DELETE on bookings — ever)
      const { error: updErr } = await supabase.from('bookings').update({ status: 'refunded' }).eq('id', booking.id).eq('learner_id', user.id);
      if (updErr) {
        setError(t('cancelFailed') + ': ' + updErr.message);
        setConfirmingId(null);
        return;
      }

      // Step 2: find learner's wallet; if missing, revert booking status
      const { data: w, error: wErr } = await supabase.from('wallets').select('*').eq('user_id', user.id).limit(1).single();
      if (wErr || !w || !w.id) {
        await supabase.from('bookings').update({ status: 'booked' }).eq('id', booking.id).eq('learner_id', user.id);
        setError(t('cancelFailed') + ': ' + t('noWallet'));
        setConfirmingId(null);
        return;
      }

      // Step 3: insert refund transaction (real column: related_booking)
      const newBalance = Number(w.balance) + refund;
      const { error: txErr } = await supabase.from('transactions').insert([{ wallet_id: w.id, kind: 'refund', amount: refund, balance_after: newBalance, related_booking: booking.id, meta: { reason: 'cancel' } }]);
      if (txErr) {
        await supabase.from('bookings').update({ status: 'booked' }).eq('id', booking.id).eq('learner_id', user.id);
        setError(t('cancelFailed') + ': ' + txErr.message);
        setConfirmingId(null);
        return;
      }

      // Step 4: update wallet balance
      const { error: wbErr } = await supabase.from('wallets').update({ balance: newBalance }).eq('id', w.id);
      if (wbErr) {
        setError(t('cancelFailed') + ': ' + wbErr.message);
        setConfirmingId(null);
        return;
      }

      setConfirmingId(null);
      await fetchData();
      setSuccess(t('cancelSuccess'));
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setConfirmingId(null);
    }
  }

  if (loading) return <div className="p-4">{tc('loading')}</div>;
  if (error) return (
    <div className="p-6">
      <BackButton />
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="mt-3 text-red-400">{tc('error')}: {error}</p>
    </div>
  );

  if (!bookings || bookings.length === 0) return (
    <div className="p-6">
      <BackButton />
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="mt-3 text-neutral-400">{t('empty')}</p>
    </div>
  );

  return (
    <div className="p-6">
      <BackButton />
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      {success ? (
        <div className="mt-4 rounded-md bg-green-800 px-4 py-2 text-green-200">{success}</div>
      ) : null}

      <table className="mt-4 w-full table-auto text-sm">
        <thead>
          <tr className="text-left text-neutral-400">
            <th>{t('colWhen')}</th>
            <th>{t('colInstructor')}</th>
            <th>{t('colStatus')}</th>
            <th>{t('colAmount')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b: any) => {
            const isOwner = userId != null && b.learner_id === userId;
            return (
              <tr key={b.id} className="border-t border-neutral-800 align-top">
                <td className="py-3 align-top">{new Date(b.created_at).toLocaleString()}</td>
                <td className="py-3">{b.instructor_id ?? t('unknownInstructor')}</td>
                <td className="py-3">{b.status === 'booked' ? t('statusBooked') : b.status === 'refunded' ? t('statusRefunded') : b.status}</td>
                <td className="py-3">{formatPKR(b.instructor_rate)}</td>
                <td className="py-3 text-right">
                  {b.status === 'booked' && isOwner ? (
                    confirmingId === b.id ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleCancel(b)} className="rounded bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-900">{t('confirmCancel')}</button>
                        <button onClick={() => setConfirmingId(null)} className="text-sm text-neutral-400">{t('abort')}</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmingId(b.id)} className="rounded border border-neutral-700 px-3 py-1.5 text-sm">{t('cancel')}</button>
                    )
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}