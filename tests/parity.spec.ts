import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

interface Item {
  thumbnail: string;
  title: string;
  images: string[];
  description: string;
  tools: string;
}

const LEGACY_URL = pathToFileURL(resolve('tests/fixtures/legacy-index.html')).href;

/** Extracts the 15 projects from the frozen original page. */
async function readLegacy(page: import('@playwright/test').Page): Promise<Item[]> {
  await page.goto(LEGACY_URL);
  return page.evaluate(() => {
    const tiles = [...document.querySelectorAll('#portfolio a.portfolio-link')];
    return tiles.map((tile) => {
      const id = tile.getAttribute('href')!.slice(1);
      const body = document.getElementById(id)!.querySelector('.modal-body')!;
      return {
        thumbnail: tile.querySelector('img')!.getAttribute('src')!.replace(/^/, '/'),
        title: body.querySelector('h2')!.textContent!.trim(),
        images: [...body.querySelectorAll('img')].map(
          (img) => '/' + img.getAttribute('src')!,
        ),
        description: body.querySelector('p')!.textContent!.trim(),
        tools: body.querySelector('ul.item-details strong')!.textContent!.trim(),
      };
    });
  });
}

test('the rewrite reproduces all 15 projects exactly', async ({ page }) => {
  const legacy = await readLegacy(page);
  expect(legacy).toHaveLength(15);

  await page.goto('/');
  const tiles = page.locator('[data-portfolio-tile]');
  await expect(tiles).toHaveCount(15);

  // Thumbnails, in order, without opening anything.
  const thumbnails = await tiles.locator('img').evaluateAll((imgs) =>
    imgs.map((i) => new URL((i as HTMLImageElement).src).pathname),
  );
  expect(thumbnails).toEqual(legacy.map((item) => item.thumbnail));

  // Open each project and compare its modal content field by field.
  for (const [index, expected] of legacy.entries()) {
    await tiles.nth(index).click();
    const dialog = page.locator('dialog[data-portfolio-dialog]');

    await expect(dialog.locator('[data-modal-title]'), `title #${index + 1}`).toHaveText(
      expected.title,
    );
    await expect(
      dialog.locator('[data-modal-description]'),
      `description #${index + 1}`,
    ).toHaveText(expected.description);
    await expect(dialog.locator('[data-modal-tools]'), `tools #${index + 1}`).toHaveText(
      expected.tools,
    );

    const images = await dialog
      .locator('[data-modal-image]')
      .evaluateAll((imgs) => imgs.map((i) => new URL((i as HTMLImageElement).src).pathname));
    expect(images, `images #${index + 1}`).toEqual(expected.images);

    await page.keyboard.press('Escape');
    await expect(dialog).not.toHaveAttribute('open', '');
  }
});

test('every image referenced anywhere resolves', async ({ page, request }) => {
  await page.goto('/');
  const paths = new Set<string>();

  const tiles = page.locator('[data-portfolio-tile]');
  for (let index = 0; index < 15; index++) {
    await tiles.nth(index).click();
    const dialog = page.locator('dialog[data-portfolio-dialog]');
    const srcs = await dialog
      .locator('[data-modal-image]')
      .evaluateAll((imgs) => imgs.map((i) => new URL((i as HTMLImageElement).src).pathname));
    srcs.forEach((src) => paths.add(src));
    await page.keyboard.press('Escape');
  }

  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});

test('the only third-party request is the Gravatar avatar', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const { hostname, protocol } = new URL(request.url());
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocal) external.push(`${protocol}//${hostname}`);
  });

  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const unexpected = external.filter((origin) => origin !== 'https://en.gravatar.com');
  expect(unexpected).toEqual([]);
});
