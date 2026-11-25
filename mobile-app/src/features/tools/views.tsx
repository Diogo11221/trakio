import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { OptionCard } from '@/components/OptionCard';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SectionLabel } from '@/components/Surface';
import {
  activityLevels,
  bandFor,
  bmi,
  bmiBands,
  bodyFatBands,
  bodyFatPercent,
  caloriesForGoal,
  dailyCalories,
  dailyWater,
  decimal,
  healthyWeightRange,
  macrosFor,
  oneRepMax,
  platesPerSide,
  repPercentages,
  roundTo,
  type Goal,
  type Plate,
  type Sex,
} from '@/features/tools/calc';
import { BandScale, InputCard, MeasureRow, Note, ResultCard, ShareBar } from '@/features/tools/components';
import { goalLabel, type BodyData, type ToolId } from '@/features/tools/data';
import { formatThousands } from '@/lib/format';
import { layoutGlide } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

export type ToolViewProps = {
  initial: BodyData;
  /** Rendered under the result with a plain-text summary (e.g. "Enviar ao aluno"). */
  footer?: (summary: string) => ReactNode;
};

const sexOptions = [
  { value: 'male', label: 'Homem' },
  { value: 'female', label: 'Mulher' },
] as const;

/** Thousands with a no-break space so "1 470 kcal" never splits across lines in a chat bubble. */
function kcal(value: number): string {
  return formatThousands(value).replace(/ /g, '\u00a0');
}

const ESTIMATE = 'É uma estimativa para adultos e não substitui a avaliação de um profissional de saúde.';

export function ToolView({ tool, ...props }: ToolViewProps & { tool: ToolId }) {
  switch (tool) {
    case 'body-mass':
      return <BodyMassTool {...props} />;
    case 'calories':
      return <CaloriesTool {...props} />;
    case 'max-lift':
      return <MaxLiftTool {...props} />;
    case 'body-fat':
      return <BodyFatTool {...props} />;
    case 'water':
      return <WaterTool {...props} />;
    case 'plates':
      return <PlatesTool {...props} />;
  }
}

// ── Índice de massa corporal ────────────────────────────────────────────────

function BodyMassTool({ initial, footer }: ToolViewProps) {
  const [weight, setWeight] = useState(initial.weightKg);
  const [height, setHeight] = useState(initial.heightCm);

  const value = bmi(weight, height);
  const { band } = bandFor(value, bmiBands);
  const [low, high] = healthyWeightRange(height);
  const summary = `Índice de massa corporal: ${decimal(value)} (${band.label}). Peso ${decimal(weight, 1, true)} kg, altura ${height} cm. Peso saudável para esta altura: ${decimal(low)} a ${decimal(high)} kg.`;

  return (
    <>
      <InputCard>
        <MeasureRow label="Peso" value={weight} unit="kg" onChange={setWeight} min={25} max={300} />
        <MeasureRow label="Altura" value={height} unit="cm" onChange={setHeight} min={100} max={230} decimals={false} last />
      </InputCard>

      <ResultCard label="O teu índice" value={decimal(value)} verdict={band.label}>
        <BandScale bands={bmiBands} value={value} min={15} max={40} highlight={1} />
        <AppText variant="small" tone="muted">
          Para {decimal(height / 100, 2)} m, o peso saudável vai de{' '}
          <AppText variant="small" style={styles.strong}>
            {decimal(low)} a {decimal(high)} kg
          </AppText>
          .
        </AppText>
      </ResultCard>

      {footer?.(summary)}
      <Note>
        Não distingue músculo de gordura: quem treina força pode ter um índice alto com pouca gordura. Para isso, usa a
        percentagem de gordura.
      </Note>
    </>
  );
}

// ── Calorias por dia ────────────────────────────────────────────────────────

const goalOptions = [
  { value: 'lose', label: 'Perder' },
  { value: 'maintain', label: 'Manter' },
  { value: 'gain', label: 'Ganhar' },
] as const;

function CaloriesTool({ initial, footer }: ToolViewProps) {
  const [sex, setSex] = useState<Sex>(initial.sex);
  const [age, setAge] = useState(initial.age);
  const [weight, setWeight] = useState(initial.weightKg);
  const [height, setHeight] = useState(initial.heightCm);
  const [activity, setActivity] = useState(initial.activity);
  const [goal, setGoal] = useState<Goal>(initial.goal);

  const maintenance = dailyCalories(sex, weight, height, age, activity);
  const target = caloriesForGoal(maintenance, goal);
  const macros = macrosFor(target, weight, goal);
  const energy = { protein: macros.protein * 4, carbs: macros.carbs * 4, fat: macros.fat * 9 };
  const total = energy.protein + energy.carbs + energy.fat || 1;
  const summary = `Calorias por dia (${goalLabel[goal].toLowerCase()}): ${kcal(target)} kcal — proteína ${macros.protein} g, hidratos ${macros.carbs} g, gordura ${macros.fat} g. Gasto diário estimado: ${kcal(maintenance)} kcal.`;

  return (
    <>
      <SegmentedControl options={sexOptions} value={sex} onChange={setSex} stretch />
      <InputCard>
        <MeasureRow label="Idade" value={age} unit="anos" onChange={setAge} min={15} max={100} decimals={false} />
        <MeasureRow label="Peso" value={weight} unit="kg" onChange={setWeight} min={25} max={300} />
        <MeasureRow label="Altura" value={height} unit="cm" onChange={setHeight} min={100} max={230} decimals={false} last />
      </InputCard>

      <SectionLabel>Quanto te mexes</SectionLabel>
      <View style={styles.options}>
        {activityLevels.map((level) => (
          <OptionCard
            key={level.value}
            compact
            title={level.title}
            description={level.description}
            selected={activity === level.value}
            onPress={() => setActivity(level.value)}
          />
        ))}
      </View>

      <SectionLabel>Objetivo</SectionLabel>
      <SegmentedControl options={goalOptions} value={goal} onChange={setGoal} stretch />

      <ResultCard label="Comer por dia" value={formatThousands(target)} unit="kcal" verdict={goalLabel[goal]}>
        <AppText variant="small" tone="muted">
          Gastas cerca de {formatThousands(maintenance)} kcal por dia.
          {goal === 'lose' ? ' Comer 20% menos faz perder cerca de meio quilo por semana.' : ''}
          {goal === 'gain' ? ' Comer 10% mais dá para ganhar músculo sem acumular muita gordura.' : ''}
        </AppText>
        <View style={styles.macros}>
          <ShareBar label="Proteína" value={`${macros.protein} g`} detail={`${Math.round((energy.protein / total) * 100)}%`} share={energy.protein / total} tone={colors.volt} />
          <ShareBar label="Hidratos" value={`${macros.carbs} g`} detail={`${Math.round((energy.carbs / total) * 100)}%`} share={energy.carbs / total} delay={80} />
          <ShareBar label="Gordura" value={`${macros.fat} g`} detail={`${Math.round((energy.fat / total) * 100)}%`} share={energy.fat / total} delay={160} tone={colors.textMuted} />
        </View>
      </ResultCard>

      {footer?.(summary)}
      <Note>{ESTIMATE}</Note>
    </>
  );
}

// ── Peso máximo numa repetição ──────────────────────────────────────────────

function MaxLiftTool({ initial, footer }: ToolViewProps) {
  const [weight, setWeight] = useState(initial.lift.weightKg);
  const [reps, setReps] = useState(initial.lift.reps);

  const max = oneRepMax(weight, reps);
  const summary = `Peso máximo numa repetição (${initial.lift.exercise}): ${decimal(roundTo(max), 1, true)} kg, a partir de ${decimal(weight, 1, true)} kg × ${reps}. Para 5 repetições: ${decimal(roundTo(max * 0.87), 1, true)} kg; para 8: ${decimal(roundTo(max * 0.8), 1, true)} kg.`;

  return (
    <>
      <AppText variant="small" tone="muted">
        Escreve uma série que fizeste até perto da falha em {initial.lift.exercise.toLowerCase()}.
      </AppText>
      <InputCard>
        <MeasureRow label="Peso levantado" value={weight} unit="kg" onChange={setWeight} min={1} max={500} />
        <MeasureRow label="Repetições" value={reps} unit="vezes" onChange={setReps} min={1} max={15} decimals={false} last />
      </InputCard>

      <ResultCard label="Conseguirias levantar uma vez" value={decimal(roundTo(max), 1, true)} unit="kg" verdict={initial.lift.exercise}>
        {reps > 10 ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)}>
            <AppText variant="small" tone="muted">
              Acima de 10 repetições a estimativa fica menos certa.
            </AppText>
          </Animated.View>
        ) : null}
        <View style={styles.table}>
          {repPercentages.map((row) => (
            <View key={row.reps} style={[styles.tableRow, row.reps === reps && styles.tableRowActive]}>
              <AppText style={styles.tableReps}>{row.reps === 1 ? '1 vez' : `${row.reps} vezes`}</AppText>
              <AppText style={styles.tableKg}>{decimal(roundTo((max * row.percent) / 100), 1, true)} kg</AppText>
              <AppText style={styles.tablePct}>{row.percent}%</AppText>
            </View>
          ))}
        </View>
      </ResultCard>

      {footer?.(summary)}
      <Note>Arredondado a 2,5 kg. Faz testes de peso máximo só com aquecimento e alguém a ajudar.</Note>
    </>
  );
}

// ── Percentagem de gordura ──────────────────────────────────────────────────

function BodyFatTool({ initial, footer }: ToolViewProps) {
  const [sex, setSex] = useState<Sex>(initial.sex);
  const [weight, setWeight] = useState(initial.weightKg);
  const [height, setHeight] = useState(initial.heightCm);
  const [waist, setWaist] = useState(initial.waistCm);
  const [neck, setNeck] = useState(initial.neckCm);
  const [hip, setHip] = useState(initial.hipCm);

  const fat = bodyFatPercent(sex, height, waist, neck, hip);
  const bands = bodyFatBands(sex);
  const band = fat === null ? null : bandFor(fat, bands).band;
  const fatKg = fat === null ? 0 : (weight * fat) / 100;
  const summary =
    fat === null
      ? ''
      : `Percentagem de gordura: ${decimal(fat)}% (${band?.label ?? ''}). Gordura ${decimal(fatKg)} kg, massa magra ${decimal(weight - fatKg)} kg. Cintura ${waist} cm, pescoço ${neck} cm${sex === 'female' ? `, anca ${hip} cm` : ''}.`;

  return (
    <>
      <SegmentedControl options={sexOptions} value={sex} onChange={setSex} stretch />
      <InputCard>
        <MeasureRow label="Peso" value={weight} unit="kg" onChange={setWeight} min={25} max={300} />
        <MeasureRow label="Altura" value={height} unit="cm" onChange={setHeight} min={100} max={230} decimals={false} />
        <MeasureRow label="Cintura" hint="À altura do umbigo, sem apertar" value={waist} unit="cm" onChange={setWaist} min={40} max={200} />
        <MeasureRow
          label="Pescoço"
          hint="Logo abaixo da maçã de Adão"
          value={neck}
          unit="cm"
          onChange={setNeck}
          min={20}
          max={70}
          last={sex === 'male'}
        />
        {sex === 'female' ? (
          <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} layout={layoutGlide}>
            <MeasureRow label="Anca" hint="Na parte mais larga" value={hip} unit="cm" onChange={setHip} min={50} max={200} last />
          </Animated.View>
        ) : null}
      </InputCard>

      <ResultCard
        label="Gordura corporal"
        value={fat === null ? '—' : decimal(fat)}
        unit="%"
        verdict={band?.label ?? 'Confirma as medidas'}
      >
        {fat !== null ? (
          <>
            <BandScale bands={bands} value={fat} min={sex === 'male' ? 2 : 10} max={sex === 'male' ? 35 : 45} highlight={2} />
            <View style={styles.split}>
              <Split label="Gordura" value={`${decimal(fatKg)} kg`} />
              <Split label="Massa magra" value={`${decimal(weight - fatKg)} kg`} />
            </View>
          </>
        ) : (
          <AppText variant="small" tone="muted">
            A cintura tem de ser maior do que o pescoço.
          </AppText>
        )}
      </ResultCard>

      {fat !== null ? footer?.(summary) : null}
      <Note>Mede de manhã, em jejum, sempre no mesmo sítio. Erra cerca de 3 a 4 pontos — serve para ver a evolução.</Note>
    </>
  );
}

function Split({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.splitItem}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText style={styles.splitValue}>{value}</AppText>
    </View>
  );
}

// ── Água por dia ────────────────────────────────────────────────────────────

const GLASS_ML = 250;

function WaterTool({ initial, footer }: ToolViewProps) {
  const [weight, setWeight] = useState(initial.weightKg);
  const [minutes, setMinutes] = useState(initial.trainingMinutes);

  const litres = dailyWater(weight, minutes);
  const glasses = Math.round((litres * 1000) / GLASS_ML);
  const summary = `Água por dia: ${decimal(litres)} L (cerca de ${glasses} copos de 250 ml), com ${minutes} min de treino.`;

  return (
    <>
      <InputCard>
        <MeasureRow label="Peso" value={weight} unit="kg" onChange={setWeight} min={25} max={300} />
        <MeasureRow label="Treino hoje" value={minutes} unit="min" onChange={setMinutes} min={0} max={300} decimals={false} last />
      </InputCard>

      <ResultCard label="Beber por dia" value={decimal(litres)} unit="L" verdict={`Cerca de ${glasses} copos`}>
        <View style={styles.glasses} accessibilityElementsHidden>
          {Array.from({ length: Math.min(glasses, 24) }, (_, i) => (
            <Animated.View key={i} entering={FadeIn.duration(220).delay(i * 25)} style={styles.glass}>
              <View style={styles.glassFill} />
            </Animated.View>
          ))}
        </View>
        <AppText variant="small" tone="muted">
          35 ml por quilo, mais meio litro por cada hora de treino. Em dias quentes, bebe mais.
        </AppText>
      </ResultCard>

      {footer?.(summary)}
      <Note>{ESTIMATE}</Note>
    </>
  );
}

// ── Discos na barra ─────────────────────────────────────────────────────────

const barOptions = [
  { value: '20', label: 'Barra 20 kg' },
  { value: '15', label: '15 kg' },
  { value: '10', label: '10 kg' },
] as const;

const plateLook: Record<Plate, { height: number; width: number; color: string }> = {
  25: { height: 112, width: 18, color: colors.volt },
  20: { height: 104, width: 17, color: colors.text },
  15: { height: 92, width: 15, color: colors.textSoft },
  10: { height: 78, width: 14, color: colors.textMuted },
  5: { height: 60, width: 12, color: colors.borderStrong },
  2.5: { height: 46, width: 10, color: colors.surfaceRaised },
  1.25: { height: 38, width: 9, color: colors.border },
};

function PlatesTool({ initial, footer }: ToolViewProps) {
  const [target, setTarget] = useState(roundTo(initial.lift.weightKg));
  const [bar, setBar] = useState<'20' | '15' | '10'>('20');
  const barKg = Number(bar);
  const { plates, rest } = platesPerSide(target, barKg);
  const list = plates.map((p) => decimal(p, 2, true)).join(' + ');
  const summary = `Discos para ${decimal(target, 1, true)} kg (barra de ${barKg} kg): ${list || 'só a barra'} de cada lado.`;

  return (
    <>
      <InputCard>
        <MeasureRow label="Peso total" value={target} unit="kg" onChange={setTarget} min={0} max={500} last />
      </InputCard>
      <SegmentedControl options={barOptions} value={bar} onChange={setBar} stretch />

      <ResultCard label="De cada lado" value={String(plates.length)} unit={plates.length === 1 ? 'disco' : 'discos'} verdict={list ? `${list} kg` : 'Só a barra'}>
        <View style={styles.barbell} accessibilityLabel={`De cada lado: ${list || 'nenhum disco'}`}>
          <View style={styles.collar} />
          <View style={styles.sleeve} />
          <View style={styles.platesRow}>
            {plates.map((p, i) => (
              <Animated.View
                key={`${target}-${bar}-${i}`}
                entering={FadeIn.duration(200).delay(i * 50)}
                style={[
                  styles.plate,
                  { height: plateLook[p].height, width: plateLook[p].width, backgroundColor: plateLook[p].color },
                ]}
              />
            ))}
          </View>
        </View>
        <View style={styles.legend}>
          {[...new Set(plates)].map((p) => (
            <View key={p} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: plateLook[p].color }]} />
              <AppText style={styles.legendText}>
                {plates.filter((x) => x === p).length} × {decimal(p, 2, true)} kg
              </AppText>
            </View>
          ))}
        </View>
        {rest > 0 ? (
          <AppText variant="small" tone="muted">
            Faltam {decimal(rest, 2, true)} kg — não dá certo com os discos normais. Tenta {decimal(target - rest, 2, true)} kg.
          </AppText>
        ) : null}
        {target < barKg ? (
          <AppText variant="small" tone="muted">
            O peso total é menor do que a barra.
          </AppText>
        ) : null}
      </ResultCard>

      {footer?.(summary)}
    </>
  );
}

const styles = StyleSheet.create({
  strong: { fontFamily: fonts.uiSemiBold, color: colors.text },
  options: { gap: 8 },
  macros: { gap: 14, marginTop: 14 },

  table: { marginTop: 12, gap: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  tableRowActive: { backgroundColor: colors.surfaceRaised },
  tableReps: { flex: 1, fontFamily: fonts.ui, fontSize: 13, color: colors.textSoft },
  tableKg: { width: 86, textAlign: 'right', fontFamily: fonts.monoMedium, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  tablePct: { width: 52, textAlign: 'right', fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted },

  split: { flexDirection: 'row', gap: 10, marginTop: 4 },
  splitItem: { flex: 1, gap: 2, padding: 12, borderRadius: 12, backgroundColor: colors.surfaceRaised },
  splitValue: { fontFamily: fonts.monoMedium, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },

  glasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 12 },
  glass: {
    width: 18,
    height: 26,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderTopWidth: 0,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  glassFill: { height: '70%', backgroundColor: 'rgba(212,255,0,0.75)' },

  barbell: { height: 130, marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  collar: { width: 10, height: 34, borderRadius: 3, backgroundColor: colors.borderStrong },
  sleeve: { position: 'absolute', left: 10, right: 0, height: 12, borderRadius: 3, backgroundColor: colors.surfaceRaised },
  platesRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 6 },
  plate: { borderRadius: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontFamily: fonts.mono, fontSize: 12, color: colors.textSoft },
});
