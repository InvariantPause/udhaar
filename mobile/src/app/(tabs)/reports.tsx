import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function ReportsScreen() {
  return (
    <Screen title="Reports" sub="Spending & income">
      <EmptyState
        icon="chart"
        title="Nothing to chart yet"
        note="Reports light up as soon as entries start landing — next build."
      />
    </Screen>
  );
}
