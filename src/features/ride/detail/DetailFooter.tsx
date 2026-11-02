import { Button, Divider, Host, Menu } from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { SymbolView } from 'expo-symbols';
import { PlatformColor, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { PillButton } from '@/ui/PillButton';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { LATE_MINUTES } from '../rideTimes';
import { malaysiaClock } from '../rideClock';
import type { Footer } from './detailModel';
import { SettleFooterBar, type SettleFooterActions } from './SettleFooter';
import type { LateChoice } from './types';

const ICON = 15;

export type FooterActions = {
  apply: () => void;
  withdraw: () => void;
  arrive: () => void;
  undoArrive: () => void;
  late: (minutes: LateChoice | null) => void;
  notComing: () => void;
  depart: () => void;
  settle: SettleFooterActions;
};

export function DetailFooter({
  footer,
  organiserName,
  departLine,
  late,
  busy,
  error,
  actions,
}: {
  footer: Footer;
  organiserName: string;
  departLine: string;
  late: boolean;
  busy: string | null;
  error: string | null;
  actions: FooterActions;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  if (footer.kind === 'none' && !error) return <SafeAreaView edges={['bottom']} />;
  return (
    <SafeAreaView edges={['bottom']} style={styles.bar} testID="ride-detail-footer">
      {error ? (
        <AppText
          variant="meta"
          accessibilityRole="alert"
          style={[styles.centre, { color: color('--color-urgent') }]}
          testID="ride-detail-action-failed"
        >
          {error}
        </AppText>
      ) : null}
      {footer.kind === 'settle' ? (
        <SettleFooterBar
          footer={footer.settle}
          organiserName={organiserName}
          busy={busy}
          actions={actions.settle}
        />
      ) : null}
      {footer.kind === 'apply' ? (
        <>
          {footer.blocked ? (
            <AppText
              variant="meta"
              tone="secondaryLabel"
              style={styles.centre}
              testID="ride-detail-full"
            >
              {t('ride.detail.apply.full')}
            </AppText>
          ) : null}
          <PillButton
            label={t('ride.detail.apply.action')}
            disabled={footer.blocked !== null}
            loading={busy === 'request'}
            onPress={actions.apply}
            testID="ride-detail-apply"
          />
        </>
      ) : null}
      {footer.kind === 'applied' ? (
        <View style={styles.row}>
          <AppText
            variant="body"
            style={[styles.flex, styles.bold]}
            accessibilityRole="text"
            testID="ride-detail-applied"
          >
            {t('ride.detail.applied.waiting', { name: organiserName })}
          </AppText>
          <PillButton
            label={t('ride.detail.applied.withdraw')}
            variant="secondary"
            loading={busy === 'withdraw'}
            onPress={actions.withdraw}
            testID="ride-detail-withdraw"
          />
        </View>
      ) : null}
      {footer.kind === 'arrive' ? (
        <View style={styles.row}>
          <LateMenu
            late={late}
            disabled={busy !== null}
            onLate={actions.late}
            onNotComing={actions.notComing}
          />
          <View style={styles.flex}>
            <PillButton
              label={t('ride.detail.meetup.arrive')}
              loading={busy === 'arrive'}
              onPress={actions.arrive}
              testID="ride-detail-arrive"
            />
          </View>
        </View>
      ) : null}
      {footer.kind === 'arrived' ? (
        <View style={styles.row}>
          <SymbolView
            name="checkmark.circle.fill"
            size={ICON}
            tintColor={color('--color-success')}
          />
          <AppText variant="body" style={[styles.flex, styles.bold]} testID="ride-detail-arrived">
            {t('ride.detail.meetup.arrivedLine', { time: malaysiaClock(footer.at) })}
          </AppText>
          <PillButton
            label={t('ride.detail.meetup.undo')}
            variant="secondary"
            loading={busy === 'undoArrive'}
            onPress={actions.undoArrive}
            testID="ride-detail-undo"
          />
        </View>
      ) : null}
      {footer.kind === 'depart' ? (
        <>
          <AppText
            variant="meta"
            tone="secondaryLabel"
            style={styles.centre}
            testID="ride-detail-depart-line"
          >
            {departLine}
          </AppText>
          <View style={styles.row}>
            {footer.selfArrived ? null : (
              <PillButton
                label={t('ride.detail.meetup.arrive')}
                variant="secondary"
                loading={busy === 'arrive'}
                onPress={actions.arrive}
                testID="ride-detail-arrive"
              />
            )}
            <View style={styles.flex}>
              <PillButton
                label={t('ride.detail.meetup.depart')}
                loading={busy === 'depart'}
                onPress={actions.depart}
                testID="ride-detail-depart"
              />
            </View>
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
}

function LateMenu({
  late,
  disabled,
  onLate,
  onNotComing,
}: {
  late: boolean;
  disabled: boolean;
  onLate: (minutes: LateChoice | null) => void;
  onNotComing: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Host matchContents>
      <Menu
        label={t('ride.detail.meetup.late')}
        systemImage="chevron.down"
        modifiers={[
          buttonStyle('bordered'),
          buttonBorderShape('capsule'),
          controlSize('large'),
          tint(color('--color-accent')),
          disabledModifier(disabled),
          accessibilityIdentifier('ride-detail-late'),
        ]}
      >
        {LATE_MINUTES.map((minutes) => (
          <Button
            key={minutes}
            label={t('ride.detail.meetup.lateMinutes', { count: minutes })}
            onPress={() => onLate(minutes)}
          />
        ))}
        {late ? (
          <Button label={t('ride.detail.meetup.lateClear')} onPress={() => onLate(null)} />
        ) : null}
        <Divider />
        <Button
          role="destructive"
          label={t('ride.detail.meetup.notComing')}
          onPress={onNotComing}
        />
      </Menu>
    </Host>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: vars['--space-4'],
    paddingTop: vars['--space-2'],
    gap: vars['--space-2'],
    backgroundColor: PlatformColor('systemGroupedBackground'),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: vars['--space-2'] },
  flex: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '600' },
  centre: { textAlign: 'center' },
});
