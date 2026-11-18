import {
  Button,
  Form,
  HStack,
  Host,
  Image,
  RNHostView,
  Section,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityElement,
  accessibilityHint,
  accessibilityHidden,
  accessibilityIdentifier,
  accessibilityLabel,
  contentShape,
  fixedSize,
  font,
  foregroundStyle,
  lineLimit,
  listRowBackground,
  shapes,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { PlatformColor, StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { nameInitial } from '@/lib/nameInitial';
import { Avatar } from '@/ui/Avatar';
import { TapirCoin } from '@/ui/TapirCoin';
import { TierMark } from '@/ui/TierMark';
import { vars } from '@/ui/theme/tokens';
import { useTheme } from '@/ui/theme/useTheme';
import { useSelectedUntilReturn } from '@/ui/useSelectedUntilReturn';

const AVATAR_SIZE = 60;
const ROW_COIN = 18;
const tertiary = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

export type MeStanding = { tier: string; rank: 1 | 2 | 3 | 4; level: string };

export function MeView({
  name,
  avatarUrl,
  standing,
  payeeDue,
  stickerCount,
  coinCount,
  onOpenProfile,
  onOpenStickers,
  onOpenCoins,
  onOpenInvite,
  onOpenTapir,
  onOpenPayee,
  onOpenBlocked,
  onOpenSettings,
}: {
  name: string;
  avatarUrl: string | null;
  standing: MeStanding | null;
  payeeDue: boolean;
  stickerCount: number | null;
  coinCount: string | null;
  onOpenProfile: (() => void) | null;
  onOpenStickers: () => void;
  onOpenCoins: () => void;
  onOpenInvite: () => void;
  onOpenTapir: () => void;
  onOpenPayee: () => void;
  onOpenBlocked: () => void;
  onOpenSettings: () => void;
}) {
  const { t } = useI18n();
  const { color } = useTheme();
  return (
    <Host style={styles.host} testID="me-screen">
      <Form modifiers={[tint(color('--color-accent'))]}>
        <Section>
          <ProfileRow
            name={name}
            avatarUrl={avatarUrl}
            standing={standing}
            onPress={onOpenProfile}
          />
        </Section>
        <Section>
          <NavRow
            label={t('stickers.book.title')}
            value={stickerCount === null ? null : t('stickers.count', { count: stickerCount })}
            onPress={onOpenStickers}
            testID="me-stickers"
          />
          <NavRow
            label={t('coins.row')}
            coin
            value={coinCount}
            onPress={onOpenCoins}
            testID="me-coins"
          />
          <NavRow label={t('coins.invite.row')} onPress={onOpenInvite} testID="me-invite" />
          <NavRow label={t('ask.settings.title')} onPress={onOpenTapir} testID="me-tapir" />
          <NavRow
            label={t('payee.meRow')}
            dotLabel={payeeDue ? t('payee.meRowDue') : null}
            onPress={onOpenPayee}
            testID="me-payee"
          />
          <NavRow label={t('block.list.title')} onPress={onOpenBlocked} testID="me-blocked" />
          <NavRow label={t('account.me.settings')} onPress={onOpenSettings} testID="me-settings" />
        </Section>
      </Form>
    </Host>
  );
}

function ProfileRow({
  name,
  avatarUrl,
  standing,
  onPress,
}: {
  name: string;
  avatarUrl: string | null;
  standing: MeStanding | null;
  onPress: (() => void) | null;
}) {
  const { t } = useI18n();
  const { selected, select } = useSelectedUntilReturn();
  const content = (
    <HStack
      spacing={vars['--space-4']}
      modifiers={[
        accessibilityElement('combine'),
        contentShape(shapes.rectangle()),
        ...(onPress ? [] : [accessibilityIdentifier('me-profile')]),
      ]}
    >
      <RNHostView matchContents>
        <Avatar
          uri={avatarUrl}
          size={AVATAR_SIZE}
          label={t('account.name.avatar')}
          initial={nameInitial(name)}
        />
      </RNHostView>
      <VStack alignment="leading" spacing={vars['--space-1']}>
        <Text
          modifiers={[
            font({ textStyle: 'title2', weight: 'bold' }),
            foregroundStyle({ type: 'hierarchical', style: 'primary' }),
            lineLimit(2),
          ]}
        >
          {name}
        </Text>
        {standing ? (
          <VStack alignment="leading" spacing={2}>
            <TierMark label={standing.tier} rank={standing.rank} modifiers={[fixedSize()]} />
            <Text modifiers={[font({ textStyle: 'footnote' }), secondary]}>{standing.level}</Text>
          </VStack>
        ) : null}
      </VStack>
      {onPress ? (
        <>
          <Spacer />
          <Image
            systemName="chevron.right"
            size={14}
            modifiers={[tertiary, accessibilityHidden()]}
          />
        </>
      ) : null}
    </HStack>
  );
  if (!onPress) return content;
  return (
    <Button
      onPress={() => {
        select();
        onPress();
      }}
      testID="me-profile"
      modifiers={[
        accessibilityHint(t('reputation.profile.openSelf')),
        ...(selected ? [listRowBackground(PlatformColor('systemGray4'))] : []),
      ]}
    >
      {content}
    </Button>
  );
}

function NavRow({
  label,
  coin = false,
  value = null,
  dotLabel = null,
  onPress,
  testID,
}: {
  label: string;
  coin?: boolean;
  value?: string | null;
  dotLabel?: string | null;
  onPress: () => void;
  testID: string;
}) {
  const { color } = useTheme();
  const { selected, select } = useSelectedUntilReturn();
  return (
    <Button
      onPress={() => {
        select();
        onPress();
      }}
      testID={testID}
      modifiers={selected ? [listRowBackground(PlatformColor('systemGray4'))] : []}
    >
      <HStack spacing={vars['--space-2']}>
        {coin ? (
          <RNHostView matchContents>
            <TapirCoin size={ROW_COIN} testID={`${testID}-coin`} />
          </RNHostView>
        ) : null}
        <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'primary' })]}>
          {label}
        </Text>
        <Spacer />
        {value ? (
          <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
            {value}
          </Text>
        ) : null}
        {dotLabel ? (
          <Image
            systemName="circle.fill"
            size={10}
            modifiers={[
              foregroundStyle(color('--color-urgent')),
              accessibilityLabel(dotLabel),
              accessibilityIdentifier(`${testID}-dot`),
            ]}
          />
        ) : null}
        <Image systemName="chevron.right" size={14} modifiers={[tertiary, accessibilityHidden()]} />
      </HStack>
    </Button>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
