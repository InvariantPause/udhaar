import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Brandmark } from '@/components/Brandmark';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { colors, radius, text as typography } from '@/design';
import { CapturePreview } from '@/features/CapturePreview';
import { useSheet } from '@/lib/sheet';

export default function TodayScreen() {
  const router = useRouter();
  const sheet = useSheet();

  return (
    <Screen title="Today" sub="Your money today">
      <View style={styles.hero}>
        <Brandmark size={54} />
        <Text style={styles.hello}>Assalam-o-Alaikum</Text>
        <Text style={styles.note}>
          The mono foundation is live. Look around the Design Kit, then try the capture sheet.
        </Text>
        <View style={styles.actions}>
          <Button variant="primary" label="Open Design Kit" icon="bolt" onPress={() => router.push('/design-kit')} />
          <Button variant="secondary" label="Preview capture" icon="plus" onPress={() => sheet.open(<CapturePreview />)} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xxl,
    paddingVertical: 34,
    paddingHorizontal: 22,
    gap: 12,
  },
  hello: { ...typography.title, marginTop: 6 },
  note: { ...typography.small, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 10 },
});
