'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

type Props = {
  bookingId: string;
  serviceTitle: string;
  onClose: () => void;
  onRated: () => void;
};

export default function RatingModal({ bookingId, serviceTitle, onClose, onRated }: Props) {
  const t = useTranslations('VendorRating');
  const ts = useTranslations('VendorServices');
  const supabase = getSupabaseBrowserClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1 || rating > 5) {
      setError(t('chooseRating'));
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t('loginToRate'));
      return;
    }
    setSubmitting(true);
    const { error: dbError } = await supabase.from('vendor_booking_ratings').insert({
      booking_id: bookingId,
      learner_id: user.id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (dbError) {
      setError(t('ratingFailed'));
      return;
    }
    onRated();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-slate-800 rounded-xl ring-1 ring-slate-600 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t('rateBooking')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
            aria-label="close"
          >
            ×
          </button>
        </div>

        <div className="mt-2 text-sm text-slate-400">{serviceTitle}</div>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div>
            <div className="text-sm text-slate-300 mb-1">{t('chooseRating')}</div>
            <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  aria-label={`${n} star`}
                  className="text-2xl leading-none transition-colors"
                >
                  <span className={(hover || rating) >= n ? 'text-amber-400' : 'text-slate-600'}>
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1" htmlFor="rating-comment">
              {t('commentLabel')}
            </label>
            <textarea
              id="rating-comment"
              className="w-full p-2 rounded bg-slate-900 text-white border border-slate-600 focus:border-sky-500 focus:outline-none"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={400}
            />
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-700 text-slate-200 text-sm hover:bg-slate-600"
            >
              {ts('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-1.5 rounded bg-sky-600 text-white text-sm hover:bg-sky-500 disabled:opacity-50"
            >
              {t('submitRating')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}