import type * as THREE from 'three';
import type { Category } from '../projects';
import { createCathedral } from './cathedral';
import { createSculpture } from './sculpture';
import { createWeapon } from './weapon';

/** Built-in placeholder scenes, one per category, used until real models are added. */
export const PRESETS: Record<Category, () => THREE.Group> = {
  cathedral: createCathedral,
  sculpture: createSculpture,
  weapon: createWeapon,
};
