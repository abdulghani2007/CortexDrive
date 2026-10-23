import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import AppShell from '@/components/AppShell';
import BackButton from '@/components/BackButton';
import SOSButtonClientWrapper from '@/modules/safety/SOSButtonClientWrapper';
import VendorServicesCard from '@/modules/vendor/services/VendorServicesCard';
import VendorAvailabilityCard from '@/modules/vendor/services/VendorAvailabilityCard';
import VendorBookingsCard from '@/modules/vendor/services/VendorBookingsCard';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type Props = {
  locale: string;
  userId: string;
  fullName: string;
  city: string;
};

export default async function VendorDashboard({ locale, userId, fullName, city }: Props) {
  const t = await getTranslations({ locale, namespace: 'Dashboard' });
  const supabase = await getSupabaseServerClient();

  // Wallet balance (best-effort)
  let walletBalance: number | null = null;
  try {
    const { data: wallet, error: werr } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    if (!werr && wallet && wallet.balance !== null && wallet.balance !== undefined) {
      walletBalance = Number(wallet.balance);
    }
  } catch {
    walletBalance = null;
  }
  const formattedBalance =
    walletBalance !== null
      ? walletBalance.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })
      : null;

  // Latest verification status
  let verificationStatus = 'unverified';
  try {
    const { data: ver } = await supabase
      .from('verifications')
      .select('status,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ver?.status && ['verified', 'needs_review', 'pending', 'rejected'].includes(ver.status)) {
      verificationStatus = ver.status;
    }
  } catch {
    verificationStatus = 'unverified';
  }

  const badgeClass =
    verificationStatus === 'verified'
      ? 'bg-emerald-600 text-white'
      : verificationStatus === 'needs_review'
        ? 'bg-amber-500 text-white'
        : verificationStatus === 'pending'
          ? 'bg-sky-600 text-white'
          : verificationStatus === 'rejected'
            ? 'bg-red-600 text-white'
            : 'bg-slate-600 text-slate-100';

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded">
        <BackButton />

        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl text-white">{t('vendorTitle')}</h1>
            <div className="text-sm text-slate-400 mt-1">
              {fullName || '—'}{city ? ` · ${city}` : ''}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Vendor
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href={`/${locale}/wallet`}
            className="group p-4 bg-slate-700/60 rounded-xl ring-1 ring-slate-600/60 hover:ring-sky-500/50 hover:bg-slate-700 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="text-sm text-slate-400 mt-3">{t('walletCard')}</div>
            <div className="text-lg text-white font-semibold">
              {formattedBalance !== null ? formattedBalance : t('walletUnavailable')}
            </div>
          </Link>

          <div className="p-4 bg-slate-700/60 rounded-xl ring-1 ring-slate-600/60">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                {t(`verificationStatus.${verificationStatus}`)}
              </span>
            </div>
            <div className="text-sm text-slate-400 mt-3">{t('verificationCard')}</div>
          </div>
        </div>

        <VendorServicesCard vendorId={userId} />
        <VendorAvailabilityCard vendorId={userId} />
        <VendorBookingsCard vendorId={userId} />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href={`/${locale}/ai-tutor`}
            className="group p-4 bg-slate-700/60 rounded-xl ring-1 ring-slate-600/60 hover:ring-sky-500/50 hover:bg-slate-700 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="text-white font-semibold text-sm mt-3">{t('aiTutorCard')}</div>
          </Link>

          <Link
            href={`/${locale}/services`}
            className="group p-4 bg-slate-700/60 rounded-xl ring-1 ring-slate-600/60 hover:ring-sky-500/50 hover:bg-slate-700 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="text-white font-semibold text-sm mt-3">{t('browseServicesCard')}</div>
          </Link>
        </div>

        <div className="mt-3 p-4 bg-slate-700/60 rounded-xl ring-1 ring-slate-600/60">
          <div className="text-white font-semibold text-sm">{t('safetyCard')}</div>
          <div className="mt-2 flex gap-3 text-sm">
            <Link href={`/${locale}/sos`} className="text-sky-400 hover:text-sky-300 transition-colors">{t('sosCard')}</Link>
            <Link href={`/${locale}/security`} className="text-sky-400 hover:text-sky-300 transition-colors">{t('securityCard')}</Link>
          </div>
        </div>

        <div className="mt-4">
          <SOSButtonClientWrapper />
        </div>
      </div>
    </AppShell>
  );
}