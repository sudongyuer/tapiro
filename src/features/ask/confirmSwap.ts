import { ActionSheetIOS } from 'react-native';

export function confirmSwap(copy: {
  title: string;
  message: string;
  confirm: string;
  cancel: string;
}) {
  return new Promise<boolean>((resolve) => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: copy.title,
        message: copy.message,
        options: [copy.confirm, copy.cancel],
        cancelButtonIndex: 1,
      },
      (index) => resolve(index === 0),
    );
  });
}
