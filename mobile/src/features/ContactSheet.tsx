import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { haptic, text as typography } from '@/design';
import { repo, useDb } from '@/lib/db';
import { useSheet } from '@/lib/sheet';
import { useToast } from '@/lib/toast';

interface ContactSheetProps {
  /** present = edit that person */
  contactId?: string;
}

/** Add or edit a person. Deleting a person cascades their udhaar ledger (undoable). */
export function ContactSheet({ contactId }: ContactSheetProps) {
  const { close } = useSheet();
  const { bump } = useDb();
  const toast = useToast();

  const existing = contactId ? repo.getContact(contactId)?.contact : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [note, setNote] = useState(existing?.note ?? '');

  const canSave = name.trim().length > 0;

  const onSave = () => {
    try {
      repo.saveContact({ id: existing?.id, name, phone, note });
      bump();
      haptic.success();
      close();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not save the person');
    }
  };

  const onDelete = existing
    ? () => {
        const token = repo.deleteContact(existing.id);
        bump();
        haptic.press();
        close();
        toast.show(
          token.txCount > 0
            ? `${existing.name} deleted with ${token.txCount} ${token.txCount === 1 ? 'entry' : 'entries'}`
            : `${existing.name} deleted`,
          {
            actionLabel: 'Undo',
            onAction: () => {
              repo.restoreContact(token);
              bump();
            },
          },
        );
      }
    : undefined;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>{existing ? 'Edit person' : 'New person'}</Text>

      <Input label="Name" value={name} onChangeText={setName} placeholder="Ali, Amma, Shop…" autoFocus={!existing} />
      <Input label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="03xx…" keyboardType="phone-pad" />
      <Input label="Note (optional)" value={note} onChangeText={setNote} placeholder="Chai wala near office" />

      <Button label={existing ? 'Save changes' : 'Add person'} variant="primary" icon="check" disabled={!canSave} onPress={onSave} />
      {onDelete ? <Button label="Delete person" variant="ghost" icon="trash" onPress={onDelete} /> : null}
      {existing ? (
        <Text style={styles.hint}>Deleting takes their whole udhaar history with it — undo brings both back.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 10, gap: 16 },
  title: { ...typography.h2 },
  hint: { ...typography.caption, textAlign: 'center' },
});
