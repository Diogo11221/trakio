import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Portrait } from '@/components/Portrait';
import { PressableScale } from '@/components/PressableScale';
import { Sheet } from '@/components/Sheet';
import { useTrainer } from '@/features/pt/store';
import { useSettings } from '@/state/settings';
import { colors, fonts } from '@/theme/tokens';

/** Trainer account (from the avatar on Início): verification, subscription, switch to student mode, sign out. */
export function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { steps, verificationSent, marketplaceActive } = useTrainer();
  const { setMode } = useSettings();
  const done = steps.filter((s) => s.done).length;

  const go = (action: () => void) => {
    onClose();
    setTimeout(action, 220);
  };

  const signOut = () =>
    Alert.alert('Terminar sessão?', 'Vais precisar de entrar outra vez para ver os teus alunos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Terminar sessão',
        style: 'destructive',
        onPress: () => go(() => router.replace('/welcome')),
      },
    ]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      accessibilityLabel="Conta"
      header={
        <View style={styles.header}>
          <Portrait person="rita" size={48} />
          <View style={styles.flex}>
            <AppText variant="heading">Rita Santos</AppText>
            <AppText variant="small" tone="muted">
              Personal Trainer · Lisboa + Online
            </AppText>
          </View>
        </View>
      }
    >
      <View style={styles.group}>
        <Row
          label="Verificar perfil"
          value={verificationSent ? 'Em análise' : `${done} de ${steps.length}`}
          onPress={() => go(() => router.push('/pt/verify'))}
        />
        <Row
          label="Subscrição do marketplace"
          value={marketplaceActive ? 'Ativa' : 'Inativa'}
          onPress={() => go(() => router.navigate('/pt/earnings'))}
        />
        <Row
          label="Mudar para modo aluno"
          onPress={() =>
            go(() => {
              setMode('coached');
              router.replace('/today');
            })
          }
          last
        />
      </View>
      <PressableScale onPress={signOut} style={styles.signOut} accessibilityRole="button">
        <AppText variant="label" tone="muted">
          Terminar sessão
        </AppText>
      </PressableScale>
    </Sheet>
  );
}

function Row({ label, value, onPress, last = false }: { label: string; value?: string; onPress: () => void; last?: boolean }) {
  return (
    <PressableScale onPress={onPress} haptic="tick" pressedScale={0.99} accessibilityRole="button">
      <View style={[styles.row, !last && styles.divider]}>
        <AppText variant="label" style={styles.flex}>
          {label}
        </AppText>
        {value ? (
          <AppText variant="small" tone="muted">
            {value}
          </AppText>
        ) : null}
        <Icon name="chevronRightFaint" size={14} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  group: { backgroundColor: colors.surfaceRaised, borderRadius: 16, overflow: 'hidden' },
  row: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  signOut: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: { fontFamily: fonts.uiMedium },
});
