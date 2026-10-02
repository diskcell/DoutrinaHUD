import { Vector3 } from './parsePosition';
import { MapConfig } from './loadMapConfig';

export interface RadarCoord {
  x: number;
  y: number;
  outOfBounds?: boolean;
}

const DEFAULT_IMAGE_SIZE = 1024;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function worldToRadar(
  pos: Vector3,
  config: MapConfig,
  imageSizeOverride?: number,
): RadarCoord {
  const { pos_x, pos_y, scale } = config;

  if (
    typeof pos.x !== 'number' ||
    typeof pos.y !== 'number' ||
    Number.isNaN(pos.x) ||
    Number.isNaN(pos.y) ||
    !pos_x ||
    !pos_y ||
    !scale
  ) {
    return { x: 50, y: 50, outOfBounds: true };
  }

  const imageSize = imageSizeOverride || config.image_size || DEFAULT_IMAGE_SIZE;

  const radarPixelX = (pos.x - pos_x) / scale;
  const radarPixelY = (pos_y - pos.y) / scale;

  const pctXRaw = (radarPixelX / imageSize) * 100;
  const pctYRaw = (radarPixelY / imageSize) * 100;

  const outOfBounds =
    pctXRaw < 0 || pctXRaw > 100 || pctYRaw < 0 || pctYRaw > 100;

  return {
    x: clamp(pctXRaw),
    y: clamp(pctYRaw),
    outOfBounds,
  };
}
