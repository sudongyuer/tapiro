import { useSignedInUser } from '@/features/account';
import { MascotGrownRoute } from '@/features/reputation';

export default function MascotGrown() {
  return <MascotGrownRoute userId={useSignedInUser()?.id ?? null} />;
}
