"use client";

import React, { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function OnboardingWizard() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState<'en'|'ur'|'roman_ur'>('en');
  const [role, setRole] = useState<string>('learner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(()=>{
    (async ()=>{
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) { router.push('/signin'); return; }
      // fetch profile
      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (profile) {
        setFullName(profile.full_name || '');
        setCity(profile.city || '');
        setLanguage(profile.language || 'en');
        setRole(profile.role || 'learner');
      }
    })();
  },[]);

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault();
    setLoading(true); setError(null);
    const { data, error } = await supabase.from('users').upsert({
      id: (await supabase.auth.getSession()).data.session?.user.id,
      full_name: fullName,
      city,
      language,
      role,
      onboarded: true
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-slate-900 text-slate-100 rounded">
      <h2 className="text-2xl mb-4" style={{color:'var(--cd-primary)'}}>Onboarding</h2>
      {error && <div className="mb-2 text-red-400">{error}</div>}
      <label className="block mb-2">Full name
        <input className="w-full p-2 mt-1 rounded bg-slate-800" value={fullName} onChange={e=>setFullName(e.target.value)} />
      </label>
      <label className="block mb-2">City
        <input className="w-full p-2 mt-1 rounded bg-slate-800" value={city} onChange={e=>setCity(e.target.value)} />
      </label>
      <label className="block mb-2">Language
        <select className="w-full p-2 mt-1 rounded bg-slate-800" value={language} onChange={e=>setLanguage(e.target.value as any)}>
          <option value="en">English</option>
          <option value="ur">Urdu</option>
          <option value="roman_ur">Roman Urdu</option>
        </select>
      </label>
      <label className="block mb-2">Role
        <input className="w-full p-2 mt-1 rounded bg-slate-800" value={role} disabled />
      </label>
      <button disabled={loading} className="w-full p-2 mt-4 rounded bg-teal-500 text-slate-900" type="submit">Finish</button>
    </form>
  );
}