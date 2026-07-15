import type { CreatureArchetype } from './CreatureArchetype';

const registry = new Map<string, CreatureArchetype>();

/**
 * Register a creature archetype.  Throws if an archetype with the same `id`
 * is already registered.
 */
export function registerArchetype(a: CreatureArchetype): void {
  if (registry.has(a.id)) {
    throw new Error(`Archetype "${a.id}" already registered`);
  }
  registry.set(a.id, a);
}

/**
 * Look up an archetype by id.  Returns `undefined` when not found.
 */
export function getArchetype(id: string): CreatureArchetype | undefined {
  return registry.get(id);
}

/**
 * Return every registered archetype (insertion order).
 */
export function getAllArchetypes(): CreatureArchetype[] {
  return Array.from(registry.values());
}
