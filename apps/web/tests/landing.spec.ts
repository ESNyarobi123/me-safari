import { test, expect, type Page } from '@playwright/test';
const apis = ['http://127.0.0.1:4000/v1/public/', 'http://127.0.0.1:4010/v1/public/'];
async function routePublic(page: Page, handler: Parameters<Page['route']>[1]) {
  for (const api of apis) await page.route(`${api}**`, handler);
}
async function unavailable(page: Page) {
  await routePublic(page, (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'DEPENDENCY_UNAVAILABLE' } }) }));
}

for (const width of [320, 360, 390, 768, 1024, 1440]) {
  test(`responsive presentation, all 7 app screens at ${width}px`, async ({ page }) => {
    await unavailable(page); await page.setViewportSize({ width, height: 900 });
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Safaris that deliver adventure/i })).toBeVisible();
    await expect(page.getByText('Showing supplied sample journeys.')).toBeVisible();
    await page.locator('#app-experience').scrollIntoViewIfNeeded();
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(7);
    for (let index = 0; index < 7; index++) {
      await tabs.nth(index).click();
      await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true');
    }
    await expect(page.locator('#app-experience')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('catalog fallback filters, modal keyboard and honest unavailable download', async ({ page }) => {
  await unavailable(page); await page.goto('/');
  await page.getByRole('button', { name: 'Coast', exact: true }).click();
  await expect(page.locator('.destination-card')).toHaveCount(1);
  await expect(page.locator('a.destination-card').first()).toHaveAttribute('href', '/packages/zanzibar/');
  await page.getByRole('button', { name: /View featured/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Demonstration rate, awaiting owner approval.')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'App Store — coming soon' }).first().click();
  await expect(page.getByRole('dialog').getByText('The store release is not available yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.locator('#app-experience').scrollIntoViewIfNeeded();
  await page.getByRole('tab', { name: /My Trips & Pickup/ }).click();
  await expect(page.getByRole('tab', { name: /My Trips & Pickup/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Photo & font credits' }).scrollIntoViewIfNeeded();
  await expect.poll(async () => { const button = page.getByRole('button', { name: 'Photo & font credits' }); return button.evaluate(el => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el; }); }).toBe(true);
  await page.getByRole('button', { name: 'Photo & font credits' }).click();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Serengeti giraffe — Justin Lane / Unsplash' })).toBeVisible();
});

test('published public API data replaces fallback and valid store links navigate', async ({ page }) => {
  const reads: string[] = []; page.on('request', request => { if (/127\.0\.0\.1:40(00|10)/.test(request.url())) reads.push(request.url()); });
  await routePublic(page, (route) => {
    const path = route.request().url().split('/public/')[1];
    const pkg = { id: 'public-example', slug: 'public-example', title: 'Published test experience', description: 'API published content', durationDays: 2, category: 'wildlife', coverUrl: '/assets/safari.jpg', fromPrice: { currency: 'USD', minor: '250000' }, demoRate: false, itinerary: { days: [{ day: 1, title: 'API first day' }] }, inclusions: ['Local guiding'] };
    const data = path === 'packages' ? [pkg] : path === 'packages/public-example' ? pkg : path === 'company' ? { name: 'Me and Adventure Safaris', email: 'public@example.com', phone: '+255 682 886 259' } : path === 'app-release' ? { state: 'AVAILABLE', appStoreUrl: 'https://apps.apple.com/tz/app/example/id123456789', playStoreUrl: 'https://play.google.com/store/apps/details?id=example.app' } : path === 'services' || path === 'destinations' ? [] : {};
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, meta: { requestId: 'test' } }) });
  });
  await page.goto('/');
  const liveCard = page.getByRole('link', { name: 'View Published test experience' });
  await expect(liveCard).toBeVisible();
  await expect(liveCard).toHaveAttribute('href', '/packages/public-example/');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'Open M&A Safaris on App Store' }).first()).toHaveAttribute('href', 'https://apps.apple.com/tz/app/example/id123456789');
  await expect(page.getByRole('link', { name: 'Open M&A Safaris on Google Play' }).first()).toHaveAttribute('href', 'https://play.google.com/store/apps/details?id=example.app');
  await expect(page.getByRole('link', { name: 'public@example.com' })).toHaveAttribute('href', 'mailto:public%40example.com');
  expect(reads.length).toBeGreaterThanOrEqual(7); expect(reads.every(url => url.includes('/v1/public/'))).toBe(true);
});

test('empty published catalog remains empty and unapproved store links stay coming soon', async ({ page }) => {
  await routePublic(page, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: route.request().url().endsWith('packages') || route.request().url().includes('/packages?') ? [] : route.request().url().includes('app-release') ? { state: 'AVAILABLE', appStoreUrl: 'https://evil.example/app', playStoreUrl: 'javascript:alert(1)' } : {} }) }));
  await page.goto('/');
  await expect(page.getByText('New journeys are being prepared.')).toBeVisible();
  await expect(page.locator('.destination-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'App Store — coming soon' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Google Play — coming soon' }).first()).toBeVisible();
});

test('journey pages are crawlable, self-canonical and carry the lead form', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('a.destination-card').first();
  const href = await card.getAttribute('href');
  expect(href).toMatch(/^\/packages\/[a-z0-9-]+\/$/);
  await page.goto(href!);

  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${href!.replace(/\/$/, '')}/$`));
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https?:\/\/.+/);

  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  const schema = JSON.parse(raw || '{}');
  expect(schema['@graph'].some((node: { '@type'?: string }) => node['@type'] === 'TouristTrip')).toBe(true);
  expect(schema['@graph'].some((node: { '@type'?: string }) => node['@type'] === 'BreadcrumbList')).toBe(true);

  const form = page.locator('form.ma-form');
  await expect(form).toBeVisible();
  await expect(form.locator('button[type="submit"]')).toHaveText(/Request this journey/i);
  await expect(form.locator('textarea[name="message"]')).toHaveAttribute('placeholder', /Questions about .*/);
});
