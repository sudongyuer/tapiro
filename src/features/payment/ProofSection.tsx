import { Section, Text } from '@expo/ui/swift-ui';
import { accessibilityIdentifier } from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';

import { ActionButton } from './formParts';
import { payDevice } from './services';

export type Proof =
  | { status: 'none' }
  | { status: 'picked'; uri: string }
  | { status: 'uploading'; uri: string }
  | { status: 'failed'; uri: string };

export function ProofSection({
  proof,
  onChange,
}: {
  proof: Proof;
  onChange: (next: Proof) => void;
}) {
  const { t } = useI18n();
  const footer =
    proof.status === 'failed' ? t('pay.sheet.proof.failed') : t('pay.sheet.proof.footer');
  return (
    <Section
      footer={
        <Text modifiers={[accessibilityIdentifier(`pay-proof-${proof.status}`)]}>{footer}</Text>
      }
    >
      {proof.status === 'none' ? (
        <ActionButton
          label={t('pay.sheet.proof.add')}
          tone="plain"
          onPress={async () => {
            const uri = await payDevice.pickProof();
            if (uri) onChange({ status: 'picked', uri });
          }}
          testID="pay-proof-add"
        />
      ) : (
        <>
          <Text modifiers={[accessibilityIdentifier('pay-proof-added')]}>
            {t('pay.sheet.proof.added')}
          </Text>
          <ActionButton
            label={t('pay.sheet.proof.remove')}
            tone="urgent"
            onPress={() => onChange({ status: 'none' })}
            disabled={proof.status === 'uploading'}
            testID="pay-proof-remove"
          />
        </>
      )}
    </Section>
  );
}
