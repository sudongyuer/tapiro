import { ActionSheetIOS } from 'react-native';

export type SheetCopy = { title: string; message: string; confirm: string; keep: string };

export function askSheet(copy: SheetCopy, destructive: boolean) {
  return new Promise<boolean>((resolve) => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: copy.title,
        message: copy.message,
        options: [copy.confirm, copy.keep],
        cancelButtonIndex: 1,
        ...(destructive ? { destructiveButtonIndex: 0 } : {}),
      },
      (index) => resolve(index === 0),
    );
  });
}
