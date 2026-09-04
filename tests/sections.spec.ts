import { test, expect } from '@playwright/test';

test('about section matches the original copy and resume link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#about h2')).toHaveText('About');
  await expect(
    page.getByText(
      'Professional Web/Application Developer with experiences of developing high performance Websites / Rich Internet Application.',
    ),
  ).toBeVisible();

  const resume = page.getByRole('link', { name: /Download Resume/ });
  await expect(resume).toHaveAttribute('href', '/docs/Takashi%20Aoki.docx');
});

test('the resume file is actually downloadable', async ({ request }) => {
  const response = await request.get('/docs/Takashi%20Aoki.docx');
  expect(response.status()).toBe(200);
});

test('footer links to LinkedIn and GitHub', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer h3')).toHaveText('Around the Web');
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
    'href',
    'https://www.linkedin.com/in/taak77',
  );
  await expect(page.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/taak77',
  );
});

test('scroll-to-top shows on mobile and hides on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/');
  await expect(page.locator('[data-scroll-top]')).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('[data-scroll-top]')).toBeHidden();
});
