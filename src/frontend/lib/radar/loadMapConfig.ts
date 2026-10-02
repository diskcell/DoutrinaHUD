export interface MapConfig {
  map: string;
  image: string;
  lower_image?: string;
  image_size?: number;
  lower_image_size?: number;
  pos_x: number;
  pos_y: number;
  scale: number;
  rotate?: number;
  zoom?: number;
  inset_left?: number;
  inset_top?: number;
  inset_right?: number;
  inset_bottom?: number;
  spawns?: {
    ct: { x: number, y: number },
    t: { x: number, y: number }
  };
  bombsites?: {
    A: { x: number, y: number } | null,
    B: { x: number, y: number } | null
  };
  verticalsections?: {
    [key: string]: {
      AltitudeMax: number,
      AltitudeMin: number
    }
  };
}

const MAP_CONFIGS: Record<string, MapConfig> = {
  "de_inferno": {
    "map": "de_inferno",
    "image": "radar.png",
    "pos_x": -2087,
    "pos_y": 3870,
    "scale": 4.9,
    "rotate": 0,
    "zoom": 0,
    "inset_left": 0,
    "inset_top": 0,
    "inset_right": 0,
    "inset_bottom": 0,
    "spawns": {
      "ct": { "x": 0.9, "y": 0.35 },
      "t": { "x": 0.1, "y": 0.67 }
    },
    "bombsites": {
      "A": { "x": 0.81, "y": 0.69 },
      "B": { "x": 0.49, "y": 0.22 }
    }
  },
  "de_mirage": {
    "map": "de_mirage",
    "image": "radar.png",
    "pos_x": -3230,
    "pos_y": 1713,
    "scale": 5.0,
    "rotate": 0,
    "zoom": 0,
    "inset_left": 0.135,
    "inset_top": 0.08,
    "inset_right": 0.105,
    "inset_bottom": 0.08,
    "spawns": {
      "ct": { "x": 0.28, "y": 0.70 },
      "t": { "x": 0.87, "y": 0.36 }
    },
    "bombsites": {
      "A": { "x": 0.54, "y": 0.76 },
      "B": { "x": 0.23, "y": 0.28 }
    }
  },
  "de_nuke": {
    "map": "de_nuke",
    "image": "radar.png",
    "lower_image": "radar_lower.webp",
    "image_size": 1024,
    "lower_image_size": 1000,
    "pos_x": -3453,
    "pos_y": 2887,
    "scale": 7,
    "rotate": 0,
    "zoom": 0,
    "inset_left": 0.33,
    "inset_top": 0.2,
    "inset_right": 0.2,
    "inset_bottom": 0.2,
    "spawns": {
      "ct": { "x": 0.82, "y": 0.45 },
      "t": { "x": 0.19, "y": 0.54 }
    },
    "bombsites": {
      "A": { "x": 0.58, "y": 0.48 },
      "B": { "x": 0.58, "y": 0.58 }
    },
    "verticalsections": {
      "default": {
        "AltitudeMax": 10000,
        "AltitudeMin": -495
      },
      "lower": {
        "AltitudeMax": -495,
        "AltitudeMin": -10000
      }
    }
  },
  "de_ancient": {
    "map": "de_ancient",
    "image": "radar.png",
    "pos_x": -2953,
    "pos_y": 2164,
    "scale": 5,
    "rotate": 0,
    "zoom": 0,
    "inset_left": 0,
    "inset_top": 0,
    "inset_right": 0,
    "inset_bottom": 0,
    "spawns": {
      "ct": { "x": 0.51, "y": 0.17 },
      "t": { "x": 0.485, "y": 0.87 }
    },
    "bombsites": {
      "A": { "x": 0.31, "y": 0.25 },
      "B": { "x": 0.80, "y": 0.40 }
    }
  },
  "de_anubis": {
    "map": "de_anubis",
    "image": "radar.png",
    "pos_x": -2796,
    "pos_y": 3328,
    "scale": 5.22,
    "rotate": 0,
    "zoom": 0,
    "inset_left": 0,
    "inset_top": 0,
    "inset_right": 0,
    "inset_bottom": 0,
    "spawns": {
      "ct": { "x": 0.61, "y": 0.22 },
      "t": { "x": 0.58, "y": 0.93 }
    },
    "bombsites": {
      "A": null,
      "B": null
    }
  },
  "de_dust2": {
    "map": "de_dust2",
    "image": "radar.png",
    "pos_x": -2476,
    "pos_y": 3239,
    "scale": 4.4,
    "rotate": 1,
    "zoom": 1.1,
    "inset_left": 0,
    "inset_top": 0,
    "inset_right": 0,
    "inset_bottom": 0,
    "spawns": {
      "ct": { "x": 0.62, "y": 0.21 },
      "t": { "x": 0.39, "y": 0.91 }
    },
    "bombsites": {
      "A": { "x": 0.80, "y": 0.16 },
      "B": { "x": 0.21, "y": 0.12 }
    }
  },
  "de_overpass": {
    "map": "de_overpass",
    "image": "radar.png",
    "pos_x": -4831,
    "pos_y": 1781,
    "scale": 5.2,
    "rotate": 0,
    "zoom": 0,
    "inset_left": 0,
    "inset_top": 0,
    "inset_right": 0,
    "inset_bottom": 0,
    "spawns": {
      "ct": { "x": 0.49, "y": 0.2 },
      "t": { "x": 0.66, "y": 0.93 }
    },
    "bombsites": {
      "A": { "x": 0.55, "y": 0.23 },
      "B": { "x": 0.7, "y": 0.31 }
    }
  }
};

export function getMapConfig(mapName: string): MapConfig | null {
  if (!mapName || typeof mapName !== 'string') return null;
  // Normalize map name (sometimes GSI sends workshop names or paths)
  const name = mapName.split('/').pop() || '';
  return MAP_CONFIGS[name] || null;
}
