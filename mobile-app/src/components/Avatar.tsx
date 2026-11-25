import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Portrait, type Person } from '@/components/Portrait';
import { colors } from '@/theme/tokens';

/**
 * The signed-in person's photo: their own picture, the Figma portrait for demo
 * accounts, or an empty circle with a camera until they add one (no initials).
 */
export function Avatar({
  photoUri,
  demoPerson,
  size,
  name,
}: {
  photoUri: string | null;
  demoPerson?: Person;
  size: number;
  name: string;
}) {
  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        accessibilityLabel={name}
      />
    );
  }
  if (demoPerson) return <Portrait person={demoPerson} size={size} />;
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
