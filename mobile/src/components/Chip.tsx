import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, haptic, radius } from '@/design';
import { Icon, type IconName } from './Icon';

interface ChipProps {
  label: string;
  active?: boolean;
  icon?: IconName;
  onPress?: () => void;
}

/** Selectable pill. Active = white (the app's one loud surface). */
export function Chip({ label, active = false, icon, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        if (onPress) {
          haptic.tap();
          onPress();
        }
      }}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon ? <Icon name={icon} size={14} color={active ? colors.inverse : colors.muted} strokeWidth={2.2} /> : null}
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

interface ChipRowProps {
  children: ReactNode;
  /** let the row bleed into the sheet's horizontal padding for edge-to-edge scroll */
  edge?: boolean;
}

/** Horizontally scrollable chip strip. */
export function ChipRow({ children, edge = false }: ChipRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={edge ? styles.edge : undefined}
      contentContainerStyle={edge ? styles.edgeContent : styles.row}
    >
      {children}
    </ScrollView>
  );
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** The big type switch (Expense · Income · Transfer · Udhaar). */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.segWrap}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              haptic.select();
              onChange(opt.value);
            }}
            style={[styles.segItem, active && styles.segItemActive]}
          >
            <Text style={[styles.segLabel, active && styles.segLabelActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.surface2,
    maxWidth: 200,
  },
  chipActive: { backgroundColor: colors.white, borderColor: colors.white },
  label: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: -0.1, color: colors.muted },
  labelActive: { color: colors.inverse },
  row: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  edge: { marginHorizontal: -18 },
  edgeContent: { flexDirection: 'row', gap: 8, paddingHorizontal: 18 },
  segWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line2,
    padding: 3,
    gap: 3,
  },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
  segItemActive: { backgroundColor: colors.white },
  segLabel: { fontFamily: fonts.semibold, fontSize: 12.5, letterSpacing: -0.2, color: colors.muted },
  segLabelActive: { color: colors.inverse, fontFamily: fonts.bold },
});
