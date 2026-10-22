'use client';

import { Suspense } from 'react';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

export default function Home() {
  const t = useTranslations('Home');
  const locale = useLocale();

  return (
    <main className="min-h-screen p-8 bg-dark-slate text-neutral-100">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between">
          <h1 className="text-4xl font-semibold">{t('title')}</h1>
          <LanguageSelector />
        </header>

        <section className="mt-8">
          <h2 className="text-2xl font-medium">{t('subtitle')}</h2>
          <p className="mt-4 text-muted">{t('tagline')}</p>
          <div className="mt-6 flex gap-4">
            <Link href={`/${locale}/marketplace`} className="px-4 py-2 bg-electric-cyan text-dark-slate rounded">{t('ctaPrimary')}</Link>
            <Link href={`/${locale}/signup?role=instructor`} className="px-4 py-2 border border-neutral-600 rounded">{t('ctaSecondary')}</Link>
          </div>
        </section>

        <section className="mt-6 flex gap-4">
          <Link href={`/${locale}/signup?role=learner`} className="px-4 py-2 border border-neutral-600 rounded text-sm">{t('ctaLearner')}</Link>
          <Link href={`/${locale}/signup?role=vendor`} className="px-4 py-2 border border-neutral-600 rounded text-sm">{t('ctaVendor')}</Link>
          <Link href={`/${locale}/admin-login`} className="px-4 py-2 border border-neutral-600 rounded text-sm">Admin Login</Link>
          <Link href={`/${locale}/signin`} className="px-4 py-2 border border-neutral-600 rounded text-sm">Sign in</Link>
        </section>
      </div>
    </main>
  );
}