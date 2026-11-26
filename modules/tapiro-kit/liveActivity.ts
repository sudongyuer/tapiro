import { NativeModule, requireNativeModule } from 'expo';

export type LiveActivityState = {
  title: string;
  staleTitle: string;
  detail: string;
  minutes?: number;
  unit: string;
  progress: number;
  startLabel: string;
  endLabel: string;
  staleNote: string;
  staleAfterSeconds?: number;
};
export type LiveActivityStartResult =
  | { status: 'ok'; id: string }
  | { status: 'disabled' }
  | {
      status: 'failed';
      code:
        'unsupported' | 'disabled' | 'tooMany' | 'tooLarge' | 'unentitled' | 'failed' | 'unknown';
    };
export type LiveActivityChangeResult = { status: 'ok' | 'notFound' };
export type LiveActivityRunState =
  'active' | 'stale' | 'ended' | 'dismissed' | 'pending' | 'unknown';
export type LiveActivityInfo = {
  id: string;
  kind: string;
  link: string | null;
  state: LiveActivityRunState;
};
export type LiveActivityPushSetUp = { deviceKey?: string; startToken?: string };

type LiveActivityEvents = {
  onLiveActivityStartToken(event: { token: string }): void;
};

declare class LiveActivityKit extends NativeModule<LiveActivityEvents> {
  liveActivityStart(
    kind: string,
    link: string | null,
    state: LiveActivityState,
  ): Promise<LiveActivityStartResult>;
  liveActivityUpdate(id: string, state: LiveActivityState): Promise<LiveActivityChangeResult>;
  liveActivityEnd(
    id: string,
    state: LiveActivityState | null,
    dismissAfterSeconds: number,
  ): Promise<LiveActivityChangeResult>;
  liveActivityEnabled(): Promise<boolean>;
  liveActivityList(): Promise<LiveActivityInfo[]>;
  liveActivityPushSetUp(url: string, anonKey: string): Promise<LiveActivityPushSetUp>;
  liveActivityPushFlush(): Promise<void>;
}

const kit = requireNativeModule<LiveActivityKit>('TapiroKit');

export const LiveActivity = {
  start(
    kind: string,
    link: string | null,
    state: LiveActivityState,
  ): Promise<LiveActivityStartResult> {
    return kit.liveActivityStart(kind, link, state);
  },
  update(id: string, state: LiveActivityState): Promise<LiveActivityChangeResult> {
    return kit.liveActivityUpdate(id, state);
  },
  end(id: string, state: LiveActivityState | null, dismissAfterSeconds: number) {
    return kit.liveActivityEnd(id, state, dismissAfterSeconds);
  },
  enabled(): Promise<boolean> {
    return kit.liveActivityEnabled();
  },
  list(): Promise<LiveActivityInfo[]> {
    return kit.liveActivityList();
  },
  pushSetUp(url: string, anonKey: string): Promise<LiveActivityPushSetUp> {
    return kit.liveActivityPushSetUp(url, anonKey);
  },
  pushFlush(): Promise<void> {
    return kit.liveActivityPushFlush();
  },
  onStartToken(cb: (token: string) => void): { remove(): void } {
    return kit.addListener('onLiveActivityStartToken', (event) => cb(event.token));
  },
};
