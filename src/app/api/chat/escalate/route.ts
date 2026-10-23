import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const body = await req.json();
  const conversation_id = body.conversation_id;
  if (!conversation_id) return NextResponse.json({ error: 'missing conversation_id' }, { status: 400 });
  const { data: session } = await supabase.auth.getSession();
  const user = session?.session?.user;
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // verify participant
  const part = await supabase.from('conversation_participants').select('*').eq('conversation_id', conversation_id).in('user_id', [user.id]).limit(1);
  if (part.error) return NextResponse.json({ error: part.error.message }, { status: 500 });
  if (!part.data || part.data.length === 0) return NextResponse.json({ error: 'not a participant' }, { status: 403 });

  // set escalated true
  const upd = await supabase.from('conversations').update({ escalated: true }).eq('id', conversation_id);
  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

  // add all admins as participants
  const admins = await supabase.from('admins').select('user_id');
  if (admins.error) return NextResponse.json({ error: admins.error.message }, { status: 500 });
  const rows = admins.data.map((a:any)=>({ conversation_id, user_id: a.user_id, is_admin: true }));
  if (rows.length>0) {
    const ins = await supabase.from('conversation_participants').upsert(rows, { onConflict: ['conversation_id','user_id'] });
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
