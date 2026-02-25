import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════
   Holographic Planet — massive point-cloud sphere
   positioned low in view (y: -12) and far back (z: -25)
   ═══════════════════════════════════════════════════ */
function HoloPlanet() {
  const meshRef = useRef<THREE.Points>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const count = isMobile ? 10000 : 20000;
  const radius = 14;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const cyan = new THREE.Color("#22d3ee");
    const indigo = new THREE.Color("#6366f1");
    const dim = new THREE.Color("#0f172a");
    const bright = new THREE.Color("#38bdf8");

    for (let i = 0; i < count; i++) {
      // Fibonacci sphere for even distribution
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = radius + (Math.random() - 0.5) * 0.6;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      const t = Math.random();
      const c = t < 0.15 ? bright : t < 0.35 ? cyan : t < 0.6 ? indigo : dim;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.y = t * 0.015;
    meshRef.current.rotation.x = Math.sin(t * 0.008) * 0.03;
  });

  return (
    <points ref={meshRef} position={[0, -12, -25]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.75}
        size={0.06}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════
   Wireframe Shell — subtle icosahedron wireframe
   ═══════════════════════════════════════════════════ */
function WireframeSphere() {
  const ref = useRef<THREE.LineSegments>(null);

  const geo = useMemo(() => {
    const sphere = new THREE.IcosahedronGeometry(14.5, 4);
    return new THREE.WireframeGeometry(sphere);
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.015;
    ref.current.rotation.x = Math.sin(t * 0.008) * 0.03;
  });

  return (
    <lineSegments ref={ref} geometry={geo} position={[0, -12, -25]}>
      <lineBasicMaterial color="#6366f1" transparent opacity={0.04} blending={THREE.AdditiveBlending} />
    </lineSegments>
  );
}

/* ═══════════════════════════════════════════════════
   Galaxy Ring — tilted swarm of 6000 particles
   ═══════════════════════════════════════════════════ */
function GalaxyRing() {
  const meshRef = useRef<THREE.Points>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const count = isMobile ? 3000 : 6000;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const cyan = new THREE.Color("#22d3ee");
    const indigo = new THREE.Color("#818cf8");
    const purple = new THREE.Color("#a78bfa");
    const white = new THREE.Color("#e0f2fe");

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const innerR = 16;
      const outerR = 24;
      const ringRadius = innerR + Math.random() * (outerR - innerR);
      const ySpread = (Math.random() - 0.5) * 0.6 * (1 - (ringRadius - innerR) / (outerR - innerR));

      pos[i * 3] = Math.cos(angle) * ringRadius;
      pos[i * 3 + 1] = ySpread;
      pos[i * 3 + 2] = Math.sin(angle) * ringRadius;

      const t = Math.random();
      const c = t < 0.05 ? white : t < 0.35 ? cyan : t < 0.65 ? indigo : purple;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.01;
  });

  return (
    <points
      ref={meshRef}
      position={[0, -12, -25]}
      rotation={[Math.PI * 0.38, 0, Math.PI * 0.05]}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.6}
        size={0.04}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════
   Data Beams — 4 fast-orbiting elliptical tracks
   ═══════════════════════════════════════════════════ */
function DataBeams() {
  const groupRef = useRef<THREE.Group>(null);

  const beams = useMemo(() => [
    { rX: 18, rZ: 14, tilt: 0.55, speed: 0.35, color: "#22d3ee", op: 0.2 },
    { rX: 20, rZ: 16, tilt: 0.75, speed: -0.25, color: "#818cf8", op: 0.15 },
    { rX: 22, rZ: 12, tilt: 0.4, speed: 0.45, color: "#6366f1", op: 0.12 },
    { rX: 17, rZ: 19, tilt: 0.9, speed: -0.4, color: "#a78bfa", op: 0.1 },
  ], []);

  const lineObjects = useMemo(() => {
    return beams.map((b) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 256; i++) {
        const a = (i / 256) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * b.rX, 0, Math.sin(a) * b.rZ));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: b.color,
        transparent: true,
        opacity: b.op,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geo, mat);
      line.rotation.x = b.tilt;
      return line;
    });
  }, [beams]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      child.rotation.y = t * beams[i].speed;
    });
  });

  return (
    <group ref={groupRef} position={[0, -12, -25]}>
      {lineObjects.map((obj, i) => (
        <primitive key={i} object={obj} />
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════
   Orbital Fireflies — bright particles traveling
   along elliptical orbits at high speed
   ═══════════════════════════════════════════════════ */
function OrbitalFireflies() {
  const count = 60;
  const meshRef = useRef<THREE.Points>(null);

  const orbits = useMemo(() => {
    return Array.from({ length: count }, () => ({
      rX: 16 + Math.random() * 8,
      rZ: 12 + Math.random() * 10,
      tiltX: 0.3 + Math.random() * 0.7,
      tiltZ: (Math.random() - 0.5) * 0.3,
      speed: (0.3 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1),
      offset: Math.random() * Math.PI * 2,
    }));
  }, []);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cyan = new THREE.Color("#22d3ee");
    const indigo = new THREE.Color("#818cf8");

    for (let i = 0; i < count; i++) {
      const c = Math.random() > 0.5 ? cyan : indigo;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const posAttr = meshRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const o = orbits[i];
      const angle = t * o.speed + o.offset;
      const x = Math.cos(angle) * o.rX;
      const z = Math.sin(angle) * o.rZ;
      // Apply tilt rotation
      arr[i * 3] = x;
      arr[i * 3 + 1] = z * Math.sin(o.tiltX) + Math.sin(angle * 2) * 0.5;
      arr[i * 3 + 2] = z * Math.cos(o.tiltX);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={meshRef} position={[0, -12, -25]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        opacity={0.9}
        size={0.12}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════
   Ambient Dust — foreground floating particles
   ═══════════════════════════════════════════════════ */
function AmbientDust({ count = 400 }) {
  const meshRef = useRef<THREE.Points>(null);
  const basePositions = useRef<Float32Array | null>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cyan = new THREE.Color("#22d3ee");
    const indigo = new THREE.Color("#818cf8");
    const dim = new THREE.Color("#334155");

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const t = Math.random();
      const c = t < 0.2 ? cyan : t < 0.4 ? indigo : dim;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    basePositions.current = pos.slice();
    return [pos, col];
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current || !basePositions.current) return;
    const t = clock.getElapsedTime();
    const posAttr = meshRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    const base = basePositions.current;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      arr[ix] = base[ix] + Math.sin(t * 0.12 + i * 0.1) * 0.3;
      arr[ix + 1] = base[ix + 1] + Math.sin(t * 0.18 + i * 0.05) * 0.2;
      arr[ix + 2] = base[ix + 2] + Math.sin(t * 0.08 + i * 0.08) * 0.15;
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
        opacity={0.35}
        size={0.025}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════
   Parallax Camera — smooth mouse-driven offset
   ═══════════════════════════════════════════════════ */
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
    mouse.current.x += (target.current.x - mouse.current.x) * 0.012;
    mouse.current.y += (target.current.y - mouse.current.y) * 0.012;

    camera.position.x = mouse.current.x * 2;
    camera.position.y = 2 + mouse.current.y * 1.5;
    camera.lookAt(0, -6, -20);
  });

  return null;
}

/* ═══════════════════════════════════════════════════
   Scene Fog — exponential depth fade
   ═══════════════════════════════════════════════════ */
function SceneFog() {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.FogExp2("#050505", 0.018);
    return () => { scene.fog = null; };
  }, [scene]);
  return null;
}

/* ═══════════════════════════════════════════════════
   Main Export — The Holographic Core
   ═══════════════════════════════════════════════════ */
export function ParticleField() {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div className="fixed inset-0" style={{ zIndex: -1 }}>
      <Canvas
        camera={{ position: [0, 2, 18], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, isMobile ? 1 : 1.5]}
      >
        <SceneFog />
        <ParallaxCamera />
        <ambientLight intensity={0.03} />

        {/* Core holographic planet */}
        <HoloPlanet />
        <WireframeSphere />

        {/* Orbiting systems */}
        <GalaxyRing />
        <DataBeams />
        <OrbitalFireflies />

        {/* Foreground ambient dust */}
        <AmbientDust count={isMobile ? 150 : 400} />
      </Canvas>

      {/* Deep radial vignette — hides bottom of planet */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 90% 50% at 50% 80%, transparent 15%, #050505 70%)",
            "linear-gradient(180deg, rgba(5,5,5,0.3) 0%, transparent 30%, transparent 60%, rgba(5,5,5,0.8) 100%)",
          ].join(", "),
        }}
      />
      {/* Top gradient for navbar clarity */}
      <div
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(5,5,5,0.6) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
