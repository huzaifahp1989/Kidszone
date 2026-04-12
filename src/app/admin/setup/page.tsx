import { promises as fs } from 'fs';
import path from 'path';
import SetupClient from './SetupClient';

export default async function SetupPage() {
  const sqlPath = path.join(process.cwd(), 'setup_stories_complete.sql');
  let sqlContent = '';
  try {
    sqlContent = await fs.readFile(sqlPath, 'utf-8');
  } catch (err) {
    sqlContent = '-- Error reading SQL file: ' + err;
  }

  return <SetupClient initialSql={sqlContent} />;
}
