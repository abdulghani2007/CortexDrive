'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';


export default function MessageButton({ instructorId }: { instructorId: string }) {
  const router = useRouter();
  const locale = useLocale();
  const supabase = getSupabaseBrowserClient();

  async function handleMessage(e: React.MouseEvent) {
    e.preventDefault();
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;
    if (!user) {
      router.push(`/${locale}/signin`);
      return;
    }
    try {
      const res = await fetch(`/api/chat/open`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ other_user_id: instructorId }),
      });
      if (!res.ok) throw new Error('open failed');
      const json = await res.json();
      router.push(`/${locale}/chat/${json.conversation_id}`);
    } catch (err) {
      console.error(err);
      alert('Could not open conversation');
    }
  }

  return (
    <button onClick={handleMessage} className="px-3 py-1 bg-sky-500 text-white rounded">Message</button>
  );
}
