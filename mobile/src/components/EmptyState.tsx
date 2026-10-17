import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, text as typography } from '@/design';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  note?: string;
}

export function EmptyState({ icon, title, note }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.tile}>
        <Icon name={icon} size={30} color={colors.muted2} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 },
  tile: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h2, fontSize: 17, textAlign: 'center' },
  note: { ...typography.small, textAlign: 'center' },
});
