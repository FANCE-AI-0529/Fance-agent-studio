import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ── Holographic Planet (Point Cloud Sphere) ── */
function HoloPlanet() {
  const meshRef = useRef<THREE.Points>(null);

  const [positions, colors, sizes] = useMemo(() => {
    const count = 12000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);

    const cyan = new THREE.Color("#22d3ee");
    const indigo = new THREE.Color("#6366f1");
    const dim = new THREE.Color("#1e293b");

    const radius = 6;

    for (let i = 0; i < count; i++) {
      // Fibonacci sphere distribution
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = radius + (Math.random() - 0.5) * 0.3;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const t = Math.random();
      const c = t < 0.3 ? cyan : t < 0.6 ? indigo : dim;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      sz[i] = Math.random() * 2 + 0.5;
    }
    return [pos, col, sz];
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.02;
    meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.01) * 0.05;
  });

  return (
    <points ref={meshRef} position={[0, -4, -8]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={positions.length / 3} itemSize={3} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={colors.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.6}
        size={0.035}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ── Wireframe Sphere Shell ── */
function WireframeSphere() {
  const ref = useRef<THREE.LineSegments>(null);

  const geo = useMemo(() => {
    const sphere = new THREE.IcosahedronGeometry(6.2, 3);
    return new THREE.WireframeGeometry(sphere);
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.02;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.01) * 0.05;
  });

  return (
    <lineSegments ref={ref} geometry={geo} position={[0, -4, -8]}>
      <lineBasicMaterial color="#6366f1" transparent opacity={0.06} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}

/* ── Galaxy Ring (tilted particle ring) ── */
function GalaxyRing() {
  const meshRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const count = 4000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const cyan = new THREE.Color("#22d3ee");
    const indigo = new THREE.Color("#818cf8");
    const purple = new THREE.Color("#a78bfa");

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const ringRadius = 8 + Math.random() * 3.5;
      const ySpread = (Math.random() - 0.5) * 0.4;

      pos[i * 3] = Math.cos(angle) * ringRadius;
      pos[i * 3 + 1] = ySpread;
      pos[i * 3 + 2] = Math.sin(angle) * ringRadius;

      const t = Math.random();
      const c = t < 0.4 ? cyan : t < 0.7 ? indigo : purple;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.015;
  });

  return (
    <points
      ref={meshRef}
      position={[0, -4, -8]}
      rotation={[Math.PI * 0.35, 0, Math.PI * 0.05]}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={positions.length / 3} itemSize={3} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={colors.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.5}
        size={0.025}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ── Data Beams (fast orbiting elliptical rings) ── */
function DataBeams() {
  const groupRef = useRef<THREE.Group>(null);

  const beams = useMemo(() => {
    return [
      { radiusX: 9, radiusZ: 7, tilt: 0.6, speed: 0.4, color: "#22d3ee", opacity: 0.15 },
      { radiusX: 10, radiusZ: 8, tilt: 0.8, speed: -0.3, color: "#818cf8", opacity: 0.12 },
      { radiusX: 11, radiusZ: 6, tilt: 0.4, speed: 0.5, color: "#6366f1", opacity: 0.1 },
    ];
  }, []);

  const lineObjects = useMemo(() => {
    return beams.map((beam) => {
      const points: THREE.Vector3[] = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            Math.cos(angle) * beam.radiusX,
            0,
            Math.sin(angle) * beam.radiusZ
          )
        );
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: beam.color,
        transparent: true,
        opacity: beam.opacity,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geo, mat);
      line.rotation.x = beam.tilt;
      return line;
    });
  }, [beams]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      child.rotation.y = clock.getElapsedTime() * beams[i].speed;
    });
  });

  return (
    <group ref={groupRef} position={[0, -4, -8]}>
      {lineObjects.map((obj, i) => (
        <primitive key={i} object={obj} />
      ))}
    </group>
  );
}

/* ── Ambient floating particles (foreground dust) ── */
function AmbientDust({ count = 300 }) {
  const meshRef = useRef<THREE.Points>(null);
  const basePositions = useRef<Float32Array | null>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const cyan = new THREE.Color("#22d3ee");
    const indigo = new THREE.Color("#818cf8");

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;

      const c = Math.random() > 0.5 ? cyan : indigo;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    basePositions.current = pos.slice();
    return [pos, col];
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !basePositions.current) return;
    const time = clock.getElapsedTime();
    const posAttr = meshRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    const base = basePositions.current;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      arr[ix] = base[ix] + Math.sin(time * 0.15 + i * 0.1) * 0.2;
      arr[ix + 1] = base[ix + 1] + Math.sin(time * 0.2 + i * 0.05) * 0.15;
      arr[ix + 2] = base[ix + 2] + Math.sin(time * 0.1 + i * 0.08) * 0.1;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.slice(), 3]} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.4}
        size={0.03}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ── Parallax Camera Controller ── */
function ParallaxCamera() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      target.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  useFrame(() => {
    mouse.current.x += (target.current.x - mouse.current.x) * 0.015;
    mouse.current.y += (target.current.y - mouse.current.y) * 0.015;

    camera.position.x = mouse.current.x * 1.2;
    camera.position.y = mouse.current.y * 0.8;
    camera.lookAt(0, -2, -8);
  });

  return null;
}

/* ── Fog Setup ── */
function SceneFog() {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.FogExp2("#050505", 0.035);
    return () => { scene.fog = null; };
  }, [scene]);
  return null;
}

/* ── Main Export ── */
export function ParticleField() {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div className="fixed inset-0" style={{ zIndex: -1 }}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, isMobile ? 1 : 1.5]}
      >
        <SceneFog />
        <ParallaxCamera />
        <ambientLight intensity={0.05} />

        {/* Core planet */}
        <HoloPlanet />
        <WireframeSphere />

        {/* Orbiting elements */}
        <GalaxyRing />
        <DataBeams />

        {/* Ambient particles */}
        <AmbientDust count={isMobile ? 150 : 300} />
      </Canvas>

      {/* Deep vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 70%, transparent 20%, #050505 75%)",
        }}
      />
      {/* Top fade for navbar readability */}
      <div
        className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, #050505 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
