import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { colors, radius, text as typography } from '@/design';
import { repo, useDbQuery } from '@/lib/db';

export default function MoreScreen() {
  const router = useRouter();

  const counts = useDbQuery(() => {
    const accounts = repo.listAccounts().length;
    const people = repo.listContacts().length;
    const txs = repo.listRecentTxs(1000).length;
    return `${accounts} places · ${people} people · ${txs} entries`;
  });

  return (
    <Screen title="More" sub="Settings & data">
      <View style={styles.section}>
        <ListRow
          icon="wallet"
          title="Money places"
          subtitle="Cash, bank, wallets"
          onPress={() => router.push('/accounts')}
        />
        <ListRow icon="users" title="People" subtitle="Udhaar contacts & balances" onPress={() => router.push('/ledger')} />
        <ListRow
          icon="target"
          title="Budgets"
          subtitle="Monthly caps per category"
          onPress={() => router.push('/budgets')}
        />
        <ListRow
          icon="cloud"
          title="Your data"
          subtitle={`${counts} · backup & restore`}
          onPress={() => router.push('/data')}
          last
        />
      </View>
      <Text style={styles.footer}>Udhaar · v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
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
