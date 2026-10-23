import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import BackButton from '@/components/BackButton';
import dynamic from 'next/dynamic';

const FuelChart = dynamic(() => import('@/components/FuelChart'), { ssr: false });

export default async function VehiclePage({ params }: { params: { locale: string } }) {
  const supabase = await getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/${params.locale}/signin`);
  const user = session.user;

  const { data: logs } = await supabase
    .from('vehicle_logs')
    .select('id,event_type,amount_pkr,odometer_km,liters,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const entries = (logs || []).map((l: any) => ({
    id: l.id,
    event_type: l.event_type || 'fuel',
    amount_pkr: l.amount_pkr ?? null,
    odometer_km: l.odometer_km ?? null,
    liters: l.liters ?? null,
    created_at: l.created_at
  }));

  // compute kmPerLiter: when liters >0 and previous odometer exists
  const fuelEntries = entries.filter((e:any)=> e.liters && e.odometer_km).map((e:any)=> ({...e, odometer_km: Number(e.odometer_km), liters: Number(e.liters)}));
  const chartData: { date: string; kmPerLiter: number }[] = [];
  for (let i = 1; i < fuelEntries.length; i++){
    const prev = fuelEntries[i-1];
    const cur = fuelEntries[i];
    const dist = cur.odometer_km - prev.odometer_km;
    if (dist > 0 && cur.liters > 0){
      chartData.push({ date: new Date(cur.created_at).toISOString().slice(0,10), kmPerLiter: Math.round((dist/cur.liters)*100)/100 });
    }
  }

  // totals
  const totalLiters = fuelEntries.reduce((s:any,e:any)=> s + (e.liters||0), 0);
  const totalKm = (()=>{ if (entries.length===0) return 0; const first = entries[0].odometer_km||0; const last = entries[entries.length-1].odometer_km||0; return (Number(last) - Number(first)) || 0; })();
  const avgKmPerLiter = totalLiters > 0 ? Math.round((totalKm/totalLiters)*100)/100 : 0;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto bg-slate-800 p-6 rounded text-white">
        <BackButton />
        <h1 className="text-2xl">Vehicle</h1>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-700 rounded">
            <div className="text-sm text-slate-300">Total KM</div>
            <div className="text-xl font-semibold">{totalKm}</div>
          </div>
          <div className="p-3 bg-slate-700 rounded">
            <div className="text-sm text-slate-300">Total Liters</div>
            <div className="text-xl font-semibold">{totalLiters}</div>
          </div>
          <div className="p-3 bg-slate-700 rounded">
            <div className="text-sm text-slate-300">Avg km/L</div>
            <div className="text-xl font-semibold">{avgKmPerLiter}</div>
          </div>
        </div>

        <div className="mt-6 bg-slate-700 p-4 rounded">
          <h2 className="font-semibold">Fuel efficiency</h2>
          <div className="mt-2">
            {/* @ts-ignore */}
            <FuelChart data={chartData} />
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold">Logs</h2>
          <ul className="mt-3 space-y-2">
            {entries.map((e:any)=> (
              <li key={e.id} className="p-3 bg-slate-700 rounded">
                <div className="text-sm text-slate-300">{new Date(e.created_at).toLocaleString()}</div>
                <div className="mt-1">Type: {e.event_type}</div>
                <div>Odometer: {e.odometer_km ?? '—'} km</div>
                <div>Liters: {e.liters ?? '—'}</div>
                <div>Amount: {e.amount_pkr ?? '—'}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
