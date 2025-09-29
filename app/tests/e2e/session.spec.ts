import { expect, test } from '@playwright/test';

test.describe('PocketStudy basics', () => {
  test('loads the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'PocketStudy' })).toBeVisible();
    await expect(page.getByRole('link', { name: /learn/i })).toBeVisible();
  });

  test('lists demo course in catalog', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible();
    await expect(page.getByText('Learning How to Learn')).toBeVisible();
  });
});
