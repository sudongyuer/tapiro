import { useEffect } from 'react';
import { AppState, Settings } from 'react-native';
import { LiveActivity } from 'tapiro-kit';

import { onReturnToForeground } from '../foreground';
import { initI18n } from '../i18n';
import { live } from '../live';
import { getSupabase } from '../supabase';
import { uiVerify } from '../uiVerify';
import { userCleanups } from '../userCleanups';
import { liveActivityContent } from './content';
import { createLiveActivityController, type StartedLinks } from './controller';
import { toLiveActivityRead } from './parse';

const STARTED_KEY = 'liveActivityStarted';
const TICK_MS = 60_000;
const SIGNALS = [
  'bounty.started',
  'bounty.eta_changed',
  'bounty.completed',
  'bounty.cancelled',
  'ride.',
];

const startedLinks: StartedLinks = {
  load() {
    const value: unknown = Settings.get(STARTED_KEY);
    if (typeof value !== 'string') return [];
    try {
      const links: unknown = JSON.parse(value);
      return Array.isArray(links) ? links.filter((link) => typeof link === 'string') : [];
    } catch {
      return [];
    }
  },
  save(links) {
    Settings.set({ [STARTED_KEY]: JSON.stringify(links) });
  },
};

async function loadSubjects() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase is not configured');
  const { data, error } = await client.rpc('live_activity_subjects');
  if (error) throw error;
  return toLiveActivityRead(data);
}

const i18n = initI18n();

export const liveActivities = createLiveActivityController({
  kit: LiveActivity,
  load: loadSubjects,
  content: (subject, now) => liveActivityContent(subject, i18n.t, now),
  started: startedLinks,
  now: Date.now,
});

userCleanups.register(() => void liveActivities.signOut());

export function useLiveActivities(userId: string | null) {
  useEffect(() => {
    if (!userId || uiVerify) return;
    liveActivities.follow();
    const refresh = () => void liveActivities.refresh();
    refresh();
    const offForeground = onReturnToForeground(AppState, refresh);
    const offSignals = live.on(SIGNALS, refresh);
    const timer = setInterval(() => void liveActivities.tick(), TICK_MS);
    return () => {
      offForeground();
      offSignals();
      clearInterval(timer);
    };
  }, [userId]);
}
