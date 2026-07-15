import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { TrackedGrenade } from '../../lib/gsi/grenadeTracker';

interface RadarGrenadeIconProps {
  grenade: TrackedGrenade;
  players?: any[];
  grenades?: TrackedGrenade[];
}

const RADAR_SIZE_PX = 400;
const RADAR_PERCENT_TO_PX = RADAR_SIZE_PX / 100;
const MOLOTOV_FIRE_RADIUS_PX = 14;
const SMOKE_EXTINGUISH_RADIUS_PX = 16;
const SMOKE_FULL_EXTINGUISH_CENTER_DISTANCE_PX = 12;

const TYPE_COLORS: Record<string, string> = {
  smoke: '#cbd5e1',
  flash: '#fef08a',
  he: '#ef4444',
  molotov: '#fb923c',
  decoy: '#a78bfa',
};

const TYPE_ICONS: Record<string, string> = {
  smoke: '/icons/cs2/smokegrenade.svg',
  flash: '/icons/cs2/flashbang.svg',
  he: '/icons/cs2/hegrenade.svg',
  molotov: '/icons/cs2/molotov.svg',
  decoy: '/icons/cs2/decoy.svg',
};

function getGrenadeOwnerId(grenade: any) {
  return (
    grenade.owner ||
    grenade.owner_steamid ||
    grenade.player ||
    grenade.steamid ||
    grenade.thrower ||
    grenade.thrower_steamid ||
    null
  );
}

function getOwnerTeam(grenade: any, players?: any[]) {
  const ownerId = getGrenadeOwnerId(grenade);

  if (!ownerId || !Array.isArray(players)) {
    return null;
  }

  const owner = players.find((player) => {
    return String(player?.steamid) === String(ownerId);
  });

  if (owner?.team === 'CT') return 'CT';
  if (owner?.team === 'T' || owner?.team === 'TR') return 'T';

  return null;
}

function getMolotovSmokeOccluders(
  grenade: TrackedGrenade,
  grenades: TrackedGrenade[] | undefined
) {
  if (!Array.isArray(grenades)) return [];

  return grenades
    .filter((candidate) => {
      return (
        candidate.type === 'smoke' &&
        candidate.isDeployed &&
        candidate.renderKey !== grenade.renderKey &&
        candidate.roundIdentity === grenade.roundIdentity
      );
    })
    .map((smoke) => {
      return {
        cx:
          18 +
          (smoke.radarPos.x - grenade.radarPos.x) * RADAR_PERCENT_TO_PX,
        cy:
          18 +
          (smoke.radarPos.y - grenade.radarPos.y) * RADAR_PERCENT_TO_PX,
        r: SMOKE_EXTINGUISH_RADIUS_PX,
      };
    });
}

function isMolotovFullySmoked(
  smokeOccluders: Array<{ cx: number; cy: number; r: number }>
) {
  return smokeOccluders.some((smoke) => {
    const distance = Math.hypot(smoke.cx - 18, smoke.cy - 18);

    return distance <= SMOKE_FULL_EXTINGUISH_CENTER_DISTANCE_PX;
  });
}

export function RadarGrenadeIcon({ grenade, players, grenades }: RadarGrenadeIconProps) {
  const [now, setNow] = useState(() => Date.now());
  const color = TYPE_COLORS[grenade.type] || '#ffffff';
  const icon = TYPE_ICONS[grenade.type];
  const { x, y } = grenade.radarPos;

  const ownerTeam = getOwnerTeam(grenade, players);
  const isDeployed = grenade.isDeployed;
  const effectAge = grenade.deployedAt ? now - grenade.deployedAt : 0;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 150);

    return () => window.clearInterval(interval);
  }, [grenade.renderKey]);

  if (grenade.type !== 'smoke' && now > grenade.hardExpireAt + 250) {
    return null;
  }

  if (!isDeployed && now - grenade.firstSeenAt > 5000) {
    return null;
  }

  /*
   ============================================================
   SMOKE
   ============================================================
  */
  if (grenade.type === 'smoke' && isDeployed) {
    const ringColor =
      ownerTeam === 'CT'
        ? '#38bdf8'
        : ownerTeam === 'T'
          ? '#f59e0b'
          : '#94a3b8';

    const glowColor =
      ownerTeam === 'CT'
        ? 'rgba(56,189,248,0.65)'
        : ownerTeam === 'T'
          ? 'rgba(245,158,11,0.65)'
          : 'rgba(148,163,184,0.55)';

    return (
      <div
        className="absolute pointer-events-none z-[10]"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <motion.div
          initial={{ scale: 0.65, opacity: 0 }}
          animate={{
            scale: [0.96, 1.04, 0.99, 1.02],
            opacity: 0.82,
          }}
          exit={{ scale: 1.12, opacity: 0 }}
          transition={{
            scale: {
              repeat: Infinity,
              duration: 3.4,
              ease: 'easeInOut',
            },
            opacity: {
              duration: 0.25,
              ease: 'easeOut',
            },
          }}
          className="relative w-[30px] h-[30px] rounded-full overflow-hidden"
          style={{
            border: `1.6px solid ${ringColor}`,
            background:
              'radial-gradient(circle at 45% 45%, rgba(226,232,240,0.56), rgba(148,163,184,0.34) 42%, rgba(51,65,85,0.26) 72%, rgba(15,23,42,0.16))',
            boxShadow: `0 0 9px ${glowColor}, inset 0 0 10px rgba(226,232,240,0.28)`,
          }}
        >
          <motion.div
            animate={{
              x: [-2, 2, -1],
              y: [0, -1, 1],
              scale: [1, 1.15, 0.95],
              opacity: [0.28, 0.48, 0.32],
            }}
            transition={{
              repeat: Infinity,
              duration: 3.8,
              ease: 'easeInOut',
            }}
            className="absolute left-[4px] top-[5px] w-[18px] h-[16px] rounded-full bg-slate-200 blur-[5px]"
          />

          <motion.div
            animate={{
              x: [2, -2, 1],
              y: [1, -2, 0],
              scale: [0.92, 1.1, 1],
              opacity: [0.22, 0.42, 0.24],
            }}
            transition={{
              repeat: Infinity,
              duration: 4.3,
              ease: 'easeInOut',
            }}
            className="absolute right-[3px] bottom-[4px] w-[17px] h-[17px] rounded-full bg-gray-300 blur-[6px]"
          />

          <motion.div
            animate={{
              scale: [1, 1.08, 0.96],
              opacity: [0.12, 0.26, 0.14],
            }}
            transition={{
              repeat: Infinity,
              duration: 4.8,
              ease: 'easeInOut',
            }}
            className="absolute left-[8px] bottom-[3px] w-[16px] h-[14px] rounded-full bg-white blur-[7px]"
          />
        </motion.div>
      </div>
    );
  }

  /*
   ============================================================
   MOLOTOV
   ============================================================
  */
  if (grenade.type === 'molotov' && isDeployed) {
    const activeDuration = grenade.deployedAt
      ? Math.max(0, grenade.expireAt - grenade.deployedAt)
      : 6131;

    if (effectAge > activeDuration) return null;

    const smokeOccluders = getMolotovSmokeOccluders(grenade, grenades);

    if (isMolotovFullySmoked(smokeOccluders)) return null;

    const maskId = `molotov_smoke_mask_${grenade.renderKey.replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    )}`;

    return (
      <div
        className="absolute pointer-events-none z-[11]"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <motion.svg
          viewBox="0 0 36 36"
          className="w-[42px] h-[34px] overflow-visible"
          initial={{ scale: 0.65, opacity: 0 }}
          animate={{
            opacity: [0.78, 0.96, 0.82, 0.94],
          }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{
            repeat: Infinity,
            duration: 0.9,
            ease: 'easeInOut',
          }}
        >
          <defs>
            <linearGradient id={`${maskId}_outer`} x1="18" y1="7" x2="18" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ef1d0d" />
              <stop offset="0.56" stopColor="#ff3b05" />
              <stop offset="1" stopColor="#ff8a00" />
            </linearGradient>
            <linearGradient id={`${maskId}_middle`} x1="18" y1="15" x2="18" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ff5a00" />
              <stop offset="0.58" stopColor="#ff9f0a" />
              <stop offset="1" stopColor="#ffd21a" />
            </linearGradient>
            <linearGradient id={`${maskId}_core`} x1="18" y1="22" x2="18" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ffe45c" />
              <stop offset="1" stopColor="#fff79a" />
            </linearGradient>
            <mask id={maskId}>
              <rect x="-60" y="-60" width="156" height="156" fill="white" />
              {smokeOccluders.map((smoke, index) => (
                <circle
                  key={index}
                  cx={smoke.cx}
                  cy={smoke.cy}
                  r={smoke.r}
                  fill="black"
                />
              ))}
            </mask>
            <filter id={`${maskId}_glow`} x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <motion.g
            mask={`url(#${maskId})`}
            filter={`url(#${maskId}_glow)`}
            style={{ transformOrigin: '18px 31px' }}
            animate={{
              y: [1, -1.6, 0.6],
              scaleY: [0.94, 1.08, 0.98],
              scaleX: [1.02, 0.97, 1.01],
            }}
            transition={{
              repeat: Infinity,
              duration: 0.82,
              ease: 'easeInOut',
            }}
          >
            <path
              d="M2 30 C3 26 1 22 5 18 C6 22 10 21 8 15 C12 19 14 14 15 9 C18 13 18 18 21 20 C21 14 25 10 29 7 C27 13 32 14 34 20 C36 24 34 29 31 31 C24 33 11 33 2 30 Z"
              fill={`url(#${maskId}_outer)`}
            />
            <path
              d="M5 30 C7 25 7 21 11 18 C10 24 15 23 14 16 C17 20 18 24 21 25 C20 20 23 17 27 15 C26 20 32 22 31 28 C26 32 11 32 5 30 Z"
              fill={`url(#${maskId}_middle)`}
              opacity="0.96"
            />
            <path
              d="M7 31 C9 27 13 27 15 23 C16 28 20 29 23 24 C24 28 28 28 30 31 C25 32 13 32 7 31 Z"
              fill={`url(#${maskId}_core)`}
              opacity="0.92"
            />
            <path
              d="M12 10 C13 7 15 6 15 3 C18 6 15 9 12 10 Z M24 11 C26 8 28 7 27 4 C31 7 28 11 24 11 Z"
              fill="#ef1d0d"
              opacity="0.9"
            />
          </motion.g>
        </motion.svg>
      </div>
    );
  }

  /*
   ============================================================
   HE â€” explosÃ£o rÃ¡pida. Nunca mostra Ã­cone parado depois.
   ============================================================
  */
  if (grenade.type === 'he' && isDeployed) {
    if (effectAge > 900) return null;

    const particles = [
      { x: 10, y: 0 },
      { x: -9, y: 1 },
      { x: 0, y: 10 },
      { x: 1, y: -9 },
      { x: 7, y: 7 },
      { x: -7, y: -7 },
    ];

    return (
      <div
        className="absolute pointer-events-none z-[18]"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <motion.div
          initial={{ scale: 0.2, opacity: 1 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
          className="absolute -left-[11px] -top-[11px] w-[22px] h-[22px] rounded-full bg-red-600/45 border-2 border-orange-400"
          style={{
            boxShadow: '0 0 16px rgba(239,68,68,0.95)',
          }}
        />

        <motion.div
          initial={{ scale: 0.4, opacity: 1 }}
          animate={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="absolute -left-[5px] -top-[5px] w-[10px] h-[10px] rounded-full bg-yellow-300"
        />

        {particles.map((particle, index) => (
          <motion.div
            key={index}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: particle.x,
              y: particle.y,
              opacity: 0,
              scale: 0.25,
            }}
            transition={{
              duration: 0.38,
              ease: 'easeOut',
            }}
            className="absolute -left-[1.5px] -top-[1.5px] w-[3px] h-[3px] rounded-full bg-orange-300"
          />
        ))}
      </div>
    );
  }
  /*
   ============================================================
   HE — explosão rápida. Nunca mostra ícone parado depois.
   ============================================================
  */
  /*
   ============================================================
   FLASH — clarão rápido. Nunca mostra ícone parado depois.
   ============================================================
  */
  if (grenade.type === 'flash' && isDeployed) {
    if (effectAge > 800) return null;

    return (
      <div
        className="absolute pointer-events-none z-[18]"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <motion.div
          initial={{ scale: 0.25, opacity: 0.95 }}
          animate={{ scale: 2.1, opacity: 0 }}
          transition={{ duration: 0.38, ease: 'easeOut' }}
          className="absolute -left-[12px] -top-[12px] w-[24px] h-[24px] rounded-full bg-white"
          style={{
            boxShadow: '0 0 18px rgba(255,255,255,1)',
          }}
        />

        <motion.div
          initial={{ scale: 0.2, opacity: 0.8, rotate: 0 }}
          animate={{ scale: 1.4, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.34, ease: 'easeOut' }}
          className="absolute -left-[8px] -top-[8px] w-[16px] h-[16px] border border-yellow-200"
        />
      </div>
    );
  }

  /*
   ============================================================
   DECOY
   ============================================================
  */
  if (grenade.type === 'decoy' && isDeployed) {
    return (
      <div
        className="absolute pointer-events-none z-[10]"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="absolute -left-[3px] -top-[3px] w-[6px] h-[6px] rounded-full bg-violet-300" />

        <motion.div
          animate={{ scale: [1, 3.6], opacity: [0.65, 0] }}
          transition={{
            repeat: Infinity,
            duration: 1.1,
            ease: 'easeOut',
          }}
          className="absolute -left-[4px] -top-[4px] w-[8px] h-[8px] rounded-full border border-violet-300"
        />

        <motion.div
          animate={{ scale: [1, 3.6], opacity: [0.5, 0] }}
          transition={{
            repeat: Infinity,
            duration: 1.1,
            ease: 'easeOut',
            delay: 0.55,
          }}
          className="absolute -left-[4px] -top-[4px] w-[8px] h-[8px] rounded-full border border-violet-300"
        />
      </div>
    );
  }

  /*
   Proteção final:
   Se por algum motivo HE/Flash já estiverem expiradas,
   nunca deixar cair no ícone voando.
  */
  if (
    (grenade.type === 'he' || grenade.type === 'flash') &&
    (grenade.isExpired || grenade.isDeployed)
  ) {
    // If HE/Flash is already deployed (showing animation), don't show projectile
    if (isDeployed) return null;
    
    // If it's already expired, don't show anything
    return null;
  }

  /*
   ============================================================
   FLYING PROJECTILE
   ============================================================
  */
  return (
    <div
      className="absolute pointer-events-none z-[20] will-change-transform"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="relative flex items-center justify-center">
        <div
          className="absolute rounded-full blur-[5px] opacity-50"
          style={{
            backgroundColor: color,
            width: '10px',
            height: '10px',
          }}
        />

        {icon ? (
          <img
            src={icon}
            alt={grenade.type}
            className="w-3.5 h-3.5 object-contain brightness-0 invert drop-shadow-md relative z-10"
            style={{
              filter: `drop-shadow(0 0 2px ${color}) brightness(0) invert(1)`,
            }}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            className="w-1.5 h-1.5 rounded-full border border-white/60 shadow-lg"
            style={{ backgroundColor: color }}
          />
        )}
      </div>
    </div>
  );
}
