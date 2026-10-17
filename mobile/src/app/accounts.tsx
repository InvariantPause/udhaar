import { StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { ListRow } from '@/components/ListRow';
import { Money } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { colors, haptic, radius, text as typography } from '@/design';
import { AccountSheet } from '@/features/AccountSheet';
import { accountIcon, accountKindLabel } from '@/features/txDisplay';
import { repo, useDb, useDbQuery, type AccountWithBalance } from '@/lib/db';
import { useSheet } from '@/lib/sheet';
import { useToast } from '@/lib/toast';

/** Every place money lives, with live balances. Archived places keep their history. */
export default function AccountsScreen() {
  const { bump } = useDb();
  const toast = useToast();
  const sheet = useSheet();

  const active = useDbQuery(() => repo.listAccounts());
  const archived = useDbQuery(() => repo.listAccounts({ includeArchived: true }).filter((a) => a.archived_at));

  const deleteAccount = (a: AccountWithBalance) => {
    const mode = repo.deleteAccount(a.id);
    bump();
    haptic.press();
    toast.show(mode === 'archived' ? `${a.name} archived (has entries)` : `${a.name} deleted`, {
      actionLabel: 'Undo',
      onAction: () => {
        repo.restoreAccount(a.id);
        bump();
      },
    });
  };

  return (
    <Screen
      title="Money places"
      sub="Cash, bank, wallets"
      back
      right={<IconButton icon="plus" label="Add place" onPress={() => sheet.open(<AccountSheet />)} />}
    >
      {active.length === 0 ? (
        <EmptyState icon="wallet" title="No places yet" note="Add cash, a bank account, or a wallet." />
      ) : (
        <View style={styles.section}>
          {active.map((a, i) => (
            <ListRow
              key={a.id}
              icon={accountIcon(a.kind)}
              title={a.name}
              subtitle={`${accountKindLabel(a.kind)} · ${a.currency}`}
              right={<Money minor={a.balance_minor} currency={a.currency} />}
              onPress={() => sheet.open(<AccountSheet account={a} />)}
              onLongPress={() => sheet.open(<AccountSheet account={a} />)}
              onDelete={() => deleteAccount(a)}
              last={i === active.length - 1}
            />
          ))}
        </View>
      )}

      {archived.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Archived</Text>
          <View style={styles.section}>
            {archived.map((a, i) => (
              <ListRow
                key={a.id}
                icon={accountIcon(a.kind)}
                title={a.name}
                subtitle={`${accountKindLabel(a.kind)} · ${a.currency} · Tap to restore`}
                right={<Money minor={a.balance_minor} currency={a.currency} />}
                onPress={() => {
                  repo.unarchiveAccount(a.id);
                  bump();
                  haptic.success();
                }}
                last={i === archived.length - 1}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  sectionTitle: { ...typography.section, marginTop: 22, marginBottom: 10 },
});
