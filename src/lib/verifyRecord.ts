import { Settings } from 'react-native';

import { uiVerifyArgument } from './uiVerify';

const startedAt = Date.now();

export function verifyRecorder(key: string) {
  const run = uiVerifyArgument('uiVerifyLiveRun') ?? '';
  const entries: { label: string; at: number }[] = [];
  const write = () => Settings.set({ [key]: JSON.stringify({ run, startedAt, entries }) });
  write();
  return (label: string) => {
    entries.push({ label, at: Date.now() - startedAt });
    write();
  };
}
