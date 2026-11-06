import type { TFunction } from 'i18next';

import { tierLabel } from '../profile/profileView';
import type { TierDrop, TierDropNoShow } from '../types';

export type TierDropLines = { title: string; reasons: string[]; wayBack: string };

const KEY = 'reputation.tierDrop';

export function noShowDate(at: string, language: string) {
  return new Intl.DateTimeFormat(`${language}-MY`, { month: 'short', day: 'numeric' }).format(
    new Date(at),
  );
}

function noShowItem(noShow: TierDropNoShow, t: TFunction, language: string) {
  const date = noShowDate(noShow.at, language);
  const title = noShow.title?.trim() || t(`${KEY}.${noShow.kind}`);
  return t(`${KEY}.noShowItem`, { date, title });
}

function reasons(drop: TierDrop, t: TFunction, language: string) {
  const lines: string[] = [];
  if (drop.noShowCount > 0) {
    const items = drop.noShows
      .map((noShow) => noShowItem(noShow, t, language))
      .join(t(`${KEY}.itemJoin`));
    lines.push(
      items
        ? t(`${KEY}.noShows`, { count: drop.noShowCount, items })
        : t(`${KEY}.noShowsBare`, { count: drop.noShowCount }),
    );
  }
  if (drop.negativeReviews > 0) {
    const key = lines.length > 0 ? 'reviewsAlso' : 'reviews';
    lines.push(t(`${KEY}.${key}`, { count: drop.negativeReviews }));
  }
  if (lines.length === 0) {
    lines.push(t(`${KEY}.fewer`, { tier: tierLabel(drop.from, t) }));
  }
  return lines;
}

function joinSteps(steps: string[], t: TFunction) {
  if (steps.length < 2) return steps.join('');
  return `${steps.slice(0, -1).join(t(`${KEY}.stepJoin`))}${t(`${KEY}.stepLast`)}${steps.at(-1)}`;
}

const capitalized = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

function wayBack(drop: TierDrop, t: TFunction) {
  const { settled, newPeople, goodReviews } = drop.toRegain;
  const tier = tierLabel(drop.toRegain.tier, t);
  const steps = [
    settled > 0 ? t(`${KEY}.stepSettled`, { count: settled }) : null,
    newPeople > 0 ? t(`${KEY}.stepPeople`, { count: newPeople }) : null,
    goodReviews > 0 ? t(`${KEY}.stepReviews`, { count: goodReviews }) : null,
  ].filter((step): step is string => step !== null);
  if (steps.length === 0) return t(`${KEY}.keepGoing`, { tier });
  return capitalized(t(`${KEY}.wayBack`, { steps: joinSteps(steps, t), tier }));
}

export function tierDropLines(drop: TierDrop, t: TFunction, language: string): TierDropLines {
  return {
    title: t(`${KEY}.title`, { tier: tierLabel(drop.to, t) }),
    reasons: reasons(drop, t, language),
    wayBack: wayBack(drop, t),
  };
}

const SHEETS_IN_TABS = new Set(['report', 'reply']);

export function tierDropCanShow(segments: readonly string[]) {
  return segments[0] === '(tabs)' && !SHEETS_IN_TABS.has(segments[segments.length - 1] ?? '');
}
