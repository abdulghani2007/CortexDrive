'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import BackButton from '@/components/BackButton';

// This very small wrapper component exists because the project previously used
// @supabase/auth-helpers-nextjs in this file. To avoid adding that dependency
// we now use the shared helper getSupabaseBrowserClient which internally calls
// createBrowserClient (from @supabase/ssr) which is already in dependencies.

export default function WalletPage() {
  const supabase = getSupabaseBrowserClient();
  const t = useTranslations('Wallet');
  const tc = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const backHref = `/${locale}`;

  const [wallet, setWallet] = React.useState<any | null>(null);
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [topupAmount, setTopupAmount] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const mountedRef = React.useRef(true);
  const realtimeChannelRef = React.useRef<any | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; unsubscribeRealtime(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return void router.push(`/${locale}/signin`);

      const { data: w, error: wErr } = await supabase.from('wallets').select('*').eq('user_id', user.id).limit(1).single();
      if (wErr && wErr.code !== 'PGRST116') {
        setError(wErr.message);
        setWallet(null);
        setTransactions([]);
        setLoading(false);
        return;
      }

      setWallet(w ?? null);

      if (w && w.id) {
        const { data: tx, error: txErr } = await supabase.from('transactions').select('*').eq('wallet_id', w.id).order('created_at', { ascending: false });
        if (txErr) {
          setError(txErr.message);
          setTransactions([]);
        } else {
          setTransactions(tx || []);
        }

        // subscribe to realtime INSERTs for transactions (Supabase Realtime channel)
        subscribeRealtime(w.id);
      } else {
        // No wallet row — empty state
        setTransactions([]);
      }
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  function formatPKR(n: number | string | null) {
    const num = Number(n || 0);
    return num.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' });
  }

  async function handleTopUp(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(topupAmount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return void router.push(`/${locale}/signin`);
      const { data: w } = await supabase.from('wallets').select('*').eq('user_id', user.id).limit(1).single();
      const newBalance = Number(w.balance) + amt;
      // existing sandbox top-up behavior (pre-existing) — keep intact
      const { error: err } = await supabase.from('transactions').insert([{ wallet_id: w.id, kind: 'topup', amount: amt, balance_after: newBalance, meta: { source: 'demo' } }]);
      if (err) { setError(t('topupFailed') + ': ' + err.message); setLoading(false); return; }
      await supabase.from('wallets').update({ balance: newBalance }).eq('id', w.id);
      setTopupAmount('');
      await fetchData();
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setLoading(false);
    }
  }

  function subscribeRealtime(walletId: number) {
    try {
      if (realtimeChannelRef.current) return; // already subscribed
      // Supabase Realtime channel for INSERT events on public.transactions
      const channel = supabase.channel(`public:transactions:wallet_${walletId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload: any) => {
          const newRow = payload.new;
          if (!newRow) return;
          // payload.new.wallet_id may be string or number depending on DB lib
          if (String(newRow.wallet_id) !== String(walletId)) return;
          setTransactions((prev) => [newRow, ...prev]);
        })
        .subscribe();
      realtimeChannelRef.current = channel;
    } catch (e) {
      console.warn('Realtime subscription failed', e);
    }
  }

  function unsubscribeRealtime() {
    try {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    } catch (e) {
      // noop
    }
  }

  if (loading) return <div className="p-4">{tc('Common.loading')}</div>;
  if (error) return <div className="p-4 text-red-400">{tc('Common.error')}: {error}</div>;

  // wallet null = empty state (no wallet row)
  if (!wallet) return (
    <div className="p-6">
      <BackButton />
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="mt-3 text-neutral-400">{t('noWallet')}</p>
    </div>
  );

  return (
    <div className="p-6">
      <BackButton />
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="mt-2 text-sm text-neutral-400">{t('balance')}: <span className="font-mono ml-2">{formatPKR(wallet.balance)}</span></p>

      <form onSubmit={handleTopUp} className="mt-4 flex items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-sm text-neutral-400">{t('topupLabel')}</span>
          <input className="rounded-md bg-neutral-900 px-2 py-1 text-sm" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} />
        </label>
        <button type="submit" disabled={loading} className="rounded bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-slate-900 disabled:opacity-50">{t('topupButton')}</button>
      </form>

      <h2 className="mt-6 text-lg font-medium">{t('transactions')}</h2>

      {transactions.length === 0 ? (
        <div className="mt-4 text-neutral-500">{t('noTransactions')}</div>
      ) : (
        <table className="mt-4 w-full table-auto text-sm">
          <thead>
            <tr className="text-left text-neutral-400">
              <th>{t('colWhen')}</th>
              <th>{t('colKind')}</th>
              <th>{t('colAmount')}</th>
              <th>{t('colBalanceAfter')}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((trow: any) => (
              <tr key={trow.id} className="border-t border-neutral-800">
                <td className="py-2 align-top">{new Date(trow.created_at).toLocaleString()}</td>
                <td className="py-2"><span className="rounded px-2 py-0.5 bg-neutral-800 text-xs">{trow.kind}</span></td>
                <td className="py-2">{formatPKR(trow.amount)}</td>
                <td className="py-2">{formatPKR(trow.balance_after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}