import { motion } from "framer-motion";

interface SwarmLogoProps {
  size?: number;
}

export function SwarmLogo({ size = 40 }: SwarmLogoProps) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const hexR = s * 0.32;

  // Hexagon points
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + hexR * Math.cos(angle)},${cy + hexR * Math.sin(angle)}`;
  }).join(" ");

  // Inner hex (smaller)
  const innerR = hexR * 0.55;
  const innerHexPoints = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${cx + innerR * Math.cos(angle)},${cy + innerR * Math.sin(angle)}`;
  }).join(" ");

  // Orbit dots positions
  const orbitR = s * 0.42;
  const dots = [0, 1, 2, 3, 4, 5].map((i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return { x: cx + orbitR * Math.cos(angle), y: cy + orbitR * Math.sin(angle) };
  });

  return (
    <motion.svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      className="flex-shrink-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
    >
      <defs>
        <linearGradient id="swarm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <filter id="swarm-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer hexagon */}
      <polygon
        points={hexPoints}
        fill="none"
        stroke="url(#swarm-grad)"
        strokeWidth="1"
        opacity="0.6"
      />

      {/* Inner hexagon */}
      <polygon
        points={innerHexPoints}
        fill="none"
        stroke="url(#swarm-grad)"
        strokeWidth="0.8"
        opacity="0.4"
      />

      {/* Connection lines from center to vertices */}
      {dots.map((dot, i) => (
        <line
          key={`line-${i}`}
          x1={cx}
          y1={cy}
          x2={dot.x}
          y2={dot.y}
          stroke="#22d3ee"
          strokeWidth="0.5"
          opacity="0.2"
        />
      ))}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2} fill="#22d3ee" filter="url(#swarm-glow)" opacity="0.9" />

      {/* Orbit dots */}
      {dots.map((dot, i) => (
        <motion.circle
          key={`dot-${i}`}
          cx={dot.x}
          cy={dot.y}
          r={1.5}
          fill={i % 2 === 0 ? "#22d3ee" : "#818cf8"}
          filter="url(#swarm-glow)"
          animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.3, 1] }}
          transition={{
            duration: 2 + i * 0.3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}
    </motion.svg>
  );
}
