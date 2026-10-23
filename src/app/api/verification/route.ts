import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { verification_id, doc_url, selfie_url } = body;
    if (!verification_id || !doc_url || !selfie_url) {
      return NextResponse.json({ message: 'missing fields' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: 'not signed in' }, { status: 401 });
    }

    // Call the ai-verify Edge Function (holds the Gemini key) with the service role key
    const functionsUrl = `${(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')}/functions/v1/ai-verify`;
    let aiJson: any;
    try {
      const aiRes = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ doc_url, selfie_url }),
      });
      if (!aiRes.ok) throw new Error('edge function returned non-ok');
      aiJson = await aiRes.json();
    } catch {
      // AI outage must NEVER fail the user's submission — the row stays 'pending'
      // and admins handle it in the manual review queue.
      return NextResponse.json({ ai_unavailable: true });
    }

    const mapping: Record<string, string> = {
      verified: 'verified',
      needs_review: 'needs_review',
      rejected: 'rejected',
    };
    const aiDecision = aiJson.ai_decision ?? aiJson.aiDecision ?? null;
    const status = mapping[String(aiDecision)] ?? 'needs_review';

    const ocr = {
      full_name: aiJson.full_name ?? null,
      cnic_number: aiJson.cnic_number ?? null,
      dob: aiJson.dob ?? null,
    };

    // Owner-checked update: only the row belonging to the signed-in user is touched
    const updates: Record<string, unknown> = { status, ai_decision: aiDecision };
    if (aiJson.raw !== undefined) updates.ocr_payload = aiJson.raw;
    if (aiJson.face_match_score !== undefined) updates.face_match_score = aiJson.face_match_score;

    let missing_columns: string[] | undefined;
    try {
      const { error: updateError } = await supabase
        .from('verifications')
        .update(updates)
        .eq('id', verification_id)
        .eq('user_id', user.id)
        .select()
        .limit(1);
      if (updateError) throw updateError;
    } catch {
      // Optional columns (ocr_payload / face_match_score) may not exist on the
      // live table yet — still record the status so the flow completes.
      const { error: retryError } = await supabase
        .from('verifications')
        .update({ status })
        .eq('id', verification_id)
        .eq('user_id', user.id)
        .select()
        .limit(1);
      if (retryError) {
        return NextResponse.json({ message: retryError.message }, { status: 500 });
      }
      missing_columns = ['ocr_payload', 'face_match_score'];
    }

    return NextResponse.json({
      status,
      face_match_score: aiJson.face_match_score ?? null,
      ocr,
      ...(missing_columns ? { missing_columns } : {}),
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
