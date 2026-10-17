import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { ListRow } from '@/components/ListRow';
import { Money } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { colors, haptic, radius, text as typography } from '@/design';
import { ContactSheet } from '@/features/ContactSheet';
import { contactBalanceLabel } from '@/features/txDisplay';
import { repo, useDb, type ContactWithBalances } from '@/lib/db';
import { useSheet } from '@/lib/sheet';
import { useToast } from '@/lib/toast';

/** Udhaar: every person and their running balance(s). Tap opens their ledger. */
export default function LedgerScreen() {
  const { rev, bump } = useDb();
  const toast = useToast();
  const sheet = useSheet();
  const router = useRouter();

  const contacts = useMemo(() => repo.listContacts(), [rev]);

  const deleteContact = (c: ContactWithBalances) => {
    const token = repo.deleteContact(c.contact.id);
    bump();
    haptic.press();
    toast.show(
      token.txCount > 0
        ? `${c.contact.name} deleted with ${token.txCount} ${token.txCount === 1 ? 'entry' : 'entries'}`
        : `${c.contact.name} deleted`,
      {
        actionLabel: 'Undo',
        onAction: () => {
          repo.restoreContact(token);
          bump();
        },
      },
    );
  };

  return (
    <Screen
      title="Udhaar"
      sub="Money lent & borrowed"
      right={<IconButton icon="plus" label="Add person" onPress={() => sheet.open(<ContactSheet />)} />}
    >
      {contacts.length === 0 ? (
        <EmptyState
          icon="users"
          title="No people yet"
          note="Add someone — lend, borrow, and settle right from their page."
        />
      ) : (
        <View style={styles.section}>
          {contacts.map((c, i) => (
            <ListRow
              key={c.contact.id}
              icon="users"
              title={c.contact.name}
              subtitle={contactBalanceLabel(c.balances)}
              right={
                c.balances.length > 0 ? (
                  <Money minor={c.balances[0].delta} currency={c.balances[0].currency} sign />
                ) : (
                  <Text style={styles.settled}>Settled</Text>
                )
              }
              onPress={() => router.push({ pathname: '/contact/[id]', params: { id: c.contact.id } })}
              onLongPress={() => sheet.open(<ContactSheet contactId={c.contact.id} />)}
              onDelete={() => deleteContact(c)}
              last={i === contacts.length - 1}
            />
          ))}
        </View>
      )}
      {contacts.length > 0 ? (
        <Text style={styles.footer}>Deleting a person takes their whole ledger along — undo brings it back.</Text>
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
  settled: { ...typography.small, color: colors.muted2 },
  footer: { ...typography.caption, textAlign: 'center', marginTop: 18 },
});
