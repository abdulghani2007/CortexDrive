'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import BackButton from '@/components/BackButton';
import type { ServiceRow } from '@/modules/vendor/services/types';
import BookingModal from '@/modules/vendor/services/BookingModal';

const CATEGORIES = ['general', 'maintenance', 'repair', 'inspection', 'other'];

export default function ServicesBrowsePage() {
  const t = useTranslations('VendorServices');
  const tr = useTranslations('VendorRating');
  const supabase = getSupabaseBrowserClient();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [booking, setBooking] = useState<ServiceRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadFailed(false);
      // select on users is restricted by RLS, so fetch services and vendor rows separately
      const { data, error } = await supabase
        .from('vendor_services')
        .select('id,vendor_id,title,description,category,mode,price,duration_minutes,vendor_ratings(avg_rating,rating_count)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (error) {
        setLoadFailed(true);
        setServices([]);
      } else {
        const rows = data as Array<
          Omit<ServiceRow, 'vendor_name' | 'vendor_city'> & {
            vendor_ratings: { avg_rating: number | string | null; rating_count: number | null } | null;
          }
        >;
        // best-effort vendor names (RLS may hide users rows)
        const vendorIds = Array.from(new Set(rows.map((r) => r.vendor_id)));
        let nameById = new Map<string, { name: string | null; city: string | null }>();
        if (vendorIds.length > 0) {
          const { data: vendors } = await supabase
            .from('users')
            .select('id,full_name,city')
            .in('id', vendorIds);
          if (vendors) {
            nameById = new Map(
              vendors.map((v: { id: string; full_name: string | null; city: string | null }) => [
                v.id,
                { name: v.full_name, city: v.city },
              ])
            );
          }
        }
        const merged: ServiceRow[] = rows.map((r) => ({
          ...r,
          vendor_ratings: undefined,
          avg_rating: r.vendor_ratings?.avg_rating ?? null,
          rating_count: r.vendor_ratings?.rating_count ?? null,
          vendor_name: nameById.get(r.vendor_id)?.name ?? null,
          vendor_city: nameById.get(r.vendor_id)?.city ?? null,
        }));
        setServices(merged);
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (category !== 'all' && s.category !== category) return false;
      if (q && !s.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, category, search]);

  function modeLabel(m: string) {
    if (m === 'in_person') return t('inPerson');
    if (m === 'mobile') return t('mobile');
    return t('both');
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <BackButton />
      <h1 className="mt-2 text-2xl font-semibold text-white">{t('browseServices')}</h1>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 p-2 rounded bg-slate-800 text-white border border-slate-600 focus:border-sky-500 focus:outline-none"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="p-2 rounded bg-slate-800 text-white border border-slate-600 focus:border-sky-500 focus:outline-none"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">{t('allCategories')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="mt-6 text-slate-400">{t('loading')}</div>}
      {!loading && loadFailed && <div className="mt-6 text-red-400">{t('errorLoad')}</div>}

      {!loading && !loadFailed && filtered.length === 0 && (
        <div className="mt-6 p-6 bg-slate-800 rounded-xl text-center text-slate-400">
          {t('noServicesBrowse')}
        </div>
      )}

      {!loading && !loadFailed && filtered.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="p-4 bg-slate-800 rounded-xl ring-1 ring-slate-700">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold">{s.title}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30">
                  {s.category}
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30">
                  {modeLabel(s.mode)}
                </span>
              </div>
              {s.description && <p className="mt-2 text-sm text-slate-300">{s.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  {t('currency', { amount: Number(s.price).toFixed(2) })} · {s.duration_minutes} {t('minutes')}
                </div>
                <span className="text-sm text-slate-400">
                  {s.vendor_name ?? '—'}{s.vendor_city ? ` · ${s.vendor_city}` : ''}
                </span>
              </div>
              {(s.rating_count ?? 0) > 0 && (
                <div className="mt-2 text-sm text-amber-300">
                  ★ {Number(s.avg_rating ?? 0).toFixed(1)}{' '}
                  <span className="text-slate-400">
                    ({s.rating_count} {tr('reviewsCount')})
                  </span>
                </div>
              )}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setBooking(s)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-500"
                >
                  {t('bookCta')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {booking && (
        <BookingModal
          service={booking}
          onClose={() => setBooking(null)}
          onBooked={() => setBooking(null)}
        />
      )}
    </main>
  );
}