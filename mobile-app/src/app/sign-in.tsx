import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { Reveal } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/state/settings';
import { colors, fonts } from '@/theme/tokens';

/** Cliente · Entrar. Auth isn't wired yet — every path lands on "Hoje". */
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { mode } = useSettings();
  const enter = () => router.replace(mode === 'trainer' ? '/pt/home' : '/today');

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

        <Reveal index={2}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="o-teu@email.pt"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
        </Reveal>
        <Reveal index={3}>
          <TextField
            label="Palavra-passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            textContentType="password"
            trailing={
              <Pressable
                hitSlop={10}
                onPress={() => {
                  haptics.tick();
                  setShowPassword((v) => !v);
                }}
                accessibilityRole="button"
              >
                <AppText style={styles.link}>{showPassword ? 'Esconder' : 'Mostrar'}</AppText>
              </Pressable>
            }
          />
        </Reveal>
        <Reveal index={4} style={styles.forgot}>
          <Pressable hitSlop={8} accessibilityRole="link">
            <AppText style={styles.link}>Esqueci-me da palavra-passe</AppText>
          </Pressable>
        </Reveal>

        <Reveal index={5}>
          <Button label="Entrar" height={54} onPress={enter} />
        </Reveal>
        <Reveal index={6} style={styles.divider}>
          <View style={styles.rule} />
          <AppText variant="small" tone="muted">
            ou
          </AppText>
          <View style={styles.rule} />
        </Reveal>
        <Reveal index={7}>
          <Button label="Continuar com a Apple" variant="light" leadingIcon="apple" height={52} onPress={enter} />
        </Reveal>
        <Reveal index={8}>
          <Button label="Continuar com o Google" variant="outline" leadingIcon="google" height={52} onPress={enter} />
        </Reveal>

        <Pressable
          style={styles.footer}
          hitSlop={10}
          onPress={() => {
            haptics.tap();
            router.back();
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
  forgot: { alignItems: 'flex-end' },
  link: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.textMuted },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  footer: { marginTop: 'auto', paddingTop: 24, alignItems: 'center' },
  footerText: { fontFamily: fonts.uiMedium, fontSize: 14, color: colors.textMuted },
});
