import { EmptyTab } from '@/features/shell';
import { useI18n } from '@/lib/i18n';

export default function Ride() {
  const { t } = useI18n();
  return (
    <EmptyTab
      symbol="car.fill"
      title={t('shell.ride.emptyTitle')}
      description={t('shell.ride.emptyBody')}
      testID="ride-empty"
    />
  );
}
