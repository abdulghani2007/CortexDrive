'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import type { VendorService } from './types';

export const SERVICE_CATEGORIES = ['general', 'maintenance', 'repair', 'inspection', 'other'] as const;
export const SERVICE_MODES = ['in_person', 'mobile', 'both'] as const;

type Props = {
  vendorId: string;
  service: VendorService | null; // null = create, non-null = edit
  onClose: () => void;
  onSaved: () => void;
};

export default function ServiceFormModal({ vendorId, service, onClose, onSaved }: Props) {
  const t = useTranslations('VendorServices');
  const supabase = getSupabaseBrowserClient();
  const [title, setTitle] = useState(service?.title ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [category, setCategory] = useState<string>(service?.category ?? 'general');
  const [mode, setMode] = useState<string>(service?.mode ?? 'both');
  const [price, setPrice] = useState<string>(service ? String(service.price) : '');
  const [durationMinutes, setDurationMinutes] = useState<string>(
    service ? String(service.duration_minutes) : '60'
  );
  const [isActive, setIsActive] = useState(service?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function modeLabel(m: string) {
    if (m === 'in_person') return t('inPerson');
    if (m === 'mobile') return t('mobile');
    return t('both');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setSaveFailed(false);

    const trimmedTitle = title.trim();
    const priceNum = Number(price);
    const durationNum = Number(durationMinutes);

    if (!trimmedTitle) {
      setValidationError(t('errorTitle'));
      return;
    }
    if (price === '' || Number.isNaN(priceNum) || priceNum < 0) {
      setValidationError(t('errorPrice'));
      return;
    }
    if (!Number.isInteger(durationNum) || durationNum < 15 || durationNum > 480) {
      setValidationError(t('errorDuration'));
      return;
    }

    setSaving(true);
    const payload = {
      title: trimmedTitle,
      description: description.trim() || null,
      category,
      mode,
      price: Math.round(priceNum * 100) / 100,
      duration_minutes: durationNum,
      is_active: isActive,
    };

    const { error: dbError } = service
      ? await supabase.from('vendor_services').update(payload).eq('id', service.id)
      : await supabase.from('vendor_services').insert({ ...payload, vendor_id: vendorId });

    setSaving(false);
    if (dbError) {
      setSaveFailed(true);
      return;
    }
    onSaved();
  }

  const inputClass =
    'w-full p-2 rounded bg-slate-900 text-white border border-slate-600 focus:border-sky-500 focus:outline-none';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-slate-800 rounded-xl ring-1 ring-slate-600 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {service ? t('editService') : t('newService')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
            aria-label="close"
          >
            ×
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-slate-300 mb-1" htmlFor="svc-title">
              {t('title')}
            </label>
            <input
              id="svc-title"
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1" htmlFor="svc-desc">
              {t('description')}
            </label>
            <textarea
              id="svc-desc"
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1" htmlFor="svc-category">
                {t('category')}
              </label>
              <select
                id="svc-category"
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1" htmlFor="svc-mode">
                {t('mode')}
              </label>
              <select
                id="svc-mode"
                className={inputClass}
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                {SERVICE_MODES.map((m) => (
                  <option key={m} value={m}>
                    {modeLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1" htmlFor="svc-price">
                {t('price')}
              </label>
              <input
                id="svc-price"
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1" htmlFor="svc-duration">
                {t('durationMinutes')}
              </label>
              <input
                id="svc-duration"
                className={inputClass}
                type="number"
                min="15"
                max="480"
                step="15"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-sky-500"
            />
            {t('isActive')}
          </label>

          {validationError && <div className="text-sm text-red-400">{validationError}</div>}
          {saveFailed && <div className="text-sm text-red-400">{t('errorSave')}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-700 text-slate-200 text-sm hover:bg-slate-600"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 rounded bg-sky-600 text-white text-sm hover:bg-sky-500 disabled:opacity-50"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}