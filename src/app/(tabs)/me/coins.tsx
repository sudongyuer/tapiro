import { useRouter } from 'expo-router';

import { CoinsScreen } from '@/features/coins';

export default function Coins() {
  const router = useRouter();
  return <CoinsScreen onBuy={() => router.push('/buy-coins')} />;
}
