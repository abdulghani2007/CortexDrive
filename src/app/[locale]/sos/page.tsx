'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

export default function SOSPage(){
  const supabase = getSupabaseBrowserClient();
  const t = useTranslations('SOS');
  const [sending,setSending]=useState(false);
  const [events,setEvents]=useState<any[]>([]);

  useEffect(()=>{
    let sub: any;
    async function init(){
      // subscribe to realtime sos_logs
      sub = supabase.channel('public:sos_logs').on('postgres_changes',{event:'INSERT',schema:'public',table:'sos_logs'},payload=>{
        setEvents(e=>[payload.new,...e]);
      }).subscribe();
    }
    init();
    return ()=>{ if (sub) supabase.removeChannel(sub); }
  },[]);

  async function sendSOS(){
    setSending(true);
    try{
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('errors.notSignedIn'));

      const loc = await getLocation();
      const { data, error } = await supabase.from('sos_logs').insert([{ user_id: user.id, lat: loc?.lat ?? null, lng: loc?.lng ?? null, note: t('note') }]);
      if (error) throw error;
      alert(t('sentAlert'));
    }catch(e:any){
      alert(t('failedAlert')+': '+(e.message||String(e)));
    }finally{ setSending(false); }
  }

  function getLocation(): Promise<{lat:number,lng:number}|null>{
    return new Promise((res)=>{
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude}),()=>res(null),{timeout:5000});
    });
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">{t('title')}</h1>
        <div className="mb-6">
          <button onClick={sendSOS} disabled={sending} className="w-full py-6 text-lg font-bold bg-red-600 text-white rounded shadow-lg hover:bg-red-700">
            {sending? t('sending') : t('send')}
          </button>
          <p className="text-sm text-neutral-400 mt-2">{t('subtitle')}</p>
        </div>

        <div>
          <h2 className="text-xl mb-2">{t('recent')}</h2>
          {events.length === 0 ? (
            <div className="text-sm text-neutral-400">{t('empty')}</div>
          ) : (
            <ul className="space-y-2">
              {events.map((ev,i)=> (
                <li key={i} className="p-3 bg-slate-800 rounded">
                  <div className="text-sm text-neutral-400">{ev.user_id} — {ev.note}</div>
                  <div className="text-sm text-neutral-400">{new Date(ev.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}