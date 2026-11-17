import { Button, ConfirmationDialog, Text } from '@expo/ui/swift-ui';
import type { ReactNode } from 'react';

import type { ConfirmCopy } from './confirm';

export function ConfirmDialog({
  copy,
  destructive,
  presented,
  onPresentedChange,
  onConfirm,
  confirmTestID,
  children,
}: {
  copy: ConfirmCopy;
  destructive: boolean;
  presented: boolean;
  onPresentedChange: (presented: boolean) => void;
  onConfirm: () => void;
  confirmTestID?: string;
  children: ReactNode;
}) {
  return (
    <ConfirmationDialog
      title={copy.title}
      titleVisibility="visible"
      isPresented={presented}
      onIsPresentedChange={onPresentedChange}
    >
      <ConfirmationDialog.Trigger>{children}</ConfirmationDialog.Trigger>
      <ConfirmationDialog.Actions>
        <Button
          label={copy.confirm}
          role={destructive ? 'destructive' : undefined}
          onPress={onConfirm}
          testID={confirmTestID}
        />
        {/* No cancel role: iOS 26+ hides a cancel action in a popover; see ConfirmDialog.swift in the kit. */}
        <Button label={copy.keep} onPress={() => onPresentedChange(false)} />
      </ConfirmationDialog.Actions>
      {copy.message ? (
        <ConfirmationDialog.Message>
          <Text>{copy.message}</Text>
        </ConfirmationDialog.Message>
      ) : null}
    </ConfirmationDialog>
  );
}
