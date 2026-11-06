import { Button, RNHostView } from '@expo/ui/swift-ui';
import { accessibilityLabel, buttonStyle } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { nameInitial } from '@/lib/nameInitial';
import { Avatar } from '@/ui/Avatar';
import { vars } from '@/ui/theme/tokens';

const AVATAR = 36;

export function AvatarButton({
  id,
  name,
  onPress,
}: {
  id: string;
  name: string;
  onPress: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Button
      onPress={() => onPress(id)}
      testID={`bounty-applicant-profile-${id}`}
      modifiers={[
        buttonStyle('borderless'),
        accessibilityLabel(t('reputation.profile.open', { name })),
      ]}
    >
      <RNHostView matchContents>
        <View style={styles.avatar}>
          <Avatar uri={null} size={AVATAR} label={name} initial={nameInitial(name)} />
        </View>
      </RNHostView>
    </Button>
  );
}

const styles = StyleSheet.create({
  avatar: {
    minWidth: vars['--touch-min'],
    minHeight: vars['--touch-min'],
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});
