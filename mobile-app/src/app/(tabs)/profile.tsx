import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Portrait } from '@/components/Portrait';
import { PressableScale } from '@/components/PressableScale';
import { Reveal, Screen } from '@/components/Screen';
import { Card, CardRow, Pill, SectionLabel } from '@/components/Surface';
import { Toggle } from '@/components/Toggle';
import { PremiumSheet } from '@/features/nutrition/PremiumSheet';
import { useWorkout } from '@/features/workout/store';
import { ManageSubscriptionSheet } from '@/features/profile/ManageSubscriptionSheet';
import { useSettings } from '@/state/settings';
import { colors, fonts } from '@/theme/tokens';

/** Cliente · Perfil e definições. */
export default function Profile() {
  const { vibration, setVibration, lockScreenAlert, setLockScreenAlert, premium, setPremium } = useSettings();
  const [sheet, setSheet] = useState<'premium' | 'manage' | null>(null);
  const { reset } = useWorkout();

  const signOut = () =>
    Alert.alert('Terminar sessão?', 'Vais precisar de entrar outra vez para ver o teu plano.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Terminar sessão',
        style: 'destructive',
        onPress: () => {
          reset();
          router.replace('/welcome');
        },
      },
    ]);

  return (
    <>
      <Screen gap={14}>
        <Reveal index={0} style={styles.header}>
          <Portrait person="miguel" size={56} />
          <View style={styles.headerText}>
            <AppText variant="heading">Miguel Costa</AppText>
            <View style={styles.pills}>
              <Pill label="Com PT" />
              {premium ? <Pill label="Premium" tone="volt" /> : null}
            </View>
          </View>
        </Reveal>

        <Reveal index={1}>
          <SectionLabel>O meu PT</SectionLabel>
        </Reveal>
        <Reveal index={2}>
          <Card radius={16}>
            <CardRow style={styles.ptRow}>
              <Portrait person="rita" size={36} />
              <View style={styles.flex}>
                <AppText style={styles.ptName}>Rita Santos</AppText>
                <AppText variant="caption" tone="muted">
                  Treino + Nutrição · 45€/mês
                </AppText>
              </View>
              <PressableScale style={styles.message} accessibilityRole="button" accessibilityLabel="Mensagem à Rita">
                <AppText style={styles.messageText}>Mensagem</AppText>
              </PressableScale>
            </CardRow>
            <SettingRow label="Encontrar outro PT" onPress={() => router.push('/trainers')} last />
          </Card>
        </Reveal>

        <Reveal index={3}>
          <SectionLabel>Dispositivos</SectionLabel>
        </Reveal>
        <Reveal index={4}>
          <Card radius={16}>
            <SettingRow label="Apple Watch" value="Ligado" leading={<Icon name="dotGreen" size={8} />} />
            <SettingRow label="Apple Health" value="há 5 min" leading={<Icon name="dotGreen" size={8} />} last />
          </Card>
        </Reveal>

        <Reveal index={5}>
          <SectionLabel>Treino</SectionLabel>
        </Reveal>
        <Reveal index={6}>
          <Card radius={16}>
            <SettingRow label="Som do fim do descanso" value="Plim" />
            <SettingRow
              label="Vibração"
              trailing={<Toggle value={vibration} onChange={setVibration} accessibilityLabel="Vibração" />}
            />
            <SettingRow
              label="Alerta com ecrã bloqueado"
              trailing={
                <Toggle
                  value={lockScreenAlert}
                  onChange={setLockScreenAlert}
                  accessibilityLabel="Alerta com ecrã bloqueado"
                />
              }
              last
            />
          </Card>
        </Reveal>

        <Reveal index={7}>
          <SectionLabel>Conta</SectionLabel>
        </Reveal>
        <Reveal index={8}>
          <Card radius={16}>
            <SettingRow
              label="Subscrição"
              value={premium ? 'Premium' : 'Gratuita'}
              onPress={() => setSheet(premium ? 'manage' : 'premium')}
            />
            <SettingRow label="Idioma" value="Português (PT)" last />
          </Card>
        </Reveal>

        <Reveal index={9}>
          <PressableScale
            onPress={signOut}
            haptic="tap"
            pressedScale={0.98}
            accessibilityRole="button"
            style={styles.signOut}
          >
            <AppText variant="label" tone="muted">
              Terminar sessão
            </AppText>
          </PressableScale>
        </Reveal>
      </Screen>

      <PremiumSheet
        visible={sheet === 'premium'}
        onClose={() => setSheet(null)}
        onActivated={() => {
          setPremium(true);
          setSheet(null);
        }}
      />
      <ManageSubscriptionSheet
        visible={sheet === 'manage'}
        onClose={() => setSheet(null)}
        onCancelled={() => {
          setPremium(false);
          setSheet(null);
        }}
      />
    </>
  );
}

function SettingRow({
  label,
  value,
  leading,
  trailing,
  onPress,
  last = false,
}: {
  label: string;
  value?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const content = (
    <CardRow last={last} style={styles.setting}>
      {leading}
      <AppText variant="label" style={styles.flex}>
        {label}
      </AppText>
      {value ? (
        <AppText variant="small" tone="muted">
          {value}
        </AppText>
      ) : null}
      {trailing ?? <Icon name="chevronRightFaint" size={14} />}
    </CardRow>
  );
  if (trailing) return content;
  return (
    <PressableScale onPress={onPress} pressedScale={0.99} haptic="tick" accessibilityRole="button" accessibilityLabel={label}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  headerText: { flex: 1, gap: 6 },
  pills: { flexDirection: 'row', gap: 6 },
  ptRow: { height: 64, paddingLeft: 16, paddingRight: 14 },
  ptName: { fontFamily: fonts.uiSemiBold, fontSize: 14, color: colors.text },
  message: { backgroundColor: colors.surfaceRaised, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  messageText: { fontFamily: fonts.uiMedium, fontSize: 12, color: colors.text },
  setting: { height: 50, paddingLeft: 16, paddingRight: 14 },
  signOut: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
