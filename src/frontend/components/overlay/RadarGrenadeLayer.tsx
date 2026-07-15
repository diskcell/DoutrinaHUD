import { TrackedGrenade } from '../../lib/gsi/grenadeTracker';

interface RadarGrenadeLayerProps {
  grenades: TrackedGrenade[];
}

const TYPE_COLORS: Record<string, string> = {
  smoke: '#f1f5f9',
  flash: '#fef08a',
  he: '#ef4444',
  molotov: '#fb923c',
  decoy: '#a78bfa',
};

export function RadarGrenadeLayer({ grenades }: RadarGrenadeLayerProps) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-[12] overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {grenades.map((g) => {
        if (!g.trail || g.trail.length < 2) {
          return null;
        }

        const points = g.trail
          .filter((p) => typeof p.x === 'number' && typeof p.y === 'number')
          .map((p) => `${p.x},${p.y}`)
          .join(' ');

        if (!points) return null;

        const color = TYPE_COLORS[g.type] || '#ffffff';
        let opacity = 0.45;

        if (g.isExpired && g.fadeStartTime) {
          const elapsed = Date.now() - g.fadeStartTime;
          // HE and Flash trails should disappear very fast
          const isQuick = g.type === 'he' || g.type === 'flash';
          const fadeDuration = isQuick ? 400 : 1500;
          opacity = Math.max(0, 0.45 - (elapsed / fadeDuration) * 0.45);
        }

        if (opacity <= 0) return null;

        return (
          <g key={`trail_group_${g.renderKey}`}>
            {/* Subtle glow/shadow for the trail */}
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={opacity * 0.3}
              style={{ filter: 'blur(1px)' }}
            />
            {/* Main Sharp Trail Line */}
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="0.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={opacity}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
}
