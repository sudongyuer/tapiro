import { useI18n } from '@/lib/i18n';
import type { BountyCategory } from '@/lib/stickers/category';

import { postKind } from './postKinds';

export function useKindCopy(category: BountyCategory | null) {
  const { t } = useI18n();
  const kind = postKind(category)?.category;
  return kind
    ? {
        title: t(`bounty.post.kind.${kind}.title`),
        when: t(`bounty.post.kind.${kind}.when`),
        place: t(`bounty.post.kind.${kind}.place`),
        description: t(`bounty.post.kind.${kind}.description`),
      }
    : {
        title: t('bounty.post.form.titlePlaceholder'),
        when: t('bounty.post.form.addTime'),
        place: t('bounty.place.add'),
        description: t('bounty.post.form.descriptionPlaceholder'),
      };
}
