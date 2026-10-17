import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { colors, radius, text as typography } from '@/design';
import { repo, useDb } from '@/lib/db';

export default function MoreScreen() {
  const router = useRouter();
  const { rev } = useDb();

  const counts = useMemo(() => {
    const accounts = repo.listAccounts().length;
    const people = repo.listContacts().length;
    const txs = repo.listRecentTxs(1000).length;
    return `${accounts} places · ${people} people · ${txs} entries`;
  }, [rev]);

  return (
    <Screen title="More" sub="Settings & data">
      <View style={styles.section}>
        <ListRow
          icon="wallet"
          title="Money places"
          subtitle="Cash, bank, wallets — balances"
          onPress={() => router.push('/accounts')}
        />
        <ListRow icon="users" title="People" subtitle="Udhaar contacts & balances" onPress={() => router.push('/ledger')} />
        <ListRow
          icon="cloud"
          title="Your data"
          subtitle={`${counts} · backup & restore`}
          onPress={() => router.push('/data')}
        />
        <ListRow icon="bolt" title="Design Kit" subtitle="Mono system & motion lab" onPress={() => router.push('/design-kit')} last />
      </View>
      <Text style={styles.footer}>Udhaar · v0.1 — device-local, no account, everything editable</Text>
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
  footer: { ...typography.caption, textAlign: 'center', marginTop: 24 },
});
