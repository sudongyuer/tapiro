import { afterEach, describe, expect, test } from 'bun:test';
import { createInstance } from 'i18next';

import { setClockStyle } from '../../../src/lib/deviceClock';
import { resources } from '../../../src/lib/i18n/resources';
import { latinSpacing } from '../../../src/lib/i18n/latinSpacing';
import { sentenceStart, sentenceStartOptions } from '../../../src/lib/i18n/sentenceStart';
import enApp from '../../../src/lib/i18n/locales/liveActivity/en';
import msApp from '../../../src/lib/i18n/locales/liveActivity/ms';
import zhApp from '../../../src/lib/i18n/locales/liveActivity/zh-Hans';
import {
  liveActivityContent,
  type LiveActivitySubject,
} from '../../../src/lib/live-activity/content';
import { LIVE_ACTIVITY_COPY } from './liveActivityCopy.ts';
import { liveActivityState, parseSubjects, type Subject } from './liveActivityContent.ts';

const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const NOW = new Date(2026, 10, 26, 13, 8, 30).getTime();
const at = (hour: number, minute: number) => new Date(2026, 10, 26, hour, minute).getTime();

function appT(language: string) {
  const i18n = createInstance();
  i18n
    .use(sentenceStart)
    .use(latinSpacing)
    .init({
      ...sentenceStartOptions,
      postProcess: [...sentenceStartOptions.postProcess, 'latinSpacing'],
      resources,
      lng: language,
      initAsync: false,
      interpolation: { escapeValue: false },
    });
  return i18n.t;
}

const SUBJECTS: LiveActivitySubject[] = [
  {
    kind: 'bounty',
    id: 'b1',
    phase: 'onTheWay',
    helper: 'Lily',
    place: '图书馆',
    task: '帮取快递',
    leftAt: at(13, 2),
    etaAt: at(13, 14),
  },
  {
    kind: 'bounty',
    id: 'b2',
    phase: 'onTheWay',
    helper: 'pihak lain',
    place: null,
    task: 'Ambil bungkusan',
    leftAt: at(13, 2),
    etaAt: at(13, 9),
  },
  {
    kind: 'bounty',
    id: 'b3',
    phase: 'arrived',
    helper: '小林',
    place: null,
    leftAt: at(12, 40),
    arrivedAt: at(13, 1),
  },
  {
    kind: 'ride',
    id: 'r1',
    phase: 'meetup',
    start: { name: 'Sunway Geo', home: true },
    gatherAt: at(12, 51),
    departAt: at(13, 21),
    arrived: 1,
    total: 1,
  },
  {
    kind: 'ride',
    id: 'r2',
    phase: 'departed',
    start: { name: '金字塔', home: false },
    gatherAt: at(12, 30),
    departedAt: at(13, 0),
    aboard: 1,
  },
];

const serverSubject = (subject: LiveActivitySubject) => subject as Subject;

const appState = (subject: LiveActivitySubject, language: string) => {
  const {
    staleAfterSeconds: _stale,
    minutes,
    ...rest
  } = liveActivityContent(subject, appT(language), NOW);
  return { ...rest, minutes: minutes ?? null };
};

afterEach(() => setClockStyle('zh-Hans', true));

describe('the server draws the same Live Activity as the app', () => {
  test('the copy is the app copy, key for key', () => {
    expect(LIVE_ACTIVITY_COPY['zh-Hans']).toEqual(zhApp);
    expect(LIVE_ACTIVITY_COPY.en).toEqual(enApp);
    expect(LIVE_ACTIVITY_COPY.ms).toEqual(msApp);
  });

  for (const language of ['zh-Hans', 'en', 'ms']) {
    test(`every phase reads the same in ${language} on a 24-hour clock`, () => {
      setClockStyle(language, true);
      for (const subject of SUBJECTS) {
        expect(
          liveActivityState(
            serverSubject(subject),
            { language, timeZone: ZONE, clock: 'h23' },
            NOW,
          ),
        ).toEqual(appState(subject, language));
      }
    });
  }

  test('and on a 12-hour clock', () => {
    setClockStyle('en', false);
    for (const subject of SUBJECTS) {
      expect(
        liveActivityState(
          serverSubject(subject),
          { language: 'en', timeZone: ZONE, clock: 'h12' },
          NOW,
        ),
      ).toEqual(appState(subject, 'en'));
    }
  });

  test('rows are read like the app reads them; a broken row is reported by its link', () => {
    const read = parseSubjects([
      {
        kind: 'ride',
        id: 'r9',
        phase: 'meetup',
        startName: 'Sunway',
        startHome: false,
        gatherAt: '2026-11-26T04:50:00Z',
        departAt: '2026-11-26T05:20:00Z',
        arrived: 0,
        total: 2,
      },
      { kind: 'bounty', id: 'b9', phase: 'onTheWay', helper: 'X' },
    ]);
    expect(read.subjects.map((subject) => subject.id)).toEqual(['r9']);
    expect([...read.unreadable]).toEqual(['tapiro://bounty/status/b9']);
  });
});
