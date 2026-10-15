import { redirect } from 'next/navigation';
import { DEFAULT_WRITTEN_SLUG } from '@/lib/written-competition';

export default function RabiUlAwwalRedirectPage() {
  redirect(`/competitions/written/${DEFAULT_WRITTEN_SLUG}`);
}
