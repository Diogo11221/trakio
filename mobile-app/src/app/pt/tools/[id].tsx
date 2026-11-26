import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { SectionLabel } from '@/components/Surface';
import { useTrainer } from '@/features/pt/store';
import { useStudent } from '@/features/pt/useStudent';
import { clientBody, isToolId, toolInfo } from '@/features/tools/data';
import { StudentPicker } from '@/features/tools/StudentPicker';
import { ToolScreen } from '@/features/tools/ToolScreen';
import { ToolView } from '@/features/tools/views';
import { ApiError, api } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { colors, fonts } from '@/theme/tokens';

/** PT · uma calculadora, com os dados do aluno escolhido e envio pelo chat. */
export default function TrainerTool() {
  const params = useLocalSearchParams<{ id: string; student?: string }>();
  const { students } = useTrainer();
  const [student, setStudent] = useState<string | null>(params.student ?? students[0]?.id ?? null);
  const [sentFor, setSentFor] = useState<string | null>(null);
  const { detail, body } = useStudent(student ?? undefined);

  if (!isToolId(params.id)) return <Redirect href="/pt/tools" />;
  const tool = params.id;
  const chosen = students.find((s) => s.id === student);
  // "Enviar ao Miguel" / "Enviar à Ana".
  const toName = chosen ? `${detail?.sex === 'female' ? 'à' : 'ao'} ${chosen.firstName}` : '';

  return (
    <ToolScreen
      title={toolInfo[tool].title}
      description={toolInfo[tool].description}
      top={
        students.length > 0 ? (
          <View style={styles.top}>
            <SectionLabel>Para quem?</SectionLabel>
            <StudentPicker
              students={students}
              value={student}
              onChange={(next) => {
                setStudent(next);
                setSentFor(null);
              }}
            />
          </View>
        ) : undefined
      }
    >
      {/* Remount per student so every field starts from that student's measurements. */}
      <View key={`${student}-${body ? 'loaded' : 'default'}`} style={styles.body}>
        <ToolView
          tool={tool}
          initial={body ?? clientBody}
          footer={(summary) =>
            chosen?.conversationId ? (
              <SendFooter
                summary={summary}
                conversationId={chosen.conversationId}
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
  conversationId,
  toName,
  sent,
  onSent,
}: {
  summary: string;
  conversationId: string;
  toName: string;
  sent: boolean;
  onSent: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      await api.post(`/api/v1/conversations/${conversationId}/messages`, { kind: 'text', text: summary });
      haptics.success();
      onSent();
    } catch (e) {
      Alert.alert('Não foi possível enviar', e instanceof ApiError ? e.message : 'Tenta outra vez.');
    } finally {
      setBusy(false);
    }
  };

  if (!sent) return <Button label={`Enviar ${toName}`} variant="outline" height={50} disabled={busy} onPress={send} />;
  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.sent}>
      <Icon name="checkVolt" size={16} />
      <AppText variant="small" style={styles.sentText}>
        Enviado {toName}
      </AppText>
      <PressableScale
        onPress={() => router.push({ pathname: '/pt/chat/[id]', params: { id: conversationId } })}
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
