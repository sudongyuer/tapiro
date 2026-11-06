import { useSignedInUser } from '@/features/account';
import { TierDropRoute } from '@/features/reputation';

export default function TierDrop() {
  return <TierDropRoute userId={useSignedInUser()?.id ?? null} />;
}
