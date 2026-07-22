/** Built-in sample quiz used for testing the Audio Quiz feature. */
export const TEST_AUDIO_QUIZ_TITLE = 'Test Audio Quiz';

/** Short CC0 sample clip (MDN) — works without uploading to storage. */
export const TEST_AUDIO_QUIZ_SAMPLE_URL =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3';

export const TEST_AUDIO_QUIZ = {
  title: TEST_AUDIO_QUIZ_TITLE,
  description:
    'A sample audio quiz so you can try listening and recording an answer. Safe to delete after testing.',
  category: 'General Knowledge',
  ageGroup: 'All ages',
  prizeDetails: 'Test prize — bragging rights only!',
  maxRecordingSeconds: 60,
  winnersCount: 3,
  active: true,
  questions: [
    {
      prompt: 'Listen to the sound, then record your answer: what animal does this remind you of?',
      audioUrl: TEST_AUDIO_QUIZ_SAMPLE_URL,
    },
  ],
} as const;
