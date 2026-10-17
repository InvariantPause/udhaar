import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ListRow } from '@/components/ListRow';
import { Screen } from '@/components/Screen';
import { colors, radius, text as typography } from '@/design';

export default function MoreScreen() {
  const router = useRouter();

  return (
    <Screen title="More" sub="Settings & data">
      <View style={styles.section}>
        <ListRow
          icon="bolt"
          title="Design Kit"
          subtitle="Mono system & motion lab"
          onPress={() => router.push('/design-kit')}
          last
        />
      </View>
      <Text style={styles.footer}>Udhaar · v0.1 — mono foundation</Text>
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
