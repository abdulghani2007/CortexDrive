import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import AppShell from '@/components/AppShell';
import BackButton from '@/components/BackButton';
import SOSButtonClientWrapper from '@/modules/safety/SOSButtonClientWrapper';
import InstructorEarnings from '@/modules/earning/InstructorEarnings';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type Props = {
  locale: string;
  userId: string;
  fullName: string;
  city: string;
};

export default async function InstructorDashboard({ locale, userId, fullName, city }: Props) {
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

  // Lesson counts (bookings where this user is the instructor)
  let upcoming = 0;
  let completed = 0;
  try {
    const { data: bk, error: berr } = await supabase
      .from('bookings')
      .select('id,status')
      .eq('instructor_id', userId);
    if (!berr && Array.isArray(bk)) {
      upcoming = bk.filter((b: any) => b?.status === 'booked').length;
      completed = bk.filter((b: any) => b?.status === 'completed').length;
    }
  } catch {
    upcoming = 0;
    completed = 0;
  }

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
        <h1 className="text-2xl text-white">{t('instructorTitle')}</h1>
        <div className="text-sm text-slate-400">
          {fullName || '—'}{city ? ` · ${city}` : ''}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`/${locale}/wallet`} className="p-3 bg-slate-700 rounded block">
            <div className="text-sm text-slate-400">{t('wallet')}</div>
            <div className="text-lg text-white font-semibold">
              {formattedBalance !== null ? formattedBalance : t('walletUnavailable')}
            </div>
          </Link>
          <div className="p-3 bg-slate-700 rounded">
            <div className="text-sm text-slate-400">{t('verification')}</div>
            <div className="mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                {t(`verificationStatus.${verificationStatus}`)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-700 rounded">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">{t('myLessons')}</h2>
            <Link href={`/${locale}/bookings`} className="text-sm text-sky-400">
              {t('myBookings')}
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-slate-800 rounded text-center">
              <div className="text-slate-400">{t('lessonsUpcoming')}</div>
              <div className="text-white font-semibold">{upcoming}</div>
            </div>
            <div className="p-2 bg-slate-800 rounded text-center">
              <div className="text-slate-400">{t('lessonsCompleted')}</div>
              <div className="text-white font-semibold">{completed}</div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h2 className="text-lg font-semibold text-white">{t('earnings')}</h2>
          <InstructorEarnings instructorId={userId} locale={locale} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="p-2 bg-slate-700 rounded text-center opacity-60">
            <div className="text-white font-semibold text-sm">{t('profileCard')}</div>
            <div className="text-slate-400 text-sm">{t('comingSoon')}</div>
          </div>
          <Link href={`/${locale}/marketplace`} className="p-2 bg-slate-700 rounded text-center">
            <div className="text-white font-semibold text-sm">{t('marketplaceCard')}</div>
          </Link>
          <Link href={`/${locale}/ai-tutor`} className="p-2 bg-slate-700 rounded text-center">
            <div className="text-white font-semibold text-sm">{t('aiTutorCard')}</div>
          </Link>
          <div className="p-2 bg-slate-700 rounded">
            <div className="text-white font-semibold text-sm">{t('safetyCard')}</div>
            <div className="mt-1 flex gap-2 text-sm">
              <Link href={`/${locale}/sos`} className="text-sky-400">{t('sosCard')}</Link>
              <Link href={`/${locale}/security`} className="text-sky-400">{t('securityCard')}</Link>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <SOSButtonClientWrapper />
        </div>
      </div>
    </AppShell>
  );
}
