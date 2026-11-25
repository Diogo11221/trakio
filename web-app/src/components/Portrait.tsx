import sheetGa from '../assets/figma/portraits-ga.jpg';
import sheetGs from '../assets/figma/portraits-gs.jpg';

/**
 * Portraits come from two 3 × 2 contact sheets in Figma — "GA" (PTs and the
 * admin) and "GS" (students); each person is a crop of one cell.
 */
const columns = ['-8.52%', '-125.56%', '-242.59%'] as const;
const rows = ['-4.71%', '-122.49%'] as const;

export const people = {
  rita: { name: 'Rita Santos', sheet: sheetGa, col: 0, row: 0 },
  miguel: { name: 'Miguel Costa', sheet: sheetGa, col: 1, row: 0 },
  tiago: { name: 'Tiago Ferreira', sheet: sheetGa, col: 2, row: 0 },
  ines: { name: 'Inês Almeida', sheet: sheetGa, col: 0, row: 1 },
  bruno: { name: 'Bruno Lopes', sheet: sheetGa, col: 1, row: 1 },
  marta: { name: 'Marta Neves', sheet: sheetGa, col: 2, row: 1 },
  ana: { name: 'Ana Ribeiro', sheet: sheetGs, col: 0, row: 0 },
  joao: { name: 'João Martins', sheet: sheetGs, col: 1, row: 0 },
  carla: { name: 'Carla Sousa', sheet: sheetGs, col: 2, row: 0 },
  tomas: { name: 'Tomás Silva', sheet: sheetGs, col: 0, row: 1 },
  pedro: { name: 'Pedro Gomes', sheet: sheetGs, col: 1, row: 1 },
  sofia: { name: 'Sofia Lopes', sheet: sheetGs, col: 2, row: 1 },
} as const;

export type Person = keyof typeof people;

export function Portrait({ person, size }: { person: Person; size: number }) {
  const { sheet, col, row, name } = people[person];
  return (
    <span
      role="img"
      aria-label={name}
      style={{
        position: 'relative',
        flex: 'none',
        display: 'block',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'var(--color-bg)',
      }}
    >
      <img
        src={sheet}
        alt=""
        style={{
          position: 'absolute',
          width: '351.11%',
          height: '235.56%',
          left: columns[col],
          top: rows[row],
          maxWidth: 'none',
        }}
      />
    </span>
  );
}
