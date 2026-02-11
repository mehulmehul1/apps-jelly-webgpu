export interface LookConfig {
  scene: {
    background: string;
  };
  camera: {
    distance: number;
    autoRotateSpeed: number;
  };
  pulse: {
    speed: number;
    amplitude: number;
  };
  bulb: {
    colorA: string;
    colorB: string;
    opacity: number;
    patternScale0: number;
    patternScale1: number;
    rimBoost: number;
  };
  gel: {
    color: string;
    opacity: number;
  };
  tail: {
    colorA: string;
    colorB: string;
    opacity: number;
    scale: number;
  };
  mouth: {
    colorA: string;
    colorB: string;
    opacity: number;
    scale: number;
  };
  tentacle: {
    color: string;
    opacity: number;
    area: number;
  };
  dust: {
    color: string;
    opacity: number;
    size: number;
    scale: number;
    area: number;
    count: number;
  };
  post: {
    bloomStrength: number;
    bloomRadius: number;
    bloomThreshold: number;
    lensDirtOpacity: number;
    lensDirtFadeRate: number;
    lensDirtSpawnSpread: number;
    lensDirtMaxScale: number;
    vignetteDarkness: number;
    vignetteOffset: number;
    vignetteColor: string;
  };
}

export const DEFAULT_LOOK_PRESET: LookConfig = {
  scene: {
    background: '#0A060E',
  },
  camera: {
    distance: 120,
    autoRotateSpeed: 0.001,
  },
  pulse: {
    speed: 0.5,
    amplitude: 0.15,
  },
  bulb: {
    colorA: '#FFA9D2',
    colorB: '#70256C',
    opacity: 0.75,
    patternScale0: 1.0,
    patternScale1: 1.0,
    rimBoost: 1.0,
  },
  gel: {
    color: '#415AB5',
    opacity: 0.25,
  },
  tail: {
    colorA: '#E4BBEE',
    colorB: '#241138',
    opacity: 0.75,
    scale: 20.0,
  },
  mouth: {
    colorA: '#EFA6F0',
    colorB: '#4A67CE',
    opacity: 0.65,
    scale: 3.0,
  },
  tentacle: {
    color: '#997299',
    opacity: 0.25,
    area: 2000,
  },
  dust: {
    color: '#FFFFFF',
    opacity: 0.95,
    size: 32,
    scale: 150,
    area: 300,
    count: 8000,
  },
  post: {
    bloomStrength: 0.2,
    bloomRadius: 0.4,
    bloomThreshold: 0.7,
    lensDirtOpacity: 0.5,
    lensDirtFadeRate: 0.995,
    lensDirtSpawnSpread: 0.5,
    lensDirtMaxScale: 0.15,
    vignetteDarkness: 0.5,
    vignetteOffset: 1.25,
    vignetteColor: '#07070C',
  },
};

export function cloneLookConfig(config: LookConfig): LookConfig {
  return JSON.parse(JSON.stringify(config)) as LookConfig;
}

export function applyLookPreset(target: LookConfig, preset: Partial<LookConfig>): LookConfig {
  if (preset.scene) {
    Object.assign(target.scene, preset.scene);
  }
  if (preset.camera) {
    Object.assign(target.camera, preset.camera);
  }
  if (preset.pulse) {
    Object.assign(target.pulse, preset.pulse);
  }
  if (preset.bulb) {
    Object.assign(target.bulb, preset.bulb);
  }
  if (preset.gel) {
    Object.assign(target.gel, preset.gel);
  }
  if (preset.tail) {
    Object.assign(target.tail, preset.tail);
  }
  if (preset.mouth) {
    Object.assign(target.mouth, preset.mouth);
  }
  if (preset.tentacle) {
    Object.assign(target.tentacle, preset.tentacle);
  }
  if (preset.dust) {
    Object.assign(target.dust, preset.dust);
  }
  if (preset.post) {
    Object.assign(target.post, preset.post);
  }
  return target;
}
