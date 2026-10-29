import { useEffect } from 'react';
import { AccessibilityInfo, ActionSheetIOS, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
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

  const confirm = () => {
    if (name === null) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('bounty.select.confirm.title', { name }),
        options: [t('bounty.select.confirm.confirm', { name }), t('bounty.select.confirm.cancel')],
        cancelButtonIndex: 1,
      },
      (index) => {
        if (index === 0) onHold();
      },
    );
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
          onAccessibilityActivate={confirm}
          testID="bounty-select-hold"
        />
      ) : null}
    </SheetActions>
  );
}

const styles = StyleSheet.create({
  notice: { textAlign: 'center' },
});
