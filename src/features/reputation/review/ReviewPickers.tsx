import { useEffect, type Ref } from 'react';
import { PlatformColor, Pressable, StyleSheet, View, type ViewInstance } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useI18n } from '@/lib/i18n';
import { uiVerifyReduceMotion } from '@/lib/uiVerify';
import { AppText } from '@/ui/AppText';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';

import { chipsFor } from '../model';
import { chipLabel } from '../profile/profileView';
import { FACES, type Face, type ReviewDraft, type Role } from '../types';
import { ReviewFace } from './ReviewFace';

export const FACE_SIZE = 76;

const DIM_SCALE = 0.88;
const DIM_OPACITY = 0.35;
const CHIP_HEIGHT = 36;
const CHIP_SLOP = (vars['--touch-min'] - CHIP_HEIGHT) / 2;

function FaceArt({ face, dimmed, reduced }: { face: Face; dimmed: boolean; reduced: boolean }) {
  const dim = useSharedValue(0);
  useEffect(() => {
    dim.set(
      withTiming(dimmed ? 1 : 0, {
        duration: vars['--duration-settle'],
        reduceMotion: ReduceMotion.Never,
      }),
    );
  }, [dim, dimmed]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - (1 - DIM_OPACITY) * dim.value,
    transform: [{ scale: reduced ? 1 : 1 - (1 - DIM_SCALE) * dim.value }],
  }));
  return (
    <Animated.View style={style}>
      <ReviewFace face={face} size={FACE_SIZE} />
    </Animated.View>
  );
}

export function FacePicker({
  picked,
  disabled,
  onPick,
  pickedRef,
}: {
  picked: Face | null;
  disabled: boolean;
  onPick: (face: Face) => void;
  pickedRef: Ref<ViewInstance>;
}) {
  const { t } = useI18n();
  const reduced = useReducedMotion() || uiVerifyReduceMotion;
  return (
    <View style={styles.faces} accessibilityRole="radiogroup">
      {FACES.map((face) => {
        const selected = picked === face;
        const dimmed = picked !== null && !selected;
        return (
          <Pressable
            key={face}
            accessibilityRole="radio"
            accessibilityLabel={t(`reputation.face.${face}`)}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onPick(face)}
            testID={`review-face-${face}`}
            style={styles.face}
          >
            <View ref={selected ? pickedRef : undefined}>
              <FaceArt face={face} dimmed={dimmed} reduced={reduced} />
            </View>
            <AppText
              variant="body"
              tone={dimmed ? 'secondaryLabel' : 'label'}
              style={selected && styles.pickedLabel}
            >
              {t(`reputation.face.${face}`)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChipPicker({
  draft,
  role,
  disabled,
  onToggle,
}: {
  draft: ReviewDraft;
  role: Role;
  disabled: boolean;
  onToggle: (chip: string) => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  if (!draft.face) return null;
  return (
    <View style={styles.chips}>
      {chipsFor(role, draft.face).map((chip) => {
        const on = draft.chips.includes(chip);
        const label = chipLabel(role, chip, t);
        return (
          <Pressable
            key={chip}
            accessibilityRole="checkbox"
            accessibilityLabel={label}
            accessibilityState={{ checked: on, disabled }}
            disabled={disabled}
            hitSlop={{ top: CHIP_SLOP, bottom: CHIP_SLOP }}
            onPress={() => onToggle(chip)}
            testID={`review-chip-${chip}`}
            style={[
              styles.chip,
              on
                ? { backgroundColor: color('--color-accent'), borderColor: color('--color-accent') }
                : { borderColor: PlatformColor('separator') },
            ]}
          >
            <AppText variant="secondary" style={on && { color: color('--color-on-accent') }}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  faces: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  face: {
    flex: 1,
    alignItems: 'center',
    gap: vars['--space-2'],
    minHeight: vars['--touch-min'],
  },
  pickedLabel: { fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: vars['--space-2'] },
  chip: {
    minHeight: CHIP_HEIGHT,
    maxWidth: '100%',
    justifyContent: 'center',
    paddingHorizontal: vars['--space-3'],
    paddingVertical: vars['--space-1'],
    borderRadius: CHIP_HEIGHT / 2,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
