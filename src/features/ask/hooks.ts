import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { askDrafts, consentStore } from './services';

export function useConsentState() {
  return useSyncExternalStore(consentStore.subscribe, consentStore.getSnapshot);
}

export function useConsentFor(userId: string | null) {
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      if (consentStore.getSnapshot().userId === userId) void consentStore.refresh();
      else consentStore.start(userId);
    }, [userId]),
  );
  return useConsentState();
}

export type ComposerNote = 'offline' | 'needsUpdate' | 'held' | null;

export function useAskComposer(userId: string | null, openConsent: () => void) {
  const [text, setDraft] = useState(() => (userId ? askDrafts.get(userId) : ''));
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState<ComposerNote>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const setText = useCallback(
    (next: string) => {
      setDraft(next);
      setNote(null);
      if (userId) askDrafts.set(userId, next);
    },
    [userId],
  );

  const send = useCallback(async () => {
    if (!userId || checking || text.trim().length === 0) return;
    setChecking(true);
    setNote(null);
    let access = await consentStore.prepare();
    if (access === 'notGiven' && mounted.current) {
      const asked = consentStore.ask();
      openConsent();
      access = (await asked) === 'given' ? 'given' : 'notGiven';
    }
    if (!mounted.current) return;
    setChecking(false);
    if (access === 'offline' || access === 'needsUpdate') setNote(access);
    else if (access === 'given') setNote('held');
  }, [checking, openConsent, text, userId]);

  return { text, setText, send, checking, note };
}

const NOTE_KEYS = {
  offline: 'ask.composer.offline',
  needsUpdate: 'ask.composer.needsUpdate',
  held: 'ask.composer.held',
} as const;

export const composerNoteKey = (note: ComposerNote) => (note ? NOTE_KEYS[note] : null);
