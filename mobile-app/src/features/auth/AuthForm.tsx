import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { TextField } from '@/components/TextField';
import { haptics } from '@/lib/haptics';
import { colors, fonts } from '@/theme/tokens';

/** Email + password fields shared by "Criar conta" and "Entrar". */
export function AuthFields({
  email,
  password,
  onEmail,
  onPassword,
  onSubmit,
  newPassword,
}: {
  email: string;
  password: string;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: () => void;
  /** Sign-up: password manager suggests a new one and the hint shows. */
  newPassword: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <>
      <TextField
        label="Email"
        value={email}
        onChangeText={onEmail}
        placeholder="o-teu@email.pt"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType={newPassword ? 'username' : 'emailAddress'}
        returnKeyType="next"
      />
      <TextField
        label="Palavra-passe"
        value={password}
        onChangeText={onPassword}
        secureTextEntry={!show}
        autoComplete={newPassword ? 'new-password' : 'current-password'}
        textContentType={newPassword ? 'newPassword' : 'password'}
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        placeholder={newPassword ? 'Pelo menos 8 caracteres' : undefined}
        trailing={
          <Pressable
            hitSlop={10}
            onPress={() => {
              haptics.tick();
              setShow((v) => !v);
            }}
            accessibilityRole="button"
          >
            <AppText style={styles.link}>{show ? 'Esconder' : 'Mostrar'}</AppText>
          </Pressable>
        }
      />
    </>
  );
}

/** Error line that fades in under the fields. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(140)} style={styles.error} accessibilityLiveRegion="polite">
      <AppText variant="small" style={styles.errorText}>
        {message}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  link: { fontFamily: fonts.uiMedium, fontSize: 13, color: colors.textMuted },
  error: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  errorText: { color: colors.text },
});
