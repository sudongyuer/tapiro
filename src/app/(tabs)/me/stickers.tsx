import { useSignedInUser } from '@/features/account';
import { StickerBook } from '@/features/stickers';

export default function Stickers() {
  const user = useSignedInUser();
  if (!user) return null;
  return <StickerBook userId={user.id} />;
}
