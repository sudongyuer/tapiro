import { collectSticker, dismissSettled } from '@/lib/stickers';

import type { LiveCardModel } from '../homeModel';
import { BountyCard, OwedCard } from './BountyCard';
import { CalmCard, FallbackCard } from './CalmCard';
import { PayCard } from './PayCard';
import { RideCard } from './RideCard';
import { SettledCard } from './SettledCard';
import { UnavailableCard } from './UnavailableCard';

function collectSettled(stickerId: string) {
  void collectSticker(stickerId);
  dismissSettled(stickerId);
}

export function CardBody({
  card,
  behind,
  name,
  onAsk,
}: {
  card: LiveCardModel;
  behind: boolean;
  name: string;
  onAsk: () => void;
}) {
  if (card.kind === 'calm') return <CalmCard name={name} onAsk={onAsk} />;
  if (card.kind === 'unavailable') return <UnavailableCard issue={card.issue} />;
  const { detail, item } = card;
  switch (detail?.kind) {
    case 'oweMoney':
      return <PayCard detail={detail} />;
    case 'rideSoon':
      return <RideCard detail={detail} />;
    case 'owedToYou':
      return <OwedCard detail={detail} />;
    case 'bountyAction':
    case 'bountyInProgress':
    case 'waitingConfirm':
      return <BountyCard detail={detail} />;
    case 'settled':
      return (
        <SettledCard
          detail={detail}
          behind={behind}
          onCollect={() => collectSettled(detail.stickerId)}
        />
      );
    default:
      return <FallbackCard item={item} />;
  }
}
