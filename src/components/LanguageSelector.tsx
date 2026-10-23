"use client";

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

const locales = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ur', label: 'اردو', dir: 'rtl' },
  { code: 'roman_ur', label: 'Roman Urdu', dir: 'ltr' },
];

export function LanguageSelector() {
  const router = useRouter();
  const pathname = usePathname() || '/en';
  // normalize pathname to ensure it starts with a locale
  // if user lands on root it will be redirected by middleware to /en

  const searchParams = useSearchParams();
  const t = useTranslations('Common');

  // current locale is the first segment of the pathname (e.g. /en/...)
  const currentLocale = pathname.split('/')[1] || 'en';

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newLocale = e.target.value;
    // preserve pathname after the locale segment
    const parts = pathname.split('/');
    // remove the first empty string and the locale segment
    parts[1] = newLocale;
    const newPath = parts.join('/') || `/${newLocale}`;

    const params = searchParams ? `?${searchParams.toString()}` : '';

    // use replace to avoid polluting history and preserve search params
    router.replace(`${newPath}${params}`);
  }

  return (
    <div>
      <label htmlFor="lang-select" className="sr-only">
        {t('selectLanguage')}
      </label>
      <select
        id="lang-select"
        value={locales.find((l) => l.code === currentLocale)?.code || 'en'}
        onChange={onChange}
        className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-dark-slate dark:text-neutral-100 flex items-center"
        style={{ paddingLeft: 36 }}
      >
        {locales.map((l) => (
          <option key={l.code} value={l.code} dir={l.dir}>
            {l.label}
          </option>
        ))}
      </select>
      {/* decorative flag icons positioned over the select for a crisp round look */}
      <div className="relative -mt-8 ml-2 pointer-events-none" style={{ width: 28, height: 28 }}>
        {currentLocale === 'en' && (
          <img src="/flags/gb.png" alt="English" className="h-7 w-7 rounded-full border border-slate-700" />
        )}
        {currentLocale === 'ur' && (
          <img src="/flags/pk.png" alt="اردو" className="h-7 w-7 rounded-full border border-slate-700" />
        )}
        {currentLocale === 'roman_ur' && (
          <img src="/flags/pk_gb_mix.png" alt="Roman Urdu" className="h-7 w-7 rounded-full border border-slate-700" />
        )}
      </div>
    </div>
  );
}
