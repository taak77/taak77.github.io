import { test, expect } from '@playwright/test';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const IMG_ROOT = 'public/img';

/** Every file under public/img, paired with the URL Astro serves it at. */
function imageAssets(): { url: string; file: string }[] {
  return readdirSync(IMG_ROOT, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const file = join(entry.parentPath, entry.name);
      return { url: `/img/${relative(IMG_ROOT, file).split(sep).join('/')}`, file };
    });
}

const ASSETS = [
  ...imageAssets(),
  { url: '/docs/Takashi%20Aoki.docx', file: 'public/docs/Takashi Aoki.docx' },
  { url: '/robots.txt', file: 'public/robots.txt' },
];

test(`all ${ASSETS.length} public assets are served at their original URLs`, async ({
  request,
}) => {
  const failures: string[] = [];

  for (const { url, file } of ASSETS) {
    const response = await request.get(url);
    if (response.status() !== 200) {
      failures.push(`${url}: HTTP ${response.status()}`);
      continue;
    }

    // A 200 alone would also pass for a truncated or re-encoded file, and
    // "byte-for-byte" is a hard constraint for this task.
    const served = (await response.body()).length;
    const onDisk = statSync(file).size;
    if (served !== onDisk) {
      failures.push(`${url}: served ${served} bytes, ${onDisk} bytes on disk`);
    }
  }

  expect(failures).toEqual([]);
});
