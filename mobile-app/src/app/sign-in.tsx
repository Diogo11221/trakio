import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { Reveal } from '@/components/Screen';
import { Chip } from '@/components/Chip';
import { AuthFields, FormError } from '@/features/auth/AuthForm';
import { DEMO_PASSWORD, demoLogins } from '@/features/auth/remoteAuth';
import { AuthError } from '@/features/auth/types';
import { haptics } from '@/lib/haptics';
import { homeFor, useAuth } from '@/state/auth';
import { useSettings } from '@/state/settings';
import { colors, fonts } from '@/theme/tokens';

/** Entrar — test accounts stored on this phone (see features/auth/localAuth). */
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const { mode, setMode } = useSettings();

  const enter = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      setError('Escreve o email e a palavra-passe.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const account = await signIn(email, password);
      if (account.role === 'trainer') setMode('trainer');
      else if (mode === 'trainer') setMode('solo');
      haptics.success();
      router.replace(homeFor(account));
    } catch (e) {
      haptics.warning();
      setError(e instanceof AuthError ? e.message : 'Não foi possível entrar. Tenta outra vez.');
      setBusy(false);
    }
  };

  const notYet = () =>
    Alert.alert('Ainda não disponível', 'Por agora entra-se com email e palavra-passe. Se te esqueceste da palavra-passe, escreve para suporte@trakio.app.');

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 42, paddingBottom: insets.bottom + 16 }]}
      >
        <Reveal index={0}>
          <Logo size={30} />
        </Reveal>
        <View style={styles.spacer} />
        <Reveal index={1} style={styles.heading}>
          <AppText variant="title" style={styles.title}>
            Bem-vindo de volta
          </AppText>
          <AppText variant="body" tone="muted">
            Entra para continuar o teu plano.
          </AppText>
        </Reveal>

        <Reveal index={2} style={styles.fields}>
          <AuthFields email={email} password={password} onEmail={setEmail} onPassword={setPassword} onSubmit={enter} newPassword={false} />
        </Reveal>
        <FormError message={error} />
        <Reveal index={4} style={styles.forgot}>
          <Pressable
            hitSlop={8}
            accessibilityRole="link"
            onPress={() => Alert.alert('Versão de teste', 'Ainda não há recuperação da palavra-passe. Usa uma conta de teste ou cria outra.')}
          >
            <AppText style={styles.link}>Esqueci-me da palavra-passe</AppText>
          </Pressable>
        </Reveal>

        <Reveal index={5}>
          <Button label={busy ? 'A entrar…' : 'Entrar'} height={54} disabled={busy} onPress={enter} />
        </Reveal>
        {demoLogins.length > 0 ? (
        <Reveal index={5} style={styles.demo}>
          <AppText variant="caption" tone="muted">
            Contas de teste (servidor de desenvolvimento)
          </AppText>
          <View style={styles.demoChips}>
            {demoLogins.map((demo) => (
              <Chip
                key={demo.email}
                label={demo.label}
                kind="outline"
                selected={email === demo.email}
                onPress={() => {
                  setEmail(demo.email);
                  setPassword(DEMO_PASSWORD);
                  setError(null);
                }}
              />
            ))}
          </View>
        </Reveal>
        ) : null}
        <Reveal index={6} style={styles.divider}>
          <View style={styles.rule} />
          <AppText variant="small" tone="muted">
            ou
          </AppText>
          <View style={styles.rule} />
        </Reveal>
        <Reveal index={7}>
          <Button label="Continuar com a Apple" variant="light" leadingIcon="apple" height={52} onPress={notYet} />
        </Reveal>
        <Reveal index={8}>
          <Button label="Continuar com o Google" variant="outline" leadingIcon="google" height={52} onPress={notYet} />
        </Reveal>

        <Pressable
          style={styles.footer}
          hitSlop={10}
          onPress={() => {
            haptics.tap();
            router.replace('/sign-up');
          }}
          accessibilityRole="link"
        >
          <AppText style={styles.footerText}>
            Ainda não tens conta? <AppText style={[styles.footerText, { color: colors.text }]}>Criar conta</AppText>
          </AppText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 24, gap: 18 },
  spacer: { height: 20 },
  heading: { gap: 6 },
  title: { fontSize: 30, letterSpacing: -0.9 },
  fields: { gap: 18 },
  forgot: { alignItems: 'flex-end' },
  demo: { gap: 8, alignItems: 'center' },
  demoChips: { flexDirection: 'row', gap: 8 },
  link: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.textMuted },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  footer: { marginTop: 'auto', paddingTop: 24, alignItems: 'center' },
  footerText: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.textMuted },
});
