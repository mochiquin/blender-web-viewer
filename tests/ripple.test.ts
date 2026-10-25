import { describe, expect, it } from 'vitest';
import { rippleMarkup } from '../src/ui/ripple';

describe('click mark', () => {
  it('stamps a letter and zero-padded coordinates', () => {
    const html = rippleMarkup(12.4, 640, 'N');
    expect(html).toContain('<b>N</b>');
    expect(html).toContain('0012 · 0640');
  });

  it('never prints negative coordinates', () => {
    expect(rippleMarkup(-3, 5, 'A')).toContain('0000 · 0005');
  });
});
