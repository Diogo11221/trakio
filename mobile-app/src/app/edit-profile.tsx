import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { SectionLabel } from '@/components/Surface';
import {
  BodyStep,
  GoalStep,
  NameStep,
  PlaceStep,
  SpecialtiesStep,
  TrainingStep,
  validName,
  validPlace,
  type ClientDraft,
  type TrainerDraft,
} from '@/features/auth/ProfileSteps';
import { ToolScreen } from '@/features/tools/ToolScreen';
import { haptics } from '@/lib/haptics';
import { useAuth, useClientProfile, useTrainerProfile } from '@/state/auth';

/** Editar perfil — the same fields as onboarding, on one page (client or PT). */
export default function EditProfile() {
  const { account } = useAuth();
  return account?.role === 'trainer' ? <TrainerEdit /> : <ClientEdit />;
}

function ClientEdit() {
  const { saveProfile } = useAuth();
  const { kind: _kind, ...initial } = useClientProfile();
  const [draft, setDraft] = useState<ClientDraft>(initial);
  const [saving, setSaving] = useState(false);
  const patch = (p: Partial<ClientDraft>) => setDraft((d) => ({ ...d, ...p }));
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile({ kind: 'client', ...draft, name: draft.name.trim() });
      haptics.success();
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Não foi possível guardar', 'Tenta outra vez.');
    }
  };

  return (
    <ToolScreen title="Editar perfil" description="O plano, as calorias e as calculadoras usam estes dados.">
      <NameStep name={draft.name} photoUri={draft.photoUri} demoPerson={draft.photoUri ? undefined : draft.demoPerson} onChange={patch} hint="É assim que o teu PT te vê." />
      <View style={styles.section}>
        <SectionLabel>Sobre ti</SectionLabel>
        <BodyStep value={draft} onChange={patch} />
      </View>
      <View style={styles.section}>
        <SectionLabel>Objetivo</SectionLabel>
        <GoalStep value={draft} onChange={patch} />
      </View>
      <View style={styles.section}>
        <TrainingStep value={draft} onChange={patch} />
      </View>
      <Button
        label={saving ? 'A guardar…' : 'Guardar'}
        disabled={!changed || !validName(draft.name) || saving}
        onPress={save}
        style={styles.save}
      />
    </ToolScreen>
  );
}

function TrainerEdit() {
  const { saveProfile } = useAuth();
  const { kind: _kind, ...initial } = useTrainerProfile();
  const [draft, setDraft] = useState<TrainerDraft>(initial);
  const [saving, setSaving] = useState(false);
  const patch = (p: Partial<TrainerDraft>) => setDraft((d) => ({ ...d, ...p }));
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);
  const valid = validName(draft.name) && validPlace(draft) && draft.specialties.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile({ kind: 'trainer', ...draft, name: draft.name.trim(), city: draft.city.trim() });
      haptics.success();
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Não foi possível guardar', 'Tenta outra vez.');
    }
  };

  return (
    <ToolScreen title="Editar perfil" description="É o que os alunos veem no marketplace.">
      <NameStep name={draft.name} photoUri={draft.photoUri} demoPerson={draft.photoUri ? undefined : draft.demoPerson} onChange={patch} hint="Uma foto de cara aumenta os pedidos de alunos." />
      <View style={styles.section}>
        <SectionLabel>Onde dás aulas</SectionLabel>
        <PlaceStep value={draft} onChange={patch} />
      </View>
      <View style={styles.section}>
        <SectionLabel>Especialidades</SectionLabel>
        <SpecialtiesStep value={draft} onChange={patch} />
      </View>
      <Button label={saving ? 'A guardar…' : 'Guardar'} disabled={!changed || !valid || saving} onPress={save} style={styles.save} />
    </ToolScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: 8 },
  save: { marginTop: 12 },
});
