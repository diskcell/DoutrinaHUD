import { cn } from '../AdminLayout';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface RadarPlayerIconProps {
  player: any;
  x: number;
  y: number;
  rotation?: number;
  isObserved: boolean;
  hasBomb: boolean;
}

const POSITION_TWEEN_SECONDS = 0.23;
const ROTATION_TWEEN_SECONDS = 0.18;
const TELEPORT_DISTANCE_PERCENT = 18;

function shortestAngleDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

function getActiveWeapon(player: any) {
  const weapons = Object.values<any>(player?.weapons || {});

  return weapons.find((weapon) => weapon?.state === 'active') || null;
}

function isShootableWeapon(weapon: any) {
  if (!weapon) return false;

  const type = String(weapon.type || '').toLowerCase();
  const name = String(weapon.name || '').toLowerCase();

  return (
    !type.includes('grenade') &&
    type !== 'knife' &&
    type !== 'c4' &&
    !name.includes('knife') &&
    !name.includes('grenade') &&
    !name.includes('c4')
  );
}

export function RadarPlayerIcon({
  player,
  x,
  y,
  rotation = 0,
  isObserved,
  hasBomb,
}: RadarPlayerIconProps) {
  const isCT = player.team === 'CT';
  const health = player.state?.health ?? 0;
  const isDead = health <= 0;
  const safeRotation = Number.isFinite(rotation) ? rotation : 0;
  const previousPositionRef = useRef({ x, y });
  const previousRotationRef = useRef(safeRotation);
  const [continuousRotation, setContinuousRotation] = useState(safeRotation);

  const positionDistance = Math.hypot(
    x - previousPositionRef.current.x,
    y - previousPositionRef.current.y,
  );
  const shouldSnapPosition = positionDistance >= TELEPORT_DISTANCE_PERCENT;

  useEffect(() => {
    previousPositionRef.current = { x, y };
  }, [x, y]);

  useEffect(() => {
    const delta = shortestAngleDelta(previousRotationRef.current, safeRotation);
    previousRotationRef.current = safeRotation;
    setContinuousRotation((current) => current + delta);
  }, [safeRotation]);

  const previousWeaponRef = useRef<{
    name: string | null;
    ammoClip: number | null;
  }>({
    name: null,
    ammoClip: null,
  });

  const [muzzleFlashKey, setMuzzleFlashKey] = useState(0);

  useEffect(() => {
    const activeWeapon = getActiveWeapon(player);
    const ammoClip = Number(activeWeapon?.ammo_clip);
    const weaponName = activeWeapon?.name ? String(activeWeapon.name) : null;
    const previous = previousWeaponRef.current;

    if (
      !isDead &&
      isShootableWeapon(activeWeapon) &&
      weaponName &&
      Number.isFinite(ammoClip) &&
      previous.name === weaponName &&
      previous.ammoClip !== null &&
      ammoClip < previous.ammoClip
    ) {
      setMuzzleFlashKey((key) => key + 1);
    }

    previousWeaponRef.current = {
      name: weaponName,
      ammoClip: Number.isFinite(ammoClip) ? ammoClip : null,
    };
  }, [player?.weapons, isDead]);

  const teamColor = isCT ? '#3b82f6' : '#f59e0b';
  const teamAccent = isCT ? '#93c5fd' : '#fcd34d';

  const markerSize = 18;
  const arrowSize = 8;
  const markerBoxSize = markerSize + arrowSize * 2;

  const isBombCarrier = hasBomb && !isDead;

  return (
    <motion.div
      initial={false}
      animate={{
        left: `${x}%`,
        top: `${y}%`,
      }}
      transition={{
        duration: shouldSnapPosition ? 0 : POSITION_TWEEN_SECONDS,
        ease: 'linear',
      }}
      className={cn(
        'absolute pointer-events-none',
        isDead ? 'opacity-35 grayscale z-0' : isObserved ? 'z-50' : 'z-10'
      )}
      style={{
        transform: 'translate(-50%, -50%)',
        willChange: 'left, top',
      }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          width: markerBoxSize,
          height: markerBoxSize,
        }}
      >
        {isBombCarrier && (
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.45, 0, 0.45],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 bg-red-600 rounded-full blur-sm"
          />
        )}

        <motion.div
          initial={false}
          animate={{ rotate: continuousRotation }}
          transition={{
            duration: shouldSnapPosition ? 0 : ROTATION_TWEEN_SECONDS,
            ease: 'linear',
          }}
          className="absolute inset-0 w-full h-full drop-shadow-md"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {!isDead && (
              <path
                d="M50,13 L64,42 L36,42 Z"
                fill={
                  isBombCarrier
                    ? '#dc2626'
                    : isObserved
                      ? '#ffffff'
                      : teamColor
                }
                stroke={
                  isBombCarrier
                    ? '#ef4444'
                    : isObserved
                      ? '#ffffff'
                      : teamAccent
                }
                strokeWidth="2"
                strokeLinejoin="round"
              />
            )}

            {!isDead && muzzleFlashKey > 0 && (
              <motion.g
                key={muzzleFlashKey}
                initial={{ opacity: 0, scale: 0.45 }}
                animate={{ opacity: [0, 1, 0], scale: [0.55, 1.15, 1.55] }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                style={{ transformOrigin: '50px 8px' }}
              >
                <path
                  d="M50,0 L55,10 L50,17 L45,10 Z"
                  fill="#fef3c7"
                  stroke="#f97316"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle
                  cx="50"
                  cy="8"
                  r="7"
                  fill="rgba(251,191,36,0.45)"
                />
              </motion.g>
            )}

            <circle
              cx="50"
              cy="52"
              r="22"
              fill={
                isDead
                  ? '#171717'
                  : isBombCarrier
                    ? '#dc2626'
                    : isObserved
                      ? '#ffffff'
                      : teamColor
              }
              stroke={
                isDead
                  ? '#404040'
                  : isBombCarrier
                    ? '#ef4444'
                    : isObserved
                      ? '#ffffff'
                      : teamAccent
              }
              strokeWidth={isObserved ? '8' : '4'}
            />
          </svg>
        </motion.div>

        {!isDead && (
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center select-none font-black tracking-tighter leading-none z-20',
              isObserved || isBombCarrier
                ? 'text-white text-[11px]'
                : 'text-white text-[10px] drop-shadow-sm',
              isObserved && !isBombCarrier ? 'text-black' : ''
            )}
          >
            {player.displayNumber}
          </span>
        )}

        {isDead && (
          <div className="absolute inset-0 flex items-center justify-center text-white/40 text-[10px] font-bold z-20">
            X
          </div>
        )}
      </div>
    </motion.div>
  );
}
