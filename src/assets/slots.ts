/**
 * Art asset slots. Drop files into the folders under src/assets/ and they are picked up at build
 * time; nothing else needs editing. Files with ".placeholder." in their name are templates: they
 * show the size and layout to work to, and are never displayed on the site.
 *
 *   src/assets/poster/     hero poster layers, e.g. "20-spire.webp"  (number = depth, 00 far … 99 near)
 *   src/assets/covers/     catalogue covers named by entry id, e.g. "sanctum.webp"
 *   src/assets/backdrops/  inspect-room backdrops, e.g. "cloister.webp" or "dusk-loop.webm"
 */

export interface PosterLayer {
  key: string;
  url: string;
  /** Parallax depth for the sheet stack (same scale as the code-drawn sheets: 0 far, 1.5 near). */
  depth: number;
  /** Depth-of-field blur in px for far and very near layers. */
  blur?: number;
}

export interface CustomBackdrop {
  id: string;
  url: string;
  kind: 'image' | 'video';
}

const IMAGE = /\.(svg|png|webp|jpe?g|avif)$/i;
const VIDEO = /\.(webm|mp4)$/i;

const fileName = (path: string) => path.split('/').pop() ?? path;
const isPlaceholder = (name: string) => /\.placeholder\./i.test(name);
const stem = (name: string) => name.replace(/\.placeholder(?=\.)/i, '').replace(/\.[^.]+$/, '');

/** Map a layer number (00–99) to a sheet depth and blur, so far layers drift less and soften. */
export function depthFor(order: number): { depth: number; blur?: number } {
  const depth = Math.round((order / 99) * 1.5 * 100) / 100;
  if (order < 15) return { depth, blur: 2.5 };
  if (order > 92) return { depth, blur: 1.2 };
  return { depth };
}

/**
 * Poster layers from file paths: real files only, ordered back to front by their number prefix.
 * Files without a number go in the middle (50).
 */
export function posterLayers(files: Record<string, string>): PosterLayer[] {
  return Object.entries(files)
    .map(([path, url]) => ({ name: fileName(path), url }))
    .filter(({ name }) => IMAGE.test(name) && !isPlaceholder(name))
    .map(({ name, url }) => {
      const match = /^(\d{1,2})[-_ ]/.exec(name);
      const order = match ? Number(match[1]) : 50;
      return { key: stem(name), url, order, ...depthFor(order) };
    })
    .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key))
    .map(({ order: _order, ...layer }) => layer);
}

/** Cover images keyed by catalogue entry id (file stem), real files only. */
export function covers(files: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [path, url] of Object.entries(files)) {
    const name = fileName(path);
    if (IMAGE.test(name) && !isPlaceholder(name)) result[stem(name)] = url;
  }
  return result;
}

/** Custom backdrops from images and looping videos, real files only, sorted by name. */
export function backdrops(files: Record<string, string>): CustomBackdrop[] {
  return Object.entries(files)
    .map(([path, url]) => ({ name: fileName(path), url }))
    .filter(({ name }) => (IMAGE.test(name) || VIDEO.test(name)) && !isPlaceholder(name))
    .map(({ name, url }): CustomBackdrop => ({ id: stem(name), url, kind: VIDEO.test(name) ? 'video' : 'image' }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
