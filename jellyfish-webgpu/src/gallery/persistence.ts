import { EMPTY_TASTE_PROFILE, type TasteProfile } from './model/tasteProfile';
import type { AxisStudy } from './model/study';
import type { SpecimenRecipe } from './model/recipe';

export interface GalleryPersistenceDocument {
  version: 3;
  specimens: SpecimenRecipe[];
  favorites: string[];
  studies: AxisStudy[];
  tasteProfile: TasteProfile;
}

const STORAGE_KEY = 'jellyfish-gallery-studio';
const LEGACY_KEY = 'jellyfish-gallery-saved';

export function emptyPersistence(): GalleryPersistenceDocument {
  return { version: 3, specimens: [], favorites: [], studies: [], tasteProfile: structuredClone(EMPTY_TASTE_PROFILE) };
}

export function loadGalleryPersistence(storage: Storage = localStorage): GalleryPersistenceDocument {
  try {
    const current = storage.getItem(STORAGE_KEY);
    if (current) return normalize(JSON.parse(current));
    const legacy = storage.getItem(LEGACY_KEY);
    if (legacy) return migrateLegacy(JSON.parse(legacy));
  } catch {
    return emptyPersistence();
  }
  return emptyPersistence();
}

export function saveGalleryPersistence(document: GalleryPersistenceDocument, storage: Storage = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(document));
}

function normalize(value: Partial<GalleryPersistenceDocument>): GalleryPersistenceDocument {
  return {
    version: 3,
    specimens: Array.isArray(value.specimens) ? value.specimens : [],
    favorites: Array.isArray(value.favorites) ? value.favorites : [],
    studies: Array.isArray(value.studies) ? value.studies : [],
    tasteProfile: value.tasteProfile ?? structuredClone(EMPTY_TASTE_PROFILE),
  };
}

function migrateLegacy(value: Array<{ id: string; seed: string; orderId: string; sectionId: string; surfaceId: string; tweaks?: Record<string, number>; savedAt?: number }>): GalleryPersistenceDocument {
  const document = emptyPersistence();
  document.specimens = value.map((form) => ({
    schemaVersion: 1,
    id: form.id,
    createdAt: form.savedAt ?? Date.now(),
    seed: form.seed,
    vessel: {
      orderId: form.orderId,
      sectionId: form.sectionId as never,
      surfaceId: form.surfaceId as never,
      values: form.tweaks ?? {},
    },
    character: { modules: { tail: false, mouth: false, tentacles: false }, values: {} },
  }));
  document.favorites = document.specimens.map((specimen) => specimen.id);
  return document;
}
