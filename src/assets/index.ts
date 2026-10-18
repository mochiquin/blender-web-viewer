/**
 * Collects the art files in src/assets/* at build time (Vite's import.meta.glob), so adding or
 * replacing a file is all it takes. See slots.ts for the naming rules.
 */
import { backdrops, covers, posterLayers } from './slots';

const poster = import.meta.glob('./poster/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const cover = import.meta.glob('./covers/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const backdrop = import.meta.glob('./backdrops/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const POSTER_LAYERS = posterLayers(poster);
export const COVERS = covers(cover);
export const CUSTOM_BACKDROPS = backdrops(backdrop);
