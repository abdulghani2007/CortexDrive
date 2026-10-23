import Link from 'next/link';
import InstructorCard from '@/modules/marketplace/components/InstructorCard';
import BackButton from '@/components/BackButton';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function Marketplace() {
  const cities = ['Lahore','Karachi','Islamabad','Rawalpindi','Faisalabad','Peshawar','Multan'];
  const supabase = await getSupabaseServerClient(); if (!supabase?.auth) throw new Error('Supabase init failed');

  let profiles: any[] | null = null;
  try {
    const { data } = await supabase.from('users').select('id,full_name,city,hourly_rate').eq('role','instructor').limit(50);
    profiles = data as any[] | null;
  } catch (e) {
    console.warn('Supabase query failed in marketplace page (likely missing env or migration):', e);
  }

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Instructors</h1>
        </header>
        <BackButton/>
        <p className="mt-4 text-muted">Browse instructors by city, verification status, and rating.</p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(profiles ?? cities.map((c)=>({ user_id: c, full_name: c, city: c, verification_status:'unverified', hourly_rate:0 }))).map((p:any) => (
            <InstructorCard key={p.id ?? p.user_id} profile={{ user_id: p.id ?? p.user_id, full_name: p.full_name ?? '—', city: p.city ?? '—', hourly_rate: p.hourly_rate ?? 0, verification_status: 'unverified' }} />
          ))}
        </div>
      </div>
    </main>
  );
}