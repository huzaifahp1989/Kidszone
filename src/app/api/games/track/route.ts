import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, gameId, gameTitle, pointsEarned, difficulty, tasksPlayed } = body || {};

    if (!userId || !gameId) {
      return NextResponse.json({ error: 'userId and gameId are required' }, { status: 400 });
    }

    const payload = {
      user_id: userId,
      game_id: String(gameId),
      game_title: gameTitle ? String(gameTitle) : 'Game',
      points_earned: Number(pointsEarned || 0),
      difficulty: difficulty ? String(difficulty) : null,
      tasks_played: Number(tasksPlayed || 0),
      played_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from('game_activity_logs').insert(payload);

    if (error) {
      // If the table does not exist yet, don't fail gameplay.
      return NextResponse.json({ ok: false, warning: error.message }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
