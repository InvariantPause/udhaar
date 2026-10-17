import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, haptic, layout, radius } from '@/design';
import { Brandmark } from './Brandmark';
import { Icon } from './Icon';

interface ScreenProps {
  title: string;
  sub?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Shared screen shell: mono header (brandmark or back), scrollable body. */
export function Screen({ title, sub, back = false, right, children, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {back ? (
          <Pressable
            onPress={() => {
              haptic.tap();
              router.back();
            }}
            style={styles.roundBtn}
            accessibilityLabel="Back"
          >
            <Icon name="chevronLeft" size={19} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.roundBtn}>
            <Brandmark size={24} />
          </View>
        )}
        <View style={styles.titles}>
          <Text style={styles.title}>{title}</Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        </View>
        {right ?? null}
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 12,
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.8, color: colors.text },
  sub: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted, marginTop: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: layout.screenPadding, paddingBottom: 110 },
});
