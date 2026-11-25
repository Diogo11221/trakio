import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { Portrait } from '@/components/Portrait';
import { PressableScale } from '@/components/PressableScale';
import { Reveal, Screen } from '@/components/Screen';
import { Card, CardRow } from '@/components/Surface';
import { AccountSheet } from '@/features/pt/AccountSheet';
import { SectionHeader, StatStrip } from '@/features/pt/components';
import { agenda, months, students } from '@/features/pt/data';
import { useTrainer } from '@/features/pt/store';
import { formatToday, greeting } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { refreshMockData } from '@/lib/refresh';
import { firstName, useTrainerProfile } from '@/state/auth';
import { colors, fonts } from '@/theme/tokens';

/** PT · Início. */
export default function TrainerHome() {
  const now = new Date();
  const profile = useTrainerProfile();
  const { aiDecisions } = useTrainer();
  const [accountOpen, setAccountOpen] = useState(false);
  // Once the trainer acts on an AI suggestion, the student leaves this list.
  const attention = students.filter((s) => s.tag === 'attention' && !aiDecisions[s.id]);

  return (
    <>
      <Screen gap={16} onRefresh={refreshMockData}>
        <Reveal index={0} style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="small" tone="muted">
              {formatToday(now)}
            </AppText>
            <AppText variant="title">
              {greeting(now)}, {firstName(profile.name)}
            </AppText>
          </View>
          <PressableScale onPress={() => setAccountOpen(true)} accessibilityLabel="Conta">
            <Avatar photoUri={profile.photoUri} demoPerson={profile.demoPerson} size={42} name={profile.name} />
          </PressableScale>
        </Reveal>

        <Reveal index={1}>
          <StatStrip
            stats={[
              { value: String(students.length), label: 'alunos ativos' },
              { value: String(attention.length), label: 'com alertas', dot: attention.length > 0 },
              { value: `${months[0].received}€`, label: 'este mês' },
            ]}
          />
        </Reveal>

        <Reveal index={2}>
          <SectionHeader
            title="Precisam de atenção"
            action="Ver todos"
            onAction={() => router.navigate({ pathname: '/pt/students', params: { filter: 'attention' } })}
          />
        </Reveal>

        <Reveal index={3}>
          <Card>
            {attention.length === 0 ? (
              <View style={styles.empty}>
                <Icon name="checkVolt" size={16} />
                <AppText variant="small" tone="muted">
                  Está tudo em dia. Nenhum aluno precisa de atenção.
                </AppText>
              </View>
            ) : (
              attention.map((student, i) => (
                <PressableScale
                  key={student.id}
                  onPress={() => router.push({ pathname: '/pt/student/[id]', params: { id: student.id } })}
                  pressedScale={0.99}
                  accessibilityLabel={`${student.name}: ${student.alert}`}
                >
                  <CardRow last={i === attention.length - 1} style={styles.row}>
                    <Portrait person={student.id} size={40} />
                    <View style={styles.flex}>
                      <AppText style={styles.name}>{student.name}</AppText>
                      <AppText variant="caption" tone="muted" numberOfLines={1}>
                        {student.alert}
                      </AppText>
                    </View>
                    <Icon name="chevronRightFaint" size={14} />
                  </CardRow>
                </PressableScale>
              ))
            )}
          </Card>
        </Reveal>

        <Reveal index={4}>
          <SectionHeader title="Hoje" />
        </Reveal>

        <Reveal index={5}>
          <Card>
            {agenda.map((item, i) => (
              <CardRow key={item.id} last={i === agenda.length - 1} style={styles.agendaRow}>
                <AppText style={styles.time}>{item.time}</AppText>
                <View style={styles.flex}>
                  <AppText variant="label">{item.title}</AppText>
                  <AppText variant="caption" tone="muted">
                    {item.detail}
                  </AppText>
                </View>
                {item.live ? (
                  <PressableScale
                    haptic="press"
                    onPress={() => haptics.success()}
                    style={styles.join}
                    accessibilityRole="button"
                    accessibilityLabel="Entrar na videochamada"
                  >
                    <AppText style={styles.joinText}>Entrar</AppText>
                  </PressableScale>
                ) : (
                  <Icon name="chevronRightFaint" size={14} />
                )}
              </CardRow>
            ))}
          </Card>
        </Reveal>

        <Reveal index={6}>
          <SectionHeader title="Ferramentas" />
        </Reveal>
        <Reveal index={7}>
          <PressableScale
            onPress={() => router.push('/pt/tools')}
            haptic="tap"
            pressedScale={0.98}
            accessibilityRole="button"
            accessibilityLabel="Calculadoras"
          >
            <Card>
              <CardRow last style={styles.toolsRow}>
                <View style={styles.flex}>
                  <AppText variant="label">Calculadoras</AppText>
                  <AppText variant="caption" tone="muted">
                    Massa corporal, calorias, peso máximo, gordura, água e discos — com as medidas de cada aluno
                  </AppText>
                </View>
                <Icon name="chevronRightFaint" size={14} />
              </CardRow>
            </Card>
          </PressableScale>
        </Reveal>
      </Screen>
      <AccountSheet visible={accountOpen} onClose={() => setAccountOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { gap: 4 },
  row: { paddingHorizontal: 14, paddingVertical: 12 },
  name: { fontFamily: fonts.uiSemiBold, fontSize: 14, color: colors.text },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  toolsRow: { paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  agendaRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 14 },
  time: { width: 46, fontFamily: fonts.monoMedium, fontSize: 14, color: colors.text },
  join: { backgroundColor: colors.volt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  joinText: { fontFamily: fonts.uiSemiBold, fontSize: 12, color: colors.bg },
});
