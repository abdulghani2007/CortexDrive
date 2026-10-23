import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const userCooldowns = new Map();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, locale } = body;
    if (!message) return NextResponse.json({ error: 'missing message' }, { status: 400 });

const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip') || 'anon';
    const last = userCooldowns.get(ip) || 0;
    if (Date.now() - last < 5000) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    userCooldowns.set(ip, Date.now());

const googleKey = process.env.GOOGLE_API_KEY;
    if (!googleKey) {
      return NextResponse.json({ answer: `[MOCK ANSWER] ${message}`, mock: true });
    }

const systemInstruction = locale === 'ur'
      ? 'You are a helpful driving instructor in Pakistan. Answer in Urdu.'
      : locale === 'roman_ur'
        ? 'You are a helpful driving instructor in Pakistan. Answer in Roman Urdu (Latin script).'
        : 'You are a helpful driving instructor in Pakistan. Answer in English.';

// Gemini generateContent payload — NOT the PaLM {prompt:{text}} shape
    const payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
    };

const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': googleKey },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ error: 'provider_error', detail: txt }, { status: 502 });
    }
    const json = await res.json();
    const answer = json?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || '').join('') || '';
    return NextResponse.json({ answer: answer || '[NO_ANSWER]', mock: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
