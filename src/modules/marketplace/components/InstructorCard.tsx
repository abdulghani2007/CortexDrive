'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type Database from '@/types/database';
import MessageButton from './MessageButton';

export default function InstructorCard({ profile }: { profile: Database['public']['Tables']['profiles']['Row'] }) {
  const locale = useLocale();
  const rating = (profile.avg_rating ?? 0).toFixed(1);
  return (
    <div className="block p-4 border rounded hover:shadow">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{profile.full_name ?? 'Instructor'}</h3>
            <div className="text-sm text-muted">{profile.city}</div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">{profile.verification_status}</span>
            <span className="text-sm">⭐ {rating}</span>
            <span className="ml-auto font-semibold">PKR {profile.hourly_rate ?? '0'}/hr</span>
          </div>
        </div>
        <div className="ml-4">
          {/* Message CTA */}
          {/* dynamic import to avoid server-side error */}
          <MessageButton instructorId={profile.user_id} />
        </div>
      </div>
    </div>
  );
}