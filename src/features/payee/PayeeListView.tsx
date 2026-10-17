import {
  Button,
  HStack,
  Host,
  Image,
  List,
  Section,
  Spacer,
  Text,
  Toggle,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHidden,
  accessibilityIdentifier,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { METHOD_ICONS, methodDetail, methodTitle } from './display';
import { firstRecheckDue, hasCash, transferMethods, type PayeeMethod } from './methods';
import { LoadStateSections } from './LoadState';
import { NoticeCard } from './NoticeCard';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const tertiary = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });
const ICON_BOX = 28;

export function PayeeListView({
  status,
  methods,
  now,
  actionFailed,
  onRetry,
  onEdit,
  onRemove,
  onRecheck,
  onCashChange,
}: {
  status: 'loading' | 'ready' | 'failed';
  methods: readonly PayeeMethod[];
  now: Date;
  actionFailed: boolean;
  onRetry: () => void;
  onEdit: (method: PayeeMethod) => void;
  onRemove: (method: PayeeMethod) => void;
  onRecheck: (method: PayeeMethod) => void;
  onCashChange: (on: boolean) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const rows = transferMethods(methods);
  const due = firstRecheckDue(rows, now);

  return (
    <Host style={styles.host} testID="payee-screen">
      <List modifiers={[listStyle('insetGrouped'), tint(color('--color-accent'))]}>
        {status === 'ready' ? null : <LoadStateSections status={status} onRetry={onRetry} />}
        {actionFailed ? (
          <NoticeCard
            tone="urgent"
            icon="exclamationmark.circle.fill"
            title={t('payee.actionFailed')}
            testID="payee-action-failed"
          />
        ) : null}
        {status !== 'ready' ? null : due ? (
          <NoticeCard
            tone="warning"
            icon="clock.badge.exclamationmark"
            title={t('payee.recheck.title', { method: methodTitle(t, due) })}
            body={t('payee.recheck.body')}
            action={{
              label: t('payee.recheck.action'),
              onPress: () => onRecheck(due),
              testID: 'payee-recheck-action',
            }}
            testID="payee-recheck"
          />
        ) : null}
        {status !== 'ready' ? null : rows.length === 0 ? (
          <Section footer={<Text>{t('payee.privacy')}</Text>}>
            <VStack
              alignment="leading"
              spacing={vars['--space-1']}
              modifiers={[accessibilityElement('combine'), accessibilityIdentifier('payee-empty')]}
            >
              <Text modifiers={[font({ textStyle: 'headline' })]}>{t('payee.emptyTitle')}</Text>
              <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>
                {t('payee.emptyBody')}
              </Text>
            </VStack>
          </Section>
        ) : (
          <Section footer={<Text>{t('payee.privacy')}</Text>}>
            <List.ForEach onDelete={(indices) => indices.forEach((i) => onRemove(rows[i]))}>
              {rows.map((method) => (
                <MethodRow key={method.id} method={method} onPress={() => onEdit(method)} />
              ))}
            </List.ForEach>
          </Section>
        )}
        {status === 'ready' ? (
          <Section title={t('payee.cash.header')}>
            <Toggle
              label={t('payee.cash.toggle')}
              systemImage={METHOD_ICONS.cash}
              isOn={hasCash(methods)}
              onIsOnChange={onCashChange}
              testID="payee-cash"
            />
          </Section>
        ) : null}
      </List>
    </Host>
  );
}

function MethodRow({ method, onPress }: { method: PayeeMethod; onPress: () => void }) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Button onPress={onPress} testID={`payee-row-${method.id}`}>
      <HStack spacing={vars['--space-3']} modifiers={[accessibilityElement('combine')]}>
        <Image
          systemName={METHOD_ICONS[method.type]}
          size={20}
          modifiers={[
            frame({ width: ICON_BOX, height: ICON_BOX }),
            foregroundStyle(color('--color-accent')),
            accessibilityHidden(),
          ]}
        />
        <VStack alignment="leading" spacing={vars['--space-1'] / 2}>
          <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'primary' })]}>
            {methodTitle(t, method)}
          </Text>
          <Text modifiers={[font({ textStyle: 'subheadline' }), secondary, lineLimit(2)]}>
            {methodDetail(t, method)}
          </Text>
        </VStack>
        <Spacer />
        {method.isDefault ? (
          <Text modifiers={[font({ textStyle: 'subheadline' }), secondary]}>
            {t('payee.default')}
          </Text>
        ) : null}
        <Image systemName="chevron.right" size={14} modifiers={[tertiary, accessibilityHidden()]} />
      </HStack>
    </Button>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
