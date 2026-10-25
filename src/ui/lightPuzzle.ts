export type PressResult = 'step' | 'solved' | 'miss' | 'ignored';

/**
 * The light-path puzzle: points must be lit in the order the light travels. The next point in
 * order extends the chain; any other point breaks it and starts over.
 */
export class LightPuzzle {
  private lit: number[] = [];

  constructor(readonly length: number) {}

  get chain(): readonly number[] {
    return this.lit;
  }

  get solved(): boolean {
    return this.length > 0 && this.lit.length === this.length;
  }

  press(index: number): PressResult {
    if (this.solved || this.lit.includes(index) || index < 0 || index >= this.length) return 'ignored';
    if (index !== this.lit.length) {
      this.lit = [];
      return 'miss';
    }
    this.lit.push(index);
    return this.solved ? 'solved' : 'step';
  }

  reset(): void {
    this.lit = [];
  }
}
