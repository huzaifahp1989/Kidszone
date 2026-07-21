import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const uid = '34220508-20f0-4bc0-b8e9-a3ae917f58c1';
  const { getDailyActivityStatus } = await import('../src/lib/daily-activity-limits');
  const status = await getDailyActivityStatus(uid);
  console.log(JSON.stringify(status, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
