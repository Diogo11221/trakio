import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOutLeft, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card, CardRow, IconButton } from '@/components/Surface';
import {
  BodyStep,
  emptyClient,
  emptyTrainer,
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
import { experienceLabel } from '@/features/auth/types';
import { ApiError } from '@/lib/api';
import { ToolGrid } from '@/features/tools/components';
import { ageFrom, bodyFromProfile, goalLabel } from '@/features/tools/data';
import { NumberFieldAccessory } from '@/features/workout/components/NumberField';
import { haptics } from '@/lib/haptics';
import { firstName, homeFor, useAuth } from '@/state/auth';
import { useSettings } from '@/state/settings';
import { easeOut } from '@/theme/motion';
import { colors, fonts, pagePadding } from '@/theme/tokens';

type Step = { title: string; subtitle: string; valid: boolean; body: ReactNode };

/** Criar perfil — a few short steps after creating the account (client or PT). */
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { account, saveProfile, signOut } = useAuth();
  const { mode, setMode } = useSettings();
  const role = account?.role ?? 'client';

  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState<ClientDraft>(emptyClient);
  const [trainer, setTrainer] = useState<TrainerDraft>(emptyTrainer);
  const patchClient = (patch: Partial<ClientDraft>) => setClient((c) => ({ ...c, ...patch }));
  const patchTrainer = (patch: Partial<TrainerDraft>) => setTrainer((t) => ({ ...t, ...patch }));

  const steps: Step[] =
    role === 'client'
      ? [
          {
            title: 'Como te chamas?',
            subtitle: 'Uma foto ajuda o teu PT a reconhecer-te.',
            valid: validName(client.name),
            body: <NameStep name={client.name} photoUri={client.photoUri} onChange={patchClient} hint="Podes mudar o nome e a foto mais tarde no Perfil." />,
          },
          {
            title: 'Sobre ti',
            subtitle: 'Usamos isto para calcular calorias, cargas e o teu progresso.',
            valid: true,
            body: <BodyStep value={client} onChange={patchClient} />,
          },
          {
            title: 'Qual é o teu objetivo?',
            subtitle: 'O plano e as calorias ajustam-se a isto.',
            valid: true,
            body: <GoalStep value={client} onChange={patchClient} />,
          },
          {
            title: 'Como treinas?',
            subtitle: 'Para começarmos com o volume certo.',
            valid: true,
            body: <TrainingStep value={client} onChange={patchClient} />,
          },
          {
            title: `Tudo pronto, ${firstName(client.name)}`,
            subtitle: 'Confirma os teus dados. Podes mudá-los sempre que quiseres.',
            valid: true,
            body: <ClientSummary draft={client} />,
          },
        ]
      : [
          {
            title: 'Como te chamas?',
            subtitle: 'É assim que os alunos te vão ver no marketplace.',
            valid: validName(trainer.name),
            body: <NameStep name={trainer.name} photoUri={trainer.photoUri} onChange={patchTrainer} hint="Uma foto tua, de cara, aumenta os pedidos de alunos." />,
          },
          {
            title: 'Onde dás aulas?',
            subtitle: 'Os alunos procuram PTs perto de casa ou online.',
            valid: validPlace(trainer),
            body: <PlaceStep value={trainer} onChange={patchTrainer} />,
          },
          {
            title: 'Em que és especialista?',
            subtitle: 'Escolhe até 4.',
            valid: trainer.specialties.length > 0,
            body: <SpecialtiesStep value={trainer} onChange={patchTrainer} />,
          },
          {
            title: `Tudo pronto, ${firstName(trainer.name)}`,
            subtitle: 'Para apareceres no marketplace, falta verificar o perfil — fazes isso depois em Conta.',
            valid: true,
            body: <TrainerSummary draft={trainer} />,
          },
        ];

  const step = steps[index] ?? steps[0]!;
  const last = index === steps.length - 1;

  const back = () => {
    if (index > 0) {
      setIndex(index - 1);
      return;
    }
    Alert.alert('Sair do registo?', 'A conta fica criada. Quando voltares a entrar, continuas a partir daqui.', [
      { text: 'Continuar registo', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/welcome');
        },
      },
    ]);
  };

  const next = async () => {
    if (!step.valid || saving) return;
    if (!last) {
      setIndex(index + 1);
      return;
    }
    setSaving(true);
    try {
      const saved = await saveProfile(
        role === 'client'
          ? {
              kind: 'client',
              ...client,
              name: client.name.trim(),
            }
          : { kind: 'trainer', ...trainer, name: trainer.name.trim(), city: trainer.city.trim() },
      );
      if (role === 'trainer') setMode('trainer');
      haptics.success();
      router.replace(homeFor(saved));
      // "Com o meu PT": find and hire them in the marketplace (the link exists once paid).
      if (role === 'client' && mode === 'coached') setTimeout(() => router.push('/trainers'), 400);
    } catch (e) {
      setSaving(false);
      Alert.alert('Não foi possível guardar', e instanceof ApiError ? e.message : 'Tenta outra vez.');
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="chevronLeft" onPress={back} accessibilityLabel={index > 0 ? 'Passo anterior' : 'Sair do registo'} />
        <View style={styles.progress} accessibilityLabel={`Passo ${index + 1} de ${steps.length}`}>
          {steps.map((s, i) => (
            <Segment key={s.title + i} done={i <= index} />
          ))}
        </View>
        <AppText style={styles.count}>
          {index + 1}/{steps.length}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={index} entering={FadeInRight.duration(320).easing(easeOut)} exiting={FadeOutLeft.duration(160)} style={styles.step}>
          <View style={styles.heading}>
            <AppText variant="title">{step.title}</AppText>
            <AppText variant="body" tone="muted">
              {step.subtitle}
            </AppText>
          </View>
          {step.body}
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
        <Button
          label={last ? (saving ? 'A guardar…' : role === 'client' ? 'Começar a treinar' : 'Abrir a minha área') : 'Continuar'}
          disabled={!step.valid || saving}
          onPress={next}
        />
      </View>
      <NumberFieldAccessory />
    </View>
  );
}

function Segment({ done }: { done: boolean }) {
  const style = useAnimatedStyle(() => ({
    backgroundColor: withTiming(done ? colors.volt : colors.surfaceRaised, { duration: 260 }),
  }));
  return <Animated.View style={[styles.segment, style]} />;
}

function SummaryRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <CardRow last={last} style={styles.summaryRow}>
      <AppText variant="label" tone="muted" style={styles.flex}>
        {label}
      </AppText>
      <AppText style={styles.summaryValue}>{value}</AppText>
    </CardRow>
  );
}

function ClientSummary({ draft }: { draft: ClientDraft }) {
  const body = bodyFromProfile({ kind: 'client', ...draft });
  const kg = (v: number) => `${String(v).replace('.', ',')} kg`;
  return (
    <Animated.View entering={FadeIn.duration(260)} style={styles.summary}>
      <Card radius={16}>
        <CardRow style={styles.summaryHead}>
          <Avatar photoUri={draft.photoUri} size={48} name={draft.name} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{draft.name.trim()}</AppText>
            <AppText variant="caption" tone="muted">
              {ageFrom(draft.birthYear)} anos · {draft.sex === 'male' ? 'Homem' : 'Mulher'}
            </AppText>
          </View>
        </CardRow>
        <SummaryRow label="Altura" value={`${draft.heightCm} cm`} />
        <SummaryRow label="Peso" value={kg(draft.weightKg)} />
        <SummaryRow label="Objetivo" value={draft.goalWeightKg !== null ? `${goalLabel[draft.goal]} · ${kg(draft.goalWeightKg)}` : goalLabel[draft.goal]} />
        <SummaryRow label="Treino" value={`${draft.daysPerWeek}× por semana · ${experienceLabel[draft.experience]}`} last />
      </Card>
      <AppText variant="overline" tone="muted">
        Os teus números
      </AppText>
      <ToolGrid body={body} tools={['body-mass', 'calories']} />
    </Animated.View>
  );
}

function TrainerSummary({ draft }: { draft: TrainerDraft }) {
  const where = [draft.city.trim(), draft.online ? 'Online' : ''].filter(Boolean).join(' + ');
  return (
    <Animated.View entering={FadeIn.duration(260)}>
      <Card radius={16}>
        <CardRow style={styles.summaryHead}>
          <Avatar photoUri={draft.photoUri} size={48} name={draft.name} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{draft.name.trim()}</AppText>
            <AppText variant="caption" tone="muted">
              Personal Trainer · {where}
            </AppText>
          </View>
        </CardRow>
        <SummaryRow label="Especialidades" value={draft.specialties.join(', ')} last />
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: pagePadding, paddingBottom: 8 },
  progress: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  count: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, width: 30, textAlign: 'right' },
  content: { paddingHorizontal: pagePadding, paddingTop: 16 },
  step: { gap: 22 },
  heading: { gap: 6 },
  bottom: { paddingHorizontal: pagePadding, paddingTop: 10, backgroundColor: colors.bg },
  summary: { gap: 12 },
  summaryHead: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  summaryRow: { paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  summaryValue: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right' },
});
