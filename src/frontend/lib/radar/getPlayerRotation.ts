/**
 * Extracts and calculates player rotation in degrees from various GSI fields.
 * Higher priority is given to view angles/yaw if available.
 */
export function getPlayerRotation(player: any): number {
  if (!player) return 0;

  const debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugRadar') === 'true';

  let rotation = 0;
  let source = 'none';

  // 1. Check for explicit yaw/angle fields (most direct)
  const yawCandidate = 
    player.state?.yaw ?? 
    player.state?.angle ?? 
    player.angle ?? 
    player.viewAngle;

  if (typeof yawCandidate === 'number') {
    rotation = yawCandidate;
    source = 'explicit number';
  } else if (typeof yawCandidate === 'string') {
    rotation = parseFloat(yawCandidate);
    source = 'explicit string';
  }
  // 2. Check for view_angle vector or string
  else {
    const viewAngle = player.state?.view_angle || player.view_angle;
    if (viewAngle) {
       const parsed = parseDirectionValue(viewAngle);
       if (parsed !== null) {
         rotation = parsed;
         source = 'view_angle';
       }
    }
  }

  // 3. Check for orientation/forward vector (fallback)
  if (source === 'none') {
    const forward = player.forward || player.orientation;
    if (forward) {
      const parsed = parseDirectionValue(forward, true); // true means it's a vector [x, y]
      if (parsed !== null) {
        rotation = parsed;
        source = 'forward/orientation vector';
      }
    }
  }

  if (debug) {
    console.log(`[RadarDebug] Player: ${player.name}`, {
      rawFields: {
        forward: player.forward,
        orientation: player.orientation,
        angle: player.angle,
        view_angle: player.view_angle,
        viewAngle: player.viewAngle,
        state: player.state
      },
      finalRotation: rotation,
      source
    });
  }

  return rotation;
}

/**
 * Parses a value into degrees. 
 * If it's a vector [x, y] or string "x, y", it calculates atan2.
 * If it's a single value, it parses as float.
 */
function parseDirectionValue(val: any, isVector = false): number | null {
  if (val === undefined || val === null) return null;

  let x: number | null = null;
  let y: number | null = null;

  // Object {x, y}
  if (typeof val === 'object' && 'x' in val && 'y' in val) {
    x = Number(val.x);
    y = Number(val.y);
  }
  // Array [x, y]
  else if (Array.isArray(val)) {
    x = Number(val[0]);
    y = Number(val[1]);
  }
  // String "x, y" or "angle"
  else if (typeof val === 'string') {
    if (val.includes(',')) {
      const parts = val.split(',').map(p => p.trim());
      x = Number(parts[0]);
      y = Number(parts[1]);
    } else {
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    }
  }
  // Single number
  else if (typeof val === 'number') {
    return val;
  }

  if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) {
    // If it's a direction vector (like forward), we need 90 - atan2
    // If it's an [angle, pitch] array (sometimes view_angle is sent this way), the first is yaw.
    if (isVector) {
      const gsiAngle = Math.atan2(y, x) * (180 / Math.PI);
      return 90 - gsiAngle;
    } else {
      // If it's [yaw, pitch], yaw is usually the first element
      return x;
    }
  }

  return null;
}
