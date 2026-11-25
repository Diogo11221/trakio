import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Reveal } from '@/components/Screen';
import { IconButton } from '@/components/Surface';
import { NumberFieldAccessory } from '@/features/workout/components/NumberField';
import { colors, pagePadding } from '@/theme/tokens';

/** Page frame shared by the tools list and every calculator (client and PT). */
export function ToolScreen({
  title,
  description,
  top,
  children,
}: {
  title: string;
  description?: string;
  /** Extra block under the title (e.g. the PT's student picker). */
  top?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bar}>
          <IconButton icon="chevronLeft" onPress={() => router.back()} accessibilityLabel="Voltar" />
        </View>
        <Reveal index={0} style={styles.header}>
          <AppText variant="title">{title}</AppText>
          {description ? (
            <AppText variant="small" tone="muted" style={styles.description}>
              {description}
            </AppText>
          ) : null}
        </Reveal>
        {top ? <Reveal index={1}>{top}</Reveal> : null}
        <Reveal index={2} style={styles.body}>
          {children}
        </Reveal>
      </ScrollView>
      <NumberFieldAccessory />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: pagePadding, gap: 16 },
  bar: { flexDirection: 'row', height: 44, alignItems: 'center' },
  header: { gap: 6 },
  description: { lineHeight: 19 },
  body: { gap: 14 },
});
