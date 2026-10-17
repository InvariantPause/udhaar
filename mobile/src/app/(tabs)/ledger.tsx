import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function LedgerScreen() {
  return (
    <Screen title="Udhaar" sub="Money lent & borrowed">
      <EmptyState
        icon="users"
        title="No contacts yet"
        note="People and their running ledgers arrive with the data layer — next build."
      />
    </Screen>
  );
}
