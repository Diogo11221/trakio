import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { Reveal } from '@/components/Screen';
import { IconButton } from '@/components/Surface';
import { AuthFields, FormError } from '@/features/auth/AuthForm';
import { AuthError } from '@/features/auth/types';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/state/auth';
import { useSettings } from '@/state/settings';
import { colors, fonts } from '@/theme/tokens';

/** Criar conta (teste) — the account lives on this phone until backend-core has auth. */
export default function SignUp() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const { mode } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trainer = mode === 'trainer';
  const ready = email.trim().length > 3 && password.length > 0;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signUp(email, password, trainer ? 'trainer' : 'client');
      haptics.success();
      router.replace('/onboarding');
    } catch (e) {
      haptics.warning();
      setError(e instanceof AuthError ? e.message : 'Não foi possível criar a conta. Tenta outra vez.');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 16 }]}
      >
        <View style={styles.bar}>
          <IconButton icon="chevronLeft" onPress={() => router.back()} accessibilityLabel="Voltar" />
          <Logo size={26} />
          <View style={styles.barSpacer} />
        </View>
        <Reveal index={1} style={styles.heading}>
          <AppText variant="title" style={styles.title}>
            {trainer ? 'Cria a tua conta de PT' : 'Cria a tua conta'}
          </AppText>
          <AppText variant="body" tone="muted">
            {trainer ? 'A seguir, montamos o teu perfil para os alunos.' : 'A seguir, só precisamos de alguns dados para o teu plano.'}
          </AppText>
        </Reveal>

        <Reveal index={2} style={styles.fields}>
          <AuthFields email={email} password={password} onEmail={setEmail} onPassword={setPassword} onSubmit={submit} newPassword />
        </Reveal>
        <FormError message={error} />

        <Reveal index={3}>
          <Button label={busy ? 'A criar…' : 'Criar conta'} height={54} disabled={!ready || busy} onPress={submit} />
        </Reveal>
        <Reveal index={4}>
          <AppText variant="caption" tone="muted" style={styles.note}>
            Versão de teste: a conta fica guardada só neste telemóvel.
          </AppText>
        </Reveal>

        <Pressable
          style={styles.footer}
          hitSlop={10}
          onPress={() => {
            haptics.tap();
            router.replace('/sign-in');
          }}
          accessibilityRole="link"
        >
          <AppText style={styles.footerText}>
            Já tens conta? <AppText style={[styles.footerText, { color: colors.text }]}>Entrar</AppText>
          </AppText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 24, gap: 18 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: 18 },
  barSpacer: { width: 36 },
  heading: { gap: 6 },
  title: { fontSize: 30, letterSpacing: -0.9 },
  fields: { gap: 18 },
  note: { textAlign: 'center' },
  footer: { marginTop: 'auto', paddingTop: 24, alignItems: 'center' },
  footerText: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.textMuted },
});
