import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { haptics } from '@/lib/haptics';
import { colors, fonts } from '@/theme/tokens';

const tabs: Record<string, { label: string; icon: IconName }> = {
  today: { label: 'Hoje', icon: 'tabToday' },
  train: { label: 'Treinar', icon: 'tabTrain' },
  nutrition: { label: 'Nutrição', icon: 'tabNutrition' },
  progress: { label: 'Progresso', icon: 'tabProgress' },
  profile: { label: 'Perfil', icon: 'tabProfile' },
};

/** "Mobile/Barra de navegação · Cliente" — Volt only on the active glyph. */
export function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      {state.routes.map((route, index) => {
        const tab = tabs[route.name];
        if (!tab) return null;
        const focused = index === state.index;
        return (
          <TabButton
            key={route.key}
            label={tab.label}
            icon={tab.icon}
            focused={focused}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                haptics.tick();
                navigateToTab(route.key);
              }
            }}
          />
        );
      })}
    </View>
  );
}

function TabButton({
  label,
  icon,
  focused,
  onPress,
}: {
  label: string;
  icon: IconName;
  focused: boolean;
  onPress: () => void;
}) {
  const bump = useSharedValue(1);

  useEffect(() => {
    if (focused) bump.set(withSequence(withTiming(1.08, { duration: 110 }), withTiming(1, { duration: 200 })));
  }, [bump, focused]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.get() }] }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Animated.View style={iconStyle}>
        <Icon name={icon} size={24} tint={focused ? colors.volt : colors.textMuted} />
      </Animated.View>
      <AppText style={[styles.label, { color: focused ? colors.text : colors.textMuted }]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: 'hidden',
  },
  tint: { backgroundColor: colors.tabBar },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontFamily: fonts.uiMedium, fontSize: 10 },
});
