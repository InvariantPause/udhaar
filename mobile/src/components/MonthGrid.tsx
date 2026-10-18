import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, haptic, radius, text as typography } from '@/design';
import { addMonths, formatDate, formatMonth, monthGrid, sameDay, startOfMonth, startOfToday } from '@/lib/format';
import { Icon } from './Icon';

interface MonthGridProps {
  /** the picked day */
  value: number;
  onSelect: (dayTs: number) => void;
}

/** Monday-first, matching CLDR for PK. */
const WEEK_HEADS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Single-month calendar for backdating an entry.
 * Mono only: white fill = picked, hairline ring = today, dimmed = not tappable.
 * The shown month is set on mount from `value` — paging is internal only.
 */
export function MonthGrid({ value, onSelect }: MonthGridProps) {
  const [monthTs, setMonthTs] = useState(() => startOfMonth(value));
  const todayTs = startOfToday();
  const month = new Date(monthTs);
  const canGoNext = addMonths(monthTs, 1) <= startOfMonth(todayTs);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={8}
          onPress={() => {
            haptic.tap();
            setMonthTs(addMonths(monthTs, -1));
          }}
          style={styles.nav}
        >
          <Icon name="chevronLeft" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.month} accessibilityRole="header" accessibilityLiveRegion="polite">
          {formatMonth(monthTs)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: !canGoNext }}
          disabled={!canGoNext}
          hitSlop={8}
          onPress={() => {
            haptic.tap();
            setMonthTs(addMonths(monthTs, 1));
          }}
          style={styles.nav}
        >
          <Icon name="chevronRight" size={18} color={canGoNext ? colors.text : colors.muted2} />
        </Pressable>
      </View>

      <View style={styles.weekHeads} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {WEEK_HEADS.map((head, i) => (
          <Text key={`${head}${i}`} style={styles.weekHeadLabel}>
            {head}
          </Text>
        ))}
      </View>

      {monthGrid(monthTs).map((week) => (
        <View key={week[0]} style={styles.week}>
          {week.map((dayTs) => {
            const cell = new Date(dayTs);
            const inMonth = cell.getMonth() === month.getMonth() && cell.getFullYear() === month.getFullYear();
            const disabled = !inMonth || dayTs > todayTs;
            const selected = sameDay(dayTs, value);
            const today = dayTs === todayTs;
            return (
              <Pressable
                key={dayTs}
                accessibilityRole="button"
                accessibilityLabel={today ? `${formatDate(dayTs)}, today` : formatDate(dayTs)}
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                hitSlop={2}
                onPress={() => {
                  haptic.select();
                  onSelect(dayTs);
                }}
                style={styles.cell}
              >
                <View style={[styles.day, today && !selected && styles.dayToday, selected && styles.daySelected]}>
                  <Text style={[styles.dayLabel, disabled && styles.dayLabelDim, selected && styles.dayLabelSelected]}>
                    {cell.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 10,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line2,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  nav: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  month: { ...typography.label },
  weekHeads: { flexDirection: 'row', marginTop: 6, marginBottom: 2 },
  weekHeadLabel: { ...typography.caption, flex: 1, textAlign: 'center' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' },
  day: { width: 32, height: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  dayToday: { borderWidth: 1, borderColor: colors.line2 },
  daySelected: { backgroundColor: colors.white },
  dayLabel: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.text, fontVariant: ['tabular-nums'] },
  dayLabelDim: { color: colors.muted2 },
  dayLabelSelected: { color: colors.inverse, fontFamily: fonts.semibold },
});
