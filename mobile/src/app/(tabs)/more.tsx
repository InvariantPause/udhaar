import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { Toggle } from '@/components/Toggle';
import { colors, haptic, radius, text as typography } from '@/design';
import { repo, useDb, useDbQuery } from '@/lib/db';
import { useToast } from '@/lib/toast';

export default function MoreScreen() {
  const router = useRouter();
  const { bump } = useDb();
  const toast = useToast();

  const counts = useDbQuery(() => {
    const accounts = repo.listAccounts().length;
    const people = repo.listContacts().length;
    const txs = repo.listRecentTxs(1000).length;
    return `${accounts} places · ${people} people · ${txs} entries`;
  });

  const appLock = useDbQuery(() => repo.getMeta('app_lock') === '1');

  // The app lock rides on the phone's own screen lock — no second secret.
  const setAppLock = async (next: boolean) => {
    haptic.press();
    if (!next) {
      repo.setMeta('app_lock', '0');
      bump();
      toast.show('App lock off');
      return;
    }
    try {
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level === LocalAuthentication.SecurityLevel.NONE) {
        toast.show('Set up a screen lock on this device first');
        return;
      }
      repo.setMeta('app_lock', '1');
      bump();
      haptic.success();
      toast.show('App lock on — it asks at every open');
    } catch {
      toast.show('Could not check this device');
    }
  };

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
          icon="repeat"
          title="Recurring bills"
          subtitle="Rent, internet, fees — one-tap logging"
          onPress={() => router.push('/recurring')}
        />
        <ListRow
          icon="cloud"
          title="Your data"
          subtitle={`${counts} · backup & restore`}
          onPress={() => router.push('/data')}
        />
        <ListRow
          icon="lock"
          title="App lock"
          subtitle={appLock ? 'On · asks at every open' : 'Use your device screen lock'}
          right={<Toggle value={appLock} label="App lock" onValueChange={(v) => void setAppLock(v)} />}
          onPress={() => void setAppLock(!appLock)}
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
