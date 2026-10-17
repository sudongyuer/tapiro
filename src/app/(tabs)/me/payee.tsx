import { useRouter } from 'expo-router';

import { useSignedInUser } from '@/features/account';
import { PayeeScreen } from '@/features/payee';

export default function PayeeMethods() {
  const router = useRouter();
  const user = useSignedInUser();
  if (!user) return null;
  return (
    <PayeeScreen
      userId={user.id}
      onOpen={(sheet, options = {}) =>
        router.push({
          pathname: `/payee/${sheet}`,
          params: {
            id: options.id,
            wallet: options.wallet,
            repick: options.repick ? '1' : undefined,
          },
        })
      }
    />
  );
}
