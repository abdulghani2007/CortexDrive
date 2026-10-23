'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import type { VendorService } from './types';
import ServiceFormModal from './ServiceFormModal';

const MAX_SERVICES = 3;

type Props = {
  vendorId: string;
};

export default function VendorServicesCard({ vendorId }: Props) {
  const t = useTranslations('VendorServices');
  const supabase = getSupabaseBrowserClient();
  const [services, setServices] = useState<VendorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VendorService | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    const { data, error } = await supabase
      .from('vendor_services')
      .select('id,vendor_id,title,description,category,mode,price,duration_minutes,is_active,created_at')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: true });
    if (error) {
      setLoadFailed(true);
      setServices([]);
    } else {
      setServices((data ?? []) as VendorService[]);
    }
    setLoading(false);
  }, [supabase, vendorId]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  async function toggleActive(service: VendorService) {
    const { error } = await supabase
      .from('vendor_services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);
    if (!error) void loadServices();
  }

  function openNew() {
    if (services.length >= MAX_SERVICES) return;
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(s: VendorService) {
    setEditing(s);
    setModalOpen(true);
  }

  function modeLabel(m: string) {
    if (m === 'in_person') return t('inPerson');
    if (m === 'mobile') return t('mobile');
    return t('both');
  }

  return (
    <div className="mt-3 p-4 bg-slate-700/60 rounded-xl ring-1 ring-slate-600/60">
      <div className="flex items-center justify-between">
        <div className="text-white font-semibold text-sm">{t('myServices')}</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{t('servicesUsed', { count: services.length })}</span>
          {services.length < MAX_SERVICES && (
            <button
              type="button"
              onClick={openNew}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-600 text-white hover:bg-sky-500"
            >
              {t('newService')}
            </button>
          )}
        </div>
      </div>

      {loading && <div className="mt-3 text-sm text-slate-400">{t('loading')}</div>}

      {!loading && loadFailed && (
        <div className="mt-3 text-sm text-red-400">{t('errorLoad')}</div>
      )}

      {!loading && !loadFailed && services.length === 0 && (
        <div className="mt-3 flex flex-col items-center gap-2 py-4">
          <div className="text-sm text-slate-400">{t('noServices')}</div>
          <button
            type="button"
            onClick={openNew}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-500"
          >
            {t('addFirstService')}
          </button>
        </div>
      )}

      {!loading && !loadFailed && services.length > 0 && (
        <ul className="mt-3 space-y-2">
          {services.map((s) => (
            <li
              key={s.id}
              className="p-3 bg-slate-800 rounded-lg ring-1 ring-slate-700/60 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium text-sm">{s.title}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30">
                    {s.category}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30">
                    {modeLabel(s.mode)}
                  </span>
                  {!s.is_active && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30">
                      {t('inactive')}
                    </span>
                  )}
                </div>
                {s.description && (
                  <div className="text-xs text-slate-400 mt-1 line-clamp-2">{s.description}</div>
                )}
                <div className="text-xs text-slate-400 mt-1">
                  {t('currency', { amount: Number(s.price).toFixed(2) })} · {s.duration_minutes} {t('minutes')}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-200 hover:bg-slate-600"
                >
                  {t('editService')}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleActive(s)}
                  className={`px-2 py-1 rounded text-xs ${
                    s.is_active
                      ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {s.is_active ? t('archive') : t('activate')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <ServiceFormModal
          vendorId={vendorId}
          service={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            void loadServices();
          }}
        />
      )}
    </div>
  );
}