import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Group } from 'three';
import { MathUtils, PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { subscribeScroll } from '../hooks/scrollBus';
import { WeightPlate } from './WeightPlate';

type Pointer = { x: number; y: number };

/** Soft studio reflections from three's built-in RoomEnvironment — no HDRI download. */
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = 0.32;
    return () => {
      scene.environment = null;
      target.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Plates({ pointer, scroll, animate }: { pointer: RefObject<Pointer>; scroll: RefObject<number>; animate: boolean }) {
  const big = useRef<Group>(null);
  const small = useRef<Group>(null);
  const rig = useRef<Group>(null);

  useFrame((state, delta) => {
    const t = animate ? state.clock.elapsedTime : 0;
    const p = pointer.current ?? { x: 0, y: 0 };
    const s = scroll.current ?? 0;
    const damp = Math.min(1, delta * 3);

    if (rig.current) {
      rig.current.rotation.y = MathUtils.lerp(rig.current.rotation.y, p.x * 0.12, damp);
      rig.current.rotation.x = MathUtils.lerp(rig.current.rotation.x, -p.y * 0.08, damp);
      rig.current.position.y = MathUtils.lerp(rig.current.position.y, s * 3.2, damp);
    }
    if (big.current) {
      big.current.rotation.y = 0.55 + t * 0.06 + s * 1.4;
      big.current.rotation.z = 0.2 + Math.sin(t * 0.3) * 0.03;
    }
    if (small.current) {
      small.current.rotation.y = -0.7 - t * 0.09 - s * 1.8;
      small.current.position.y = 2.3 + Math.sin(t * 0.5) * 0.08;
    }
  });

  return (
    <group ref={rig}>
      <group ref={big} position={[-7.4, -0.9, -2]} rotation={[Math.PI / 2 - 0.35, 0.55, 0.2]}>
        <WeightPlate scale={2.8} />
      </group>
      <group ref={small} position={[7.1, 2.3, -3]} rotation={[Math.PI / 2 + 0.4, -0.7, -0.35]}>
        <WeightPlate scale={1.5} />
      </group>
    </group>
  );
}

/**
 * Hero backdrop: two machined iron plates in dark metal, lit by a soft studio
 * environment (no network HDRI). They drift with the pointer and spin away
 * on scroll.
 */
export default function HeroScene({ animate }: { animate: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const pointer = useRef<Pointer>({ x: 0, y: 0 });
  const scroll = useRef(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    const unsubscribe = subscribeScroll((y, h) => {
      scroll.current = Math.min(1, y / h);
    });
    const element = container.current;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)));
    if (element) observer.observe(element);
    return () => {
      window.removeEventListener('pointermove', onMove);
      unsubscribe();
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={container} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 14], fov: 32 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.08} />
        <directionalLight position={[-4, 6, 6]} intensity={0.7} color="#e9edf5" />
        <pointLight position={[0, -3, 4]} intensity={3} distance={14} color="#d4ff00" />
        <Plates pointer={pointer} scroll={scroll} animate={animate} />
        <StudioEnvironment />
      </Canvas>
    </div>
  );
}
