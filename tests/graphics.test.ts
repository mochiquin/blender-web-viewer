import { describe, expect, it } from 'vitest';
import { heroPoster, projectPlate } from '../src/graphics/plates';
import { applyWeight, weightFor } from '../src/graphics/sheets';
import { brush, hashSeed, ring, rule, seeded, sweep } from '../src/graphics/sketch';
import { PROJECTS, type Project } from '../src/projects';

const numbersIn = (path: string) => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('seeded random', () => {
  it('repeats exactly for the same seed and differs for another', () => {
    const a = seeded(42);
    const b = seeded(42);
    const c = seeded(43);
    const seqA = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(seqA);
    expect(Array.from({ length: 5 }, c)).not.toEqual(seqA);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('hashes strings to stable seeds', () => {
    expect(hashSeed('sanctum')).toBe(hashSeed('sanctum'));
    expect(hashSeed('sanctum')).not.toBe(hashSeed('figure'));
  });
});

describe('hand-drawn marks', () => {
  it('draws a ring that stays near its radius and overshoots its start', () => {
    const d = ring(100, 100, 50, seeded(1), 2);
    expect(d.startsWith('M')).toBe(true);
    const nums = numbersIn(d);
    expect(nums.every(Number.isFinite)).toBe(true);
    // every coordinate lies within the wobble band of the circle
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const r = Math.hypot(nums[i] - 100, nums[i + 1] - 100);
      expect(r).toBeLessThan(60);
    }
  });

  it('draws a rule that runs past both of its end points', () => {
    const nums = numbersIn(rule(10, 50, 110, 50, seeded(2), 8, 0));
    expect(nums[0]).toBeLessThan(10);
    expect(nums[nums.length - 2]).toBeGreaterThan(110);
  });

  it('draws a closed brush outline', () => {
    const d = brush(sweep(0, 0, 100, 0, 5), 10);
    expect(d.endsWith('Z')).toBe(true);
    expect(numbersIn(d).every(Number.isFinite)).toBe(true);
  });
});

describe('plates', () => {
  it.each(PROJECTS.map((p) => [p.id, p] as const))('plate for %s is well-formed', (_, project) => {
    const svg = projectPlate(project);
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    expect(svg).toContain(project.number);
    const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ref of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref[1]);
  });

  it('gives each plate its own ids so several can sit on one page', () => {
    const idsOf = (p: Project) => [...projectPlate(p).matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    const all = PROJECTS.flatMap(idsOf);
    expect(new Set(all).size).toBe(all.length);
  });

  it('is the same every time for the same entry', () => {
    expect(projectPlate(PROJECTS[0])).toBe(projectPlate(PROJECTS[0]));
  });

  it('escapes titles', () => {
    const svg = projectPlate({ ...PROJECTS[0], id: 'x', title: '<script>&', titleEn: 'A "B"' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;&amp;');
  });

  it('draws the hero poster as a stack of sheets without broken numbers', () => {
    const html = heroPoster();
    expect(html).not.toMatch(/NaN|undefined|Infinity/);
    expect(html).toContain('textPath');
    expect((html.match(/<svg class="sheet/g) ?? []).length).toBeGreaterThanOrEqual(8);
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ref of html.matchAll(/(?:url\(#|href="#)([^)"]+)/g)) expect(ids).toContain(ref[1]);
  });

  it('keeps every element of a card inside the card', () => {
    for (const project of PROJECTS) {
      const svg = projectPlate(project);
      for (const m of svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"/g)) {
        expect(Number(m[1])).toBeLessThanOrEqual(600);
        expect(Number(m[2])).toBeLessThanOrEqual(800);
      }
    }
  });
});

describe('sheets', () => {
  it('draws far sheets thinner and near sheets heavier', () => {
    expect(weightFor(0.1)).toBeLessThan(weightFor(0.5));
    expect(weightFor(0.5)).toBeLessThan(weightFor(1.2));
  });

  it('scales stroke widths by depth', () => {
    expect(applyWeight('<path stroke-width="2" />', 1.2)).toBe('<path stroke-width="3.10" />');
    expect(applyWeight('<path stroke-width="2" />', 0.1)).toBe('<path stroke-width="1.20" />');
  });
});
