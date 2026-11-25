/** Groups thousands with a plain space, as in the Figma ("4 812", "64 260"). */
function group(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function thousands(value: number): string {
  return group(String(Math.round(value)));
}

/** pt-PT money with cents: "45,00 €". */
export function euros(value: number): string {
  const [int, dec] = Math.abs(value).toFixed(2).split('.');
  return `${value < 0 ? '−' : ''}${group(int ?? '0')},${dec ?? '00'} €`;
}
