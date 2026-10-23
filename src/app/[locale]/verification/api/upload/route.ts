import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request, { params }: any) {
  const server = await getSupabaseServerClient();
  const form = await req.formData();
  const file = form.get('file') as any;
  const keyPrefix = (form.get('key_prefix') as string) || 'verifications/unknown';
  if (!file || !file.stream) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name}`;
  const path = `${keyPrefix}/${filename}`;
  const bucket = 'verifications';

  const { data, error } = await server.storage.from(bucket).upload(path, buffer, { upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // return storage path (data.path) so client can reference it
  return NextResponse.json({ path: data?.path });
}
