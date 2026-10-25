import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
export default async function () {
  execFileSync(process.execPath, [resolve(__dirname, '../scripts/report-live-coverage.cjs')], { stdio: 'inherit' });
}
