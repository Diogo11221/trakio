import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

/**
 * Procedural lathe-turned metal. Lines run along the texture's U axis, so on
 * a LatheGeometry (U = around, V = along the profile) they become concentric
 * rings — like a machined iron plate.
 */
export function createTurnedMetalTextures(size = 1024): { color: CanvasTexture; roughness: CanvasTexture } {
  const make = (paint: (ctx: CanvasRenderingContext2D) => void, srgb: boolean): CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not available');
    paint(ctx);
    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.anisotropy = 8;
    if (srgb) texture.colorSpace = SRGBColorSpace;
    return texture;
  };

  // Deterministic pseudo-random so the plate looks the same on every load.
  let seed = 7;
  const random = (): number => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const streaks = Array.from({ length: size }, () => random());

  const color = make((ctx) => {
    for (let y = 0; y < size; y += 1) {
      const noise = streaks[y] ?? 0.5;
      const tone = 24 + Math.round(noise * 16);
      ctx.fillStyle = `rgb(${tone}, ${tone + 2}, ${tone + 6})`;
      ctx.fillRect(0, y, 16, 1);
    }
  }, true);

  const roughness = make((ctx) => {
    for (let y = 0; y < size; y += 1) {
      const noise = streaks[(y * 7) % size] ?? 0.5;
      const value = 90 + Math.round(noise * 90);
      ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
      ctx.fillRect(0, y, 16, 1);
    }
  }, false);

  return { color, roughness };
}
