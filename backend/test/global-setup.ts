import { execSync } from 'child_process';

export default function globalSetup() {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgresql://formo:formo@localhost:5435/formo_test?schema=public';
  execSync('npx prisma db push --force-reset --skip-generate', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });
}
