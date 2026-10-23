import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const userCooldowns = new Map(); // in-memory 5s cooldown per user

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const body = await req.json();
  const { conversation_id, body: text } = body;
  const { data: session } = await supabase.auth.getSession();
  const user = session?.session?.user;
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (!conversation_id || !text) return NextResponse.json({ error: 'missing params' }, { status: 400 });

  // cooldown
  const last = userCooldowns.get(user.id) || 0;
  if (Date.now() - last < 5000) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  userCooldowns.set(user.id, Date.now());

  // insert message
  const insert = await supabase.from('conversation_messages').insert({ conversation_id, sender_id: user.id, body: text }).select();
  if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 500 });
  // update conversation last_message_at
  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation_id);
  return NextResponse.json({ message: insert.data?.[0] });
}

export async function GET(req: Request) {
  const supabase = await getSupabaseServerClient();
  const url = new URL(req.url);
  const conversation_id = url.searchParams.get('conversation_id');
  if (!conversation_id) return NextResponse.json({ error: 'missing conversation_id' }, { status: 400 });
  const { data: session } = await supabase.auth.getSession();
  const user = session?.session?.user;
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // select messages and join sender profile
  const messages = await supabase.from('conversation_messages').select('*').eq('conversation_id', conversation_id).order('created_at', { ascending: true });
  if (messages.error) return NextResponse.json({ error: messages.error.message }, { status: 500 });
  const senderIds = Array.from(new Set(messages.data.map((m: any) => m.sender_id)));
  let profilesMap: Record<string, any> = {};
  if (senderIds.length > 0) {
    const profiles = await supabase.from('profiles').select('id, full_name, city').in('id', senderIds);
    if (!profiles.error && profiles.data) {
      profiles.data.forEach((p: any) => { profilesMap[p.id] = p; });
    }
  }
  const items = messages.data.map((m: any) => ({ ...m, sender: profilesMap[m.sender_id] || null }));
  return NextResponse.json({ items });
}
