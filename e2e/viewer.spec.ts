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

test('inspect draws frames, a measured chain and a reticle that reaches to parts', async ({ page }) => {
  await page.goto('/#/inspect/blade');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  const lines = page.locator('.room-inspect .annotation-lines');
  await expect(lines.locator('.chain').first()).toBeAttached();
  await expect(lines.locator('.measure').first()).toContainText(' m');
  await expect(lines.locator('.frame').first()).toBeAttached();

  const box = (await page.locator('.room-inspect .stage').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2 + 5);
  await expect(lines.locator('.reticle')).toBeAttached();
  await expect(lines.locator('.reach').first()).toBeAttached();
});

test('the faint grain sits on the 3D view only, under the overlays', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.room-prelude .grain')).toHaveCount(0);

  await page.goto('/#/inspect/sanctum');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  const grain = page.locator('.room-inspect .stage .grain');
  await expect(grain).toBeAttached();
  expect(await grain.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  expect(Number(await grain.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.15);
  const z = (sel: string) => page.locator(sel).first().evaluate((el) => Number(getComputedStyle(el).zIndex) || 0);
  expect(await z('.room-inspect .annotation-lines')).toBeGreaterThan(await z('.room-inspect .stage .grain'));
});

test('inspects part by part: tour, arrow keys, close, section and layered explode', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/#/inspect/sanctum');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  const report = page.locator('.report');
  await expect(report).toBeHidden();

  await page.locator('.lil-gui .controller', { hasText: '逐项检查' }).locator('button').click();
  await expect(report).toBeVisible();
  await expect(report.locator('.report-code')).toHaveText('P-01');
  await expect(report.locator('.report-checks li')).toHaveCount(8);
  await expect(page.locator('.room-inspect .info')).toBeHidden();

  await page.keyboard.press('ArrowRight');
  await expect(report.locator('.report-code')).toHaveText('P-02');
  await expect(report.locator('.report-progress')).toContainText('已检查 2');
  await page.keyboard.press('ArrowLeft');
  await expect(report.locator('.report-code')).toHaveText('P-01');
  expect(await canvasHasContent(page)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(report).toBeHidden();
  await expect(page.locator('.room-inspect .info')).toBeVisible();

  const section = page.locator('.lil-gui .controller', { hasText: 'Section' }).locator('input[type=text], input[type=number]').first();
  await section.fill('0.5');
  await section.press('Enter');
  expect(await canvasHasContent(page)).toBe(true);

  await page.locator('.lil-gui .controller', { hasText: '逐层展开' }).locator('button').click();
  await expect(page.locator('.lil-gui .controller', { hasText: 'Explode' }).locator('input[type=text], input[type=number]').first()).not.toHaveValue('0');
  expect(errors).toEqual([]);
});

test('clicking a part opens its report, and orbiting does not', async ({ page }) => {
  await page.goto('/#/inspect/figure');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  const canvas = page.locator('.room-inspect canvas');
  const box = (await canvas.boundingBox())!;
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  // A drag across the model orbits the camera and must not pick a part.
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + 60, centre.y + 10, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.report')).toBeHidden();

  // Hovering shows the part name; a plain click on it inspects it.
  await page.mouse.move(centre.x, centre.y);
  await expect(page.locator('.hover-label')).toBeVisible();
  await page.mouse.click(centre.x, centre.y);
  await expect(page.locator('.report')).toBeVisible();
  await page.locator('.report-close').click();
  await expect(page.locator('.report')).toBeHidden();
});

test('light path: wrong order resets, right order lights the beam', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/#/inspect/sanctum');
  await expect(page.locator('body')).toHaveAttribute('data-state', 'ready');
  await page.locator('.lil-gui .controller', { hasText: '光路' }).locator('button').click();
  const marks = page.locator('.lp-mark');
  await expect(marks).toHaveCount(4);
  await expect(page.locator('.callout:visible')).toHaveCount(0);

  // Out of order: nothing stays lit.
  await marks.nth(2).click();
  await expect(page.locator('.lp-mark.lit')).toHaveCount(0);
  await expect(page.locator('.room-inspect .stage')).toHaveClass(/miss/);

  for (let i = 0; i < 4; i++) await marks.nth(i).click();
  await expect(page.locator('.lp-mark.lit')).toHaveCount(4);
  await expect(page.locator('.room-inspect .stage')).toHaveClass(/solved/);
  await expect(page.locator('.status')).toContainText('光路贯通');

  await page.keyboard.press('Escape');
  await expect(page.locator('.room-inspect .stage')).not.toHaveClass(/light-mode/);
  await expect(page.locator('.callout:visible')).toHaveCount(4);
  expect(errors).toEqual([]);
});
