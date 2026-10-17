import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { Chip, ChipRow } from '@/components/Chip';
import { FieldLabel } from '@/components/Field';
import { Input } from '@/components/Input';
import { haptic, text as typography } from '@/design';
import { repo, useDb, useDbQuery, type AccountKind, type AccountWithBalance } from '@/lib/db';
import { fromMinor, toMinor } from '@/lib/money';
import { useSheet } from '@/lib/sheet';
import { useToast } from '@/lib/toast';
import { accountIcon, accountKindLabel } from './txDisplay';

const KINDS: AccountKind[] = ['cash', 'bank', 'wallet', 'other'];
const CURRENCIES = ['PKR', 'USD', 'INR', 'EUR'];

interface AccountSheetProps {
  /** present = edit that place */
  account?: AccountWithBalance;
}

/** Add or edit a money place (cash, bank, wallet, anything). */
export function AccountSheet({ account }: AccountSheetProps) {
  const { close } = useSheet();
  const { bump } = useDb();
  const toast = useToast();

  const [name, setName] = useState(account?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'cash');
  const [currency, setCurrency] = useState(account?.currency ?? 'PKR');
  const [opening, setOpening] = useState(account ? String(fromMinor(account.opening_minor, account.currency)) : '');

  // A place with entries keeps its currency — history rows are written in it.
  const currencyLocked = useDbQuery(() => (account ? repo.accountHasEntries(account.id) : false));

  const canSave = name.trim().length > 0;

  const onSave = () => {
    try {
      repo.saveAccount({
        id: account?.id,
        name,
        kind,
        currency,
        opening_minor: toMinor(opening || '0', currency),
      });
      bump();
      haptic.success();
      close();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save the place');
    }
  };

  const onDelete = account
    ? () => {
        const mode = repo.deleteAccount(account.id);
        bump();
        haptic.press();
        close();
        toast.show(
          mode === 'archived' ? `${account.name} archived (has entries)` : `${account.name} deleted`,
          {
            actionLabel: 'Undo',
            onAction: () => {
              repo.restoreAccount(account.id);
              bump();
            },
          },
        );
      }
    : undefined;

  return (
    <View style={styles.root}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.wrap}
        style={styles.scroll}
      >
        <Text style={styles.title}>{account ? 'Edit place' : 'New place'}</Text>

        <Input label="Name" value={name} onChangeText={setName} placeholder="JazzCash, Bank, Pocket…" autoFocus={!account} />

        <View>
          <FieldLabel>Type</FieldLabel>
          <ChipRow>
            {KINDS.map((k) => (
              <Chip
                key={k}
                label={accountKindLabel(k)}
                icon={accountIcon(k)}
                active={k === kind}
                onPress={() => setKind(k)}
              />
            ))}
          </ChipRow>
        </View>

        <View>
          <FieldLabel>Currency</FieldLabel>
          {currencyLocked ? (
            <View style={styles.lockedRow}>
              <Chip label={currency} active />
              <Text style={styles.lockedNote}>Has entries in {currency}</Text>
            </View>
          ) : (
            <ChipRow>
              {CURRENCIES.map((c) => (
                <Chip key={c} label={c} active={c === currency} onPress={() => setCurrency(c)} />
              ))}
            </ChipRow>
          )}
        </View>

        <View>
          <FieldLabel>Opening balance</FieldLabel>
          <AmountInput value={opening} onChangeText={setOpening} currency={currency} />
          <Text style={styles.hint}>Before any entries. Usually 0.</Text>
        </View>

        {onDelete ? <Button label="Delete place" variant="ghost" icon="trash" onPress={onDelete} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={account ? 'Save changes' : 'Add place'}
          variant="primary"
          icon="check"
          disabled={!canSave}
          onPress={onSave}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexShrink: 1 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  wrap: { paddingBottom: 4, gap: 16 },
  footer: { paddingTop: 12 },
  title: { ...typography.h2 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockedNote: { ...typography.caption, flex: 1 },
  hint: { ...typography.caption, marginTop: 6 },
});
