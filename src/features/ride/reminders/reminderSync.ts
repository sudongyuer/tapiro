import { onReturnToForeground, type AppStateSource } from '@/lib/foreground';

type Answers = { subscribe(listener: () => void): () => void };

export function followReminderSync(appState: AppStateSource, answers: Answers, sync: () => void) {
  sync();
  const offForeground = onReturnToForeground(appState, sync);
  const offAnswers = answers.subscribe(sync);
  return () => {
    offForeground();
    offAnswers();
  };
}
