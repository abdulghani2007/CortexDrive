import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import AppShell from '@/components/AppShell';
import BackButton from '@/components/BackButton';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type Props = {
  locale: string;
  userId: string;
  fullName: string;
};

export default async function AdminDashboard({ locale, userId, fullName }: Props) {
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  const supabase = await getSupabaseServerClient();

  // Error-tolerant counting helper — every metric degrades to 0, never throws.
  async function countRows(
    table: string,
    filter?: { column: string; values: string[] }
  ): Promise<number> {
    try {
      let q = supabase.from(table).select('id', { count: 'exact', head: true });
      if (filter) q = q.in(filter.column, filter.values);
      const { count, error } = await q;
      if (error || count === null) return 0;
      return count;
    } catch {
      return 0;
    }
  }

  const [pendingVerifications, totalBookings, sosEvents, walletActivity] = await Promise.all([
    countRows('verifications', { column: 'status', values: ['pending', 'needs_review'] }),
    countRows('bookings'),
    countRows('sos_logs'),
    countRows('transactions'),
  ]);

  const cards = [
    {
      label: t('adminPendingVerifications'),
      value: pendingVerifications,
      href: `/${locale}/admin`,
      accent: pendingVerifications > 0
        ? { chip: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30', num: 'text-amber-400' }
        : { chip: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30', num: 'text-white' },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: t('adminBookings'),
      value: totalBookings,
      href: `/${locale}/admin`,
      accent: { chip: 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30', num: 'text-white' },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: t('adminSosEvents'),
      value: sosEvents,
      href: `/${locale}/admin`,
      accent: { chip: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30', num: 'text-white' },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      ),
    },
    {
      label: t('adminWalletActivity'),
      value: walletActivity,
      href: `/${locale}/admin`,
      accent: { chip: 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30', num: 'text-white' },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded">
        <BackButton />

        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl text-white">{t('adminTitle')}</h1>
            <div className="text-sm text-slate-400 mt-1">{fullName || '—'}</div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            Admin
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {cards.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="group p-4 bg-slate-700/60 rounded-xl ring-1 ring-slate-600/60 hover:ring-sky-500/50 hover:bg-slate-700 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${c.accent.chip}`}>
                  {c.icon}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className={`mt-3 text-3xl font-bold tabular-nums ${c.accent.num}`}>{c.value}</div>
              <div className="text-sm text-slate-400 mt-0.5">{c.label}</div>
            </Link>
          ))}
        </div>

        <Link
          href={`/${locale}/admin`}
          className="mt-6 flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-lg shadow-sky-600/20 transition-all duration-200"
        >
          {t('openAdminPanel')}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </AppShell>
  );
}
