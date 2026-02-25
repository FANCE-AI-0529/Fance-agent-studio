import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ count = 800 }) {
  const mesh = useRef<THREE.Points>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const { viewport } = useThree();

  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);

    const cyan = new THREE.Color("#22d3ee");
    const indigo = new THREE.Color("#818cf8");
    const purple = new THREE.Color("#a78bfa");

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;

      const t = Math.random();
      const color = t < 0.33 ? cyan : t < 0.66 ? indigo : purple;
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;

      sz[i] = Math.random() * 3 + 0.5;
    }
    return [pos, col, sz];
  }, [count]);

  useFrame(({ clock, pointer }) => {
    if (!mesh.current) return;
    const time = clock.getElapsedTime();

    // Smooth mouse tracking
    mouseRef.current.x += (pointer.x * viewport.width * 0.3 - mouseRef.current.x) * 0.02;
    mouseRef.current.y += (pointer.y * viewport.height * 0.3 - mouseRef.current.y) * 0.02;

    const posAttr = mesh.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const baseX = positions[ix];
      const baseY = positions[ix + 1];
      const baseZ = positions[ix + 2];

      // Breathing wave
      arr[ix] = baseX + Math.sin(time * 0.3 + baseY * 0.5) * 0.15 + mouseRef.current.x * (0.02 + baseZ * 0.005);
      arr[ix + 1] = baseY + Math.sin(time * 0.4 + baseX * 0.3) * 0.2 + mouseRef.current.y * (0.02 + baseZ * 0.005);
      arr[ix + 2] = baseZ + Math.sin(time * 0.2 + i * 0.01) * 0.1;
    }
    posAttr.needsUpdate = true;

    mesh.current.rotation.y = time * 0.015;
    mesh.current.rotation.x = Math.sin(time * 0.1) * 0.03;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.slice(), 3]} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} count={count} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.7}
        size={0.04}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Neural connection lines
function NeuralGrid() {
  const lineRef = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const nodes = 40;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < nodes; i++) {
      points.push(new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6
      ));
    }

    const cyan = new THREE.Color("#22d3ee");
    const indigo = new THREE.Color("#818cf8");

    for (let i = 0; i < nodes; i++) {
      for (let j = i + 1; j < nodes; j++) {
        const d = points[i].distanceTo(points[j]);
        if (d < 3.5) {
          positions.push(points[i].x, points[i].y, points[i].z);
          positions.push(points[j].x, points[j].y, points[j].z);
          const c = Math.random() > 0.5 ? cyan : indigo;
          colors.push(c.r, c.g, c.b);
          colors.push(c.r, c.g, c.b);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (!lineRef.current) return;
    lineRef.current.rotation.y = clock.getElapsedTime() * 0.01;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.08} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}

export function ParticleField() {
  return (
    <div className="fixed inset-0" style={{ zIndex: -1 }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.1} />
        <Particles count={typeof window !== 'undefined' && window.innerWidth < 640 ? 400 : 1000} />
        <NeuralGrid />
      </Canvas>
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, #050505 80%)",
        }}
      />
    </div>
  );
}
