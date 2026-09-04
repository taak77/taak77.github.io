import { test, expect } from '@playwright/test';

test('clicking a tile opens the dialog with that project', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-portfolio-tile]').first().click();

  const dialog = page.locator('dialog[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog.locator('[data-modal-title]')).toHaveText('MyAds');
  await expect(dialog.locator('[data-modal-description]')).toHaveText('Self serve ad platform');
  await expect(dialog.locator('[data-modal-tools]')).toHaveText('jQuery, Adobe Flex');
});

test('a multi-image project renders every image', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-portfolio-tile]').nth(4).click(); // Stats Lab

  const dialog = page.locator('dialog[data-portfolio-dialog]');
  await expect(dialog.locator('[data-modal-title]')).toHaveText('Stats Lab');
  await expect(dialog.locator('[data-modal-image]')).toHaveCount(4);
});

test('Escape closes the dialog', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-portfolio-tile]').first().click();
  await expect(page.locator('dialog[data-portfolio-dialog]')).toHaveAttribute('open', '');

  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[data-portfolio-dialog]')).not.toHaveAttribute('open', '');
});

test('the Close button closes the dialog', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-portfolio-tile]').first().click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('dialog[data-portfolio-dialog]')).not.toHaveAttribute('open', '');
});

test('focus returns to the triggering tile on close', async ({ page }) => {
  await page.goto('/');
  const tile = page.locator('[data-portfolio-tile]').nth(2);
  await tile.click();
  await page.keyboard.press('Escape');

  const label = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  expect(label).toBe('View details for NFL Schedules page');
});

test('body scroll is locked while open and restored on close', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-portfolio-tile]').first().click();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

  await page.evaluate(() => {
    const dialog = document.querySelector('dialog[data-portfolio-dialog]')!;
    dialog.addEventListener(
      'cancel',
      () => {
        document.documentElement.dataset.overflowDuringCancel = document.body.style.overflow;
      },
      { once: true },
    );
  });
  await page.keyboard.press('Escape');
  expect(await page.locator('html').getAttribute('data-overflow-during-cancel')).toBe('');
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});
