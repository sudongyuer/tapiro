import {
  BottomSheet,
  Button,
  DatePicker,
  Group,
  Host,
  NavigationStack,
  Text,
  Toolbar,
  ToolbarItem,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityIdentifier,
  datePickerStyle,
  disabled,
  font,
  foregroundStyle,
  frame,
  labelsHidden,
  multilineTextAlignment,
  navigationBarTitleDisplayMode,
  navigationTitle,
  padding,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { vars } from '@/ui/theme/tokens';

import { earliestEta, sameMinute } from './etaTime';

export type EtaMode = 'start' | 'change';

export type EtaRequest = {
  id: number;
  mode: EtaMode;
  initial: Date;
  current: string | null;
  now: Date;
};

export function EtaSheet({
  request,
  open,
  name,
  onConfirm,
  onClose,
}: {
  request: EtaRequest | null;
  open: boolean;
  name: string;
  onConfirm: (mode: EtaMode, at: Date) => void;
  onClose: () => void;
}) {
  return (
    <Host matchContents style={styles.anchor}>
      <BottomSheet
        isPresented={open && request !== null}
        onIsPresentedChange={(presented) => {
          if (!presented) onClose();
        }}
      >
        <Group modifiers={[presentationDetents(['medium']), presentationDragIndicator('visible')]}>
          {request ? (
            <EtaPicker
              key={request.id}
              request={request}
              name={name}
              onConfirm={onConfirm}
              onClose={onClose}
            />
          ) : null}
        </Group>
      </BottomSheet>
    </Host>
  );
}

function EtaPicker({
  request,
  name,
  onConfirm,
  onClose,
}: {
  request: EtaRequest;
  name: string;
  onConfirm: (mode: EtaMode, at: Date) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [picked, setPicked] = useState(request.initial);
  const start = request.mode === 'start';
  const unchanged = !start && sameMinute(picked, request.current);
  return (
    <NavigationStack>
      <Toolbar>
        <VStack
          spacing={vars['--space-2']}
          modifiers={[
            padding({ horizontal: vars['--space-4'] }),
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'top' }),
            navigationTitle(t(start ? 'bounty.eta.title' : 'bounty.eta.changeTitle')),
            navigationBarTitleDisplayMode('inline'),
          ]}
        >
          <Text
            modifiers={[
              font({ textStyle: 'subheadline' }),
              foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
              multilineTextAlignment('center'),
              accessibilityIdentifier('bounty-eta-body'),
            ]}
          >
            {t('bounty.eta.body', { name })}
          </Text>
          <DatePicker
            title={t('bounty.eta.picker')}
            selection={picked}
            displayedComponents={['hourAndMinute']}
            range={{ start: earliestEta(request.now) }}
            onDateChange={setPicked}
            modifiers={[
              datePickerStyle('wheel'),
              labelsHidden(),
              accessibilityIdentifier('bounty-eta-picker'),
            ]}
          />
        </VStack>
        <Toolbar.Content>
          <ToolbarItem placement="cancellationAction">
            <Button
              label={t('bounty.eta.cancel')}
              onPress={onClose}
              modifiers={[accessibilityIdentifier('bounty-eta-cancel')]}
            />
          </ToolbarItem>
          <ToolbarItem placement="confirmationAction">
            <Button
              label={t(start ? 'bounty.eta.start' : 'bounty.eta.ok')}
              onPress={() => onConfirm(request.mode, picked)}
              modifiers={[disabled(unchanged), accessibilityIdentifier('bounty-eta-confirm')]}
            />
          </ToolbarItem>
        </Toolbar.Content>
      </Toolbar>
    </NavigationStack>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', width: 0, height: 0 },
});
