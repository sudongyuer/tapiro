import { useRouter } from 'expo-router';

import { BuyCoinsSheet } from '@/features/coins';

export default function BuyCoins() {
  const router = useRouter();
  return <BuyCoinsSheet onClose={() => router.back()} />;
}
