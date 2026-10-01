import { MapConfig, getMapConfig } from './loadMapConfig';
import { Vector3 } from './parsePosition';

export interface MapAssets {
  image: string;
  config: MapConfig;
  isLower?: boolean;
}

export function resolveMapAssets(mapName: string, playerPos?: Vector3 | null): MapAssets | null {
  const config = getMapConfig(mapName);
  if (!config) return null;

  const mapFolder = `${import.meta.env.BASE_URL}maps/${config.map}`;
  let image = `${mapFolder}/${config.image}`;
  let isLower = false;

  // Handle multi-level maps like Nuke
  if (config.map === 'de_nuke' && playerPos && config.lower_image) {
    const lowerSection = config.verticalsections?.lower;
    if (lowerSection && playerPos.z <= lowerSection.AltitudeMax) {
      image = `${mapFolder}/${config.lower_image}`;
      isLower = true;
    }
  }

  return {
    image,
    config,
    isLower
  };
}
