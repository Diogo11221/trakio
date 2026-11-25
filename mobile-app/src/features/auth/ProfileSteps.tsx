import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Checkbox } from '@/components/Checkbox';
import { Chip } from '@/components/Chip';
import { OptionCard } from '@/components/OptionCard';
import { PressableScale } from '@/components/PressableScale';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SectionLabel } from '@/components/Surface';
import { TextField } from '@/components/TextField';
import {
  experienceLabel,
  specialtyOptions,
  type ClientProfile,
  type Experience,
  type TrainerProfile,
} from '@/features/auth/types';
import { activityLevels, type Goal } from '@/features/tools/calc';
import { InputCard, MeasureRow } from '@/features/tools/components';
import { haptics } from '@/lib/haptics';
import { layoutGlide } from '@/theme/motion';
import { colors, fonts } from '@/theme/tokens';

export type ClientDraft = Omit<ClientProfile, 'kind'>;
export type TrainerDraft = Omit<TrainerProfile, 'kind'>;

export const emptyClient: ClientDraft = {
  name: '',
  photoUri: null,
  sex: 'male',
  birthYear: 1995,
  heightCm: 175,
  weightKg: 75,
  goalWeightKg: null,
  goal: 'maintain',
  activity: 'light',
  daysPerWeek: 3,
  experience: 'new',
  coached: false,
};

export const emptyTrainer: TrainerDraft = {
  name: '',
  photoUri: null,
  city: '',
  online: false,
  specialties: [],
};

// ── Validation ──────────────────────────────────────────────────────────────

export function validName(name: string): boolean {
  return name.trim().length >= 2;
}

export function validPlace(draft: TrainerDraft): boolean {
  return draft.city.trim().length >= 2 || draft.online;
}

// ── Name + photo (both roles) ───────────────────────────────────────────────

export function NameStep({
  name,
  photoUri,
  onChange,
  hint,
}: {
  name: string;
  photoUri: string | null;
  onChange: (patch: { name?: string; photoUri?: string | null }) => void;
  hint: string;
}) {
  const pick = async () => {
    haptics.tap();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const uri = result.canceled ? null : (result.assets[0]?.uri ?? null);
    if (uri) {
      haptics.success();
      onChange({ photoUri: uri });
    }
  };

  return (
    <View style={styles.stack}>
      <PressableScale
        onPress={pick}
        pressedScale={0.96}
        style={styles.photo}
        accessibilityRole="button"
        accessibilityLabel={photoUri ? 'Mudar foto' : 'Adicionar foto'}
      >
        <Avatar photoUri={photoUri} size={96} name={name || 'Tu'} />
        <AppText style={styles.photoText}>{photoUri ? 'Mudar foto' : 'Adicionar foto'}</AppText>
      </PressableScale>
      <TextField
        label="Nome"
        value={name}
        onChangeText={(value) => onChange({ name: value })}
        placeholder="Nome e apelido"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="done"
        maxLength={40}
      />
      <AppText variant="caption" tone="muted">
        {hint}
      </AppText>
    </View>
  );
}

// ── Client: body ────────────────────────────────────────────────────────────

const sexOptions = [
  { value: 'male', label: 'Homem' },
  { value: 'female', label: 'Mulher' },
] as const;

export function BodyStep({ value, onChange }: { value: ClientDraft; onChange: (patch: Partial<ClientDraft>) => void }) {
  return (
    <View style={styles.stack}>
      <SegmentedControl options={sexOptions} value={value.sex} onChange={(sex) => onChange({ sex })} stretch />
      <InputCard>
        <MeasureRow
          label="Ano de nascimento"
          value={value.birthYear}
          unit=""
          onChange={(birthYear) => onChange({ birthYear })}
          min={1930}
          max={2012}
          decimals={false}
        />
        <MeasureRow label="Altura" value={value.heightCm} unit="cm" onChange={(heightCm) => onChange({ heightCm })} min={120} max={230} decimals={false} />
        <MeasureRow label="Peso" value={value.weightKg} unit="kg" onChange={(weightKg) => onChange({ weightKg })} min={30} max={300} last />
      </InputCard>
    </View>
  );
}

// ── Client: goal ────────────────────────────────────────────────────────────

const goals: { value: Goal; title: string; description: string }[] = [
  { value: 'lose', title: 'Perder gordura', description: 'Comer um pouco menos e manter a força.' },
  { value: 'maintain', title: 'Ficar em forma', description: 'Manter o peso e sentir-me melhor.' },
  { value: 'gain', title: 'Ganhar músculo', description: 'Treinar com carga e comer o suficiente.' },
];

export function GoalStep({ value, onChange }: { value: ClientDraft; onChange: (patch: Partial<ClientDraft>) => void }) {
  const setGoal = (goal: Goal) => {
    if (goal === value.goal) return;
    const goalWeightKg = goal === 'maintain' ? null : Math.round(value.weightKg + (goal === 'lose' ? -5 : 3));
    onChange({ goal, goalWeightKg });
  };

  return (
    <View style={styles.stack}>
      <View style={styles.options}>
        {goals.map((g) => (
          <OptionCard key={g.value} title={g.title} description={g.description} selected={value.goal === g.value} onPress={() => setGoal(g.value)} />
        ))}
      </View>
      {value.goal !== 'maintain' && value.goalWeightKg !== null ? (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} layout={layoutGlide}>
          <InputCard>
            <MeasureRow
              label="Peso que queres atingir"
              hint={`Agora: ${String(value.weightKg).replace('.', ',')} kg`}
              value={value.goalWeightKg}
              unit="kg"
              onChange={(goalWeightKg) => onChange({ goalWeightKg })}
              min={30}
              max={300}
              last
            />
          </InputCard>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ── Client: training ────────────────────────────────────────────────────────

const experienceOptions = (Object.keys(experienceLabel) as Experience[]).map((value) => ({ value, label: experienceLabel[value] }));

export function TrainingStep({ value, onChange }: { value: ClientDraft; onChange: (patch: Partial<ClientDraft>) => void }) {
  return (
    <View style={styles.stack}>
      <SectionLabel>Dias de treino por semana</SectionLabel>
      <View style={styles.days}>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <Chip key={d} label={String(d)} selected={value.daysPerWeek === d} onPress={() => onChange({ daysPerWeek: d })} />
        ))}
      </View>

      <SectionLabel>Experiência</SectionLabel>
      <SegmentedControl options={experienceOptions} value={value.experience} onChange={(experience) => onChange({ experience })} stretch />

      <SectionLabel>No dia a dia</SectionLabel>
      <View style={styles.options}>
        {activityLevels.map((level) => (
          <OptionCard
            key={level.value}
            compact
            title={level.title}
            description={level.description}
            selected={value.activity === level.value}
            onPress={() => onChange({ activity: level.value })}
          />
        ))}
      </View>
    </View>
  );
}

// ── Trainer: place + specialties ────────────────────────────────────────────

export function PlaceStep({ value, onChange }: { value: TrainerDraft; onChange: (patch: Partial<TrainerDraft>) => void }) {
  return (
    <View style={styles.stack}>
      <TextField
        label="Cidade"
        value={value.city}
        onChangeText={(city) => onChange({ city })}
        placeholder="Ex.: Lisboa"
        autoCapitalize="words"
        textContentType="addressCity"
        returnKeyType="done"
        maxLength={40}
      />
      <Checkbox checked={value.online} onToggle={() => onChange({ online: !value.online })} label="Também dou aulas online" />
    </View>
  );
}

export const MAX_SPECIALTIES = 4;

export function SpecialtiesStep({ value, onChange }: { value: TrainerDraft; onChange: (patch: Partial<TrainerDraft>) => void }) {
  const toggle = (s: string) => {
    const has = value.specialties.includes(s);
    if (!has && value.specialties.length >= MAX_SPECIALTIES) {
      haptics.warning();
      return;
    }
    onChange({ specialties: has ? value.specialties.filter((x) => x !== s) : [...value.specialties, s] });
  };
  return (
    <View style={styles.stack}>
      <View style={styles.chips}>
        {specialtyOptions.map((s) => (
          <Chip key={s} label={s} kind="outline" selected={value.specialties.includes(s)} onPress={() => toggle(s)} />
        ))}
      </View>
      <AppText variant="caption" tone="muted">
        {value.specialties.length} de {MAX_SPECIALTIES} escolhidas · aparecem no teu perfil do marketplace.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  options: { gap: 8 },
  photo: { alignSelf: 'center', alignItems: 'center', gap: 10, paddingVertical: 6 },
  photoText: { fontFamily: fonts.uiSemiBold, fontSize: 13, color: colors.volt },
  days: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
