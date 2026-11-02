import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { PlatformColor, StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { PressDim } from '@/ui/PressDim';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import type { SplitMode } from '../types';

const ICON = 17;
const LOCK = 11;

export function Card({
  children,
  testID,
  tone,
}: {
  children: ReactNode;
  testID: string;
  tone?: 'warning';
}) {
  const { color } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tone
            ? color('--color-warning-fill')
            : PlatformColor('secondarySystemGroupedBackground'),
        },
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}

function Tile({
  icon,
  title,
  sub,
  onPress,
  testID,
}: {
  icon: SFSymbol;
  title: string;
  sub: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <PressDim
      style={[styles.card, styles.tile]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}，${sub}`}
      testID={testID}
    >
      <SymbolView name={icon} size={ICON} tintColor={PlatformColor('label')} />
      <View style={styles.tileText}>
        <AppText variant="secondary" numberOfLines={1} style={styles.bold}>
          {title}
        </AppText>
        <AppText variant="meta" tone="secondaryLabel" numberOfLines={1}>
          {sub}
        </AppText>
      </View>
    </PressDim>
  );
}

export function MeetupTiles({
  organiser,
  plate,
  failed,
  onNavigate,
  onGrab,
  onPlate,
}: {
  organiser: boolean;
  plate: string | null;
  failed: 'maps' | 'grab' | null;
  onNavigate: () => void;
  onGrab: () => void;
  onPlate: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <View style={styles.tiles}>
      <View style={styles.tileRow}>
        <Tile
          icon="location.north.fill"
          title={t('ride.detail.meetup.navigate')}
          sub={t('ride.detail.meetup.navigateSub')}
          onPress={onNavigate}
          testID="ride-detail-navigate"
        />
        {organiser ? (
          <Tile
            icon="arrow.up.forward.square"
            title={t('ride.detail.meetup.grab')}
            sub={t('ride.detail.meetup.grabSub')}
            onPress={onGrab}
            testID="ride-detail-grab"
          />
        ) : null}
      </View>
      {organiser ? (
        <Tile
          icon="car.fill"
          title={t('ride.detail.meetup.plate')}
          sub={plate ?? t('ride.detail.meetup.plateEmpty')}
          onPress={onPlate}
          testID="ride-detail-plate"
        />
      ) : null}
      {failed ? (
        <AppText
          variant="meta"
          style={{ color: color('--color-urgent') }}
          accessibilityRole="alert"
          testID="ride-detail-open-failed"
        >
          {t(failed === 'grab' ? 'ride.detail.meetup.grabFailed' : 'ride.detail.meetup.mapsFailed')}
        </AppText>
      ) : null}
    </View>
  );
}

export function NoteCard({ note, onEdit }: { note: string; onEdit: (() => void) | null }) {
  const { t } = useI18n();
  return (
    <Card testID="ride-detail-note">
      <View style={styles.split}>
        <AppText variant="meta" tone="secondaryLabel" style={styles.flex}>
          {t('ride.detail.note.title')}
        </AppText>
        {onEdit ? (
          <PressDim
            onPress={onEdit}
            accessibilityRole="button"
            style={styles.edit}
            testID="ride-detail-note-edit"
          >
            <AppText variant="meta" style={styles.bold}>
              {t('ride.detail.note.edit')}
            </AppText>
          </PressDim>
        ) : null}
      </View>
      <AppText variant="body">{note}</AppText>
    </Card>
  );
}

export function SplitRow({
  mode,
  busy,
  onChange,
}: {
  mode: SplitMode;
  busy: boolean;
  onChange: (mode: SplitMode) => void;
}) {
  const { t } = useI18n();
  return (
    <Card testID="ride-detail-split">
      <View style={styles.split}>
        <View style={styles.flex}>
          <AppText variant="body">{t('ride.detail.split.title')}</AppText>
          <AppText variant="meta" tone="secondaryLabel">
            {t('ride.detail.split.footer')}
          </AppText>
        </View>
        <Host matchContents>
          <Picker
            label={t('ride.detail.split.title')}
            selection={mode}
            onSelectionChange={(next: SplitMode) => {
              if (!busy && next !== mode) onChange(next);
            }}
            testID="ride-detail-split-picker"
            modifiers={[pickerStyle('menu')]}
          >
            <Text modifiers={[tag('tapiro')]}>{t('ride.create.form.splitTapiro')}</Text>
            <Text modifiers={[tag('grab')]}>{t('ride.create.form.splitGrab')}</Text>
          </Picker>
        </Host>
      </View>
    </Card>
  );
}

export function PrivacyLine() {
  const { t } = useI18n();
  return (
    <View style={styles.privacy}>
      <SymbolView name="lock.fill" size={LOCK} tintColor={PlatformColor('secondaryLabel')} />
      <AppText variant="meta" tone="secondaryLabel" testID="ride-detail-privacy">
        {t('ride.detail.privacy')}
      </AppText>
    </View>
  );
}

export function PromptCard({
  title,
  body,
  actions,
  tone,
  testID,
}: {
  title: string;
  body: string | null;
  actions: {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
    loading?: boolean;
    testID: string;
  }[];
  tone?: 'warning';
  testID: string;
}) {
  return (
    <Card testID={testID} tone={tone}>
      <AppText variant="body" style={styles.bold} accessibilityRole="header">
        {title}
      </AppText>
      {body ? (
        <AppText variant="secondary" tone="secondaryLabel">
          {body}
        </AppText>
      ) : null}
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <PillButton
              key={action.testID}
              label={action.label}
              variant={action.variant ?? 'primary'}
              loading={action.loading}
              onPress={action.onPress}
              testID={action.testID}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: vars['--radius-card'],
    borderCurve: 'continuous',
    padding: vars['--space-4'],
    gap: vars['--space-1'],
    backgroundColor: PlatformColor('secondarySystemGroupedBackground'),
  },
  tiles: { gap: vars['--space-2'] },
  tileRow: { flexDirection: 'row', gap: vars['--space-2'] },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-3'],
    paddingVertical: vars['--space-3'],
    minHeight: vars['--touch-min'],
  },
  tileText: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '600' },
  split: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-3'] },
  flex: { flex: 1, minWidth: 0 },
  edit: {
    minHeight: vars['--touch-min'],
    minWidth: vars['--touch-min'],
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: vars['--space-1'],
    paddingHorizontal: vars['--space-1'],
  },
  actions: { flexDirection: 'row', gap: vars['--space-2'], paddingTop: vars['--space-2'] },
});
