import { test, expect } from '@playwright/test';

const EXPECTED_THUMBNAILS = [
  '/img/portfolio/myads.jpg',
  '/img/portfolio/htcm.jpg',
  '/img/portfolio/schedules.jpg',
  '/img/portfolio/gamecenter.jpg',
  '/img/portfolio/statslab.jpg',
  '/img/portfolio/ps4.jpg',
  '/img/portfolio/appletv.jpg',
  '/img/portfolio/sblive.jpg',
  '/img/portfolio/fflive-console.jpg',
  '/img/portfolio/d3.jpg',
  '/img/portfolio/espn-web.jpg',
  '/img/portfolio/espn-web-player.jpg',
  '/img/portfolio/kanopi-landing.jpg',
  '/img/portfolio/chordx-android-app-2.jpg',
  '/img/portfolio/axs-seat-map-crypto.jpg',
];

test('renders 15 tiles with the original thumbnails in the original order', async ({ page }) => {
  await page.goto('/');
  const tiles = page.locator('[data-portfolio-tile]');
  await expect(tiles).toHaveCount(15);

  const srcs = await tiles.locator('img').evaluateAll((imgs) =>
    imgs.map((i) => new URL((i as HTMLImageElement).src).pathname),
  );
  expect(srcs).toEqual(EXPECTED_THUMBNAILS);
});

test('every thumbnail actually loads', async ({ page }) => {
  await page.goto('/');
  const broken = await page.locator('[data-portfolio-tile] img').evaluateAll((imgs) =>
    imgs.filter((i) => !(i as HTMLImageElement).naturalWidth).map((i) => (i as HTMLImageElement).src),
  );
  expect(broken).toEqual([]);
});

test('tiles are keyboard-reachable buttons with accessible names', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-portfolio-tile]').first()).toHaveAttribute(
    'aria-label',
    'View details for MyAds',
  );
});
