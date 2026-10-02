import { MapConfig, getMapConfig } from './loadMapConfig';

export interface MapAssets {
  image: string;
  lowerImage?: string;
  config: MapConfig;
}

export function resolveMapAssets(mapName: string): MapAssets | null {
  const config = getMapConfig(mapName);
  if (!config) return null;

  const mapFolder = `${import.meta.env.BASE_URL}maps/${config.map}`;

  return {
    image: `${mapFolder}/${config.image}`,
    lowerImage: config.lower_image
      ? `${mapFolder}/${config.lower_image}`
      : undefined,
    config,
  };
}
