import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const body = await req.json();
  const other = body.other_user_id;
  const { data: session } = await supabase.auth.getSession();
  const user = session?.session?.user;
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!other) return NextResponse.json({ error: 'missing other_user_id' }, { status: 400 });

  // call RPC to get or create conversation
  const rpc = await supabase.rpc('get_or_create_conversation', { p_user_a: user.id, p_user_b: other });
  if (rpc.error) return NextResponse.json({ error: rpc.error.message }, { status: 500 });
  const conversation_id = rpc.data;
  return NextResponse.json({ conversation_id });
}
