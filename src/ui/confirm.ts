import { findNodeHandle } from 'react-native';
import { confirm } from 'tapiro-kit';

export type ConfirmCopy = { title: string; message?: string; confirm: string; keep: string };

export type ConfirmAnchor = number | 'bar' | null;

export function anchorOf(target: unknown): ConfirmAnchor {
  if (target == null) return null;
  if (typeof target === 'number') return target;
  return findNodeHandle(target as Parameters<typeof findNodeHandle>[0]) ?? null;
}

export function pressAnchor(event: { currentTarget?: unknown; target?: unknown }): ConfirmAnchor {
  return anchorOf(event.currentTarget) ?? anchorOf(event.target);
}

export function askConfirm(copy: ConfirmCopy, destructive: boolean, anchor: ConfirmAnchor) {
  return confirm({
    title: copy.title,
    message: copy.message ?? null,
    confirm: copy.confirm,
    keep: copy.keep,
    destructive,
    anchorTag: typeof anchor === 'number' ? anchor : undefined,
    anchorBar: anchor === 'bar',
  });
}
