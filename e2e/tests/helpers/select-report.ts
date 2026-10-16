import { test } from '@playwright/test';

/** Log the actual PostgreSQL SELECT row(s), and persist it in the HTML report. */
export async function reportSelect(label: string, sql: string, expected: unknown, stored: unknown): Promise<void> {
  console.log(`\n[POSTGRESQL SELECT] ${label}`);
  console.log(sql.trim());
  console.table(Array.isArray(stored) ? stored : [stored]);
  await test.info().attach(`${label.replace(/[^a-z0-9_-]/gi, '-')}-select.json`, {
    body: Buffer.from(JSON.stringify({ label, sql: sql.trim(), expected, stored }, null, 2)),
    contentType: 'application/json',
  });
}
