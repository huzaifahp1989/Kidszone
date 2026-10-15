export const OCTOBER_HADITH_QUIZ_START = '2026-10-01T00:00:00.000Z';
export const OCTOBER_HADITH_QUIZ_END = '2026-10-30T23:59:59.999Z';
export const OCTOBER_HADITH_QUIZ_LAST_DAY = '2026-10-30';
export const OCTOBER_HADITH_QUIZ_TABLE = 'october_hadith_quiz_submissions';
export const OCTOBER_HADITH_MAX_MARKS = 10;
export const OCTOBER_HADITH_QUESTION_COUNT = 10;

export const OCTOBER_HADITH_QUESTIONS = [
  {
    id: 'hadith-01',
    difficulty: 'Easy',
    question: 'What should a Muslim make sure is good before beginning an action?',
    source: 'Sahih al-Bukhari 1; Sahih Muslim 1907',
  },
  {
    id: 'hadith-02',
    difficulty: 'Easy',
    question: 'According to a hadith, what good deed can a friendly smile to another person be?',
    source: 'Jami` at-Tirmidhi 1956',
  },
  {
    id: 'hadith-03',
    difficulty: 'Easy',
    question: 'What reward can a person gain by removing something harmful from a path?',
    source: 'Sahih al-Bukhari 2989; Sahih Muslim 1009',
  },
  {
    id: 'hadith-04',
    difficulty: 'Easy',
    question: 'When a person has nothing good to say, what does the Prophet teach them to do?',
    source: 'Sahih al-Bukhari 6018; Sahih Muslim 47',
  },
  {
    id: 'hadith-05',
    difficulty: 'Medium',
    question: 'What does the hadith about loving for your brother what you love for yourself teach us to do?',
    source: 'Sahih al-Bukhari 13; Sahih Muslim 45',
  },
  {
    id: 'hadith-06',
    difficulty: 'Medium',
    question: 'According to the Prophet, who is truly strong when angry?',
    source: 'Sahih al-Bukhari 6114; Sahih Muslim 2609',
  },
  {
    id: 'hadith-07',
    difficulty: 'Medium',
    question: 'What does the Prophet say are the best people to be: those who learn the Qur’an and do what with it?',
    source: 'Sahih al-Bukhari 5027',
  },
  {
    id: 'hadith-08',
    difficulty: 'Difficult',
    question: 'What does the hadith teach about showing mercy to people and receiving mercy from Allah?',
    source: 'Sahih al-Bukhari 7376; Sahih Muslim 2319',
  },
  {
    id: 'hadith-09',
    difficulty: 'Difficult',
    question: 'According to the Prophet, what kind of good deed is most beloved to Allah?',
    source: 'Sahih al-Bukhari 6464; Sahih Muslim 783',
  },
  {
    id: 'hadith-10',
    difficulty: 'Difficult',
    question: 'What reward does the Prophet describe for someone who takes a path to seek knowledge?',
    source: 'Sahih Muslim 2699',
  },
] as const;

export type OctoberHadithQuestionId = (typeof OCTOBER_HADITH_QUESTIONS)[number]['id'];

export type OctoberHadithRegistration = {
  fullName: string;
  age: number;
  madrasah: string;
  city: string;
};

export type OctoberHadithSubmissionInput = OctoberHadithRegistration & {
  answers: Record<OctoberHadithQuestionId, string>;
};

export function isOctoberHadithQuizOpen(now = new Date()): boolean {
  return now >= new Date(OCTOBER_HADITH_QUIZ_START) && now <= new Date(OCTOBER_HADITH_QUIZ_END);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateOctoberHadithSubmission(
  value: unknown
): { ok: true; submission: OctoberHadithSubmissionInput } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: 'Please provide your details and answers.' };

  const fullName = typeof value.fullName === 'string' ? value.fullName.trim() : '';
  const madrasah = typeof value.madrasah === 'string' ? value.madrasah.trim() : '';
  const city = typeof value.city === 'string' ? value.city.trim() : '';
  const age = Number(value.age);

  if (!fullName || fullName.length > 120) {
    return { ok: false, error: 'Enter your full name (up to 120 characters).' };
  }
  if (!Number.isInteger(age) || age < 3 || age > 18) {
    return { ok: false, error: 'Enter an age from 3 to 18.' };
  }
  if (!madrasah || madrasah.length > 120) {
    return { ok: false, error: 'Enter your madrasah name (up to 120 characters).' };
  }
  if (!city || city.length > 100) {
    return { ok: false, error: 'Enter your city (up to 100 characters).' };
  }
  if (!isRecord(value.answers)) {
    return { ok: false, error: 'Please answer all 10 questions.' };
  }

  const questionIds = OCTOBER_HADITH_QUESTIONS.map((question) => question.id);
  if (Object.keys(value.answers).length !== questionIds.length) {
    return { ok: false, error: 'Please answer all 10 questions.' };
  }

  const answers = {} as Record<OctoberHadithQuestionId, string>;
  for (const question of OCTOBER_HADITH_QUESTIONS) {
    const answer = value.answers[question.id];
    if (typeof answer !== 'string' || !answer.trim() || answer.length > 2000) {
      return { ok: false, error: `Please provide an answer to question ${question.id.slice(-2)} (up to 2,000 characters).` };
    }
    answers[question.id] = answer.trim();
  }

  return {
    ok: true,
    submission: { fullName, age, madrasah, city, answers },
  };
}
