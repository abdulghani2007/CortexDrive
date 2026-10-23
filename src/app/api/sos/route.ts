import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request){
  const server = await getSupabaseServerClient();
  const body = await req.json();
  const user = (await server.auth.getUser()).data.user;
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status:401 });
  const { lat = null, lng = null } = body || {};
  const payload = { user_id: user.id, lat, lng, created_at: new Date().toISOString() };
  const { data, error } = await server.from('sos_logs').insert(payload).select('*');
  if (error) return NextResponse.json({ error: error.message }, { status:500 });
  return NextResponse.json({ sos: data });
}
