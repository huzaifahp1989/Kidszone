import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPassStatus } from '@/lib/seerah-course';

const clampMark = (value: any) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(20, Math.round(n)));
};

const toFinalScore = (row: any) => {
  if (Array.isArray(row?.manual_marks) && row.manual_marks.length > 0) {
    return row.manual_marks.reduce((sum: number, v: number) => sum + Number(v || 0), 0);
  }
  return Number(row?.final_score ?? row?.auto_score ?? 0);
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = String(searchParams.get('format') || '').toLowerCase();

    const { data, error } = await supabaseAdmin
      .from('seerah_quiz_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ setupRequired: true, submissions: [], leaderboard: [] }, { status: 503 });
      }
      throw error;
    }

    const submissions = (data || []).map((row: any) => {
      const finalScore = toFinalScore(row);
      return {
        ...row,
        finalScore,
        status: getPassStatus(finalScore),
      };
    });

    const byUser = new Map<string, { userId: string; userName: string; email: string; totalScore: number; passedChapters: number; submittedChapters: number }>();
    for (const row of submissions) {
      const uid = String(row.user_id || '');
      if (!uid) continue;
      const existing = byUser.get(uid) || {
        userId: uid,
        userName: row.user_name || 'Learner',
        email: row.email || '',
        totalScore: 0,
        passedChapters: 0,
        submittedChapters: 0,
      };
      existing.totalScore += Number(row.finalScore || 0);
      existing.submittedChapters += 1;
      if (row.status === 'passed') existing.passedChapters += 1;
      byUser.set(uid, existing);
    }

    const leaderboard = Array.from(byUser.values())
      .map((row) => ({
        ...row,
        averageScore: row.submittedChapters > 0 ? Math.round(row.totalScore / row.submittedChapters) : 0,
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    if (format === 'csv') {
      const header = [
        'user_id',
        'user_name',
        'email',
        'chapter_number',
        'submitted_at',
        'auto_score',
        'final_score',
        'status',
      ];

      const lines = submissions.map((row) => [
        row.user_id,
        JSON.stringify(row.user_name || ''),
        JSON.stringify(row.email || ''),
        row.chapter_number,
        row.submitted_at,
        row.auto_score,
        row.finalScore,
        row.status,
      ].join(','));

      const csv = [header.join(','), ...lines].join('\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="seerah-submissions.csv"',
        },
      });
    }

    return NextResponse.json({ submissions, leaderboard });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || '').trim();
    const manualMarksRaw = Array.isArray(body?.manualMarks) ? body.manualMarks : null;
    const adminNotes = typeof body?.adminNotes === 'string' ? body.adminNotes : undefined;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = { reviewed_at: new Date().toISOString() };

    if (manualMarksRaw) {
      const marks: number[] = manualMarksRaw.slice(0, 5).map(clampMark);
      const finalScore = marks.reduce((sum: number, v: number) => sum + v, 0);
      updatePayload.manual_marks = marks;
      updatePayload.final_score = finalScore;
      updatePayload.status = getPassStatus(finalScore);
    }

    if (adminNotes !== undefined) {
      updatePayload.admin_notes = adminNotes;
    }

    const { data, error } = await supabaseAdmin
      .from('seerah_quiz_submissions')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    const finalScore = toFinalScore(data);
    return NextResponse.json({
      submission: {
        ...data,
        finalScore,
        status: getPassStatus(finalScore),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
