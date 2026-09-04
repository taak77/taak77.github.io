import { test, expect } from '@playwright/test';

test('Flatly palette and Bootstrap 3 breakpoints are compiled into the CSS', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page.locator('link[rel=stylesheet]').evaluateAll(
    (links) => links.map((l) => (l as HTMLLinkElement).getAttribute('href')!),
  );
  expect(hrefs.length).toBeGreaterThan(0);

  let css = '';
  for (const href of hrefs) {
    css += await (await request.get(href)).text();
  }

  expect(css).toContain('#18bc9c');
  expect(css).toContain('#2c3e50');
  expect(css).toContain('768px');
  expect(css).toContain('992px');
  expect(css).toContain('1200px');
  expect(css).toContain('1.42857143');
});

test('Montserrat and Lato are self-hosted, with no external font request', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (r) => requested.push(r.url()));

  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const families = await page.evaluate(() =>
    [...document.fonts].map((f) => f.family.replaceAll('"', '')),
  );
  expect(families).toContain('Montserrat');
  expect(families).toContain('Lato');

  expect(requested.filter((u) => u.includes('fonts.googleapis.com'))).toEqual([]);
  expect(requested.filter((u) => u.startsWith('http://'))).toEqual([]);
});
