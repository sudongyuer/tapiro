import { Form, Host, ProgressView, Section } from '@expo/ui/swift-ui';
import { accessibilityIdentifier, accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';

import { NoticeCard } from './NoticeCard';

export function LoadStateSections({
  status,
  onRetry,
}: {
  status: 'loading' | 'failed';
  onRetry: () => void;
}) {
  const { t } = useI18n();
  if (status === 'failed')
    return (
      <NoticeCard
        tone="urgent"
        icon="wifi.exclamationmark"
        title={t('payee.loadFailed.title')}
        body={t('payee.loadFailed.body')}
        action={{ label: t('payee.retry'), onPress: onRetry, testID: 'payee-retry' }}
        testID="payee-load-failed"
      />
    );
  return (
    <Section>
      <ProgressView
        modifiers={[
          accessibilityLabel(t('payee.loading')),
          accessibilityIdentifier('payee-loading'),
        ]}
      />
    </Section>
  );
}

export function LoadStateForm(props: { status: 'loading' | 'failed'; onRetry: () => void }) {
  return (
    <Host style={styles.host}>
      <Form>
        <LoadStateSections {...props} />
      </Form>
    </Host>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
