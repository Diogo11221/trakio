import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { PressableScale } from '@/components/PressableScale';
import { Reveal, Screen } from '@/components/Screen';
import { Card, CardRow, Pill, SectionLabel } from '@/components/Surface';
import { Toggle } from '@/components/Toggle';
import { PremiumSheet } from '@/features/nutrition/PremiumSheet';
import { useWorkout } from '@/features/workout/store';
import { ManageSubscriptionSheet } from '@/features/profile/ManageSubscriptionSheet';
import { experienceLabel } from '@/features/auth/types';
import { goalLabel } from '@/features/tools/data';
import { useAuth, useClientProfile } from '@/state/auth';
import { useSettings } from '@/state/settings';
import { colors, fonts } from '@/theme/tokens';
import { refreshAll } from '@/lib/refresh';
import { DeleteAccountSheet } from '@/features/auth/DeleteAccountSheet';

/** Cliente · Perfil e definições. */
export default function Profile() {
  const { vibration, setVibration, lockScreenAlert, setLockScreenAlert, premium, restSound, setRestSound } = useSettings();
  const [sheet, setSheet] = useState<'premium' | 'manage' | 'delete' | null>(null);
  const { reset } = useWorkout();
  const { account, signOut: endSession } = useAuth();
  const profile = useClientProfile();
  const coached = profile.coached;
  const kg = (v: number) => `${String(v).replace('.', ',')} kg`;

  const signOut = () =>
    Alert.alert('Terminar sessão?', 'Vais precisar de entrar outra vez para ver o teu plano.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Terminar sessão',
        style: 'destructive',
        onPress: async () => {
          reset();
          await endSession();
          router.replace('/welcome');
        },
      },
    ]);

  const devicesInfo = () =>
    Alert.alert(
      'Relógio e Apple Health',
      'A ligação ao Apple Health (sono, passos, frequência cardíaca) precisa da versão instalada da app — não funciona no Expo Go. Por agora, a prontidão é calculada a partir dos teus treinos.',
    );

  const removeAccount = () => setSheet('delete');

  return (
    <>
      <Screen gap={14} onRefresh={refreshAll}>
        <Reveal index={0} style={styles.header}>
          <Avatar photoUri={profile.photoUri} size={56} name={profile.name} />
          <View style={styles.headerText}>
            <AppText variant="heading">{profile.name}</AppText>
            <View style={styles.pills}>
              <Pill label={coached ? 'Com PT' : 'Sozinho'} />
              {premium ? <Pill label="Premium" tone="volt" /> : null}
            </View>
          </View>
        </Reveal>

        <Reveal index={1}>
          <SectionLabel>Os meus dados</SectionLabel>
        </Reveal>
        <Reveal index={2}>
          <Card radius={16}>
            <SettingRow label="Peso" value={kg(profile.weightKg)} onPress={() => router.push('/edit-profile')} />
            <SettingRow label="Altura" value={`${profile.heightCm} cm`} onPress={() => router.push('/edit-profile')} />
            <SettingRow
              label="Objetivo"
              value={profile.goalWeightKg !== null ? `${goalLabel[profile.goal]} · ${kg(profile.goalWeightKg)}` : goalLabel[profile.goal]}
              onPress={() => router.push('/edit-profile')}
            />
            <SettingRow
              label="Treino"
              value={`${profile.daysPerWeek}× por semana · ${experienceLabel[profile.experience]}`}
              onPress={() => router.push('/edit-profile')}
            />
            <SettingRow label="Editar perfil" onPress={() => router.push('/edit-profile')} last />
          </Card>
        </Reveal>

        <Reveal index={3}>
          <SectionLabel>O meu PT</SectionLabel>
        </Reveal>
        <Reveal index={4}>
          {coached && profile.trainer ? (
            <Card radius={16}>
              <CardRow style={styles.ptRow}>
                <Avatar photoUri={profile.trainer.photoUri} size={36} name={profile.trainer.name} />
                <View style={styles.flex}>
                  <AppText style={styles.ptName}>{profile.trainer.name}</AppText>
                  <AppText variant="caption" tone="muted">
                    {profile.trainer.pack} · {profile.trainer.price}€/{profile.trainer.period}
                  </AppText>
                </View>
                <PressableScale
                  onPress={() => router.push('/chat')}
                  style={styles.message}
                  accessibilityRole="button"
                  accessibilityLabel={`Mensagem a ${profile.trainer.name}`}
                >
                  <AppText style={styles.messageText}>Mensagem</AppText>
                </PressableScale>
              </CardRow>
              <SettingRow label="Encontrar outro PT" onPress={() => router.push('/trainers')} last />
            </Card>
          ) : (
            <Card radius={16}>
              <SettingRow label="Encontrar um PT" value="Marketplace" onPress={() => router.push('/trainers')} last />
            </Card>
          )}
        </Reveal>

        <Reveal index={5}>
          <SectionLabel>Dispositivos</SectionLabel>
        </Reveal>
        <Reveal index={6}>
          <Card radius={16}>
            <SettingRow label="Apple Watch" value="Por ligar" onPress={devicesInfo} />
            <SettingRow label="Apple Health" value="Por ligar" onPress={devicesInfo} last />
          </Card>
        </Reveal>

        <Reveal index={7}>
          <SectionLabel>Treino</SectionLabel>
        </Reveal>
        <Reveal index={8}>
          <Card radius={16}>
            <SettingRow label="Calculadoras" value="Massa corporal, calorias…" onPress={() => router.push('/tools')} />
            <SettingRow
              label="Som do fim do descanso"
              trailing={<Toggle value={restSound} onChange={setRestSound} accessibilityLabel="Som do fim do descanso" />}
            />
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

        <Reveal index={9}>
          <SectionLabel>Conta</SectionLabel>
        </Reveal>
        <Reveal index={10}>
          <Card radius={16}>
            <SettingRow
              label="Subscrição"
              value={premium ? 'Premium' : 'Gratuita'}
              onPress={() => setSheet(premium ? 'manage' : 'premium')}
            />
            <SettingRow label="Email" value={account?.email ?? '—'} />
            <SettingRow label="Idioma" value="Português (PT)" />
            <SettingRow label="Apagar conta" onPress={removeAccount} last />
          </Card>
        </Reveal>

        <Reveal index={11}>
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
        onActivated={() => setSheet(null)}
      />
      <ManageSubscriptionSheet
        visible={sheet === 'manage'}
        onClose={() => setSheet(null)}
        onCancelled={() => setSheet(null)}
      />
      <DeleteAccountSheet visible={sheet === 'delete'} onClose={() => setSheet(null)} onDeleted={reset} />
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
      {trailing ?? (onPress ? <Icon name="chevronRightFaint" size={14} /> : null)}
    </CardRow>
  );
  if (trailing || !onPress) return content;
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
