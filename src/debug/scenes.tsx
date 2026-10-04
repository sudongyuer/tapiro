import type { ComponentType } from 'react';

import { DesignTokensScene } from './DesignTokensScene';

export type Scene = {
  id: string;
  title: string;
  Component: ComponentType<{ onReady: () => void }>;
};

export const scenes: Scene[] = [
  { id: 'design-tokens', title: 'Design tokens', Component: DesignTokensScene },
];

export function findScene(id: string) {
  return scenes.find((scene) => scene.id === id);
}
