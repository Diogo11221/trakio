import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import type { SetEntry } from '@/features/workout/data';
import { NumberField } from '@/features/workout/components/NumberField';
import { formatKg } from '@/lib/format';
import { enterFade } from '@/theme/motion';
import { colors, fonts, radii } from '@/theme/tokens';

export const SET_COLUMNS = { set: 28, previous: 86, reps: 56, check: 30 } as const;

type SetRowProps = {
  number: number;
  entry: SetEntry;
  state: 'done' | 'active' | 'pending';
  /** Sets an exact value on the active set (typed in the field). */
  onSet?: (field: 'kg' | 'reps', value: number) => void;
};

function previousLabel(entry: SetEntry) {
  return entry.previous ? `${formatKg(entry.previous.kg)} × ${entry.previous.reps}` : '—';
}

/** "Treino/Linha de série" — Feita / Ativa / Por fazer. */
export function SetRow({ number, entry, state, onSet }: SetRowProps) {
  if (state === 'active') {
    return <ActiveSetRow number={number} entry={entry} onSet={onSet} />;
  }
  const done = state === 'done';
  return (
    <View style={styles.row} accessibilityLabel={`Série ${number}${done ? ', feita' : ''}`}>
      <AppText style={[styles.set, { width: SET_COLUMNS.set }]}>{number}</AppText>
      <AppText style={[styles.previous, { width: SET_COLUMNS.previous }]}>{previousLabel(entry)}</AppText>
      <AppText style={[styles.logged, styles.flexCenter, !done && styles.pendingText]}>{formatKg(entry.kg)}</AppText>
      <AppText style={[styles.logged, styles.center, { width: SET_COLUMNS.reps }, !done && styles.pendingText]}>
        {entry.reps}
      </AppText>
      <View style={[styles.checkSlot, { width: SET_COLUMNS.check }]}>
        {done ? (
          <Animated.View entering={enterFade(0, 200)}>
            <Icon name="checkVolt" size={16} />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function ActiveSetRow({ number, entry, onSet }: Omit<SetRowProps, 'state'>) {
  return (
    <View style={[styles.row, styles.active]} accessibilityLabel={`Série ${number}, em curso`}>
      <AppText style={[styles.set, styles.activeSet, { width: SET_COLUMNS.set }]}>{number}</AppText>
      <AppText style={[styles.previous, { width: SET_COLUMNS.previous }]}>{previousLabel(entry)}</AppText>
      <NumberField
        value={entry.kg}
        format={formatKg}
        decimals
        onChange={(kg) => onSet?.('kg', kg)}
        accessibilityLabel="Peso em quilos"
        style={styles.flex}
      />
      <NumberField
        value={entry.reps}
        format={String}
        decimals={false}
        onChange={(reps) => onSet?.('reps', reps)}
        accessibilityLabel="Repetições"
        style={{ width: SET_COLUMNS.reps }}
      />
      {/* Status only — the set is logged with "Concluir série", never by tapping here. */}
      <View style={styles.checkRing} accessibilityElementsHidden importantForAccessibility="no" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: radii.md - 2,
  },
  active: {
    height: 60,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.voltBorderSoft,
  },
  flex: { flex: 1 },
  flexCenter: { flex: 1, textAlign: 'center' },
  center: { textAlign: 'center' },
  set: { fontFamily: fonts.monoMedium, fontSize: 13, color: colors.text },
  activeSet: { color: colors.volt },
  previous: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted },
  logged: { fontFamily: fonts.monoMedium, fontSize: 15, color: colors.textSoft, fontVariant: ['tabular-nums'] },
  pendingText: { color: colors.textFaint },
  checkSlot: { alignItems: 'center', justifyContent: 'center', height: 30 },
  checkRing: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: 'rgba(212,255,0,0.8)' },
});
