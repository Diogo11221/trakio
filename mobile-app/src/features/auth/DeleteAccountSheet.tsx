import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Sheet } from '@/components/Sheet';
import { TextField } from '@/components/TextField';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/state/auth';
import { fonts } from '@/theme/tokens';

/**
 * Apagar conta: says what disappears and asks for the password again, so a phone left
 * unlocked isn't enough to erase someone's account.
 */
export function DeleteAccountSheet({ visible, onClose, onDeleted }: { visible: boolean; onClose: () => void; onDeleted?: () => void }) {
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      haptics.warning();
      onDeleted?.();
      setPassword('');
      router.replace('/welcome');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível apagar a conta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={close} accessibilityLabel="Apagar conta" header={<AppText variant="heading">Apagar conta</AppText>}>
      <AppText variant="label" tone="muted" style={styles.body}>
        Apagamos o teu perfil, treinos, refeições, conversas e fotos. Subscrições ativas são canceladas. Não dá para desfazer.
      </AppText>
      <TextField label="Palavra-passe" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" onSubmitEditing={confirm} />
      {error ? (
        <AppText variant="small" tone="muted" style={styles.error}>
          {error}
        </AppText>
      ) : null}
      <Button label="Apagar a minha conta" variant="outline" height={50} disabled={!password || busy} onPress={confirm} />
      <Button label="Manter conta" height={54} onPress={close} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: fonts.ui, lineHeight: 20 },
  error: { color: '#FF6B6B' },
});
