import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Card, CardRow } from '@/components/Surface';
import { type Band } from '@/features/tools/calc';
import { toolIds, toolInfo, toolPreview, type BodyData, type ToolId } from '@/features/tools/data';
import { haptics } from '@/lib/haptics';
import { easeOut } from '@/theme/motion';
import { colors, durations, fonts, radii } from '@/theme/tokens';

// ── Inputs ──────────────────────────────────────────────────────────────────

function parse(text: string): number | null {
  const normalised = text.replace(',', '.').trim();
  if (normalised === '') return null;
  const value = Number(normalised);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function format(value: number, decimals: boolean): string {
  if (!decimals) return String(Math.round(value));
  return String(Math.round(value * 10) / 10).replace('.', ',');
}

type MeasureRowProps = {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  min: number;
  max: number;
  decimals?: boolean;
  hint?: string;
  last?: boolean;
};

/** One measurement inside an input card: label on the left, typed value on the right. */
export function MeasureRow({ label, value, unit, onChange, min, max, decimals = true, hint, last = false }: MeasureRowProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const focus = useSharedValue(0);

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.get(), [0, 1], [colors.borderStrong, colors.volt]),
  }));

  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false}>
      <CardRow last={last} style={styles.measure}>
        <View style={styles.flex}>
          <AppText variant="label">{label}</AppText>
          {hint ? (
            <AppText variant="caption" tone="muted">
              {hint}
            </AppText>
          ) : null}
        </View>
        <Animated.View style={[styles.inputBox, boxStyle]}>
          <TextInput
            ref={input}
            value={draft ?? format(value, decimals)}
            onChangeText={(text) => {
              setDraft(text);
              const parsed = parse(text);
              if (parsed !== null && parsed >= min && parsed <= max) onChange(decimals ? parsed : Math.round(parsed));
            }}
            onFocus={() => {
              haptics.tick();
              setDraft(format(value, decimals));
              focus.set(withTiming(1, { duration: durations.fast }));
            }}
            onBlur={() => {
              const parsed = draft === null ? null : parse(draft);
              if (parsed !== null) {
                const clamped = Math.min(max, Math.max(min, parsed));
                onChange(decimals ? clamped : Math.round(clamped));
              }
              setDraft(null);
              focus.set(withTiming(0, { duration: durations.base }));
            }}
            keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
            selectTextOnFocus
            keyboardAppearance="dark"
            selectionColor={colors.volt}
            maxLength={5}
            accessibilityLabel={`${label} em ${unit}`}
            style={styles.input}
          />
          <AppText style={styles.unit}>{unit}</AppText>
        </Animated.View>
      </CardRow>
    </Pressable>
  );
}

export function InputCard({ children }: { children: ReactNode }) {
  return <Card radius={16}>{children}</Card>;
}

// ── Results ─────────────────────────────────────────────────────────────────

/** Big result: label, value in mono, unit and a one-line verdict. */
export function ResultCard({
  label,
  value,
  unit,
  verdict,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  verdict?: string;
  children?: ReactNode;
}) {
  return (
    <Card radius={20} style={styles.result}>
      <AppText variant="small" tone="muted">
        {label}
      </AppText>
      <View style={styles.valueRow}>
        <AppText style={styles.value} accessibilityLiveRegion="polite">
          {value}
        </AppText>
        {unit ? <AppText style={styles.valueUnit}>{unit}</AppText> : null}
      </View>
      {verdict ? <AppText style={styles.verdict}>{verdict}</AppText> : null}
      {children}
    </Card>
  );
}

/**
 * Horizontal scale split into bands (healthy band in Volt) with a marker that
 * glides to the value. `min`/`max` bound the open-ended first and last bands.
 */
export function BandScale({
  bands,
  value,
  min,
  max,
  highlight,
}: {
  bands: Band[];
  value: number;
  min: number;
  max: number;
  /** Index of the band drawn in Volt (the "good" one). */
  highlight: number;
}) {
  const [width, setWidth] = useState(0);
  const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));

  const markerStyle = useAnimatedStyle(() => ({
    opacity: width > 0 ? 1 : 0,
    transform: [{ translateX: withTiming(ratio * width, { duration: 520, easing: easeOut }) }],
  }));

  const spans = bands.map((b) => Math.min(max, b.to) - Math.max(min, b.from));
  const active = bands.findIndex((b) => value >= b.from && value < b.to);

  return (
    <View style={styles.scale}>
      <View style={styles.scaleTrack} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {bands.map((b, i) => (
          <View
            key={b.label}
            style={[
              styles.scaleBand,
              { flex: Math.max(0.0001, spans[i] ?? 0) },
              {
                backgroundColor:
                  i === highlight ? colors.volt : i === active ? colors.textMuted : colors.surfaceRaised,
                opacity: i === highlight && active !== highlight ? 0.45 : 1,
              },
            ]}
          />
        ))}
      </View>
      <Animated.View style={[styles.marker, markerStyle]} pointerEvents="none">
        <View style={styles.markerDot} />
      </Animated.View>
      <View style={styles.ticks}>
        {bands.slice(1).map((b) => {
          const left = ((b.from - min) / (max - min)) * 100;
          return (
            <AppText key={b.label} style={[styles.tick, { left: `${left}%` }]}>
              {String(b.from).replace('.', ',')}
            </AppText>
          );
        })}
      </View>
    </View>
  );
}

/** Labelled bar that grows to `share` (0–1). Used for macros. */
export function ShareBar({
  label,
  value,
  detail,
  share,
  delay = 0,
  tone = colors.text,
}: {
  label: string;
  value: string;
  detail: string;
  share: number;
  delay?: number;
  tone?: string;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(delay, withTiming(Math.min(1, Math.max(0, share)), { duration: 600, easing: easeOut })));
  }, [delay, progress, share]);
  const style = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  return (
    <View style={styles.share}>
      <View style={styles.shareTop}>
        <AppText variant="label" style={styles.flex}>
          {label}
        </AppText>
        <AppText style={styles.shareValue}>{value}</AppText>
        <AppText variant="caption" tone="muted" style={styles.shareDetail}>
          {detail}
        </AppText>
      </View>
      <View style={styles.shareTrack}>
        <Animated.View style={[styles.shareFill, { backgroundColor: tone }, style]} />
      </View>
    </View>
  );
}

/** "Estimativa…" line under every result. */
export function Note({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.note, style]}>
      <Icon name="info" size={14} />
      <AppText variant="caption" tone="muted" style={styles.flex}>
        {children}
      </AppText>
    </View>
  );
}

// ── Tool tiles ──────────────────────────────────────────────────────────────

/** 2-column grid of tools with a live value from `body` on each tile. */
export function ToolGrid({
  body,
  onOpen,
  tools = toolIds,
}: {
  body: BodyData;
  /** Leave out for a read-only grid (e.g. the onboarding summary). */
  onOpen?: (tool: ToolId) => void;
  tools?: ToolId[];
}) {
  return (
    <View style={styles.grid}>
      {tools.map((tool) => {
        const preview = toolPreview(tool, body);
        const content = (
          <>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {toolInfo[tool].short}
            </AppText>
            <View style={styles.tileValueRow}>
              <AppText style={styles.tileValue}>{preview.value}</AppText>
              {preview.unit ? <AppText style={styles.tileUnit}>{preview.unit}</AppText> : null}
            </View>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {preview.note}
            </AppText>
          </>
        );
        if (!onOpen) {
          return (
            <View key={tool} style={[styles.tileWrap, styles.tile]}>
              {content}
            </View>
          );
        }
        return (
          <PressableScale
            key={tool}
            onPress={() => onOpen(tool)}
            haptic="tap"
            pressedScale={0.97}
            wrapperStyle={styles.tileWrap}
            style={styles.tile}
            accessibilityRole="button"
            accessibilityLabel={`${toolInfo[tool].title}: ${preview.value} ${preview.unit}`}
          >
            {content}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  measure: { paddingLeft: 16, paddingRight: 12, paddingVertical: 10, gap: 12, minHeight: 60 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 128,
    flexShrink: 0,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    backgroundColor: colors.input,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    textAlign: 'right',
    color: colors.text,
    fontFamily: fonts.monoMedium,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  unit: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, minWidth: 22 },

  result: { padding: 18, gap: 6 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  value: { fontFamily: fonts.monoMedium, fontSize: 48, letterSpacing: -2, color: colors.text, fontVariant: ['tabular-nums'] },
  valueUnit: { fontFamily: fonts.mono, fontSize: 16, color: colors.textMuted },
  verdict: { fontFamily: fonts.uiSemiBold, fontSize: 15, color: colors.volt },

  scale: { marginTop: 14, paddingTop: 10, paddingBottom: 18 },
  scaleTrack: { flexDirection: 'row', height: 8, gap: 3 },
  scaleBand: { height: 8, borderRadius: 4 },
  marker: { position: 'absolute', top: 0, left: -9, width: 18, alignItems: 'center' },
  markerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 7,
    backgroundColor: colors.text,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  ticks: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 14 },
  tick: {
    position: 'absolute',
    width: 40,
    marginLeft: -20,
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMuted,
  },

  share: { gap: 8 },
  shareTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  shareValue: { fontFamily: fonts.monoMedium, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  shareDetail: { width: 64, textAlign: 'right' },
  shareTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  shareFill: { height: 6, borderRadius: 3 },

  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tileWrap: { width: '48.5%', flexGrow: 1 },
  tile: {
    gap: 4,
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  tileValue: { fontFamily: fonts.monoMedium, fontSize: 22, color: colors.text, fontVariant: ['tabular-nums'] },
  tileUnit: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted },
});
