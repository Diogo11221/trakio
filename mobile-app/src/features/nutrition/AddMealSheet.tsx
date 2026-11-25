import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { PressableScale } from '@/components/PressableScale';
import { Sheet } from '@/components/Sheet';
import { slotForHour, slots, useDiary, type MealSlot } from '@/features/nutrition/diary';
import { parseMeal, totals } from '@/features/nutrition/foods';
import { formatTimeOfDay } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { newId } from '@/lib/persist';
import { layoutGlide } from '@/theme/motion';
import { colors, fonts, radii } from '@/theme/tokens';

/**
 * Registo rápido (grátis): write what you ate in plain words — "2 ovos, 150 g
 * de frango e arroz" — and it's matched against the local food table.
 */
export function AddMealSheet({
  visible,
  onClose,
  day,
  slot: initialSlot,
}: {
  visible: boolean;
  onClose: () => void;
  day: string;
  slot: MealSlot | null;
}) {
  const { addMeal } = useDiary();
  const [text, setText] = useState('');
  const [slot, setSlot] = useState<MealSlot | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);

  const chosen = slot ?? initialSlot ?? slotForHour(new Date().getHours());
  const parsed = parseMeal(text);
  const items = parsed.items.filter((i) => !removed.includes(i.id));
  const sum = totals(items);

  const close = () => {
    setText('');
    setSlot(null);
    setRemoved([]);
    onClose();
  };

  const save = () => {
    if (items.length === 0) return;
    addMeal(day, {
      id: newId('meal'),
      slot: chosen,
      time: formatTimeOfDay(new Date()),
      items,
      source: 'manual',
      photoUri: null,
    });
    haptics.success();
    close();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      accessibilityLabel="Adicionar refeição"
      header={<AppText variant="subheading">Adicionar refeição</AppText>}
    >
      <View style={styles.body}>
        <View style={styles.chips}>
          {slots.map((s) => (
            <Chip key={s.id} label={s.name} kind="outline" selected={chosen === s.id} onPress={() => setSlot(s.id)} />
          ))}
        </View>

        <View style={styles.inputBox}>
          <TextInput
            value={text}
            onChangeText={(value) => {
              setText(value);
              setRemoved([]);
            }}
            placeholder="Ex.: 2 ovos, 150 g de frango, arroz e salada"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.volt}
            keyboardAppearance="dark"
            multiline
            autoFocus
            style={styles.input}
            accessibilityLabel="O que comeste?"
          />
        </View>

        {items.length > 0 ? (
          <Animated.View entering={FadeIn.duration(180)} layout={layoutGlide} style={styles.items}>
            {items.map((item) => (
              <PressableScale
                key={item.id}
                onPress={() => {
                  haptics.tick();
                  setRemoved((r) => [...r, item.id]);
                }}
                pressedScale={0.98}
                accessibilityLabel={`Tirar ${item.name}`}
              >
                <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.item}>
                  <AppText variant="label" style={styles.flex}>
                    {item.name}
                  </AppText>
                  <AppText style={styles.grams}>{item.grams} g</AppText>
                  <AppText style={styles.kcal}>{Math.round(item.grams * item.per.kcal)} kcal</AppText>
                </Animated.View>
              </PressableScale>
            ))}
            <AppText variant="caption" tone="muted">
              Total {sum.kcal} kcal · proteína {sum.protein} g · hidratos {sum.carbs} g · gordura {sum.fat} g. Toca num alimento para o tirar.
            </AppText>
          </Animated.View>
        ) : null}

        {parsed.unknown.length > 0 && text.trim().length > 2 ? (
          <AppText variant="caption" tone="muted">
            Não reconheci: {parsed.unknown.join(', ')}. Experimenta outra palavra (ex.: “frango”, “pão”, “iogurte”).
          </AppText>
        ) : null}

        <Button label={items.length > 0 ? `Guardar · ${sum.kcal} kcal` : 'Guardar'} disabled={items.length === 0} onPress={save} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14 },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  inputBox: {
    minHeight: 84,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: { color: colors.text, fontFamily: fonts.ui, fontSize: 15, minHeight: 60, textAlignVertical: 'top' },
  items: { gap: 6 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
  },
  grams: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted },
  kcal: { fontFamily: fonts.monoMedium, fontSize: 13, color: colors.text, width: 70, textAlign: 'right' },
});
