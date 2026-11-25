import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

/**
 * Portraits live on two 3 × 2 contact sheets in Figma — "GA" (coaches + Miguel)
 * and "GS" (students); each person is a crop of one cell, same offsets as Figma.
 */
const sheets = {
  ga: require('@/assets/figma/portraits-ga.jpg'),
  gs: require('@/assets/figma/portraits-gs.jpg'),
} as const;

const columns = ['-8.52%', '-125.56%', '-242.59%'] as const;
const rows = ['-4.71%', '-122.49%'] as const;

export const people = {
  rita: { name: 'Rita Santos', sheet: 'ga', col: 0, row: 0 },
  miguel: { name: 'Miguel Costa', sheet: 'ga', col: 1, row: 0 },
  tiago: { name: 'Tiago Ferreira', sheet: 'ga', col: 2, row: 0 },
  ines: { name: 'Inês Almeida', sheet: 'ga', col: 0, row: 1 },
  bruno: { name: 'Bruno Lopes', sheet: 'ga', col: 1, row: 1 },
  ana: { name: 'Ana Ribeiro', sheet: 'gs', col: 0, row: 0 },
  joao: { name: 'João Martins', sheet: 'gs', col: 1, row: 0 },
  carla: { name: 'Carla Sousa', sheet: 'gs', col: 2, row: 0 },
  tomas: { name: 'Tomás Silva', sheet: 'gs', col: 0, row: 1 },
  pedro: { name: 'Pedro Gomes', sheet: 'gs', col: 1, row: 1 },
  sofia: { name: 'Sofia Lopes', sheet: 'gs', col: 2, row: 1 },
} as const;

export type Person = keyof typeof people;

export function Portrait({ person, size }: { person: Person; size: number }) {
  const { col, row, name, sheet } = people[person];
  return (
    <View
      style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
    >
      <Image
        source={sheets[sheet]}
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
