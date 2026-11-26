import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { protectedImage } from '@/lib/api';
import { colors } from '@/theme/tokens';

/**
 * Someone's photo — from the server (sent with the session token) or just picked on this phone —
 * or an empty circle with a camera until they add one (no initials).
 */
export function Avatar({ photoUri, size, name }: { photoUri: string | null; size: number; name: string }) {
  if (photoUri) {
    return (
      <Image
        source={protectedImage(photoUri)}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        accessibilityLabel={name}
      />
    );
  }
  return (
    <View
      style={[styles.empty, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityLabel={`${name}, sem foto`}
    >
      <Icon name="camera" size={Math.round(size * 0.42)} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
});
