import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

/**
 * Portraits live on one 3 × 2 contact sheet in Figma ("GA"); each person is a
 * crop of one cell — same offsets as the Figma image fills.
 */
const sheet = require('@/assets/figma/portraits-ga.jpg');

const columns = ['-8.52%', '-125.56%', '-242.59%'] as const;
const rows = ['-4.71%', '-122.49%'] as const;

export const people = {
  rita: { name: 'Rita Santos', col: 0, row: 0 },
  miguel: { name: 'Miguel Costa', col: 1, row: 0 },
  tiago: { name: 'Tiago Ferreira', col: 2, row: 0 },
  ines: { name: 'Inês Almeida', col: 0, row: 1 },
  bruno: { name: 'Bruno Lopes', col: 1, row: 1 },
} as const;

export type Person = keyof typeof people;

export function Portrait({ person, size }: { person: Person; size: number }) {
  const { col, row, name } = people[person];
  return (
    <View
      style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
    >
      <Image
        source={sheet}
        style={[styles.sheet, { left: columns[col], top: rows[row] }]}
        contentFit="fill"
        transition={180}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  sheet: { position: 'absolute', width: '351.11%', height: '235.56%' },
});
