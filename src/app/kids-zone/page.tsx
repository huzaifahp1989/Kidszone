import { redirect } from 'next/navigation';

/** Push / deep-link target used by admin presets — send kids to Home. */
export default function KidsZoneRedirectPage() {
  redirect('/');
}
