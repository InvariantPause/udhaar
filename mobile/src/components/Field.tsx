import { StyleSheet, Text } from 'react-native';
import { colors, text as typography } from '@/design';

/** Tiny uppercase label above a field or chip strip. */
export function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: { ...typography.section, fontSize: 11, color: colors.muted2, marginBottom: 8 },
});
