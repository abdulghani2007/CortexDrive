import React from 'react';
import { redirect } from 'next/navigation';
import AdminPanel from '@/modules/admin/AdminPanel';
import AppShell from '@/components/AppShell';
import BackButton from '@/components/BackButton';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';

export default async function AdminPage({ params }: { params: { locale: string } }) {
  const supabase = await getSupabaseServerClient();
  const t = await getTranslations({ locale: params.locale, namespace: 'Admin' });

  const { data: { user } } = await supabase.auth.getUser();
  // Gate: user must be in public.admins
  if (!user) redirect(`/${params.locale}/signin`);
  const { data: admins } = await supabase.from('admins').select('user_id').eq('user_id', user.id).limit(1);

  if (!admins || admins.length === 0) {
    // Visible "not authorized" state instead of a silent redirect
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto bg-slate-800 p-6 rounded">
          <BackButton />
          <h1 className="text-2xl text-white mt-2">{t('title')}</h1>
          <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6 text-amber-400 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v-4m0-4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <strong className="block text-lg text-amber-100">{t('adminNotAuthorized')}</strong>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto bg-slate-800 p-6 rounded">
        <BackButton />
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-2xl text-white">{t('title')}</h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            Admin
          </span>
        </div>
        {/* AdminPanel is a client component */}
        <AdminPanel />
      </div>
    </AppShell>
  );
}
