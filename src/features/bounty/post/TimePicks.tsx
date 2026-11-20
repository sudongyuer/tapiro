import { Button, Text } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  foregroundStyle,
  frame,
  lineLimit,
  listRowInsets,
  multilineTextAlignment,
} from '@expo/ui/swift-ui/modifiers';

import { ChipRow } from 'tapiro-kit';

import { useI18n } from '@/lib/i18n';
import type { BountyCategory } from '@/lib/stickers/category';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { edgeSeparator } from '@/ui/FieldRow';
import { shownPicks } from './postKinds';
import { CHIP_LABEL_HEIGHT } from './RewardSection';
import type { PostDraft, TimeChoice } from './types';

const PICKS_INSETS = listRowInsets({
  top: vars['--space-3'],
  bottom: vars['--space-3'],
  leading: vars['--space-5'],
  trailing: vars['--space-5'],
});

export function TimePicks({
  time,
  category,
  onEdit,
}: {
  time: TimeChoice;
  category: BountyCategory | null;
  onEdit: (patch: Partial<PostDraft>) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  const picks = shownPicks(category, new Date());
  if (picks.length === 0) return null;
  const chosen = time.kind === 'deadline' ? Date.parse(time.deadlineAt) : null;
  return (
    <ChipRow spacing={vars['--space-2']} modifiers={[PICKS_INSETS, edgeSeparator]}>
      {picks.map((pick) => {
        const name = t(`bounty.post.timePick.${pick.id}`);
        const on = chosen === pick.at.getTime();
        return (
          <Button
            key={pick.id}
            onPress={() =>
              onEdit({ time: { kind: 'deadline', deadlineAt: pick.at.toISOString() } })
            }
            testID={`bounty-post-pick-time-${pick.id}`}
            modifiers={[
              buttonStyle(on ? 'borderedProminent' : 'bordered'),
              buttonBorderShape('capsule'),
              controlSize('regular'),
              frame({ maxWidth: Infinity, maxHeight: Infinity }),
              accessibilityLabel(t('bounty.post.timePick.label', { name })),
              ...(on ? [accessibilityAddTraits(['isSelected'])] : []),
            ]}
          >
            <Text
              modifiers={[
                lineLimit(2),
                multilineTextAlignment('center'),
                frame({ maxWidth: Infinity, minHeight: CHIP_LABEL_HEIGHT, maxHeight: Infinity }),
                ...(on ? [foregroundStyle(color('--color-on-accent'))] : []),
              ]}
            >
              {name}
            </Text>
          </Button>
        );
      })}
    </ChipRow>
  );
}
