'use client';
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type Point = { date: string; kmPerLiter: number };
export default function FuelChart({ data }: { data: Point[] }){
  return (
    <div style={{ width: '100%', height: 250 }} className="text-white">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="#273449" />
          <XAxis dataKey="date" stroke="#cbd5e1" />
          <YAxis stroke="#cbd5e1" />
          <Tooltip wrapperStyle={{ background: '#0f172a', borderRadius: 6, color: '#fff' }} />
          <Line type="monotone" dataKey="kmPerLiter" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
