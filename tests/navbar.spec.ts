import { test, expect } from '@playwright/test';

test('navbar shrinks past 300px and expands back', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('nav[data-navbar]');
  await expect(nav).toHaveAttribute('data-shrink', 'false');

  await page.evaluate(() => window.scrollTo(0, 400));
  await expect(nav).toHaveAttribute('data-shrink', 'true');

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(nav).toHaveAttribute('data-shrink', 'false');
});

test('brand and nav links are present', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('nav[data-navbar]');
  await expect(nav.getByRole('link', { name: 'Takashi Aoki' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '#portfolio');
  await expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('href', '#about');
});

test('mobile menu toggles and auto-closes on link click', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');

  const menu = page.locator('[data-nav-menu]');
  const toggle = page.locator('[data-nav-toggle]');
  await expect(page.locator('astro-island').filter({ has: toggle })).not.toHaveAttribute('ssr', '');
  await expect(menu).toBeHidden();

  await toggle.click();
  await expect(menu).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await menu.getByRole('link', { name: 'Portfolio' }).click();
  await expect(menu).toBeHidden();
});

test('scrollspy marks the section in view', async ({ page }) => {
  await page.goto('/');
  await page.locator('#portfolio').scrollIntoViewIfNeeded();
  await expect(
    page.locator('nav[data-navbar]').getByRole('link', { name: 'Portfolio' }),
  ).toHaveAttribute('aria-current', 'page');
});
