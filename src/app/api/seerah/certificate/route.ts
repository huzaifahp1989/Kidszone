import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get('userId') || '').trim();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { data: cert, error } = await supabaseAdmin
      .from('seerah_certificates')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Certificate table not set up yet.' }, { status: 503 });
      }
      throw error;
    }

    if (!cert) {
      return NextResponse.json({ error: 'Certificate not available yet. Complete all chapters and pass quizzes first.' }, { status: 403 });
    }

    const issuedAt = cert.issued_at ? new Date(cert.issued_at).toLocaleString() : new Date().toLocaleString();
    const studentName = cert.user_name || 'Learner';

    const certificateText = [
      'Seerah of Prophet Muhammad ﷺ Course Completion',
      '=============================================',
      '',
      `This certifies that ${studentName}`,
      'has successfully completed all five Seerah chapters and chapter quizzes.',
      '',
      `Certificate ID: ${cert.id}`,
      `Issued At: ${issuedAt}`,
      '',
      'May Allah increase beneficial knowledge and righteous action. Ameen.',
    ].join('\n');

    return new NextResponse(certificateText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="seerah-certificate-${cert.id}.txt"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
