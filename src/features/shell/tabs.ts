export const SHELL_TABS = ['bounty', 'ride', 'messages', 'me'] as const;
export type ShellTab = (typeof SHELL_TABS)[number];

export type TabLocation = { tab: ShellTab; onRoot: boolean };

export function isShellTab(value: unknown): value is ShellTab {
  return typeof value === 'string' && (SHELL_TABS as readonly string[]).includes(value);
}

export function tabLocation(segments: readonly string[]): TabLocation | null {
  const [group, tab, ...rest] = segments;
  if (group !== '(tabs)' || !isShellTab(tab)) return null;
  const onRoot = rest.length === 0 || (rest.length === 1 && rest[0] === 'index');
  return { tab, onRoot };
}
