import {
  isWrittenCompetitionOpen,
  toPublicQuestion,
  type WrittenCompetition,
  type WrittenPrize,
  type WrittenQuestionDifficulty,
  type WrittenQuestionPublic,
} from '@/lib/written-competition';

export type SeedWrittenQuestion = {
  questionNumber: number;
  questionText: string;
  difficulty: WrittenQuestionDifficulty;
  topic: string;
  expectedAnswer: string;
  markingGuidance: string;
  maxMarks: number;
  minRequiredPoints: number;
  source: string;
  explanation: string;
};

export const RABI_UL_AWWAL_SEED_QUESTIONS: SeedWrittenQuestion[] = [
  {
    questionNumber: 1,
    difficulty: 'medium',
    topic: 'First revelation',
    questionText:
      'Explain why Prophet Muhammad ﷺ spent time in seclusion before the first revelation and describe what happened when the first revelation came.',
    expectedAnswer:
      'A strong answer should describe the Prophet’s ﷺ practice of tahannuth / seclusion in the cave of Hira, the coming of Angel Jibril عليه السلام, the command to “Read”, and the Prophet’s ﷺ reaction, followed by Khadijah رضي الله عنها comforting him and taking him to Waraqah ibn Nawfal.',
    markingGuidance:
      'Award marks for: (1) reason for seclusion / reflection away from idol worship, (2) location of the first revelation, (3) what occurred with Jibril عليه السلام, (4) the first words revealed, (5) the Prophet’s ﷺ response and the support he received afterwards. Do not require every detail; reward accurate, connected explanation.',
    maxMarks: 10,
    minRequiredPoints: 4,
    source: '',
    explanation: '',
  },
  {
    questionNumber: 2,
    difficulty: 'medium',
    topic: 'Makkan period',
    questionText:
      'Describe the importance of the early Muslims accepting Islam during the Makkan period and explain some of the difficulties faced by the early Muslim community.',
    expectedAnswer:
      'A strong answer should mention that early Muslims formed the first community, accepted Islam despite opposition, and faced boycott, torture, mockery, and pressure to abandon the faith. Names such as Bilal, the family of Yasir, or the migration to Abyssinia strengthen the answer.',
    markingGuidance:
      'Look for: importance of the first believers, social/economic persecution, examples of hardship, and how the community remained steadfast. Extra credit for linking hardship to later strength of the Ummah.',
    maxMarks: 10,
    minRequiredPoints: 4,
    source: '',
    explanation: '',
  },
  {
    questionNumber: 3,
    difficulty: 'challenging',
    topic: 'Hijrah',
    questionText:
      'Explain the events surrounding the Hijrah from Makkah to Madinah and identify the important people involved in assisting Prophet Muhammad ﷺ during the journey. Mention at least three important details.',
    expectedAnswer:
      'A strong answer should cover the plot of Quraysh, Ali رضي الله عنه remaining in the Prophet’s ﷺ bed, the journey with Abu Bakr رضي الله عنه, hiding in the cave of Thawr, the role of Abdullah ibn Urayqit as guide, and Asma رضي الله عنها bringing food. Arrival in Quba / Madinah may also be mentioned.',
    markingGuidance:
      'Require at least three accurate details. Award higher marks for chronology, named companions, and understanding of why the Hijrah was necessary. Do not award full marks for a one-sentence answer.',
    maxMarks: 10,
    minRequiredPoints: 5,
    source: '',
    explanation: '',
  },
  {
    questionNumber: 4,
    difficulty: 'medium',
    topic: 'Battle of Badr',
    questionText:
      'What were some of the main reasons for the Battle of Badr, and what important lessons can Muslims learn from the events surrounding the battle?',
    expectedAnswer:
      'A strong answer should mention the Quraysh caravan, the wider conflict after years of persecution, the small Muslim force, reliance upon Allah, and lessons of courage, discipline, and gratitude after victory.',
    markingGuidance:
      'Credit causes (caravan / ongoing hostility), the situation of the Muslims, and at least two lessons (tawakkul, unity, justice with captives, gratitude). Penalise answers that only name the battle with no explanation.',
    maxMarks: 10,
    minRequiredPoints: 4,
    source: '',
    explanation: '',
  },
  {
    questionNumber: 5,
    difficulty: 'challenging',
    topic: 'Treaty of Hudaybiyyah',
    questionText:
      'Explain the significance of the Treaty of Hudaybiyyah and how an event that initially appeared difficult for the Muslims ultimately became highly significant for the spread of Islam.',
    expectedAnswer:
      'A strong answer should mention the circumstances leading to the treaty, the terms, the initial reaction of some companions, and the longer-term opening that allowed da‘wah to spread, later described as a clear victory.',
    markingGuidance:
      'A strong answer should mention relevant points such as: circumstances leading to the treaty; the agreement made between the Muslims and Quraysh; the initial reaction of some companions; the longer-term consequences; how the treaty contributed to an environment in which Islam spread.',
    maxMarks: 10,
    minRequiredPoints: 5,
    source: '',
    explanation: '',
  },
  {
    questionNumber: 6,
    difficulty: 'medium',
    topic: 'Da‘wah and character',
    questionText:
      'Describe the Prophet’s ﷺ approach to dealing with people who opposed him during the Makkan period. Give examples from the Seerah.',
    expectedAnswer:
      'A strong answer should describe patience, continued da‘wah, not returning harm with harm, concern for people’s guidance, and examples such as Ta’if, the boycott, or prayers for his people rather than destruction.',
    markingGuidance:
      'Look for character qualities (patience, mercy, perseverance) tied to specific incidents. Vague praise without Seerah examples should not receive high marks.',
    maxMarks: 10,
    minRequiredPoints: 4,
    source: '',
    explanation: '',
  },
  {
    questionNumber: 7,
    difficulty: 'challenging',
    topic: 'Madinan community',
    questionText:
      'Explain how Prophet Muhammad ﷺ established the Muslim community after arriving in Madinah. Mention several important steps or developments.',
    expectedAnswer:
      'A strong answer should mention the masjid, brotherhood between Muhajirun and Ansar, the Constitution of Madinah, agreements with other communities, establishing salah and social justice, and building a united community.',
    markingGuidance:
      'Award marks for several distinct developments, not a single point. Look for masjid, mu’akhat (brotherhood), written agreements, and community organisation.',
    maxMarks: 10,
    minRequiredPoints: 5,
    source: '',
    explanation: '',
  },
  {
    questionNumber: 8,
    difficulty: 'challenging',
    topic: 'Character of the Prophet ﷺ',
    questionText:
      'Describe some of the qualities and characteristics of Prophet Muhammad ﷺ demonstrated through his dealings with his companions, family and wider community.',
    expectedAnswer:
      'A strong answer should give specific qualities (mercy, honesty, humility, justice, kindness to children and family) with Seerah examples rather than a list of adjectives alone.',
    markingGuidance:
      'Require qualities + examples. Higher marks for range across companions, family, and the wider community. Penalise generic answers with no events.',
    maxMarks: 10,
    minRequiredPoints: 5,
    source: '',
    explanation: '',
  },
  {
    questionNumber: 9,
    difficulty: 'challenging',
    topic: 'Conquest of Makkah',
    questionText:
      'Explain the events surrounding the Conquest of Makkah and describe how Prophet Muhammad ﷺ dealt with many of the people who had previously opposed him.',
    expectedAnswer:
      'A strong answer should mention the breaking of Hudaybiyyah terms, the peaceful entry, general amnesty, “Go, you are free,” destruction of idols, and mercy instead of revenge.',
    markingGuidance:
      'Look for: cause of the conquest, manner of entry, treatment of former enemies, and the lesson of mercy and justice. Full marks need both events and how people were treated.',
    maxMarks: 10,
    minRequiredPoints: 5,
    source: '',
    explanation: '',
  },
  {
    questionNumber: 10,
    difficulty: 'challenging',
    topic: 'Lessons from the Seerah',
    questionText:
      'Choose one major event from the life of Prophet Muhammad ﷺ and explain what Muslims today can learn from that event. Your answer should include specific lessons connected to the Seerah.',
    expectedAnswer:
      'A strong answer names a specific event (Hijrah, Badr, Uhud, Hudaybiyyah, Ta’if, Conquest of Makkah, etc.), summarises what happened, and draws clear lessons for today.',
    markingGuidance:
      'The event must be identified. Award marks for accurate Seerah detail and for lessons that are clearly connected to that event, not generic advice. Weak answers name an event with no lessons, or lessons with no event.',
    maxMarks: 10,
    minRequiredPoints: 5,
    source: '',
    explanation: '',
  },
];

export const RABI_UL_AWWAL_SEED_PRIZES = [
  {
    prizeName: 'FREE An-Nasihah World Yearly Usage',
    prizeDescription: 'Win a FREE yearly subscription to An-Nasihah World.',
    prizeImageUrl: '/prizes/annasihah-world.png',
    sponsor: 'An-Nasihah World',
    sponsorLogoUrl: null as string | null,
    winnersCount: 1,
    prizeOrder: 1,
  },
  {
    prizeName: 'School Stationery Prize',
    prizeDescription: 'Enter for your chance to win a school stationery bundle.',
    prizeImageUrl: '/prizes/school-stationery.png',
    sponsor: '',
    sponsorLogoUrl: null as string | null,
    winnersCount: 1,
    prizeOrder: 2,
  },
];

export const RABI_UL_AWWAL_START_DATE = '2026-08-21T00:00:00.000Z';
export const RABI_UL_AWWAL_CLOSING_DATE = '2026-09-30T23:59:59.999Z';
export const RABI_UL_AWWAL_WINNER_ANNOUNCEMENT_DATE = '2026-10-03T00:00:00.000Z';

export const RABI_UL_AWWAL_SEED_COMPETITION = {
  slug: 'rabi-ul-awwal-seerah-2026',
  name: 'Rabi ul Awwal Seerah Quiz',
  description:
    'A written-answer Seerah competition for Rabi ul Awwal. Study the life of Prophet Muhammad ﷺ, type your own answers, and enter the prize draw after admin review.',
  category: 'seerah' as const,
  rules:
    'Write your own answers in full sentences. There are no multiple-choice options. One submission per participant. After you submit, you cannot change your answers. The admin team marks every answer by hand. Only eligible entries can enter the prize draw. Children’s full names, emails, and contact details are not shown publicly.',
  prizeInformation:
    'Prize 1: FREE An-Nasihah World yearly usage. Prize 2: a school stationery bundle. Winners are chosen from eligible entries after the competition closes.',
  startDate: RABI_UL_AWWAL_START_DATE,
  closingDate: RABI_UL_AWWAL_CLOSING_DATE,
  winnerAnnouncementDate: RABI_UL_AWWAL_WINNER_ANNOUNCEMENT_DATE,
  questionCount: 10,
  maxAnswerLength: 2000,
  minAge: null as number | null,
  maxAttempts: 1,
  minScoreRequired: 50,
  winnersCount: 2,
  showWinnersPublicly: false,
  active: true,
};

export function rabiUlAwwalFallbackCompetition(): WrittenCompetition {
  return {
    id: 'preview',
    slug: RABI_UL_AWWAL_SEED_COMPETITION.slug,
    name: RABI_UL_AWWAL_SEED_COMPETITION.name,
    description: RABI_UL_AWWAL_SEED_COMPETITION.description,
    category: RABI_UL_AWWAL_SEED_COMPETITION.category,
    rules: RABI_UL_AWWAL_SEED_COMPETITION.rules,
    prizeInformation: RABI_UL_AWWAL_SEED_COMPETITION.prizeInformation,
    startDate: RABI_UL_AWWAL_SEED_COMPETITION.startDate,
    closingDate: RABI_UL_AWWAL_SEED_COMPETITION.closingDate,
    winnerAnnouncementDate: RABI_UL_AWWAL_SEED_COMPETITION.winnerAnnouncementDate,
    questionCount: RABI_UL_AWWAL_SEED_COMPETITION.questionCount,
    maxAnswerLength: RABI_UL_AWWAL_SEED_COMPETITION.maxAnswerLength,
    minAge: RABI_UL_AWWAL_SEED_COMPETITION.minAge,
    maxAttempts: RABI_UL_AWWAL_SEED_COMPETITION.maxAttempts,
    minScoreRequired: RABI_UL_AWWAL_SEED_COMPETITION.minScoreRequired,
    winnersCount: RABI_UL_AWWAL_SEED_COMPETITION.winnersCount,
    showWinnersPublicly: false,
    active: true,
    createdAt: '',
    updatedAt: '',
  };
}

export function rabiUlAwwalFallbackQuestions(): WrittenQuestionPublic[] {
  return RABI_UL_AWWAL_SEED_QUESTIONS.map((question) =>
    toPublicQuestion({
      id: `preview-q-${question.questionNumber}`,
      questionNumber: question.questionNumber,
      questionText: question.questionText,
      difficulty: question.difficulty,
      topic: question.topic,
      maxMarks: question.maxMarks,
      active: true,
      expectedAnswer: '',
      markingGuidance: '',
      minRequiredPoints: question.minRequiredPoints,
      source: '',
      explanation: '',
    })
  );
}

export function rabiUlAwwalFallbackPrizes(): WrittenPrize[] {
  return RABI_UL_AWWAL_SEED_PRIZES.map((prize, index) => ({
    id: `preview-prize-${index}`,
    competitionId: 'preview',
    prizeName: prize.prizeName,
    prizeDescription: prize.prizeDescription,
    prizeImageUrl: prize.prizeImageUrl,
    prizeImagePath: null,
    sponsor: prize.sponsor,
    sponsorLogoUrl: prize.sponsorLogoUrl,
    winnersCount: prize.winnersCount,
    prizeOrder: prize.prizeOrder,
    active: true,
  }));
}

export function rabiUlAwwalPublicFallbackPayload() {
  const competition = rabiUlAwwalFallbackCompetition();
  return {
    tableMissing: true,
    setupNeeded: false,
    open: isWrittenCompetitionOpen(competition),
    competition,
    questions: rabiUlAwwalFallbackQuestions(),
    prizes: rabiUlAwwalFallbackPrizes(),
    winners: [] as Array<{ id: string; displayName: string; prizeName: string | null }>,
  };
}
