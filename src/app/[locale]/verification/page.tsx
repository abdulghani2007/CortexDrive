'use client';

import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import useSelfieCapture from '@/modules/verification/useSelfieCapture';
import AiResultBanner from '@/modules/verification/AiResultBanner';
import type { AiResult } from '@/modules/verification/types';

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('Verification');
  if (!status) return null;
  const map: Record<string, { label: string; cls: string }> = {
    verified: { label: t('status.verified'), cls: 'bg-emerald-100 text-emerald-800' },
    needs_review: { label: t('status.needsReview'), cls: 'bg-amber-100 text-amber-800' },
    rejected: { label: t('status.rejected'), cls: 'bg-red-100 text-red-800' },
    pending: { label: t('status.pending'), cls: 'bg-neutral-100 text-neutral-800' },
  };
  const p = map[status] ?? { label: status, cls: 'bg-neutral-100 text-neutral-800' };
  return <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${p.cls}`}>{p.label}</span>;
}

export default function VerificationPage() {
  const t = useTranslations('Verification');
  const tc = useTranslations('Common');
  const [cnic, setCnic] = useState<File | null>(null);
  const [license, setLicense] = useState<File | null>(null);
  const selfie = useSelfieCapture();
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [docType, setDocType] = useState<'cnic' | 'driving_license'>('cnic');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<any[] | null>(null);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setRows(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (mounted) setRows([]); return; }
        const { data, error } = await supabase.from('verifications').select('id,type,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false });
        if (error) throw error;
        if (mounted) setRows(data || []);
      } catch (e: any) { if (mounted) setRowsError(e.message || String(e)); }
    }
    load();
    return () => { mounted = false; };
  }, [supabase]);

  async function uploadToStorage(file: File, userId: string, namePrefix: string) {
    const ts = Date.now();
    const path = `verifications/${userId}/${namePrefix}-${ts}-${file.name}`;
    const bucket = 'verifications';
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);
    // store the storage path (data.path)
    return data.path;
  }

  async function submit() {
    setMessage(null);
    setAiResult(null);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('errors.notSignedIn'));
      if (!cnic || (docType === 'driving_license' && !license)) throw new Error(t('errors.noFile'));
      if (!selfie.file) throw new Error(t('errors.noFile'));

      // Upload files to private storage under verifications/{user.id}/...
      const cnicPath = await uploadToStorage(cnic!, user.id, 'cnic');
      let licensePath = null;
      if (docType === 'driving_license' && license) {
        licensePath = await uploadToStorage(license, user.id, 'license');
      }
      const selfiePath = await uploadToStorage(selfie.file, user.id, 'selfie');

      // Insert verification row (pending)
      const payload: any = {
        user_id: user.id,
        type: docType,
        doc_url: licensePath ?? cnicPath,
        selfie_url: selfiePath,
        status: 'pending',
      };

      const { data, error } = await supabase.from('verifications').insert(payload).select('id').single();
      if (error) throw new Error(error.message);

      // Trigger AI verification via the server route (owner-checked) — called ONCE
      try {
        const res = await fetch('/api/verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verification_id: data.id, doc_url: payload.doc_url, selfie_url: payload.selfie_url }),
        });
        const json = await res.json();
        if (json.ai_unavailable) {
          setAiResult({ ai_unavailable: true, status: 'unavailable' });
        } else {
          setAiResult(json as AiResult);
        }
      } catch {
        // Network failure of the AI step must not fail the submission (row stays 'pending')
        setAiResult({ ai_unavailable: true, status: 'unavailable' });
      }

      setMessage(t('submitSuccess'));
      // reload rows
      const { data: list } = await supabase.from('verifications').select('id,type,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false });
      setRows(list || []);
    } catch (e: any) {
      setMessage(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
      <p className="text-neutral-400 mb-4">{t('subtitle')}</p>

      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">{t('fields.docType')}</label>
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="doc" checked={docType === 'cnic'} onChange={() => setDocType('cnic')} />
              <span>{t('docTypes.cnic')}</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="doc" checked={docType === 'driving_license'} onChange={() => setDocType('driving_license')} />
              <span>{t('docTypes.drivingLicense')}</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block mb-1 font-medium">{t('fields.upload')}</label>
          <input type="file" accept="image/*" onChange={(e) => setCnic(e.target.files?.[0] ?? null)} />
        </div>

        {docType === 'driving_license' && (
          <div>
            <label className="block mb-1 font-medium">{t('fields.upload')}</label>
            <input type="file" accept="image/*" onChange={(e) => setLicense(e.target.files?.[0] ?? null)} />
          </div>
        )}

        <div>
          <label className="block mb-1 font-medium">{t('fields.selfie')}</label>
          <input type="file" accept="image/*" onChange={selfie.onChange} />
          {selfie.preview && <img src={selfie.preview} alt="selfie preview" className="mt-2 w-32 h-32 object-cover rounded" />}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={submit} disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded">
            {loading ? tc('loading') : t('submit')}
          </button>
        </div>

        {message && <div className="text-sm text-neutral-700">{message}</div>}

        {aiResult && <div className="mt-4"><AiResultBanner result={aiResult} /></div>}

        <div className="mt-6">
          <h2 className="text-lg font-semibold">{t('currentStatus.title')}</h2>
          {rowsError && <div className="text-sm text-red-600">{rowsError}</div>}
          {rows === null && <div className="text-sm text-neutral-500">{tc('loading')}</div>}
          {rows && rows.length === 0 && <div className="text-sm text-neutral-400">{t('currentStatus.empty')}</div>}
          {rows && rows.length > 0 && (
            <ul className="space-y-2 mt-2">
              {rows.map(r => (
                <li key={r.id} className="p-3 border rounded flex justify-between items-center">
                  <div>
                    <div className="text-sm text-neutral-400">{new Date(r.created_at).toLocaleString()}</div>
                    <div className="font-medium">{r.type}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}