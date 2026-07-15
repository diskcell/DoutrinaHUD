export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Parses CS2 GSI position which can be:
 * - string "x, y, z"
 * - array [x, y, z]
 * - object { x, y, z }
 */
export function parsePosition(pos: any): Vector3 | null {
  if (!pos) return null;

  // Case: Object { x, y, z }
  if (typeof pos === 'object' && 'x' in pos && 'y' in pos) {
    return {
      x: Number(pos.x),
      y: Number(pos.y),
      z: Number(pos.z || 0)
    };
  }

  // Case: Array [x, y, z]
  if (Array.isArray(pos)) {
    return {
      x: Number(pos[0]),
      y: Number(pos[1]),
      z: Number(pos[2] || 0)
    };
  }

  // Case: String "x, y, z"
  if (typeof pos === 'string') {
    const parts = pos.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      return {
        x: Number(parts[0]),
        y: Number(parts[1]),
        z: Number(parts[2] || 0)
      };
    }
  }

  return null;
}

/**
 * Parses CS2 GSI forward vector and returns rotation in degrees.
 * Returns 0 if invalid.
 */
export function parseOrientation(forward: any): number {
  if (!forward) return 0;

  let x = 0;
  let y = 0;

  if (typeof forward === 'object' && 'x' in forward && 'y' in forward) {
    x = Number(forward.x);
    y = Number(forward.y);
  } else if (Array.isArray(forward)) {
    x = Number(forward[0]);
    y = Number(forward[1]);
  } else if (typeof forward === 'string') {
    const parts = forward.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      x = Number(parts[0]);
      y = Number(parts[1]);
    }
  }

  if (isNaN(x) || isNaN(y)) return 0;

  // In CS2: X is East/West, Y is North/South.
  // Standard atan2(y, x) gives 0 at East (1, 0) and 90 at North (0, 1).
  // In CSS, 0 is Up (North) and 90 is Right (East).
  // So: CSS_angle = 90 - (GSI_angle)
  const gsiAngle = Math.atan2(y, x) * (180 / Math.PI);
  return 90 - gsiAngle;
}
