import portraitsCoaches from '../assets/figma/pt/portraits-ga.jpg';
import portraitsStudents from '../assets/figma/pt/portraits-gs.jpg';

/** Portraits come from two 3 × 2 contact sheets; each person is a crop of one cell. */
const people = {
  rita: { sheet: portraitsCoaches, left: '-8.52%', name: 'Rita Santos' },
  miguel: { sheet: portraitsCoaches, left: '-125.56%', name: 'Miguel Costa' },
  ana: { sheet: portraitsStudents, left: '-8.52%', name: 'Ana Ribeiro' },
  joao: { sheet: portraitsStudents, left: '-125.56%', name: 'João Martins' },
} as const;

export type Person = keyof typeof people;

export function Portrait({ person, size }: { person: Person; size: number }) {
  const { sheet, left, name } = people[person];
  return (
    <span
      style={{
        position: 'relative',
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'block',
      }}
    >
      <img
        src={sheet}
        alt={name}
        style={{ position: 'absolute', height: '235.56%', width: '351.11%', left, top: '-4.71%', maxWidth: 'none' }}
      />
    </span>
  );
}
