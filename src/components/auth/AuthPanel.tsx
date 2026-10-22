"use client";

import React, { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';

type Mode = 'signin' | 'signup';
type AuthRole = 'learner' | 'instructor' | 'vendor';

export default function AuthPanel({
  mode = 'signin',
  admin = false,
  initialRole = 'learner',
}: {
  mode?: Mode;
  admin?: boolean;
  initialRole?: AuthRole;
}) {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const locale = useLocale();

  const [activeMode, setActiveMode] = useState<Mode>(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AuthRole>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please fill in both email and password.');
      return;
    }
    if (activeMode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setBusy(true);
    try {
      if (activeMode === 'signup') {
        // The DB trigger handle_new_user creates the public.users profile row.
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim(), role } },
        });
        if (signUpError) { setError(signUpError.message); return; }
        router.push(`/${locale}/dashboard`);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.session) {
        setError(signInError?.message || 'Invalid email or password.');
        return;
      }
      if (admin) {
        const { data: adminRow } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', data.session.user.id)
          .maybeSingle();
        if (!adminRow) {
          await supabase.auth.signOut();
          setError('This account is not an admin.');
          return;
        }
        router.push(`/${locale}/admin`);
        return;
      }
      router.push(`/${locale}/dashboard`);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-slate-900 text-slate-100 rounded border border-slate-800">
      <h2 className="text-2xl mb-4" style={{ color: 'var(--cd-primary)' }}>
        {admin ? 'Admin Login' : activeMode === 'signin' ? 'Sign in' : 'Create account'}
      </h2>

      {!admin && (
        <div className="flex mb-4 rounded overflow-hidden border border-slate-700">
          <button
            type="button"
            onClick={() => { setActiveMode('signin'); setError(null); }}
            className={`flex-1 px-4 py-2 text-sm ${activeMode === 'signin' ? 'bg-electric-cyan text-dark-slate' : 'bg-slate-800 text-slate-300'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('signup'); setError(null); }}
            className={`flex-1 px-4 py-2 text-sm ${activeMode === 'signup' ? 'bg-electric-cyan text-dark-slate' : 'bg-slate-800 text-slate-300'}`}
          >
            Create account
          </button>
        </div>
      )}

      {error && <div className="mb-3 text-red-400 text-sm" role="alert">{error}</div>}

      <form onSubmit={handleSubmit}>
        {activeMode === 'signup' && (
          <>
            <label className="block mb-2 text-sm">Full name
              <input className="w-full p-2 mt-1 rounded bg-slate-800" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="block mb-2 text-sm">I am a
              <select className="w-full p-2 mt-1 rounded bg-slate-800" value={role} onChange={(e) => setRole(e.target.value as AuthRole)}>
                <option value="learner">Learner</option>
                <option value="instructor">Instructor</option>
                <option value="vendor">Vendor</option>
              </select>
            </label>
          </>
        )}
        <label className="block mb-2 text-sm">Email
          <input className="w-full p-2 mt-1 rounded bg-slate-800" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="block mb-2 text-sm">Password
          <input type="password" className="w-full p-2 mt-1 rounded bg-slate-800" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={activeMode === 'signup' ? 'new-password' : 'current-password'} />
        </label>
        <button className="w-full p-2 mt-4 rounded bg-electric-cyan text-dark-slate disabled:opacity-50" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : activeMode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      {!admin && activeMode === 'signin' && (
        <p className="mt-4 text-sm text-slate-400">
          Don&apos;t have an account?{' '}
          <button type="button" className="underline" style={{ color: 'var(--cd-primary)' }} onClick={() => { setActiveMode('signup'); setError(null); }}>
            Sign up
          </button>
        </p>
      )}
      {admin && (
        <p className="mt-4 text-sm text-slate-400">
          <Link className="underline" style={{ color: 'var(--cd-primary)' }} href={`/${locale}/signin`}>Back to user sign in</Link>
        </p>
      )}
    </div>
  );
}