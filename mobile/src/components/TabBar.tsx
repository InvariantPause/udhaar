import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, haptic, layout, springs } from '@/design';
import { TransactionSheet } from '@/features/TransactionSheet';
import { useSheet } from '@/lib/sheet';
import { Icon, type IconName } from './Icon';

/** Tab identity. Order: Today · Udhaar · [FAB] · Reports · More */
const META: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Today', icon: 'home' },
  ledger: { label: 'Udhaar', icon: 'users' },
  reports: { label: 'Reports', icon: 'chart' },
  more: { label: 'More', icon: 'menu' },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const sheet = useSheet();

  const tabs = state.routes.map((route, index) => ({
    key: route.key,
    name: route.name,
    index,
    ...(META[route.name] ?? { label: route.name, icon: 'home' as IconName }),
  }));

  const onTabPress = (item: (typeof tabs)[number]) => {
    const focused = state.index === item.index;
    const event = navigation.emit({ type: 'tabPress', target: item.key, canPreventDefault: true });
    if (focused || event.defaultPrevented) return;
    haptic.select();
    navigation.navigate(item.name);
  };

  const left = tabs.slice(0, 2);
  const right = tabs.slice(2);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {left.map((t) => (
        <TabItem key={t.key} label={t.label} icon={t.icon} active={state.index === t.index} onPress={() => onTabPress(t)} />
      ))}
      <Fab
        onPress={() => {
          haptic.press();
          sheet.open(<TransactionSheet />);
        }}
      />
      {right.map((t) => (
        <TabItem key={t.key} label={t.label} icon={t.icon} active={state.index === t.index} onPress={() => onTabPress(t)} />
      ))}
    </View>
  );
}

function TabItem({ label, icon, active, onPress }: { label: string; icon: IconName; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityLabel={label}>
      <Icon name={icon} size={23} color={active ? colors.text : colors.muted2} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function Fab({ onPress }: { onPress: () => void }) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.06 }] }));

  return (
    <Animated.View style={[styles.fabWrap, anim]}>
      <Pressable
        accessibilityLabel="Add entry"
        onPressIn={() => {
          pressed.value = withSpring(1, springs.press);
        }}
        onPressOut={() => {
          pressed.value = withSpring(0, springs.press);
        }}
        onPress={onPress}
        style={styles.fab}
      >
        <Icon name="plus" size={27} color={colors.inverse} strokeWidth={2.6} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(8, 8, 8, 0.97)',
    borderTopWidth: layout.hairline,
    borderTopColor: colors.line,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 8 },
  tabLabel: { fontFamily: fonts.semibold, fontSize: 10.5, letterSpacing: 0.1, color: colors.muted2 },
  tabLabelActive: { color: colors.text },
  fabWrap: { marginTop: -26 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
