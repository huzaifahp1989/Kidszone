import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const target = process.argv[2]?.trim();
  if (!target) {
    console.error('Usage: npx tsx scripts/repair-user-points.mts <email-or-user-id>');
    process.exit(1);
  }

  const { repairUserPointsByEmail, repairUserPointsByUserId } = await import('../src/lib/points-repair');
  const isUserId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(target);

  const result = isUserId
    ? await repairUserPointsByUserId(target, { backfillToday: true })
    : await repairUserPointsByEmail(target, { backfillToday: true });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
