export type AppStateSource = {
  currentState?: string | null;
  addEventListener(type: 'change', listener: (state: string) => void): { remove: () => void };
};

// iOS reports inactive → active for a launch, a system alert, Control Center and the app switcher; only a return
// from background means the app missed time and has to read again.
export function onReturnToForeground(appState: AppStateSource, run: () => void) {
  let wasBackground = appState.currentState === 'background';
  const subscription = appState.addEventListener('change', (next) => {
    if (next === 'background') wasBackground = true;
    if (next !== 'active' || !wasBackground) return;
    wasBackground = false;
    run();
  });
  return () => subscription.remove();
}
