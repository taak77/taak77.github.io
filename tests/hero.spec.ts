import { test, expect } from '@playwright/test';

test('head metadata matches the original', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Portfolio - Takashi Aoki');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.locator('link[rel=icon]')).toHaveAttribute('href', '/img/notion.svg');
});

test('hero renders name, title, intro, and avatar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Takashi Aoki', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Software Engineer', { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      'An accomplished detail-oriented application developer with 20+ years of professional experience in software engineering.',
    ),
  ).toBeVisible();
  await expect(page.locator('header img')).toHaveAttribute(
    'src',
    /en\.gravatar\.com\/userimage\/34773047/,
  );
});

test('the hero divider is present without a star icon', async ({ page }) => {
  await page.goto('/');
  const divider = page.locator('header .star-divider--light');
  await expect(divider).toBeVisible();
  await expect(divider.locator('svg')).toHaveCount(0);
});
