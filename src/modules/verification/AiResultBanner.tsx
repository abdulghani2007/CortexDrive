import React from 'react';
import type { AiResult } from './types';
import { useTranslations } from 'next-intl';

export default function AiResultBanner({ result }: { result: AiResult | null }) {
  const t = useTranslations('Verification');
  if (!result) return null;
  if (result.ai_unavailable) return <div className="p-3 rounded bg-amber-100 text-amber-800">{t('aiResult.unavailable')}</div>;
  if (result.status === 'verified') return <div className="p-3 rounded bg-emerald-100 text-emerald-800">{t('aiResult.verified', { score: `${Math.round((result.face_match_score ?? 0) * 100)}%` })}</div>;
  if (result.status === 'needs_review') return <div className="p-3 rounded bg-amber-100 text-amber-800">{t('aiResult.needsReview')}</div>;
  if (result.status === 'rejected') return <div className="p-3 rounded bg-red-100 text-red-800">{t('aiResult.rejected')}</div>;
  return null;
}
