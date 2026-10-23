import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import LearnerDashboard from '@/modules/dashboard/LearnerDashboard';
import InstructorDashboard from '@/modules/dashboard/InstructorDashboard';
import AdminDashboard from '@/modules/dashboard/AdminDashboard';
import VendorDashboard from '@/modules/dashboard/VendorDashboard';

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'Dashboard' });

  const supabase = await getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/${locale}/signin`);
  const user = session.user;

  const { data: profile } = await supabase
    .from('users')
    .select('full_name,city,role')
    .eq('id', user.id)
    .maybeSingle();

  const fullName = profile?.full_name ?? '';
  const city = profile?.city ?? '';
  const role = profile?.role;

  if (role === 'learner') {
    return (
      <LearnerDashboard
        locale={locale}
        userId={user.id}
        fullName={fullName}
        city={city}
      />
    );
  }

  if (role === 'instructor') {
    return (
      <InstructorDashboard
        locale={locale}
        userId={user.id}
        fullName={fullName}
        city={city}
      />
    );
  }

  if (role === 'admin') {
    return (
      <AdminDashboard
        locale={locale}
        userId={user.id}
        fullName={fullName}
      />
    );
  }

  if (role === 'vendor') {
    return (
      <VendorDashboard
        locale={locale}
        userId={user.id}
        fullName={fullName}
        city={city}
      />
    );
  }

  // unknown role — no dashboard exists yet
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded">
        <h1 className="text-2xl text-white">{t('otherRolePending')}</h1>
      </div>
    </AppShell>
  );
}
