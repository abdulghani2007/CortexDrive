'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

type Reschedule = {
  id: string;
  booking_id: string;
  proposed_by: string;
  new_starts_at: string;
  new_ends_at: string;
  status: string;
};

type Props = {
  bookingId: string;
  status: string;
  startsAt: string;
  durationMinutes: number;
  viewerIsProvider: boolean;
};

const ACTIVE = ['pending', 'booked', 'in_progress'];

export default function BookingActions({ bookingId, status, startsAt, durationMinutes }: Props) {
  const t = useTranslations('VendorReschedule');
  const supabase = getSupabaseBrowserClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Reschedule | null>(null);
  const [showPropose, setShowPropose] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [newStart, setNewStart] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProposal = useCallback(async () => {
    const { data } = await supabase
      .from('vendor_booking_reschedules')
      .select('id,booking_id,proposed_by,new_starts_at,new_ends_at,status')
      .eq('booking_id', bookingId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setProposal((data as Reschedule | null) ?? null);
  }, [supabase, bookingId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) setUserId(user?.id ?? null);
    })();
    void loadProposal();
    return () => {
      cancelled = true;
    };
  }, [supabase, loadProposal]);

  async function propose() {
    setError(null);
    setNotice(null);
    if (!newStart || !userId) {
      setError(t('rescheduleInvalid'));
      return;
    }
    const s = new Date(newStart);
    if (Number.isNaN(s.getTime()) || s.getTime() <= Date.now()) {
      setError(t('rescheduleInvalid'));
      return;
    }
    const e = new Date(s.getTime() + durationMinutes * 60000);
    setBusy(true);
    const { data: row, error: insError } = await supabase
      .from('vendor_booking_reschedules')
      .insert({
        booking_id: bookingId,
        proposed_by: userId,
        new_starts_at: s.toISOString(),
        new_ends_at: e.toISOString(),
      })
      .select('id')
      .single();
    if (insError || !row) {
      setBusy(false);
      setError(t('rescheduleFailed'));
      return;
    }
    // proposer's own consensus vote
    await supabase
      .from('vendor_booking_consensus')
      .insert({ reschedule_id: row.id, user_id: userId, accepted: true, responded_at: new Date().toISOString() });
    setBusy(false);
    setShowPropose(false);
    setNewStart('');
    void loadProposal();
  }

  async function vote(accept: boolean) {
    if (!proposal || !userId) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    const { error: voteError } = await supabase
      .from('vendor_booking_consensus')
      .upsert(
        { reschedule_id: proposal.id, user_id: userId, accepted: accept, responded_at: new Date().toISOString() },
        { onConflict: 'reschedule_id,user_id' }
      );
    if (voteError) {
      setBusy(false);
      setError(t('rescheduleFailed'));
      return;
    }
    if (!accept) {
      await supabase
        .from('vendor_booking_reschedules')
        .update({ status: 'rejected' })
        .eq('id', proposal.id);
      setBusy(false);
      setProposal(null);
      setNotice(t('rejected'));
      return;
    }
    const { error: resError } = await supabase
      .from('vendor_booking_reschedules')
      .update({ status: 'accepted' })
      .eq('id', proposal.id);
    if (resError) {
      setBusy(false);
      setError(t('rescheduleFailed'));
      return;
    }
    // apply the new times to the booking (no_provider_overlap is the DB guard)
    const { error: bookingError } = await supabase
      .from('vendor_bookings')
      .update({ starts_at: proposal.new_starts_at, ends_at: proposal.new_ends_at })
      .eq('id', bookingId);
    setBusy(false);
    if (bookingError) {
      setError(t('overlapOnAccept'));
      await supabase
        .from('vendor_booking_reschedules')
        .update({ status: 'pending' })
        .eq('id', proposal.id);
      return;
    }
    setProposal(null);
    setNotice(t('accepted'));
  }

  async function escalate() {
    setError(null);
    setNotice(null);
    if (!reason.trim() || !userId) {
      setError(t('issueFailed'));
      return;
    }
    setBusy(true);
    const { error: escError } = await supabase.from('vendor_booking_escalations').insert({
      booking_id: bookingId,
      raised_by: userId,
      reason: reason.trim(),
    });
    setBusy(false);
    if (escError) {
      setError(t('issueFailed'));
      return;
    }
    setShowEscalate(false);
    setReason('');
    setNotice(t('issueSent'));
  }

  if (!ACTIVE.includes(status)) return null;

  const isProposer = proposal && userId && proposal.proposed_by === userId;

  return (
    <div className="mt-2">
      {notice && <div className="mt-1 text-xs text-emerald-300">{notice}</div>}
      {error && <div className="mt-1 text-xs text-red-400">{error}</div>}

      {proposal && (
        <div className="mt-2 p-2 bg-slate-900/60 rounded-lg ring-1 ring-sky-500/30">
          <div className="text-xs text-slate-300">
            {isProposer ? t('proposedByYou') : t('proposedByOther')}:{' '}
            {new Date(proposal.new_starts_at).toLocaleString()} –{' '}
            {new Date(proposal.new_ends_at).toLocaleTimeString()}
          </div>
          {!isProposer && (
            <div className="mt-1.5 flex gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void vote(true)}
                className="px-2 py-1 rounded text-xs bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {t('accept')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void vote(false)}
                className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50"
              >
                {t('decline')}
              </button>
            </div>
          )}
          {isProposer && <div className="mt-1 text-[10px] text-slate-400">{t('proposed')}</div>}
        </div>
      )}

      <div className="mt-1.5 flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            setShowPropose(true);
            setError(null);
          }}
          className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-200 hover:bg-slate-600"
        >
          {t('reschedule')}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowEscalate(true);
            setError(null);
          }}
          className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-200 hover:bg-slate-600"
        >
          {t('raiseIssue')}
        </button>
      </div>

      {showPropose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-slate-800 rounded-xl ring-1 ring-slate-600 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{t('reschedule')}</h2>
              <button type="button" onClick={() => setShowPropose(false)} className="text-slate-400 hover:text-white text-xl leading-none" aria-label="close">×</button>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1" htmlFor="res-start">{t('newStart')}</label>
                <input
                  id="res-start"
                  type="datetime-local"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full p-2 rounded bg-slate-900 text-white border border-slate-600 focus:border-sky-500 focus:outline-none"
                />
              </div>
              {error && <div className="text-sm text-red-400">{error}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowPropose(false)} className="px-3 py-1.5 rounded bg-slate-700 text-slate-200 text-sm hover:bg-slate-600">{t('cancel')}</button>
                <button type="button" disabled={busy} onClick={() => void propose()} className="px-3 py-1.5 rounded bg-sky-600 text-white text-sm hover:bg-sky-500 disabled:opacity-50">{t('propose')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEscalate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-slate-800 rounded-xl ring-1 ring-slate-600 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{t('raiseIssue')}</h2>
              <button type="button" onClick={() => setShowEscalate(false)} className="text-slate-400 hover:text-white text-xl leading-none" aria-label="close">×</button>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1" htmlFor="esc-reason">{t('issueReason')}</label>
                <textarea
                  id="esc-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={400}
                  className="w-full p-2 rounded bg-slate-900 text-white border border-slate-600 focus:border-sky-500 focus:outline-none"
                />
              </div>
              {error && <div className="text-sm text-red-400">{error}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowEscalate(false)} className="px-3 py-1.5 rounded bg-slate-700 text-slate-200 text-sm hover:bg-slate-600">{t('cancel')}</button>
                <button type="button" disabled={busy} onClick={() => void escalate()} className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm hover:bg-amber-500 disabled:opacity-50">{t('send')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}