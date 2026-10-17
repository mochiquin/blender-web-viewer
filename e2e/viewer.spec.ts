import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const fixture = fileURLToPath(new URL('./fixtures/cube.glb', import.meta.url));

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
  const shot = await page.locator('.room-inspect canvas').screenshot();
  return shot.length > 15_000; // a flat PNG compresses to very little
}

async function dropFile(page: Page, name: string, bytes: number[], type: string) {
  const dataTransfer = await page.evaluateHandle(
    ({ data, fileName, mime }) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(data)], fileName, { type: mime }));
      return transfer;
    },
    { data: bytes, fileName: name, mime: type },
  );
  await page.dispatchEvent('body', 'dragenter', { dataTransfer });
  await page.dispatchEvent('body', 'drop', { dataTransfer });
}

test('prelude links through to the catalogue', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.locator('.room-prelude h1')).toBeVisible();
  await expect(page.locator('.fan-badge')).toContainText('FAN-MADE');

  await page.getByRole('link', { name: /进入图录/ }).click();
  await expect(page).toHaveURL(/#\/catalogue$/);
  await expect(page.locator('.plate-card[data-category]')).toHaveCount(3);
  await expect(page.locator('.plate-local')).toBeVisible();
  expect(errors).toEqual([]);
});

test('catalogue filters by category', async ({ page }) => {
  await page.goto('/#/catalogue');
  await page.getByRole('button', { name: /雕塑/ }).click();
  await expect(page.locator('.plate-card[data-category]:visible')).toHaveCount(1);
  await expect(page.locator('.plate-card[data-category="sculpture"]')).toBeVisible();
  await page.getByRole('button', { name: /全部/ }).click();
  await expect(page.locator('.plate-card[data-category]:visible')).toHaveCount(3);
});

for (const id of ['sanctum', 'figure', 'blade']) {
  test(`inspects the ${id} preset with callouts and no errors`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(`/#/inspect/${id}`);
    await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
    const callouts = Number(await page.locator('.room-inspect .stage').getAttribute('data-callouts'));
    expect(callouts).toBeGreaterThanOrEqual(3);
    await expect(page.locator('.callout:visible')).toHaveCount(callouts);
    await expect(page.locator('.strip-item.active')).toHaveAttribute('data-id', id);
    expect(await canvasHasContent(page)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('opening a catalogue plate shows that entry', async ({ page }) => {
  await page.goto('/#/catalogue');
  await page.locator('.plate-card[data-category="weapon"]').click();
  await expect(page).toHaveURL(/#\/inspect\/blade$/);
  await expect(page.locator('.room-inspect .info-title')).toHaveText('铳剑 · 占位');
});

test('panel switches shading and backdrop', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/#/inspect/sanctum');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');

  const shading = page.locator('.lil-gui .controller', { hasText: 'Shading' }).locator('select');
  for (const label of ['Wireframe', 'Clay', 'Normals', 'UV checker', 'Shaded (materials)']) {
    await shading.selectOption({ label });
    await expect(shading.locator('option:checked')).toHaveText(label);
  }
  const backdrop = page.locator('.lil-gui .controller', { hasText: 'Backdrop' }).locator('select');
  await backdrop.selectOption({ label: '暮色 Dusk' });
  await expect(page.locator('.room-inspect .backdrop')).toHaveAttribute('data-backdrop', 'dusk');

  await page.locator('.lil-gui .controller', { hasText: 'Callouts' }).locator('input').uncheck();
  await expect(page.locator('.callout:visible')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a .glb dropped on any room opens as a local preview', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/#/catalogue');
  await dropFile(page, 'cube.glb', [...readFileSync(fixture)], 'model/gltf-binary');

  await expect(page).toHaveURL(/#\/inspect\/local$/);
  await expect(page.locator('.room-inspect .info-title')).toHaveText('cube.glb');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('body')).toHaveAttribute('data-meshes', '1');
  await expect(page.locator('.room-inspect .stats')).toContainText('12');
  expect(errors).toEqual([]);
});

test('the local slot offers a file chooser', async ({ page }) => {
  await page.goto('/#/inspect/local');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'empty');
  await page.locator('.empty-local input[type=file]').setInputFiles(fixture);
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('.room-inspect .info-title')).toHaveText('cube.glb');
});

test('rejects files that are not models', async ({ page }) => {
  await page.goto('/#/catalogue');
  await dropFile(page, 'notes.txt', [...Buffer.from('hello')], 'text/plain');
  await expect(page.locator('#toast')).toContainText('notes.txt');
  await expect(page).toHaveURL(/#\/catalogue$/);
});

test('callouts stay on screen on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/inspect/sanctum');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  const boxes = await page.locator('.callout:visible .callout-no').evaluateAll((nodes) =>
    nodes.map((n) => n.getBoundingClientRect()).map((r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })),
  );
  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
  }
});
