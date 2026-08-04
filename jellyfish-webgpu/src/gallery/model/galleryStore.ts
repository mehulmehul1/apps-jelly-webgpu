import { analyzeRecipe, type SpecimenAnalysis } from './analysis';
import { branchRecipe, cloneRecipe, type SpecimenRecipe, type WallSpecimen } from './recipe';
import { EMPTY_TASTE_PROFILE, recordFavorite, setExplicitRange, type TasteProfile } from './tasteProfile';
import type { AxisStudy } from './study';
import { loadGalleryPersistence, saveGalleryPersistence } from '../persistence';

export type StudioMode = 'beautiful' | 'laboratory';

export interface GalleryStoreState {
  wall: WallSpecimen[];
  selectedId: string | null;
  draft: SpecimenRecipe | null;
  studies: AxisStudy[];
  favorites: Set<string>;
  tasteProfile: TasteProfile;
  mode: StudioMode;
}

type Listener = (state: GalleryStoreState) => void;

export class GalleryStore {
  private state: GalleryStoreState;
  private listeners = new Set<Listener>();

  constructor(initialWall: WallSpecimen[] = []) {
    const saved = loadGalleryPersistence();
    this.state = {
      wall: [...initialWall, ...saved.specimens.map((recipe) => ({ recipe, label: recipe.id, source: 'branch' as const, parentId: recipe.parentId, favorite: saved.favorites.includes(recipe.id) }))],
      selectedId: null,
      draft: null,
      studies: saved.studies,
      favorites: new Set(saved.favorites),
      tasteProfile: saved.tasteProfile ?? structuredClone(EMPTY_TASTE_PROFILE),
      mode: 'beautiful',
    };
  }

  getState(): GalleryStoreState { return this.state; }
  subscribe(listener: Listener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  select(id: string | null): void {
    const item = this.state.wall.find((entry) => entry.recipe.id === id);
    this.state.selectedId = id;
    this.state.draft = item ? cloneRecipe(item.recipe) : null;
    this.emit();
  }

  branchSelected(): SpecimenRecipe | null {
    if (!this.state.draft) return null;
    const branch = branchRecipe(this.state.draft, `${this.state.draft.id}::branch-${Date.now().toString(36)}`);
    this.state.draft = branch;
    this.state.selectedId = branch.id;
    this.state.wall.push({ recipe: branch, label: `${branch.id} · branch`, source: 'branch', parentId: branch.parentId, favorite: false });
    this.emit();
    return branch;
  }

  updateDraft(mutator: (draft: SpecimenRecipe) => void): void {
    if (!this.state.draft) return;
    const next = cloneRecipe(this.state.draft);
    mutator(next);
    this.state.draft = next;
    const item = this.state.wall.find((entry) => entry.recipe.id === next.id);
    if (item) item.recipe = cloneRecipe(next);
    this.emit();
  }

  toggleFavorite(id = this.state.selectedId): void {
    if (!id) return;
    if (this.state.favorites.has(id)) this.state.favorites.delete(id);
    else this.state.favorites.add(id);
    for (const item of this.state.wall) item.favorite = this.state.favorites.has(item.recipe.id);
    const item = this.state.wall.find((entry) => entry.recipe.id === id);
    if (item) this.state.tasteProfile = recordFavorite(this.state.tasteProfile, flattenNumericValues(item.recipe));
    this.persist();
    this.emit();
  }

  setExplicitRange(path: string, lower: number, upper: number): void {
    this.state.tasteProfile = setExplicitRange(this.state.tasteProfile, path, lower, upper);
    this.persist();
    this.emit();
  }

  setMode(mode: StudioMode): void { this.state.mode = mode; this.emit(); }
  addStudy(study: AxisStudy): void { this.state.studies.push(study); this.persist(); this.emit(); }
  analysis(): SpecimenAnalysis | null { return this.state.draft ? analyzeRecipe(this.state.draft) : null; }

  persist(): void {
    saveGalleryPersistence({ version: 3, specimens: this.state.wall.filter((item) => item.source !== 'seeded').map((item) => item.recipe), favorites: [...this.state.favorites], studies: this.state.studies, tasteProfile: this.state.tasteProfile });
  }

  private emit(): void { for (const listener of this.listeners) listener(this.state); }
}

function flattenNumericValues(recipe: SpecimenRecipe): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(recipe.vessel.values)) result[`vessel.${key}`] = value;
  for (const [key, value] of Object.entries(recipe.character.values)) result[`character.${key}`] = value;
  for (const [key, value] of Object.entries(recipe.costume?.values ?? {})) result[`costume.${key}`] = value;
  for (const [key, value] of Object.entries(recipe.gesture?.values ?? {})) {
    if (typeof value === 'number') result[`gesture.${key}`] = value;
  }
  return result;
}
