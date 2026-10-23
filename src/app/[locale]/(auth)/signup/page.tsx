'use client';
import BackButton from '@/components/BackButton';
import AuthPanel from '@/components/auth/AuthPanel';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

export default function SignUpPage(){
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  useEffect(()=>{
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).maybeSingle();
          const role = profile?.role || 'learner';
          if (role === 'admin') router.push('/en/admin');
          else if (role === 'vendor') router.push('/en/vendor');
          else if (role === 'instructor') router.push('/en/instructor');
          else router.push('/en/dashboard');
        } catch {
          router.push('/en/dashboard');
        }
      }
    });
    return () => subscription.unsubscribe();
  },[]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <BackButton />
      <AuthPanel mode="signup" />
    </div>
  );
}