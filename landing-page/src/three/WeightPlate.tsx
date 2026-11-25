import type { ThreeElements } from '@react-three/fiber';
import { useMemo } from 'react';
import { LatheGeometry, Vector2 } from 'three';
import { createTurnedMetalTextures } from './brushedTexture';

/** Half-profile (radius, height) of a machined iron plate, revolved around Y. */
function plateProfile(): Vector2[] {
  const points: Array<[number, number]> = [
    [0.13, -0.13],
    [0.13, 0.13],
    // hub
    [0.3, 0.13],
    [0.34, 0.11],
    [0.38, 0.07],
    // recessed face
    [0.82, 0.07],
    [0.86, 0.1],
    [0.9, 0.15],
    // rim with a rounded outer edge
    [0.97, 0.15],
    [0.995, 0.13],
    [1.0, 0.1],
    [1.0, -0.1],
    [0.995, -0.13],
    [0.97, -0.15],
    [0.9, -0.15],
    [0.86, -0.1],
    [0.82, -0.07],
    [0.38, -0.07],
    [0.34, -0.11],
    [0.3, -0.13],
    [0.13, -0.13],
  ];
  return points.map(([x, y]) => new Vector2(x, y));
}

type WeightPlateProps = ThreeElements['group'];

export function WeightPlate(props: WeightPlateProps) {
  const geometry = useMemo(() => {
    const lathe = new LatheGeometry(plateProfile(), 160);
    lathe.computeVertexNormals();
    return lathe;
  }, []);
  const textures = useMemo(() => createTurnedMetalTextures(), []);

  return (
    <group {...props}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          map={textures.color}
          roughnessMap={textures.roughness}
          metalness={0.92}
          roughness={0.5}
          clearcoat={0.15}
          clearcoatRoughness={0.6}
        />
      </mesh>
      {/* Volt index line machined into the rim face — the only accent. */}
      <mesh position={[0, 0.152, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.928, 0.937, 160, 1, 0, Math.PI * 0.2]} />
        <meshBasicMaterial color="#d4ff00" toneMapped={false} />
      </mesh>
    </group>
  );
}
