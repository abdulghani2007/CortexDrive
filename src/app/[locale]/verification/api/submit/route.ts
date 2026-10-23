import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request){
  const body = await req.json();
  const server = await getSupabaseServerClient();
  const user = (await server.auth.getUser()).data.user;
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { doc_type, cnic_path, license_path, external_url } = body;
  if (!doc_type || (!cnic_path && !license_path && !external_url)) return NextResponse.json({ error: 'Missing' }, { status: 400 });

  const payload = {
    user_id: user.id,
    doc_type,
    doc_url: cnic_path || license_path || external_url,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await server.from('verifications').insert(payload).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verification: data });
}
