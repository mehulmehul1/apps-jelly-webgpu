export type GalleryWorkspace = 'vessel' | 'character' | 'costume' | 'gesture' | 'study';

export interface WorkspaceDefinition {
  id: GalleryWorkspace;
  label: string;
  promise: string;
}

export const WORKSPACES: WorkspaceDefinition[] = [
  { id: 'vessel', label: 'Vessel', promise: 'Shape the blank body.' },
  { id: 'character', label: 'Character', promise: 'Add and tune body parts.' },
  { id: 'costume', label: 'Costume', promise: 'Dress the body with material and light.' },
  { id: 'gesture', label: 'Gesture', promise: 'Give the specimen life and social form.' },
  { id: 'study', label: 'Study', promise: 'Ask one clear question of the form.' },
];

export function workspaceIndex(workspace: GalleryWorkspace): number {
  return WORKSPACES.findIndex((item) => item.id === workspace);
}
