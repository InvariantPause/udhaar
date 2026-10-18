import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  type WithSpringConfig,
} from 'react-native-reanimated';
import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { ListRow } from '@/components/ListRow';
import { Money } from '@/components/Money';
import { Screen } from '@/components/Screen';
import { colors, fonts, haptic, radius, springs, text as typography } from '@/design';
import { TransactionSheet } from '@/features/TransactionSheet';
import { formatMoney, toMinor } from '@/lib/money';
import { useSheet } from '@/lib/sheet';

/**
 * Design Kit — every token and component, live.
 * This is the source of truth for how Udhaar looks and moves.
 */
export default function DesignKitScreen() {
  const sheet = useSheet();
  const [amount, setAmount] = useState('');
  const [rows, setRows] = useState(DEMO_ROWS);
  const [longPressed, setLongPressed] = useState<string | null>(null);

  return (
    <Screen title="Design Kit" sub="Mono system · motion lab" back>
      <SectionTitle>Palette</SectionTitle>
      <View style={styles.swatches}>
        {SWATCHES.map(([name, value]) => (
          <View key={name} style={styles.swatch}>
            <View style={[styles.swatchChip, { backgroundColor: value }]} />
            <Text style={styles.swatchLabel}>{name}</Text>
          </View>
        ))}
      </View>

      <SectionTitle>Type</SectionTitle>
      <Card>
        <Text style={typography.display}>₨8,500</Text>
        <Text style={[typography.title, styles.gap8]}>Screen title</Text>
        <Text style={[typography.h2, styles.gap8]}>Section header</Text>
        <Text style={[typography.body, styles.gap8]}>Body text for rows and notes.</Text>
        <Text style={[typography.small, styles.gap4]}>Secondary · muted</Text>
      </Card>

      <SectionTitle>Buttons</SectionTitle>
      <View style={styles.stack}>
        <Button variant="primary" label="Save entry" icon="check" onPress={() => haptic.success()} />
        <Button variant="secondary" label="Secondary action" icon="edit" onPress={() => {}} />
        <Button variant="ghost" label="Ghost action" onPress={() => {}} />
        <Button variant="primary" label="Disabled" disabled onPress={() => {}} />
      </View>

      <SectionTitle>Money</SectionTitle>
      <Card>
        <MoneyRow label="Income" right={<Money minor={8500000} currency="PKR" sign />} />
        <MoneyRow label="Expense" right={<Money minor={-350050} currency="PKR" sign />} />
        <MoneyRow label="To receive" right={<Money minor={500000} currency="PKR" />} />
        <MoneyRow label="Display" right={<Money minor={-2840000} currency="PKR" style={typography.moneyDisplay} />} />
      </Card>

      <SectionTitle>Amount input</SectionTitle>
      <AmountInput value={amount} onChangeText={setAmount} currency="PKR" />
      <Text style={styles.live}>
        {amount ? formatMoney(toMinor(amount, 'PKR'), 'PKR', { sign: true }) : 'Type an amount — this is the real parser'}
      </Text>

      <SectionTitle>Rows — swipe left, long-press</SectionTitle>
      <View style={styles.section}>
        {rows.map((r, i) => (
          <ListRow
            key={r.id}
            icon="wallet"
            title={r.title}
            subtitle={longPressed === r.id ? 'Long-press detected' : r.sub}
            right={<Money minor={r.amount} currency="PKR" sign />}
            onDelete={() => {
              haptic.success();
              setRows((rs) => rs.filter((x) => x.id !== r.id));
            }}
            onLongPress={() => {
              setLongPressed(r.id);
              setTimeout(() => setLongPressed((cur) => (cur === r.id ? null : cur)), 1200);
            }}
            last={i === rows.length - 1}
          />
        ))}
      </View>
      {rows.length === 0 ? (
        <View style={styles.resetWrap}>
          <Button variant="secondary" label="Reset demo rows" icon="repeat" onPress={() => setRows(DEMO_ROWS)} />
        </View>
      ) : null}

      <SectionTitle>Sheet</SectionTitle>
      <Button variant="secondary" label="Open capture sheet" icon="plus" onPress={() => sheet.open(<TransactionSheet />)} />

      <SectionTitle>Motion presets</SectionTitle>
      {MOTION.map(([name, config]) => (
        <MotionDemo key={name} label={name} config={config} />
      ))}

      <SectionTitle>Icons</SectionTitle>
      <View style={styles.iconGrid}>
        {ICON_NAMES.map((n) => (
          <View key={n} style={styles.iconTile}>
            <Icon name={n} size={20} color={colors.text} />
            <Text style={styles.iconLabel}>{n}</Text>
          </View>
        ))}
      </View>

      <SectionTitle>Haptics</SectionTitle>
      <View style={styles.rowButtons}>
        <Button size="sm" label="Light" onPress={() => haptic.tap()} style={styles.flex1} />
        <Button size="sm" label="Medium" onPress={() => haptic.press()} style={styles.flex1} />
        <Button size="sm" label="Success" onPress={() => haptic.success()} style={styles.flex1} />
      </View>
    </Screen>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function MoneyRow({ label, right }: { label: string; right: ReactNode }) {
  return (
    <View style={styles.moneyRow}>
      <Text style={typography.small}>{label}</Text>
      {right}
    </View>
  );
}

function MotionDemo({ label, config }: { label: string; config: WithSpringConfig }) {
  const x = useSharedValue(0);
  const [w, setW] = useState(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const play = () => {
    haptic.tap();
    const target = Math.max(w - 82, 0);
    x.value = withSequence(withSpring(target, config), withSpring(0, config));
  };
  return (
    <Pressable onPress={play} onLayout={onLayout} style={styles.motionRow}>
      <View>
        <Text style={styles.motionLabel}>{label}</Text>
        <Text style={styles.motionConfig}>
          damping {config.damping} · stiffness {config.stiffness}
        </Text>
      </View>
      <Animated.View style={[styles.motionDot, style]} />
    </Pressable>
  );
}

const SWATCHES: [string, string][] = [
  ['bg', colors.bg],
  ['surface', colors.surface],
  ['surface2', colors.surface2],
  ['surface3', colors.surface3],
  ['line', colors.line],
  ['line2', colors.line2],
];

const DEMO_ROWS = [
  { id: '1', title: 'Kiryana / Grocery', sub: 'Today · Cash', amount: -820000 },
  { id: '2', title: 'Salary', sub: 'Yesterday · Bank', amount: 8500000 },
  { id: '3', title: 'Chai / Food', sub: 'Yesterday · Easypaisa', amount: -145000 },
];

const MOTION: [string, WithSpringConfig][] = [
  ['press', springs.press],
  ['snappy', springs.snappy],
  ['soft', springs.soft],
  ['sheet', springs.sheet],
  ['bouncy', springs.bouncy],
];

const ICON_NAMES: IconName[] = [
  'home',
  'users',
  'chart',
  'menu',
  'plus',
  'search',
  'trash',
  'edit',
  'check',
  'chevronLeft',
  'chevronRight',
  'x',
  'download',
  'upload',
  'arrowDown',
  'arrowUp',
  'repeat',
  'target',
  'gear',
  'cloud',
  'bolt',
  'wallet',
  'bank',
  'phone',
  'box',
  'calendar',
];

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { alignItems: 'center', gap: 4, width: 74 },
  swatchChip: { width: 66, height: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  swatchLabel: { ...typography.caption },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  stack: { gap: 10 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  gap8: { marginTop: 8 },
  gap4: { marginTop: 4 },
  live: { ...typography.small, marginTop: 10, textAlign: 'center' },
  sectionTitle: { ...typography.section, marginTop: 26, marginBottom: 10 },
  moneyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  resetWrap: { marginTop: 10 },
  motionRow: {
    position: 'relative',
    justifyContent: 'center',
    height: 58,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  motionLabel: { ...typography.label, fontFamily: fonts.bold },
  motionConfig: { ...typography.caption, marginTop: 1 },
  motionDot: {
    position: 'absolute',
    left: 14,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconTile: {
    width: 76,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
  },
  iconLabel: { ...typography.caption, fontSize: 10 },
  rowButtons: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
});
