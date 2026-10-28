import { useI18n } from '@/lib/i18n';
import { HoldButton } from '@/ui/HoldButton';
import { SheetActions } from '@/ui/SheetFrame';

import type { FooterView } from './applicantsView';

export function SelectFooter({
  footer,
  onHold,
  onAccessibilityActivate,
}: {
  footer: FooterView;
  onHold: () => void;
  onAccessibilityActivate: () => void;
}) {
  const { t } = useI18n();
  const name =
    footer.state === 'disabled' ? null : (footer.applicant.name ?? t('bounty.post.unknownName'));
  const hint =
    footer.others === 0
      ? t('bounty.select.hold.hintAlone')
      : t('bounty.select.hold.hint', { count: footer.others });
  return (
    <SheetActions>
      <HoldButton
        label={
          name === null ? t('bounty.select.hold.none') : t('bounty.select.hold.label', { name })
        }
        holdingLabel={t('bounty.select.hold.holding')}
        busyLabel={t('bounty.select.hold.sending')}
        hint={hint}
        accessibilityHint={t('bounty.select.hold.a11yHint')}
        state={footer.state}
        onComplete={onHold}
        onAccessibilityActivate={onAccessibilityActivate}
        testID="bounty-select-hold"
      />
    </SheetActions>
  );
}
