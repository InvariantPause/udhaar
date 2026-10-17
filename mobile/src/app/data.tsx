import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { colors, haptic, radius, text as typography } from '@/design';
import { describeBackupText, exportBackupJson, runImport } from '@/lib/backup';
import type { BackupDescription } from '@/lib/backupFormat';
import { repo, useDb, useDbQuery } from '@/lib/db';
import { useToast } from '@/lib/toast';

interface Pending {
  json: string;
  desc: BackupDescription;
}

/**
 * Your data — export writes a versioned JSON backup and hands it to the
 * Android share sheet; import picks a file, dry-runs it (describe), and only
 * then offers Merge or Replace. Replace snapshots the current state first,
 * so even it is undoable once from the toast.
 */
export default function DataScreen() {
  const { bump } = useDb();
  const toast = useToast();

  const counts = useDbQuery(() => repo.exportCounts());
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const onExport = async () => {
    setBusy('export');
    try {
      const { fileName, json } = exportBackupJson();
      const file = new File(Paths.cache, fileName);
      if (file.exists) file.delete();
      file.create();
      file.write(json);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Udhaar backup' });
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not export the backup');
    } finally {
      setBusy(null);
    }
  };

  const onPick = async () => {
    setBusy('import');
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;
      const json = await new File(uri).text();
      const desc = describeBackupText(json);
      if (!desc.ok) {
        toast.show(desc.error ?? 'That file is not an Udhaar backup');
        return;
      }
      setPending({ json, desc });
    } catch {
      toast.show('Could not read that file');
    } finally {
      setBusy(null);
    }
  };

  const apply = (mode: 'replace' | 'merge') => {
    if (!pending) return;
    try {
      const snapshot = mode === 'replace' ? exportBackupJson().json : null;
      const result = runImport(pending.json, mode);
      bump();
      haptic.success();
      setPending(null);
      if (snapshot) {
        toast.show(`Replaced · ${result.inserted} rows`, {
          actionLabel: 'Undo',
          onAction: () => {
            try {
              runImport(snapshot, 'replace');
              bump();
              haptic.tap();
            } catch {
              toast.show('Could not undo the replace');
            }
          },
        });
      } else {
        toast.show(`Merged · ${result.inserted} rows`);
      }
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Import failed');
    }
  };

  return (
    <Screen title="Your data" sub="Backup & restore" back>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>On this phone</Text>
        <Text style={styles.counts}>
          {counts.places} {counts.places === 1 ? 'place' : 'places'} · {counts.people}{' '}
          {counts.people === 1 ? 'person' : 'people'} · {counts.entries} {counts.entries === 1 ? 'entry' : 'entries'}
        </Text>
        <Button
          label={busy === 'export' ? 'Preparing…' : 'Export backup'}
          variant="primary"
          icon="download"
          disabled={busy !== null}
          onPress={onExport}
        />
      </View>

      {pending ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ready to restore</Text>
          <Text style={styles.counts}>
            {pending.desc.format === 'legacy' ? 'Old prototype backup' : 'Udhaar backup'} · {pending.desc.counts.transactions}{' '}
            entries · {pending.desc.counts.contacts} {pending.desc.counts.contacts === 1 ? 'person' : 'people'} ·{' '}
            {pending.desc.counts.accounts} {pending.desc.counts.accounts === 1 ? 'place' : 'places'} ·{' '}
            {pending.desc.counts.categories} categories
          </Text>
          {pending.desc.currencies.length > 0 ? (
            <Text style={styles.note}>Currencies: {pending.desc.currencies.join(', ')}</Text>
          ) : null}
          {pending.desc.warnings.map((w) => (
            <Text key={w} style={styles.warning}>
              {w}
            </Text>
          ))}
          <Text style={styles.note}>Merge adds to your data. Replace overwrites with the file.</Text>
          <View style={styles.actions}>
            <Button label="Merge" variant="secondary" style={styles.actionBtn} onPress={() => apply('merge')} />
            <Button label="Replace everything" variant="primary" style={styles.actionBtn} onPress={() => apply('replace')} />
          </View>
          <Button label="Cancel" variant="ghost" onPress={() => setPending(null)} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Restore</Text>
          <Text style={styles.note}>Pick a backup file. Nothing changes until you choose.</Text>
          <Button
            label={busy === 'import' ? 'Reading…' : 'Import backup'}
            variant="secondary"
            icon="upload"
            disabled={busy !== null}
            onPress={onPick}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: 18,
    gap: 12,
    marginBottom: 14,
  },
  cardTitle: { ...typography.section, fontSize: 11 },
  counts: { ...typography.body },
  note: { ...typography.small },
  warning: { ...typography.small, color: colors.text },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1 },
});
