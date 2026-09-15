import { test, expect } from '@playwright/test';

test.describe('atittle.com Smoke Tests', () => {
  test('homepage loads and renders critical sections', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/atittle.com/i);

    // Skip to main content link
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();

    // Hero section
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // Navigation links
    await expect(page.locator('header nav[aria-label="Primary"] a[href="/demos"]')).toBeVisible();
    await expect(page.locator('header nav[aria-label="Primary"] a[href="/pricing"]')).toBeVisible();
    await expect(page.locator('header a[href="/contact"]').first()).toBeVisible();

    // Industry showcase section
    const industrySection = page.locator('#industries');
    await expect(industrySection).toBeAttached();

    // Footer with copyright
    const footer = page.locator('footer');
    await expect(footer).toBeAttached();
  });

  test('all registered industry demo entry points load successfully', async ({ page }) => {
    const demos = [
      { path: '/demos/anaar-awadhi-table', name: 'Anaar' },
      { path: '/demos/ivory-smiles', name: 'Ivory Smiles' },
      { path: '/demos/kayal-backwaters', name: 'Kayal Backwaters' },
      { path: '/demos/manthan-institute', name: 'Manthan Institute' },
      { path: '/demos/sanjeevani-clinic', name: 'Sanjeevani Clinic' },
      { path: '/demos/shivalik-homes', name: 'Shivalik Homes' },
      { path: '/demos/repwork-studio', name: 'Repwork Studio' },
      { path: '/demos/meridian-advisory', name: 'Meridian Advisory' },
    ];

    for (const demo of demos) {
      const res = await page.goto(demo.path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('Ivory Smiles treatment filter works', async ({ page }) => {
    await page.goto('/demos/ivory-smiles/treatments/');
    await expect(page.locator('h1')).toBeVisible();

    const allBtn = page.locator('button[data-filter="All"]');
    await expect(allBtn).toBeVisible();

    // Filter by Preventive
    const preventiveBtn = page.locator('button[data-filter="Preventive"]');
    if (await preventiveBtn.isVisible()) {
      await preventiveBtn.click();
      await expect(preventiveBtn).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('Kayal Backwaters stay planner calculates estimates', async ({ page }) => {
    await page.goto('/demos/kayal-backwaters');
    const form = page.locator('form[data-stay-planner]');
    await expect(form).toBeAttached();

    // Fill dates
    await page.locator('input[name="arrival"]').fill('2026-10-01');
    await page.locator('input[name="departure"]').fill('2026-10-05');
    await page.locator('button[type="submit"]:has-text("Preview my stay")').click();

    const result = page.locator('[data-stay-result]');
    await expect(result).toBeVisible();
    await expect(result).not.toHaveText('Choose your dates to see an indicative room total.');
  });

  test('Shivalik Homes EMI calculator calculates EMI', async ({ page }) => {
    await page.goto('/demos/shivalik-homes/projects/shivalik-meadows');
    const form = page.locator('form[data-emi-calculator]');
    await expect(form).toBeAttached();

    const emiResult = page.locator('[data-emi-result]');
    await expect(emiResult).toBeVisible();
    await expect(emiResult).not.toHaveText('—');
  });

  test('Contact form validation works on invalid submission', async ({ page }) => {
    await page.goto('/contact');
    const form = page.locator('form[data-enquiry-form]');
    await expect(form).toBeAttached();

    // Attempt submit with empty inputs
    const submitBtn = page.locator('button[data-submit-btn]');
    await submitBtn.click();

    // Name field should be invalid
    const nameInput = page.locator('input[name="name"]');
    const isInvalid = await nameInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });
});
