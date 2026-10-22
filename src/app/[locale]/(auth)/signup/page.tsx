'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthPanel from '@/components/auth/AuthPanel';
import BackButton from '@/components/BackButton';

function SignUpContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const initialRole =
    roleParam === 'instructor' || roleParam === 'vendor' || roleParam === 'learner'
      ? roleParam
      : 'learner';

  return (
    <div className="max-w-md mx-auto">
      <BackButton />
      <AuthPanel mode="signup" initialRole={initialRole} />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
        <SignUpContent />
      </div>
    </Suspense>
  );
}