import { getTranslations } from 'next-intl/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const formatPKR = (n: number) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(n);

export default async function InstructorEarnings({
  instructorId,
  locale,
}: {
  instructorId: string;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: 'Earnings' });

  // Strategy: compute earnings FROM the transactions table.
  // We first fetch the instructor's wallet(s) and then read transactions for them.
  // Classify released earnings as transactions of kind 'payout' and pending as other positive
  // credit-like transactions (escrow/hold). The live schema uses kinds such as
  // 'payout' and 'fee_split' (see edge function). This heuristic is defensive
  // and works with the existing dataset; adjust when more kinds are known.
  const sb = await getSupabaseServerClient();

  // get wallets for instructor
  const { data: wallets, error: wErr } = await sb.from('wallets').select('id').eq('user_id', instructorId);
  if (wErr) {
    return (
      <section className="mt-6 p-4 bg-slate-700 rounded text-red-300">
        {t('error')}
      </section>
    );
  }
  const walletIds = (wallets ?? []).map((w: any) => w.id);
  if (walletIds.length === 0) {
    return (
      <section className="mt-6 p-4 bg-slate-700 rounded text-neutral-300">
        {t('empty')}
      </section>
    );
  }

  const { data: txRows, error: txErr } = await sb
    .from('transactions')
    .select('id,kind,amount,related_booking,created_at')
    .in('wallet_id', walletIds)
    .order('created_at', { ascending: false });

  if (txErr) {
    return (
      <section className="mt-6 p-4 bg-slate-700 rounded text-red-300">
        {t('error')}
      </section>
    );
  }

  const txList = txRows ?? [];
  if (txList.length === 0) {
    return (
      <section className="mt-6 p-4 bg-slate-700 rounded text-neutral-300">
        {t('empty')}
      </section>
    );
  }

  // platform_settings is a key-value table (key = 'platform_fee_percent')
  const { data: feeRow } = await sb
    .from('platform_settings')
    .select('value')
    .eq('key', 'platform_fee_percent')
    .maybeSingle();
  const feePercent = feeRow?.value != null ? Number(feeRow.value) || 0 : 0;

  // classify transactions: released = payouts, pending = other positive credits
  const released = txList.filter((tx: any) => tx.kind === 'payout');
  const pending = txList.filter((tx: any) => tx.kind !== 'payout' && tx.kind !== 'fee_split' && Number(tx.amount || 0) > 0);

  const releasedGross = released.reduce((s: number, tx: any) => s + Number(tx.amount || 0), 0);
  const pendingGross = pending.reduce((s: number, tx: any) => s + Number(tx.amount || 0), 0);

  const pendingNet = pendingGross - (pendingGross * feePercent) / 100;
  const releasedNet = releasedGross - (releasedGross * feePercent) / 100;

  return (
    <section className="mt-6 p-4 bg-slate-700 rounded text-white">
      <h2 className="text-lg font-semibold">{t('title')}</h2>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div className="p-3 bg-slate-800 rounded">
          <div className="text-sm text-neutral-300">{t('pending')}</div>
          <div className="mt-2 text-2xl">{formatPKR(pendingGross)}</div>
          <div className="text-sm text-neutral-400">{t('gross')} · {t('net')}: {formatPKR(pendingNet)}</div>
          <div className="text-xs text-neutral-500 mt-1">{pending.length} {t('bookingsCount')}</div>
        </div>
        <div className="p-3 bg-slate-800 rounded">
          <div className="text-sm text-neutral-300">{t('released')}</div>
          <div className="mt-2 text-2xl">{formatPKR(releasedGross)}</div>
          <div className="text-sm text-neutral-400">{t('gross')} · {t('net')}: {formatPKR(releasedNet)}</div>
          <div className="text-xs text-neutral-500 mt-1">{released.length} {t('bookingsCount')}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-neutral-400">{t('fee')}: {feePercent}%</div>
    </section>
  );
}