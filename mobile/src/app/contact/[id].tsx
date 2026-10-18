import { Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { ListRow } from '@/components/ListRow';
import { Money } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { colors, haptic, radius, text as typography } from '@/design';
import { ContactSheet } from '@/features/ContactSheet';
import { TransactionSheet } from '@/features/TransactionSheet';
import { buildStatement, statementSubject } from '@/features/statement';
import { txIcon, txPersonMinor, txSubtitle, txTitle } from '@/features/txDisplay';
import { repo, useDb, useDbQuery, type TxView } from '@/lib/db';
import { useSheet } from '@/lib/sheet';
import { useToast } from '@/lib/toast';

/** One person: their balance(s) per currency, settle/lend actions, full history. */
export default function ContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bump } = useDb();
  const toast = useToast();
  const sheet = useSheet();

  const contact = useDbQuery(() => repo.getContact(id));
  const txs = useDbQuery(() => repo.listContactTxs(id));

  if (!contact) {
    return (
      <Screen title="Person" back>
        <EmptyState icon="users" title="Not found" note="This person was deleted." />
      </Screen>
    );
  }

  const c = contact.contact;

  // The loud button follows the balance: they owe → collect, you owe → settle.
  const owesYou = contact.balances.length > 0 && contact.balances.every((b) => b.delta > 0);
  const youOwe = contact.balances.length > 0 && contact.balances.every((b) => b.delta < 0);

  const deleteTx = (t: TxView) => {
    const at = repo.deleteTx(t.id);
    bump();
    haptic.press();
    toast.show('Entry deleted', {
      actionLabel: 'Undo',
      onAction: () => {
        repo.restoreTx(t.id, at);
        bump();
      },
    });
  };

  const openUdhaar = (type: 'lend' | 'borrow' | 'repay_in' | 'repay_out') => {
    sheet.open(<TransactionSheet initialType={type} initialContactId={c.id} fixedPerson />);
  };

  const shareStatement = async () => {
    if (txs.length === 0) {
      toast.show('Nothing to share yet');
      return;
    }
    try {
      await Share.share({
        message: buildStatement({ name: c.name, balances: contact.balances, txs }),
        title: statementSubject(c.name),
      });
    } catch {
      toast.show('Could not open the share sheet');
    }
  };

  return (
    <Screen
      title={c.name}
      sub={c.phone ?? undefined}
      back
      right={
        <View style={styles.headerActions}>
          <IconButton icon="share" label="Share statement" onPress={shareStatement} />
          <IconButton icon="edit" label="Edit person" onPress={() => sheet.open(<ContactSheet contactId={c.id} />)} />
        </View>
      }
    >
      <View style={styles.balanceCard}>
        {contact.balances.length === 0 ? (
          <Text style={styles.settledTitle}>Settled up</Text>
        ) : (
          contact.balances.map((b) => (
            <View key={b.currency} style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>{b.delta > 0 ? 'Owes you' : 'You owe'}</Text>
              <Money minor={Math.abs(b.delta)} currency={b.currency} style={styles.balanceMoney} />
            </View>
          ))
        )}
      </View>

      <View style={styles.actions}>
        <Button
          label="They paid"
          icon="arrowDown"
          variant={owesYou ? 'primary' : 'secondary'}
          style={styles.actionBtn}
          onPress={() => openUdhaar('repay_in')}
        />
        <Button
          label="I paid"
          icon="arrowUp"
          variant={youOwe ? 'primary' : 'secondary'}
          style={styles.actionBtn}
          onPress={() => openUdhaar('repay_out')}
        />
      </View>
      <View style={styles.actions}>
        <Button
          label="Lent out"
          icon="arrowUp"
          variant="secondary"
          style={styles.actionBtn}
          onPress={() => openUdhaar('lend')}
        />
        <Button
          label="Borrowed"
          icon="arrowDown"
          variant="secondary"
          style={styles.actionBtn}
          onPress={() => openUdhaar('borrow')}
        />
      </View>

      <Text style={styles.sectionTitle}>History</Text>
      {txs.length === 0 ? (
        <EmptyState icon="users" title="No entries yet" note="Use the buttons above to record a lend, borrow or payment." />
      ) : (
        <View style={styles.section}>
          {txs.map((t, i) => (
            <ListRow
              key={t.id}
              icon={txIcon(t)}
              title={txTitle(t)}
              subtitle={txSubtitle(t)}
              right={<Money minor={txPersonMinor(t)} currency={t.currency} sign />}
              onPress={() => sheet.open(<TransactionSheet tx={t} />)}
              onLongPress={() => sheet.open(<TransactionSheet tx={t} />)}
              onDelete={() => deleteTx(t)}
              last={i === txs.length - 1}
            />
          ))}
        </View>
      )}

      {c.note ? <Text style={styles.note}>{c.note}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', gap: 8 },
  balanceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 8,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { ...typography.body, color: colors.muted },
  balanceMoney: { fontSize: 22 },
  settledTitle: { ...typography.h2, color: colors.muted },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1 },
  sectionTitle: { ...typography.section, marginTop: 24, marginBottom: 10 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  note: { ...typography.small, textAlign: 'center', marginTop: 18 },
});
