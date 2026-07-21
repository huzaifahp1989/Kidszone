/** Authorize scheduled cron routes. Manual bypass is disabled in production. */
export function authorizeCron(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const cronSecret = process.env.CRON_SECRET;

  if (isVercelCron) return true;

  if (process.env.NODE_ENV !== 'production') {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('manual') === '1') return true;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
    return true;
  }

  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}
