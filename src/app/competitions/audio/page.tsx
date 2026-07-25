import { redirect } from 'next/navigation';

/** Friendly /competitions/audio URL for the Audio Competition feature. */
export default function AudioCompetitionRedirectPage() {
  redirect('/audio-quiz');
}
