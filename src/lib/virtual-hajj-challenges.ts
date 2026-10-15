export type VirtualHajjQuestion = {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  reference: string;
  explanation: string;
};

type ChallengeQuestion = VirtualHajjQuestion & { answer: string };

function question(
  id: string,
  prompt: string,
  options: [string, string, string, string],
  answerIndex: number,
  reference: string,
  explanation: string
): ChallengeQuestion {
  return {
    id,
    prompt,
    options: options.map((label, index) => ({ id: String.fromCharCode(97 + index), label })),
    answer: String.fromCharCode(97 + answerIndex),
    reference,
    explanation,
  };
}

const dailyChallengeSets: ChallengeQuestion[][] = [
  [
    question(
      'qiblah-direction',
      'According to Quran 2:144, which direction are Muslims told to face for prayer?',
      ['Al-Masjid al-Haram in Makkah', 'Madinah', 'Mount Arafat', 'Mount Sinai'],
      0,
      'Quran 2:144',
      'The verse tells the Prophet ﷺ to turn towards al-Masjid al-Haram.'
    ),
    question(
      'qiblah-name',
      'What is the name for the direction Muslims face during prayer?',
      ['Mihrab', 'Qiblah', 'Minbar', 'Mina'],
      1,
      'Quran 2:144',
      'Qiblah is the direction Muslims face in prayer, towards al-Masjid al-Haram.'
    ),
    question(
      'qiblah-place',
      'Which city is al-Masjid al-Haram in?',
      ['Makkah', 'Madinah', 'Taif', 'Jerusalem'],
      0,
      'Quran 2:144',
      'Al-Masjid al-Haram is in Makkah.'
    ),
  ],
  [
    question(
      'tawaf-action',
      'What action around the Ancient House is mentioned in Quran 22:29?',
      ['Circumambulating it', 'Climbing onto its roof', 'Swimming around it', 'Planting a garden beside it'],
      0,
      'Quran 22:29',
      'The verse mentions circumambulating the Ancient House.'
    ),
    question(
      'tawaf-name',
      'What name does Quran 22:29 use for the Kaaba?',
      ['The Ancient House', 'The Green House', 'The High Mountain', 'The City Gate'],
      0,
      'Quran 22:29',
      'The verse refers to the Kaaba as the Ancient House.'
    ),
    question(
      'tawaf-game',
      'What does walking this game route complete?',
      ['A learning activity only', 'Hajj', 'Umrah', 'A religious rite'],
      0,
      'Learning-game safety note',
      'A game cannot perform Hajj or Umrah. Learn the rites from a qualified teacher.'
    ),
  ],
  [
    question(
      'safa-marwah-names',
      'Which two places are named together in Quran 2:158?',
      ['As-Safa and al-Marwah', 'Arafat and Mina', 'Makkah and Madinah', 'Sinai and Uhud'],
      0,
      'Quran 2:158',
      'The verse names as-Safa and al-Marwah.'
    ),
    question(
      'safa-marwah-symbols',
      'How does Quran 2:158 describe as-Safa and al-Marwah?',
      ['Among the symbols of Allah', 'Two rivers', 'Two cities', 'Two months'],
      0,
      'Quran 2:158',
      'The verse says as-Safa and al-Marwah are among the symbols of Allah.'
    ),
    question(
      'safa-marwah-visitors',
      'In Quran 2:158, which visitors are mentioned in connection with as-Safa and al-Marwah?',
      ['People visiting for Hajj or Umrah', 'People travelling for trade', 'People visiting a garden', 'People crossing a river'],
      0,
      'Quran 2:158',
      'The verse mentions people who visit the House for Hajj or Umrah.'
    ),
  ],
  [
    question(
      'house-return',
      'What two things does Quran 2:125 say Allah made the House for people?',
      ['A place of return and safety', 'A school and a market', 'A river and a garden', 'A road and a bridge'],
      0,
      'Quran 2:125',
      'The verse describes the House as a place of return and safety for people.'
    ),
    question(
      'house-foundations',
      'Who raised the foundations of the House, as mentioned in Quran 2:127?',
      ['Prophet Ibrahim and Prophet Ismail', 'Prophet Musa and Prophet Harun', 'Prophet Nuh and Prophet Hud', 'Prophet Yusuf and Prophet Yaqub'],
      0,
      'Quran 2:127',
      'The verse mentions Ibrahim and Ismail raising the foundations of the House.'
    ),
    question(
      'house-prayer',
      'In Quran 2:125, what are people told to take as a place of prayer?',
      ['The standing-place of Ibrahim', 'The top of a mountain', 'A city gate', 'A riverbank'],
      0,
      'Quran 2:125',
      'The verse mentions taking the standing-place of Ibrahim as a place of prayer.'
    ),
  ],
  [
    question(
      'hajj-months',
      'What does Quran 2:197 say about the time of Hajj?',
      ['It is during well-known months', 'It is only in winter', 'It happens every week', 'It is on one fixed weekday'],
      0,
      'Quran 2:197',
      'The verse says Hajj is during well-known months.'
    ),
    question(
      'hajj-provision',
      'Quran 2:197 says the best provision is what?',
      ['Taqwa (mindfulness of Allah)', 'A new toy', 'A tall tent', 'A gold cup'],
      0,
      'Quran 2:197',
      'The verse teaches that taqwa is the best provision.'
    ),
    question(
      'hajj-kindness',
      'Which behaviour does Quran 2:197 tell people to avoid during Hajj?',
      ['Arguing with one another', 'Helping others', 'Remembering Allah', 'Preparing provisions'],
      0,
      'Quran 2:197',
      'The verse tells people to avoid arguing during Hajj.'
    ),
  ],
  [
    question(
      'arafat-place',
      'Which place does Quran 2:198 mention leaving during Hajj?',
      ['Arafat', 'Uhud', 'Sinai', 'The Cave of Hira'],
      0,
      'Quran 2:198',
      'The verse mentions departing from Arafat.'
    ),
    question(
      'arafat-remembrance',
      'After leaving Arafat, whom does Quran 2:198 tell people to remember?',
      ['Allah', 'A king', 'A poet', 'A merchant'],
      0,
      'Quran 2:198',
      'The verse tells people to remember Allah at al-Mash’ar al-Haram.'
    ),
    question(
      'arafat-bounty',
      'What does Quran 2:198 say there is no blame in seeking?',
      ['Bounty from your Lord', 'A new home', 'A mountain path', 'A special animal'],
      0,
      'Quran 2:198',
      'The verse says there is no blame in seeking bounty from your Lord.'
    ),
  ],
];

export const VIRTUAL_HAJJ_REWARD_POINTS = 25;
export const VIRTUAL_HAJJ_MAX_DAILY_ATTEMPTS = 5;

function getDailyChallengeSet(date: Date): ChallengeQuestion[] {
  const utcDayOfYear = Math.floor(
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      Date.UTC(date.getUTCFullYear(), 0, 1)) /
      86_400_000
  );
  return dailyChallengeSets[utcDayOfYear % dailyChallengeSets.length];
}

export function getVirtualHajjQuestions(date = new Date()): VirtualHajjQuestion[] {
  return getDailyChallengeSet(date).map(({ answer: _answer, ...visibleQuestion }) => visibleQuestion);
}

export function gradeVirtualHajjAnswers(
  answers: unknown,
  date = new Date()
): { valid: boolean; correct: boolean } {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { valid: false, correct: false };
  }

  const submitted = answers as Record<string, unknown>;
  const questions = getDailyChallengeSet(date);
  if (
    Object.keys(submitted).length !== questions.length ||
    questions.some((question) => typeof submitted[question.id] !== 'string')
  ) {
    return { valid: false, correct: false };
  }

  return {
    valid: true,
    correct: questions.every((question) => submitted[question.id] === question.answer),
  };
}

export function getVirtualHajjChallengeKey(date = new Date()): string {
  return `tawaf-knowledge-${date.toISOString().slice(0, 10)}`;
}
