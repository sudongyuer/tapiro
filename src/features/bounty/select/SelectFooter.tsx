import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, type AccessibilityActionEvent } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { askConfirm, pressAnchor } from '@/ui/confirm';
import { HoldButton } from '@/ui/HoldButton';
import { SheetActions } from '@/ui/SheetFrame';
import { useTheme } from '@/ui/theme/useTheme';

import type { FooterView, NoticeReason } from './applicantsView';
import { selectFailureCopy } from './selectCopy';

export function SelectFooter({
  footer,
  notice,
  onHold,
}: {
  footer: FooterView | null;
  notice: NoticeReason | null;
  onHold: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const noticeText = notice ? selectFailureCopy(notice, t) : null;

  useEffect(() => {
    if (noticeText) AccessibilityInfo.announceForAccessibility(noticeText);
  }, [noticeText]);
  const name = footer?.applicant ? (footer.applicant.name ?? t('bounty.post.unknownName')) : null;
  const hint =
    footer?.others === 0
      ? t('bounty.select.hold.hintAlone')
      : t('bounty.select.hold.hint', { count: footer?.others ?? 0 });

  const confirm = async (event: AccessibilityActionEvent) => {
    if (name === null) return;
    const sure = await askConfirm(
      {
        title: t('bounty.select.confirm.title', { name }),
        confirm: t('bounty.select.confirm.confirm', { name }),
        keep: t('bounty.select.confirm.cancel'),
      },
      false,
      pressAnchor(event),
    );
    if (sure) onHold();
  };

  return (
    <SheetActions>
      {notice ? (
        <AppText
          variant="secondary"
          accessibilityRole="alert"
          testID="bounty-select-failed"
          style={[styles.notice, { color: color('--color-urgent') }]}
        >
          {noticeText}
        </AppText>
      ) : null}
      {footer ? (
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
          onAccessibilityActivate={(event) => void confirm(event)}
          testID="bounty-select-hold"
        />
      ) : null}
    </SheetActions>
  );
}

const styles = StyleSheet.create({
  notice: { textAlign: 'center' },
});
