import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import {
  ageGroupFromAge,
  challengeMatchesAgeGroup,
  moderateStoryText,
  validateStory,
  wordCount,
} from '@/lib/story-writing';
import { isMissingTableError, loadChildInfo, mapStory } from '@/lib/story-writing-server';

export const dynamic = 'force-dynamic';

const EDITABLE = ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'];
const MAX_OPEN_SUBMISSIONS = 10;
const NO_ID = '00000000-0000-0000-0000-000000000000';

export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Please sign in to write stories.' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('story_submissions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    const missing = isMissingTableError(error);
    return NextResponse.json({ error: error.message, setupRequired: missing }, { status: missing ? 503 : 500 });
  }
  return NextResponse.json({ stories: (data || []).map((row) => mapStory(row)) });
}

/** Create or update a story. Children can only save drafts or submit for review; points are never awarded here. */
export async function POST(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Please sign in to write stories.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action === 'submit' ? 'submit' : 'save';
  const input = {
    title: String(body.title ?? ''),
    content: String(body.content ?? ''),
    islamicLesson: String(body.islamicLesson ?? ''),
    category: body.category ? String(body.category) : null,
    challengeId: body.challengeId ? String(body.challengeId) : null,
  };

  const errors = validateStory(input, action === 'submit' ? 'submit' : 'draft');
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  await ensureUserRecords(user.id);
  const { data: profile } = await supabaseAdmin.from('users').select('age').eq('uid', user.id).maybeSingle();
  const ageGroup = ageGroupFromAge(profile?.age);

  if (input.challengeId) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: challenge } = await supabaseAdmin
      .from('story_challenges')
      .select('id, age_group, start_date, end_date, is_active')
      .eq('id', input.challengeId)
      .maybeSingle();
    const usable =
      challenge &&
      challenge.is_active &&
      challenge.start_date <= today &&
      challenge.end_date >= today &&
      challengeMatchesAgeGroup(challenge.age_group, ageGroup);
    if (!usable) return NextResponse.json({ error: 'That challenge is not available right now.' }, { status: 400 });
  }

  const storyId = body.id ? String(body.id) : null;
  const now = new Date().toISOString();
  const flags = action === 'submit' ? moderateStoryText(input.title, input.content, input.islamicLesson) : [];

  const fields = {
    title: input.title.trim(),
    content: input.content.trim(),
    islamic_lesson: input.islamicLesson.trim(),
    category: input.category,
    challenge_id: input.challengeId,
    word_count: wordCount(input.content),
    age_group: ageGroup,
    updated_at: now,
    ...(action === 'submit'
      ? { status: 'PENDING', submitted_at: now, moderation_flags: flags, is_flagged: flags.length > 0 }
      : {}),
  };

  if (action === 'submit') {
    const { count } = await supabaseAdmin
      .from('story_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'PENDING')
      .neq('id', storyId ?? NO_ID);
    if ((count ?? 0) >= MAX_OPEN_SUBMISSIONS) {
      return NextResponse.json(
        { error: 'You have lots of stories waiting for review. Please wait for the admin to review them first.' },
        { status: 429 }
      );
    }
  }

  let row: Record<string, unknown> | null = null;

  if (storyId) {
    const { data: existing } = await supabaseAdmin
      .from('story_submissions')
      .select('id, user_id')
      .eq('id', storyId)
      .maybeSingle();
    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }

    // The status guard lives in the UPDATE itself so a story approved mid-request is never overwritten.
    const { data, error } = await supabaseAdmin
      .from('story_submissions')
      .update(fields)
      .eq('id', storyId)
      .eq('user_id', user.id)
      .in('status', EDITABLE)
      .select('*')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'This story can no longer be edited.' }, { status: 409 });
    row = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('story_submissions')
      .insert({ user_id: user.id, status: 'DRAFT', ...fields })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    row = data;
  }

  const child = (await loadChildInfo([user.id])).get(user.id);
  return NextResponse.json({
    story: mapStory(row!, child),
    message:
      action === 'submit'
        ? 'Your story has been submitted for review. An admin will review it and award points if approved.'
        : 'Draft saved!',
  });
}
