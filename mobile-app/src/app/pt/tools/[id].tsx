import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import type { Person } from '@/components/Portrait';
import { PressableScale } from '@/components/PressableScale';
import { SectionLabel } from '@/components/Surface';
import { students } from '@/features/pt/data';
import { useTrainer } from '@/features/pt/store';
import { clientBody, isToolId, studentBodies, toolInfo } from '@/features/tools/data';
import { measuredStudents, StudentPicker } from '@/features/tools/StudentPicker';
import { ToolScreen } from '@/features/tools/ToolScreen';
import { ToolView } from '@/features/tools/views';
import { formatTimeOfDay } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { colors, fonts } from '@/theme/tokens';

/** PT · uma calculadora, com os dados do aluno escolhido e envio pelo chat. */
export default function TrainerTool() {
  const params = useLocalSearchParams<{ id: string; student?: string }>();
  const initial = measuredStudents.find((s) => s.id === params.student)?.id ?? measuredStudents[0]?.id ?? 'miguel';
  const [student, setStudent] = useState<Person>(initial);
  const [sentFor, setSentFor] = useState<string | null>(null);
  const { conversations } = useTrainer();

  if (!isToolId(params.id)) return <Redirect href="/pt/tools" />;
  const tool = params.id;
  const firstName = students.find((s) => s.id === student)?.firstName ?? 'aluno';
  // "Enviar ao Miguel" / "Enviar à Ana".
  const toName = `${studentBodies[student]?.sex === 'female' ? 'à' : 'ao'} ${firstName}`;
  const hasChat = conversations.some((c) => c.id === student);

  return (
    <ToolScreen
      title={toolInfo[tool].title}
      description={toolInfo[tool].description}
      top={
        <View style={styles.top}>
          <SectionLabel>Para quem?</SectionLabel>
          <StudentPicker
            value={student}
            onChange={(next) => {
              setStudent(next);
              setSentFor(null);
            }}
          />
        </View>
      }
    >
      {/* Remount per student so every field starts from that student's measurements. */}
      <View key={student} style={styles.body}>
        <ToolView
          tool={tool}
          initial={studentBodies[student] ?? clientBody}
          footer={(summary) =>
            hasChat ? (
              <SendFooter
                summary={summary}
                student={student}
                toName={toName}
                sent={sentFor === summary}
                onSent={() => setSentFor(summary)}
              />
            ) : null
          }
        />
      </View>
    </ToolScreen>
  );
}

/** "Enviar ao Miguel" → posts the result in the student's chat, then offers to open it. */
function SendFooter({
  summary,
  student,
  toName,
  sent,
  onSent,
}: {
  summary: string;
  student: Person;
  toName: string;
  sent: boolean;
  onSent: () => void;
}) {
  const { sendMessage } = useTrainer();

  const send = () => {
    const now = new Date();
    sendMessage(student, { id: `m-${now.getTime()}`, from: 'me', kind: 'text', text: summary, time: formatTimeOfDay(now) });
    haptics.success();
    onSent();
  };

  if (!sent) return <Button label={`Enviar ${toName}`} variant="outline" height={50} onPress={send} />;
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.sent}>
      <Icon name="checkVolt" size={16} />
      <AppText variant="small" style={styles.sentText}>
        Enviado {toName}
      </AppText>
      <PressableScale
        onPress={() => router.push({ pathname: '/pt/chat/[id]', params: { id: student } })}
        haptic="tap"
        accessibilityRole="button"
      >
        <AppText style={styles.link}>Ver conversa</AppText>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: { gap: 10 },
  body: { gap: 14 },
  sent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.voltBorderSoft,
  },
  sentText: { flex: 1, color: colors.text },
  link: { fontFamily: fonts.uiSemiBold, fontSize: 13, color: colors.volt },
});
