import { ContentUnavailableView, Host } from '@expo/ui/swift-ui';
import type { SFSymbol } from 'expo-symbols';
import { StyleSheet } from 'react-native';

export function EmptyTab({
  symbol,
  title,
  description,
  testID,
}: {
  symbol: SFSymbol;
  title: string;
  description: string;
  testID: string;
}) {
  return (
    <Host style={styles.host}>
      <ContentUnavailableView
        title={title}
        systemImage={symbol}
        description={description}
        testID={testID}
      />
    </Host>
  );
}

const styles = StyleSheet.create({ host: { flex: 1 } });
