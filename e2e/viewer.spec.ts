import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

/** Collect console errors and uncaught exceptions so a test can assert there were none. */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

/** True when the canvas shows more than a flat background, i.e. something was rendered. */
async function canvasHasContent(page: Page) {
  const shot = await page.locator('#viewport canvas').screenshot();
  // PNG bytes of a flat image compress to very little; a rendered model does not.
  return shot.length > 15_000;
}

test('shows the demo model with stats and no errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');

  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#project-title')).toHaveText('Demo: desk lamp');
  await expect(page.locator('body')).toHaveAttribute('data-meshes', '8');
  await expect(page.locator('#stats')).toContainText('Triangles');
  expect(await canvasHasContent(page)).toBe(true);
  expect(errors).toEqual([]);
});

test('switches shading mode from the panel', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');

  const shading = page.locator('.lil-gui .controller', { hasText: 'Shading' }).locator('select');
  for (const label of ['Wireframe', 'Clay', 'Normals', 'UV checker', 'Shaded (materials)']) {
    await shading.selectOption({ label });
    await expect(shading.locator('option:checked')).toHaveText(label);
  }
  expect(await canvasHasContent(page)).toBe(true);
  expect(errors).toEqual([]);
});

test('previews a .glb dropped onto the page', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');

  const bytes = [...readFileSync(fileURLToPath(new URL('./fixtures/cube.glb', import.meta.url)))];
  const dataTransfer = await page.evaluateHandle((data) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(data)], 'cube.glb', { type: 'model/gltf-binary' }));
    return transfer;
  }, bytes);
  await page.dispatchEvent('body', 'dragenter', { dataTransfer });
  await page.dispatchEvent('body', 'drop', { dataTransfer });

  await expect(page.locator('#project-title')).toHaveText('cube.glb');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('body')).toHaveAttribute('data-meshes', '1');
  await expect(page.locator('#stats')).toContainText('12');
  expect(errors).toEqual([]);
});

test('rejects files that are not models', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');

  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    return transfer;
  });
  await page.dispatchEvent('body', 'drop', { dataTransfer });

  await expect(page.locator('#status')).toContainText('not a .glb');
  await expect(page.locator('#project-title')).toHaveText('Demo: desk lamp');
});
