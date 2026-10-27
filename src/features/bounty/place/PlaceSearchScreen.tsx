import {
  Button,
  ContentUnavailableView,
  Host,
  HStack,
  Image,
  List,
  ProgressView,
  Section,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  disabled,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Stack, useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';
import type { PlaceResult, PlaceSuggestion, ResolvedPlace } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import { locationService, type Point } from '@/lib/location';
import { NoticeCard } from '@/ui/NoticeCard';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { currentPlace } from './currentPlace';
import { placePick, type PlacePurpose } from './placePick';
import { placeFacade } from './places';
import { usePlaceSearch } from './usePlaceSearch';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const primary = foregroundStyle({ type: 'hierarchical', style: 'primary' });
const ICON = 20;
const NO_ITEMS: PlaceSuggestion[] = [];
const row = frame({ maxWidth: Infinity, minHeight: vars['--touch-min'], alignment: 'leading' });

type Notice = 'denied' | 'noFix' | 'resolveFailed' | 'stale';
type Busy = { kind: 'current' } | { kind: 'result'; id: string } | null;

const NOTICE_KEYS = {
  denied: 'bounty.place.denied',
  noFix: 'bounty.place.noFix',
  resolveFailed: 'bounty.place.resolveFailed',
  stale: 'bounty.place.stale',
} as const;

function failureNotice(result: Exclude<PlaceResult, { status: 'ok' }>): Notice {
  return result.code === 'stale' ? 'stale' : 'resolveFailed';
}

function useRegion() {
  const [region, setRegion] = useState<Point | null>(null);
  useEffect(() => {
    let live = true;
    void locationService.permission().then(async ({ status }) => {
      if (status !== 'granted') return;
      const point = await locationService.currentPoint();
      if (live && point) setRegion(point);
    });
    return () => {
      live = false;
    };
  }, []);
  return region;
}

export function PlaceSearchScreen({
  purpose,
  onPicked,
}: {
  purpose: PlacePurpose;
  onPicked: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const search = usePlaceSearch(useRegion());
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const mounted = useRef(true);
  const working = useRef(false);
  const searchBar = useFocusedSearchBar();
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const shown = useShownItems(search.state);

  function picked(place: ResolvedPlace) {
    placePick.set(purpose, place);
    onPicked();
  }

  async function run(next: Busy, work: () => Promise<boolean>) {
    if (working.current) return;
    working.current = true;
    setBusy(next);
    setNotice(null);
    let done = false;
    try {
      done = await work();
    } finally {
      working.current = done;
      if (mounted.current) setBusy(null);
    }
  }

  const pickCurrent = () =>
    run({ kind: 'current' }, async () => {
      const result = await currentPlace(locationService, placeFacade.placeAt);
      if (!mounted.current) return true;
      if (result.kind !== 'picked') {
        setNotice(result.kind);
        return false;
      }
      picked(result.place);
      return true;
    });

  const resolve = (id: string) =>
    run({ kind: 'result', id }, async () => {
      const result = await search.resolve(id).catch((): PlaceResult => ({ status: 'failed' }));
      if (!mounted.current) return true;
      if (result.status !== 'ok') {
        setNotice(failureNotice(result));
        return false;
      }
      picked(result.place);
      return true;
    });

  return (
    <Host style={styles.host} testID="place-search">
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            ref: searchBar,
            placeholder: t('bounty.place.searchPlaceholder'),
            autoFocus: true,
            placement: 'stacked',
            hideWhenScrolling: false,
            onChangeText: (event) => search.setQuery(event.nativeEvent.text),
            onCancelButtonPress: () => search.setQuery(''),
          },
        }}
      />
      <List modifiers={[listStyle('insetGrouped'), tint(color('--color-accent'))]}>
        {notice ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t(NOTICE_KEYS[notice])}
            testID="place-search-notice"
          />
        ) : null}
        {purpose === 'post' ? (
          <Section>
            <PlaceRow
              title={t('bounty.place.current')}
              subtitle={t('bounty.place.currentSubtitle')}
              systemImage="location.fill"
              busyLabel={busy?.kind === 'current' ? t('bounty.place.locating') : null}
              blocked={busy !== null}
              onPress={pickCurrent}
              testID="place-search-current"
            />
          </Section>
        ) : null}
        <Results
          state={search.state}
          items={shown}
          busy={busy}
          onPick={resolve}
          onRetry={() => search.setQuery(search.query)}
        />
      </List>
    </Host>
  );
}

function useFocusedSearchBar() {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const searchBar = useRef<SearchBarCommands>(null);
  useEffect(
    () =>
      navigation.addListener('transitionEnd', (event) => {
        if (!event.data.closing) searchBar.current?.focus();
      }),
    [navigation],
  );
  return searchBar;
}

function useShownItems(state: ReturnType<typeof usePlaceSearch>['state']) {
  const [items, setItems] = useState(NO_ITEMS);
  const next = state.kind === 'ready' ? state.items : state.kind === 'loading' ? items : NO_ITEMS;
  if (next !== items) setItems(next);
  return next;
}

function Results({
  state,
  items,
  busy,
  onPick,
  onRetry,
}: {
  state: ReturnType<typeof usePlaceSearch>['state'];
  items: PlaceSuggestion[];
  busy: Busy;
  onPick: (id: string) => void;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  if (state.kind === 'idle') return null;
  if (state.kind === 'failed') {
    return (
      <NoticeCard
        tone="urgent"
        icon="exclamationmark.magnifyingglass"
        title={t('bounty.place.failed')}
        action={{ label: t('bounty.place.retry'), onPress: onRetry, testID: 'place-search-retry' }}
        testID="place-search-failed"
      />
    );
  }
  if (state.kind === 'ready' && items.length === 0) {
    return (
      <Section>
        <ContentUnavailableView
          title={t('bounty.place.empty')}
          systemImage="magnifyingglass"
          modifiers={[
            accessibilityElement('combine'),
            accessibilityIdentifier('place-search-empty'),
          ]}
        />
      </Section>
    );
  }
  if (items.length === 0) {
    return (
      <Section>
        <HStack modifiers={[row, accessibilityElement('combine')]}>
          <Spacer />
          <ProgressView modifiers={[accessibilityLabel(t('bounty.place.searching'))]} />
          <Spacer />
        </HStack>
      </Section>
    );
  }
  return (
    <Section title={t('bounty.place.results')}>
      {items.map((item, index) => (
        <PlaceRow
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          busyLabel={
            busy?.kind === 'result' && busy.id === item.id ? t('bounty.place.resolving') : null
          }
          blocked={busy !== null}
          onPress={() => onPick(item.id)}
          testID={`place-search-result-${index}`}
        />
      ))}
    </Section>
  );
}

function PlaceRow({
  title,
  subtitle,
  systemImage,
  busyLabel,
  blocked,
  onPress,
  testID,
}: {
  title: string;
  subtitle: string;
  systemImage?: 'location.fill';
  busyLabel: string | null;
  blocked: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { color } = useTheme();
  return (
    <Button onPress={onPress} testID={testID} modifiers={[disabled(blocked && busyLabel === null)]}>
      <HStack spacing={vars['--space-3']} modifiers={[row, accessibilityElement('combine')]}>
        {systemImage ? (
          <Image
            systemName={systemImage}
            size={ICON}
            modifiers={[foregroundStyle(color('--color-accent')), accessibilityHidden()]}
          />
        ) : null}
        <VStack alignment="leading" spacing={vars['--space-1'] / 2}>
          <Text modifiers={[systemImage ? foregroundStyle(color('--color-accent')) : primary]}>
            {title}
          </Text>
          {subtitle ? (
            <Text modifiers={[font({ textStyle: 'subheadline' }), secondary, lineLimit(2)]}>
              {subtitle}
            </Text>
          ) : null}
        </VStack>
        <Spacer />
        {busyLabel ? <ProgressView modifiers={[accessibilityLabel(busyLabel)]} /> : null}
      </HStack>
    </Button>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
