import { Button, HStack, Text } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  frame,
  lineLimit,
  multilineTextAlignment,
} from '@expo/ui/swift-ui/modifiers';

import { useI18n } from '@/lib/i18n';
import type { BountyCategory } from '@/lib/stickers/category';
import { vars } from '@/ui/theme/tokens';

import { ROW_INSETS } from './FieldRow';
import { shownPicks } from './postKinds';
import { CHIP_LABEL_HEIGHT } from './RewardSection';
import type { PostDraft, TimeChoice } from './types';

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
  const picks = shownPicks(category, new Date());
  if (picks.length === 0) return null;
  const chosen = time.kind === 'deadline' ? Date.parse(time.deadlineAt) : null;
  return (
    <HStack spacing={vars['--space-2']} modifiers={[ROW_INSETS]}>
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
              frame({ maxWidth: Infinity }),
              accessibilityLabel(t('bounty.post.timePick.label', { name })),
              ...(on ? [accessibilityAddTraits(['isSelected'])] : []),
            ]}
          >
            <Text
              modifiers={[
                lineLimit(2),
                multilineTextAlignment('center'),
                frame({ maxWidth: Infinity, minHeight: CHIP_LABEL_HEIGHT }),
              ]}
            >
              {name}
            </Text>
          </Button>
        );
      })}
    </HStack>
  );
}
