import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { enterRise } from '@/theme/motion';
import { colors, pagePadding } from '@/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  /** Vertical gap between direct children (Figma auto-layout gap). */
  gap?: number;
  /** Extra bottom room, e.g. for a floating button or sticky footer. */
  bottomInset?: number;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Rendered outside the scroll view (sticky footers, FABs, sheets). */
  overlay?: ReactNode;
};

/** Dark page with the 20 pt gutter and safe-area aware top spacing (status bar + 12). */
export function Screen({ children, gap = 16, bottomInset = 24, scroll = true, contentStyle, overlay }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = { paddingTop: insets.top + 12, paddingBottom: bottomInset, gap };

  return (
    <View style={styles.root}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, padding, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, padding, contentStyle]}>{children}</View>
      )}
      {overlay}
    </View>
  );
}

/** Staggered entrance for stacked sections — calm fade + 12 pt rise, 50 ms apart. */
export function Reveal({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View entering={enterRise(60 + index * 50)} style={style}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  content: { paddingHorizontal: pagePadding },
});
