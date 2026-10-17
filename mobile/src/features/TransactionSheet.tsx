import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { Chip, ChipRow, Segmented } from '@/components/Chip';
import { FieldLabel } from '@/components/Field';
import { IconButton } from '@/components/IconButton';
import { Input } from '@/components/Input';
import { colors, fonts, haptic, text as typography } from '@/design';
import { repo, useDb, type TxType, type TxView } from '@/lib/db';
import { sameDay, recentDays, timestampOnDay } from '@/lib/format';
import { fromMinor, toMinor } from '@/lib/money';
import { useSheet } from '@/lib/sheet';
import { useToast } from '@/lib/toast';
import { AccountSheet } from './AccountSheet';
import { accountIcon } from './txDisplay';

type Segment = 'expense' | 'income' | 'transfer' | 'udhaar';

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'udhaar', label: 'Udhaar' },
];

function isUdhaarType(t: TxType): t is 'lend' | 'borrow' | 'repay_in' | 'repay_out' {
  return t === 'lend' || t === 'borrow' || t === 'repay_in' || t === 'repay_out';
}

function segmentOf(t: TxType): Segment {
  return isUdhaarType(t) ? 'udhaar' : t;
}

interface TransactionSheetProps {
  /** present = edit that entry (type stays freely editable, everything else too) */
  tx?: TxView;
  initialType?: TxType;
  initialContactId?: string;
  /** lock the person (opened from a contact page) */
  fixedPerson?: boolean;
}

/**
 * The one form for every entry: 3-second capture on create, full correction
 * on edit. Amount first, everything else prefilled from last time.
 */
export function TransactionSheet({ tx, initialType, initialContactId, fixedPerson = false }: TransactionSheetProps) {
  const { open, close } = useSheet();
  const { rev, bump } = useDb();
  const toast = useToast();

  const accounts = useMemo(() => repo.listAccounts(), [rev]);
  const contacts = useMemo(() => repo.listContacts(), [rev]);
  const expenseCats = useMemo(() => repo.listCategories('expense'), [rev]);
  const incomeCats = useMemo(() => repo.listCategories('income'), [rev]);
  const days = useMemo(() => recentDays(7), []);

  const [type, setType] = useState<TxType>(tx?.type ?? initialType ?? 'expense');
  const [amount, setAmount] = useState(tx ? String(fromMinor(tx.amount_minor, tx.currency)) : '');
  const [accountId, setAccountId] = useState<string | null>(() => {
    if (tx?.account_id) return tx.account_id;
    const last = repo.getMeta('last_account_id');
    return last && accounts.some((a) => a.id === last) ? last : (accounts[0]?.id ?? null);
  });
  const [toAccountId, setToAccountId] = useState<string | null>(tx?.to_account_id ?? null);
  const [contactId, setContactId] = useState<string | null>(tx?.contact_id ?? initialContactId ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(() => {
    if (tx?.category_id) return tx.category_id;
    const last = repo.getMeta('last_category_id');
    return last && expenseCats.some((c) => c.id === last) ? last : (expenseCats[0]?.id ?? null);
  });
  const [occurredAt, setOccurredAt] = useState(tx?.occurred_at ?? Date.now());
  const [note, setNote] = useState(tx?.note ?? '');
  const [newPersonOpen, setNewPersonOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const isUdhaar = isUdhaarType(type);

  // Resolvers: a stored id is trusted only while it still exists (or is this tx's own link).
  const resolveAccount = (id: string | null): string | null =>
    id && (accounts.some((a) => a.id === id) || id === tx?.account_id || id === tx?.to_account_id)
      ? id
      : (accounts[0]?.id ?? null);

  const activeAccountId = resolveAccount(accountId);
  const currency = accounts.find((a) => a.id === activeAccountId)?.currency ?? tx?.currency ?? 'PKR';

  const toChoices = accounts.filter((a) => a.id !== activeAccountId && a.currency === currency);
  const activeToAccountId =
    toAccountId && toChoices.some((a) => a.id === toAccountId) ? toAccountId : (toChoices[0]?.id ?? null);

  const activeContactId =
    contactId && (contacts.some((c) => c.contact.id === contactId) || contactId === tx?.contact_id)
      ? contactId
      : (contacts[0]?.contact.id ?? null);
  const contactName = contacts.find((c) => c.contact.id === activeContactId)?.contact.name ?? 'this person';

  const cats = type === 'income' ? incomeCats : expenseCats;
  const activeCategoryId =
    categoryId && cats.some((c) => c.id === categoryId) ? categoryId : (cats[0]?.id ?? null);

  const minor = toMinor(amount, currency);
  const canSave =
    minor > 0 &&
    !!activeAccountId &&
    (type !== 'transfer' || (!!activeToAccountId && activeToAccountId !== activeAccountId)) &&
    (!isUdhaar || !!activeContactId);

  const changeSegment = (seg: Segment) => {
    setType(seg === 'udhaar' ? (isUdhaar ? type : 'lend') : seg);
  };

  const onSave = () => {
    try {
      repo.saveTx({
        id: tx?.id,
        type,
        amount_minor: minor,
        account_id: activeAccountId,
        to_account_id: type === 'transfer' ? activeToAccountId : null,
        category_id: type === 'expense' || type === 'income' ? activeCategoryId : null,
        contact_id: isUdhaar ? activeContactId : null,
        note: note.trim() || null,
        occurred_at: occurredAt,
      });
      bump();
      haptic.success();
      close();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save the entry');
    }
  };

  const onDelete = tx
    ? () => {
        const at = repo.deleteTx(tx.id);
        bump();
        haptic.press();
        close();
        toast.show('Entry deleted', {
          actionLabel: 'Undo',
          onAction: () => {
            repo.restoreTx(tx.id, at);
            bump();
          },
        });
      }
    : undefined;

  const addPerson = () => {
    const name = newPersonName.trim();
    if (!name) return;
    try {
      const id = repo.saveContact({ name });
      bump();
      setContactId(id);
      setNewPersonOpen(false);
      setNewPersonName('');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not add the person');
    }
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const id = repo.addCategory(name, type === 'income' ? 'income' : 'expense');
      bump();
      setCategoryId(id);
      setNewCategoryOpen(false);
      setNewCategoryName('');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not add the category');
    }
  };

  if (accounts.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Add a money place first</Text>
        <Text style={styles.sub}>An entry needs somewhere the money comes from — cash, bank, wallet.</Text>
        <Button label="Add a place" variant="primary" icon="wallet" onPress={() => open(<AccountSheet />)} />
      </View>
    );
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.wrap}
    >
      <Text style={styles.title}>{tx ? 'Edit entry' : 'New entry'}</Text>

      <Segmented options={SEGMENTS} value={segmentOf(type)} onChange={changeSegment} />

      {isUdhaar ? (
        <View>
          <FieldLabel>Direction</FieldLabel>
          <ChipRow>
            <Chip label="Lent out" active={type === 'lend'} onPress={() => setType('lend')} />
            <Chip label="Borrowed" active={type === 'borrow'} onPress={() => setType('borrow')} />
            {tx ? (
              <>
                <Chip label="They paid" active={type === 'repay_in'} onPress={() => setType('repay_in')} />
                <Chip label="I paid" active={type === 'repay_out'} onPress={() => setType('repay_out')} />
              </>
            ) : null}
          </ChipRow>
        </View>
      ) : null}

      <AmountInput value={amount} onChangeText={setAmount} currency={currency} autoFocus={!tx} />

      {isUdhaar ? (
        <View>
          <FieldLabel>Person</FieldLabel>
          {fixedPerson && activeContactId ? (
            <Text style={styles.fixedPerson}>{contactName}</Text>
          ) : (
            <>
              <ChipRow>
                {contacts.map((c) => (
                  <Chip
                    key={c.contact.id}
                    label={c.contact.name}
                    active={c.contact.id === activeContactId}
                    onPress={() => setContactId(c.contact.id)}
                  />
                ))}
                <Chip label="New person" icon="plus" active={newPersonOpen} onPress={() => setNewPersonOpen(true)} />
              </ChipRow>
              {newPersonOpen ? (
                <View style={styles.inline}>
                  <Input
                    value={newPersonName}
                    onChangeText={setNewPersonName}
                    placeholder="Name"
                    autoFocus
                    style={styles.inlineInput}
                  />
                  <IconButton icon="check" label="Add person" onPress={addPerson} />
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}

      <View>
        <FieldLabel>
          {type === 'expense' || type === 'lend' || type === 'repay_out'
            ? 'Paid from'
            : type === 'transfer'
              ? 'From'
              : 'Received in'}
        </FieldLabel>
        <ChipRow>
          {accounts.map((a) => (
            <Chip
              key={a.id}
              label={a.name}
              icon={accountIcon(a.kind)}
              active={a.id === activeAccountId}
              onPress={() => setAccountId(a.id)}
            />
          ))}
        </ChipRow>
      </View>

      {type === 'transfer' ? (
        <View>
          <FieldLabel>To</FieldLabel>
          <ChipRow>
            {toChoices.map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                icon={accountIcon(a.kind)}
                active={a.id === activeToAccountId}
                onPress={() => setToAccountId(a.id)}
              />
            ))}
          </ChipRow>
          {toChoices.length === 0 ? (
            <Text style={styles.hint}>Add another {currency} place to move money into.</Text>
          ) : null}
        </View>
      ) : null}

      {type === 'expense' || type === 'income' ? (
        <View>
          <FieldLabel>Category</FieldLabel>
          <ChipRow>
            {cats.map((c) => (
              <Chip key={c.id} label={c.name} active={c.id === activeCategoryId} onPress={() => setCategoryId(c.id)} />
            ))}
            <Chip label="New" icon="plus" active={newCategoryOpen} onPress={() => setNewCategoryOpen(true)} />
          </ChipRow>
          {newCategoryOpen ? (
            <View style={styles.inline}>
              <Input
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Category name"
                autoFocus
                style={styles.inlineInput}
              />
              <IconButton icon="check" label="Add category" onPress={addCategory} />
            </View>
          ) : null}
        </View>
      ) : null}

      <View>
        <FieldLabel>Date</FieldLabel>
        <ChipRow>
          {days.map((d) => (
            <Chip
              key={d.ts}
              label={d.label}
              active={sameDay(occurredAt, d.ts)}
              onPress={() => setOccurredAt(timestampOnDay(d.ts))}
            />
          ))}
        </ChipRow>
      </View>

      <Input value={note} onChangeText={setNote} placeholder="Note (optional)" maxLength={140} />

      <Button
        label={tx ? 'Save changes' : 'Save entry'}
        variant="primary"
        icon="check"
        disabled={!canSave}
        onPress={onSave}
      />
      {onDelete ? <Button label="Delete entry" variant="ghost" icon="trash" onPress={onDelete} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 10, gap: 16 },
  title: { ...typography.h2 },
  sub: { ...typography.small, marginTop: -10 },
  fixedPerson: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  inline: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  inlineInput: { flex: 1 },
  hint: { ...typography.caption, marginTop: 8 },
});
