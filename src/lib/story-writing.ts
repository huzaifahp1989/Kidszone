/**
 * Islamic Story Writing Challenge — shared constants and pure helpers.
 * Points are NOT tracked here: approved story points are applied to the existing
 * Kids Zone points tables (users_points / users) by the story_apply_review SQL function.
 */

export const STORY_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] as const;
export type StoryStatus = (typeof STORY_STATUSES)[number];

export const STORY_STATUS_LABELS: Record<StoryStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CHANGES_REQUESTED: 'Changes Requested',
};

export const STORY_CATEGORIES = [
  { value: 'prophets', label: 'Prophets', icon: '🕌' },
  { value: 'sahabah', label: 'Sahabah', icon: '🌟' },
  { value: 'good-manners', label: 'Good Manners', icon: '😊' },
  { value: 'salah', label: 'Salah', icon: '🤲' },
  { value: 'quran', label: 'Quran', icon: '📖' },
  { value: 'helping-others', label: 'Helping Others', icon: '🤝' },
  { value: 'honesty', label: 'Honesty', icon: '💎' },
  { value: 'kindness', label: 'Kindness', icon: '💖' },
  { value: 'respect-parents', label: 'Respect Parents', icon: '👨‍👩‍👧' },
  { value: 'ramadan', label: 'Ramadan', icon: '🌙' },
  { value: 'charity', label: 'Charity', icon: '🎁' },
  { value: 'patience', label: 'Patience', icon: '⏳' },
  { value: 'forgiveness', label: 'Forgiveness', icon: '🕊️' },
  { value: 'general', label: 'General Islamic Story', icon: '✨' },
] as const;

export type StoryCategory = (typeof STORY_CATEGORIES)[number]['value'];

export function isStoryCategory(value: unknown): value is StoryCategory {
  return STORY_CATEGORIES.some((category) => category.value === value);
}

export function categoryLabel(value: string | null | undefined): string {
  return STORY_CATEGORIES.find((category) => category.value === value)?.label ?? 'General Islamic Story';
}

export const STORY_LIMITS = {
  titleMax: 100,
  contentMin: 50,
  contentMax: 6000,
  lessonMin: 10,
  lessonMax: 500,
  illustrationMaxBytes: 4 * 1024 * 1024,
} as const;

export const ILLUSTRATION_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Suggested admin point components. Admin can still type any total; only the chosen total is awarded. */
export const POINT_COMPONENTS = [
  { key: 'approved', label: 'Story approved', points: 25 },
  { key: 'excellent', label: 'Excellent story', points: 25 },
  { key: 'creative', label: 'Creative story', points: 10 },
  { key: 'lesson', label: 'Strong Islamic lesson', points: 10 },
  { key: 'reference', label: 'Good Quran/Hadith reference', points: 15 },
  { key: 'illustration', label: 'Illustration', points: 10 },
  { key: 'submitted', label: 'Story submitted', points: 5 },
] as const;

export type PointComponentKey = (typeof POINT_COMPONENTS)[number]['key'];

export const DEFAULT_APPROVAL_POINTS = 25;
export const MAX_STORY_POINTS = 200;

export function isPointComponentKey(value: unknown): value is PointComponentKey {
  return POINT_COMPONENTS.some((component) => component.key === value);
}

export function sanitizeBreakdown(value: unknown): PointComponentKey[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(isPointComponentKey)));
}

export function sumComponents(keys: PointComponentKey[]): number {
  return keys.reduce((sum, key) => sum + (POINT_COMPONENTS.find((c) => c.key === key)?.points ?? 0), 0);
}

export function clampStoryPoints(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_STORY_POINTS);
}

export function wordCount(text: string): number {
  const trimmed = String(text || '').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export type StoryDraftInput = {
  title: string;
  content: string;
  islamicLesson: string;
  category: string | null;
  challengeId: string | null;
};

/** Drafts only need a title; submission needs the full story. */
export function validateStory(input: StoryDraftInput, mode: 'draft' | 'submit'): string[] {
  const errors: string[] = [];
  const title = input.title.trim();
  const content = input.content.trim();
  const lesson = input.islamicLesson.trim();

  if (!title) errors.push('Please give your story a title.');
  if (title.length > STORY_LIMITS.titleMax) errors.push(`Title must be ${STORY_LIMITS.titleMax} characters or fewer.`);
  if (content.length > STORY_LIMITS.contentMax) errors.push(`Story must be ${STORY_LIMITS.contentMax} characters or fewer.`);
  if (lesson.length > STORY_LIMITS.lessonMax) errors.push(`Islamic lesson must be ${STORY_LIMITS.lessonMax} characters or fewer.`);
  if (input.category && !isStoryCategory(input.category)) errors.push('Please choose a valid category.');

  if (mode === 'submit') {
    if (content.length < STORY_LIMITS.contentMin) {
      errors.push(`Your story needs at least ${STORY_LIMITS.contentMin} characters.`);
    }
    if (lesson.length < STORY_LIMITS.lessonMin) {
      errors.push('Please tell us the Islamic lesson or message of your story.');
    }
  }
  return errors;
}

export function ageGroupFromAge(age: unknown): string {
  const n = Number(age);
  if (!Number.isFinite(n) || n <= 0) return 'all';
  if (n <= 7) return '5-7';
  if (n <= 10) return '8-10';
  return '11-14';
}

/** Challenges for 'all' apply to everyone; otherwise the child's age group must match. */
export function challengeMatchesAgeGroup(challengeAgeGroup: string | null | undefined, childAgeGroup: string): boolean {
  const group = String(challengeAgeGroup || 'all');
  return group === 'all' || childAgeGroup === 'all' || group === childAgeGroup;
}

/** Child-safe public name: username, else first name only, else a generic label. Never email or full name. */
export function publicDisplayName(user: { username?: unknown; name?: unknown } | null | undefined): string {
  const username = String(user?.username ?? '').trim();
  if (username && !username.includes('@')) return username.slice(0, 30);
  const first = String(user?.name ?? '').trim().split(/\s+/)[0] ?? '';
  if (first && !first.includes('@') && !/^learner$/i.test(first) && !/^user[-_]/i.test(first)) return first.slice(0, 30);
  return 'Young Writer';
}

// ---------- Content moderation ----------

export type ModerationFlag =
  | 'inappropriate_language'
  | 'bullying'
  | 'personal_information'
  | 'phone_number'
  | 'address'
  | 'unsafe_content'
  | 'non_islamic_content';

export const MODERATION_FLAG_LABELS: Record<ModerationFlag, string> = {
  inappropriate_language: 'Inappropriate language',
  bullying: 'Bullying',
  personal_information: 'Personal information',
  phone_number: 'Phone number',
  address: 'Address',
  unsafe_content: 'Unsafe content',
  non_islamic_content: 'Non-Islamic / inappropriate content',
};

const BAD_WORDS = ['fuck', 'shit', 'bitch', 'bastard', 'asshole', 'damn', 'crap', 'slut', 'dick', 'piss', 'wtf'];
const BULLYING_PATTERNS = [
  /\byou(?:'re| are)\s+(?:so\s+)?(?:stupid|ugly|fat|dumb|useless|worthless|a loser)\b/,
  /\bnobody likes you\b/,
  /\bkill yourself\b/,
  /\bi hate (?:you|him|her|them)\b/,
  /\b(?:shut up|loser|idiot|moron)\b/,
];
const UNSAFE_PATTERNS = [
  /\b(?:gun|knife|bomb|weapon|murder|suicide|self[- ]harm|drugs?|cocaine|heroin|alcohol|vodka|cigarette)s?\b/,
  /\b(?:kidnap|abuse|rape|naked)\b/,
];
const NON_ISLAMIC_PATTERNS = [
  /\b(?:christmas|halloween|easter|valentine|horoscope|zodiac|ouija|witchcraft|black magic)\b/,
  /\b(?:worship(?:ped|ping)?\s+(?:idols?|statues?|the sun|the moon))\b/,
  /\b(?:pray(?:ed|ing)?\s+to\s+(?:jesus|buddha|a statue))\b/,
];
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/i;
const SOCIAL_PATTERN = /\b(?:instagram|snapchat|tiktok|whatsapp|facebook|discord)\b.{0,20}(?:@\w+|\d{3,})|@\w{3,}/i;
const PHONE_PATTERN = /(?:\+?\d[\s().-]?){9,}/;
const ADDRESS_PATTERN =
  /\b\d{1,5}\s+[a-z][a-z' -]{2,30}\s+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|close|court|crescent|way|boulevard|blvd)\b|\b[a-z]{1,2}\d{1,2}[a-z]?\s?\d[a-z]{2}\b/i;
const PERSONAL_INFO_PATTERNS = [
  /\bmy (?:full )?(?:name|surname|school|address|phone|number|email|postcode|zip ?code) is\b/i,
  /\bi (?:live|go to school|study) (?:at|in|on)\b/i,
  /\bmy (?:home|house) (?:is|address)\b/i,
];

/** Basic automatic screening. Any flag forces the submission into admin review as flagged. */
export function moderateStoryText(...parts: Array<string | null | undefined>): ModerationFlag[] {
  const raw = parts.map((part) => String(part ?? '')).join('\n');
  const text = raw.toLowerCase();
  const flags = new Set<ModerationFlag>();

  if (BAD_WORDS.some((word) => new RegExp(`\\b${word}\\w*\\b`).test(text))) flags.add('inappropriate_language');
  if (BULLYING_PATTERNS.some((pattern) => pattern.test(text))) flags.add('bullying');
  if (UNSAFE_PATTERNS.some((pattern) => pattern.test(text))) flags.add('unsafe_content');
  if (NON_ISLAMIC_PATTERNS.some((pattern) => pattern.test(text))) flags.add('non_islamic_content');
  if (PHONE_PATTERN.test(raw)) flags.add('phone_number');
  if (ADDRESS_PATTERN.test(raw)) flags.add('address');
  if (EMAIL_PATTERN.test(raw) || URL_PATTERN.test(raw) || SOCIAL_PATTERN.test(raw)) flags.add('personal_information');
  if (PERSONAL_INFO_PATTERNS.some((pattern) => pattern.test(raw))) flags.add('personal_information');

  return Array.from(flags);
}

// ---------- Months, periods and ranking ----------

export type LeaderboardPeriod = 'today' | 'week' | 'month' | 'all';

export function isLeaderboardPeriod(value: unknown): value is LeaderboardPeriod {
  return value === 'today' || value === 'week' || value === 'month' || value === 'all';
}

export function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function monthRange(key: string): { start: Date; end: Date } {
  const [year, month] = key.split('-').map(Number);
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

export function previousMonthKey(date = new Date()): string {
  return monthKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)));
}

/** Lower bound (UTC) of a leaderboard period. Weeks start on Monday. */
export function periodStart(period: LeaderboardPeriod, now = new Date()): Date | null {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === 'today') return dayStart;
  if (period === 'week') {
    const offset = (dayStart.getUTCDay() + 6) % 7;
    return new Date(dayStart.getTime() - offset * 86_400_000);
  }
  if (period === 'month') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return null;
}

export type StoryRankRow = { userId: string; storyPoints: number; storiesApproved: number };

/** Standard competition ranking: equal points share a rank (1,1,3). */
export function assignRanks<T extends { storyPoints: number }>(rows: T[]): Array<T & { rank: number }> {
  let lastPoints: number | null = null;
  let lastRank = 0;
  return rows.map((row, index) => {
    if (row.storyPoints !== lastPoints) {
      lastRank = index + 1;
      lastPoints = row.storyPoints;
    }
    return { ...row, rank: lastRank };
  });
}

// ---------- Badges ----------

export const STORY_BADGES = [
  { key: 'FIRST_STORY', label: 'First Story', icon: '🌱', description: 'Get your first story approved.' },
  { key: 'FIVE_STORIES', label: '5 Stories', icon: '📚', description: 'Get 5 stories approved.' },
  { key: 'TEN_STORIES', label: '10 Stories', icon: '🏅', description: 'Get 10 stories approved.' },
  { key: 'STORY_CHAMPION', label: 'Story Champion', icon: '🏆', description: 'Earn 200 or more story points.' },
  { key: 'CREATIVE_WRITER', label: 'Creative Writer', icon: '🎨', description: 'Write a story the admin marks as creative.' },
  { key: 'QURAN_STORY_WRITER', label: 'Quran Story Writer', icon: '📖', description: 'Include a good Quran/Hadith reference, or have a Quran story approved.' },
  { key: 'EXCELLENT_LESSON', label: 'Excellent Islamic Lesson', icon: '💡', description: 'Write a story with a strong Islamic lesson.' },
  { key: 'MONTHLY_WINNER', label: 'Monthly Winner', icon: '👑', description: 'Win the monthly Story Writing competition.' },
] as const;

export type StoryBadgeKey = (typeof STORY_BADGES)[number]['key'];

export type ApprovedStoryFact = { category: string | null; points: number; breakdown: PointComponentKey[] };

/** Badges earned from approved-story activity. MONTHLY_WINNER is awarded at competition finalisation. */
export function evaluateStoryBadges(stories: ApprovedStoryFact[]): StoryBadgeKey[] {
  const earned: StoryBadgeKey[] = [];
  const approved = stories.filter((story) => story.points > 0);
  const totalPoints = approved.reduce((sum, story) => sum + story.points, 0);

  if (approved.length >= 1) earned.push('FIRST_STORY');
  if (approved.length >= 5) earned.push('FIVE_STORIES');
  if (approved.length >= 10) earned.push('TEN_STORIES');
  if (totalPoints >= 200) earned.push('STORY_CHAMPION');
  if (approved.some((story) => story.breakdown.includes('creative'))) earned.push('CREATIVE_WRITER');
  if (approved.some((story) => story.breakdown.includes('reference') || story.category === 'quran')) {
    earned.push('QURAN_STORY_WRITER');
  }
  if (approved.some((story) => story.breakdown.includes('lesson'))) earned.push('EXCELLENT_LESSON');
  return earned;
}

export const PRIZE_STATUSES = ['PRIZE_PENDING', 'PRIZE_SENT', 'PRIZE_COLLECTED'] as const;
export type PrizeStatus = (typeof PRIZE_STATUSES)[number];
export const PRIZE_STATUS_LABELS: Record<PrizeStatus, string> = {
  PRIZE_PENDING: 'Prize Pending',
  PRIZE_SENT: 'Prize Sent',
  PRIZE_COLLECTED: 'Prize Collected',
};

export const PRIZE_RANK_LABELS: Record<number, string> = {
  1: '🏆 1st Prize',
  2: '🥈 2nd Prize',
  3: '🥉 3rd Prize',
  4: '🎁 Other Prize',
};

export const PRIZE_EXAMPLES = [
  'Amazon voucher',
  'Islamic book',
  'Certificate',
  'Personalised mug',
  'Keyring',
  'Islam Media Central prize',
];

export type ReviewAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

export function approvalNotification(points: number): { title: string; body: string } {
  return {
    title: 'Story approved',
    body: `🎉 Your story has been approved! You earned ${points} points.`,
  };
}

export const REJECTION_NOTIFICATION = {
  title: 'Story feedback',
  body: 'Your story needs some changes. Please check the feedback and try again.',
};

export const CHAMPION_NOTIFICATION = {
  title: 'Story Writing Champion',
  body: "🏆 Congratulations! You are this month's Story Writing Champion!",
};
