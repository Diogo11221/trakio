import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Reveal } from '@/components/Screen';
import { IconButton } from '@/components/Surface';
import { useTrainer } from '@/features/pt/store';
import { ApiError } from '@/lib/api';
import type { DocumentType } from '@/lib/apiTypes';
import { haptics } from '@/lib/haptics';
import { easeOut } from '@/theme/motion';
import { colors, fonts, pagePadding } from '@/theme/tokens';

const documentTitle: Record<DocumentType, string> = {
  identity: 'Documento de identificação',
  'professional-title': 'Título profissional de técnico de exercício físico',
  insurance: 'Seguro de responsabilidade civil',
};

const documentStatus: Record<string, string> = {
  missing: 'Falta enviar',
  submitted: 'Enviado · por confirmar',
  confirmed: 'Confirmado',
  rejected: 'Recusado · envia outra vez',
};

const statusLine: Record<string, string> = {
  submitted: 'Enviado para verificação',
  approved: 'Perfil verificado',
  'info-requested': 'A equipa Trakio pediu mais informação',
  refused: 'Pedido recusado · podes corrigir e enviar outra vez',
};

/** PT · Verificar perfil. */
export default function Verify() {
  const insets = useSafeAreaInsets();
  const { verification, uploadDocument, submitVerification, connectPayouts } = useTrainer();
  const [busy, setBusy] = useState<string | null>(null);
  const status = verification?.status ?? 'draft';
  const editable = status === 'draft' || status === 'info-requested' || status === 'refused';
  const verificationSent = status === 'submitted' || status === 'approved';

  type Step = { id: string; title: string; status: string; done: boolean; action: (() => void) | null };
  const steps: Step[] = [
    ...(verification?.documents ?? []).map((d) => ({
      id: d.type,
      title: documentTitle[d.type],
      status: documentStatus[d.status],
      done: d.status === 'submitted' || d.status === 'confirmed',
      action: editable && d.status !== 'confirmed' ? () => upload(d.type) : null,
    })),
    {
      id: 'payouts',
      title: 'Conta de pagamentos (Stripe)',
      status: verification?.payouts.payoutsEnabled ? 'Ligada · pronta a receber' : verification?.payouts.connected ? 'Por terminar no Stripe' : 'Por ligar',
      done: verification?.payouts.payoutsEnabled ?? false,
      action: verification?.payouts.payoutsEnabled ? null : () => run('payouts', connectPayouts),
    },
  ];
  const done = steps.filter((s) => s.done).length;
  const ready = verification?.canSubmit ?? false;
  const missingInsurance = verification?.documents.find((d) => d.type === 'insurance')?.status === 'missing';

  const run = async (id: string, task: () => Promise<void>) => {
    setBusy(id);
    try {
      await task();
      haptics.success();
    } catch (e) {
      Alert.alert('Não foi possível continuar', e instanceof ApiError ? e.message : 'Tenta outra vez.');
    } finally {
      setBusy(null);
    }
  };

  const upload = async (type: DocumentType) => {
    // Copied to the cache so the upload can read it.
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    await run(type, () => uploadDocument(type, { uri: file.uri, name: file.name, mimeType: file.mimeType ?? 'application/pdf' }));
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4, paddingBottom: 140 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <IconButton icon="chevronLeft" onPress={() => router.back()} accessibilityLabel="Voltar" />
        </View>

        <Reveal index={0} style={styles.intro}>
          <AppText style={styles.title}>Verificar o teu perfil</AppText>
          <AppText variant="label" tone="muted" style={styles.lead}>
            Precisamos destes documentos para mostrares o selo de verificado e aparecer no marketplace.
          </AppText>
        </Reveal>

        <Reveal index={1} style={styles.progress}>
          {steps.map((step, i) => (
            <Segment key={step.id} done={step.done} index={i} />
          ))}
        </Reveal>
        <AppText variant="caption" tone="muted">
          {statusLine[status] ?? `${done} de ${steps.length} passos feitos`}
        </AppText>
        {verification?.adminNote && (status === 'info-requested' || status === 'refused') ? (
          <View style={styles.note}>
            <AppText variant="label">Nota da equipa Trakio</AppText>
            <AppText variant="small" tone="muted">
              {verification.adminNote}
            </AppText>
          </View>
        ) : null}

        <Reveal index={2} style={styles.list}>
          {steps.map((step, i) => (
            <View key={step.id} style={[styles.row, i < steps.length - 1 && styles.divider]}>
              {step.done ? (
                <Animated.View key="done" entering={FadeIn.duration(260)}>
                  <Icon name="statusVerified" size={20} />
                </Animated.View>
              ) : (
                <View style={styles.todo} />
              )}
              <View style={styles.flex}>
                <AppText style={styles.stepTitle}>{step.title}</AppText>
                <AppText variant="caption" tone={step.done ? 'muted' : 'default'} numberOfLines={1}>
                  {step.status}
                </AppText>
              </View>
              {step.action ? (
                <PressableScale onPress={step.action} disabled={busy !== null} style={styles.upload} accessibilityRole="button">
                  <AppText style={styles.uploadText}>
                    {busy === step.id ? 'A enviar…' : step.id === 'payouts' ? 'Ligar' : step.done ? 'Substituir' : 'Carregar'}
                  </AppText>
                </PressableScale>
              ) : null}
            </View>
          ))}
        </Reveal>

        {editable && missingInsurance ? (
          <Reveal index={3}>
            <PressableScale onPress={() => upload('insurance')} style={styles.drop} accessibilityRole="button" accessibilityLabel="Carregar apólice do seguro">
              <Icon name="upload" size={22} />
              <AppText style={styles.dropTitle}>Carregar apólice do seguro</AppText>
              <AppText variant="caption" tone="muted">
                PDF ou foto · até 10 MB
              </AppText>
            </PressableScale>
          </Reveal>
        ) : null}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
        {verificationSent ? (
          <Animated.View entering={FadeIn.duration(260)} style={styles.sent}>
            <Icon name="checkVolt" size={16} />
            <AppText variant="label">
              {status === 'approved' ? 'Perfil verificado. Já podes ativar o marketplace em Ganhos.' : 'Enviado. A equipa Trakio responde em 1 a 2 dias úteis.'}
            </AppText>
          </Animated.View>
        ) : (
          <>
            <Button
              label="Enviar para verificação"
              height={54}
              disabled={!ready || busy !== null}
              variant={ready ? 'primary' : 'outline'}
              onPress={() => run('submit', submitVerification)}
            />
            <AppText variant="caption" tone="muted" style={styles.center}>
              A equipa Trakio responde em 1 a 2 dias úteis.
            </AppText>
          </>
        )}
      </View>
    </View>
  );
}

function Segment({ done, index }: { done: boolean; index: number }) {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withDelay(200 + index * 90, withTiming(done ? 1 : 0, { duration: 420, easing: easeOut })));
  }, [done, fill, index]);
  const style = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  note: { backgroundColor: colors.surfaceRaised, borderRadius: 14, padding: 14, gap: 4 },
  flex: { flex: 1, gap: 2 },
  center: { textAlign: 'center' },
  content: { paddingHorizontal: pagePadding, gap: 14 },
  intro: { gap: 6, marginTop: 4 },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.52, color: colors.text },
  lead: { fontFamily: fonts.ui, lineHeight: 20 },
  progress: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 3, borderRadius: 1.5, backgroundColor: colors.borderStrong, overflow: 'hidden' },
  segmentFill: { height: 3, backgroundColor: colors.volt },
  list: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  todo: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.textFaint },
  stepTitle: { fontFamily: fonts.uiSemiBold, fontSize: 14, color: colors.text },
  upload: { backgroundColor: colors.surfaceRaised, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  uploadText: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.text },
  drop: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  dropTitle: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.text },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: pagePadding, gap: 10, backgroundColor: colors.bg, paddingTop: 12 },
  sent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.voltBorderSoft,
    borderRadius: 16,
    padding: 16,
  },
});
