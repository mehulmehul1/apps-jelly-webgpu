import { type LookConfig, DEFAULT_LOOK_PRESET } from '../../editor/look-presets';
import { BodyPlan } from './BodyPlan';
import type { CreatureSpec } from './CreatureSpec';

export type PresetId =
  | 'combJelly'
  | 'salp'
  | 'siphonophore'
  | 'anemone'
  | 'glassSponge'
  | 'ascidia'
  | 'star'
  | 'customLab'
  | 'discJelly'
  | 'boxJelly'
  | 'seaNettle'
  | 'lobeJelly';

export interface CreaturePreset {
  id: PresetId;
  name: string;
  spec: CreatureSpec;
  look: Partial<LookConfig>;
}

export const PRESETS: Record<PresetId, CreaturePreset> = {
  combJelly: {
    id: 'combJelly',
    name: 'Comb Jelly',
    spec: {
      id: 'combJelly',
      archetypeId: 'jellyfish',
      bodyPlan: BodyPlan.CombJelly,
      features: { tail: false, mouth: false, tentacles: false },
      symmetry: { kind: 'radial', order: 8, breaking: 0.12, phase: 0.2 },
      crossSection: { kind: 'ellipse', xScale: 0.8, zScale: 1.15, rotation: 0.2, twist: 0.8 },
      spine: { kind: 'sine', ampX: 6, ampZ: 2, freq: 1.0, phase: 0.4 },
      surface: {
        ridges: { count: 8, amplitude: 0.18, tRange: [0.15, 0.85], phase: 0 },
      },
      geometry: {
        size: 44,
        ribsCount: 18,
        ribRadius: 16,
        tailRibsCount: 0,
        tentacleSegments: 0,
      },
      profiles: {
        // Egg-ish body: fat mid, tapered ends
        bulb: {
          kind: 'polyline',
          points: [
            [0.0, 0.9],
            [0.2, 1.15],
            [0.55, 1.0],
            [1.0, 0.25],
          ],
        },
        tail: { kind: 'constant', value: 0.0 },
      },
      emitters: {
        // No tentacles by default for comb jelly-ish silhouette
        tentacles: { kind: 'explicit', ribs: [] },
      },
      topology: { capTop: true },
      budget: { maxParticles: 6500 },
    },
    look: {
      // Comb Jelly - classic pink/purple bioluminescent (Medusae reference)
      bulb: {
        colorA: '#FFA9D2',
        colorB: '#70256C',
        opacity: 0.75,
        patternScale0: 1.0,
        patternScale1: 1.0,
        rimBoost: 1.0,
      },
      gel: { color: '#415AB5', opacity: 0.25 },
      tail: { opacity: 0.0, scale: 1.0, colorA: '#E4BBEE', colorB: '#241138' },
      mouth: { opacity: 0.0, scale: 1.0, colorA: '#FFFFFF', colorB: '#000000' },
      tentacle: { opacity: 0.0, area: 500, color: '#997299' },
      post: { bloomStrength: 0.2, bloomRadius: 0.4, bloomThreshold: 0.7 },
    },
  },

  salp: {
    id: 'salp',
    name: 'Salp',
    spec: {
      id: 'salp',
      archetypeId: 'jellyfish',
      // Salp - transparent barrel shape (NOT a tube like glass sponge)
      bodyPlan: BodyPlan.CombJelly,
      features: { tail: false, mouth: false, tentacles: false },
      symmetry: { kind: 'radial', order: 4, breaking: 0.12, phase: 0.0 },
      // Open top and bottom for incurrent/excurrent siphons
      topology: { capTop: false },
      // Smooth elliptical cross-section (vs glass sponge's angular)
      crossSection: { kind: 'ellipse', xScale: 1.15, zScale: 0.85, rotation: 0.0, twist: 0.2 },
      spine: { kind: 'none' },
      surface: {
        // Very subtle horizontal bands (muscle bands for jet propulsion)
        ridges: { count: 4, amplitude: 0.06, tRange: [0.2, 0.9], phase: 0.0 },
        // Smooth cells for gelatinous texture
        cells: { scale: 2.0, warp: 0.3 },
      },
      geometry: {
        // Short, wide barrel (1:1 height:width ratio) vs glass sponge's tall vase
        size: 38,
        ribsCount: 18,
        ribRadius: 22,
        tailRibsCount: 0,
        tentacleSegments: 0,
      },
      profiles: {
        // Barrel shape: wide cylinder with rounded ends
        bulb: {
          kind: 'polyline',
          points: [
            [0.0, 0.6],     // Bottom - rounded
            [0.1, 0.85],    // Lower bulge
            [0.5, 1.0],     // Middle - widest
            [0.9, 0.85],    // Upper bulge
            [1.0, 0.65],    // Top - slightly rounded
          ],
        },
        tail: { kind: 'constant', value: 0 },
      },
      emitters: {
        tentacles: { kind: 'explicit', ribs: [] },
      },
      budget: { maxParticles: 6000 },
    },
    look: {
      // Salp - transparent/cyan barrel-shaped with glass-like appearance
      bulb: {
        colorA: '#C7FFFA',
        colorB: '#2A84FF',
        opacity: 0.28,
        patternScale0: 0.9,
        patternScale1: 0.9,
        rimBoost: 1.2,
      },
      gel: { color: '#C7FFFA', opacity: 0.35 },
      tail: { opacity: 0.15, scale: 1.8, colorA: '#A8FFF1', colorB: '#05213D' },
      mouth: { opacity: 0.0, scale: 1.0, colorA: '#FFFFFF', colorB: '#000000' },
      tentacle: { opacity: 0.0, area: 500, color: '#FFFFFF' },
      post: { bloomStrength: 0.2, bloomRadius: 0.4, bloomThreshold: 0.7 },
    },
  },

  siphonophore: {
    id: 'siphonophore',
    name: 'Siphonophore',
    spec: {
      id: 'siphonophore',
      archetypeId: 'jellyfish',
      bodyPlan: BodyPlan.Siphonophore,
      features: { tail: true, mouth: true, tentacles: true },
      symmetry: { kind: 'radial', order: 10, breaking: 0.22, phase: 0.3 },
      spine: { kind: 'none' },
      geometry: {
        size: 30,
        ribsCount: 16,
        ribRadius: 14,
        tailRibsCount: 10,
        tentacleSegments: 80,
        tentacleSegmentLength: 1.4,
      },
      profiles: {
        bulb: { kind: 'legacy_bell' },
        tail: { kind: 'legacy_tail' },
      },
      emitters: {
        tentacles: { kind: 'phyllotaxis', groupCount: 5, ribRange: [3, 15], jitter: 1, golden: 1.0 },
      },
      colony: {
        count: 5,
        spacing: 34,
        scaleDecay: 0.92,
        layout: 'helix',
        helix: { radius: 22, turns: 1.25 },
      },
      budget: { maxParticles: 9000, maxTentacleGroups: 5 },
    },
    look: {
      // Standard Medusae reference values
      bulb: {
        colorA: '#FFA9D2',
        colorB: '#70256C',
        opacity: 0.75,
        patternScale0: 1.0,
        patternScale1: 1.0,
        rimBoost: 1.0,
      },
      gel: { color: '#415AB5', opacity: 0.25 },
      tail: { opacity: 0.75, scale: 20.0, colorA: '#E4BBEE', colorB: '#241138' },
      mouth: { opacity: 0.65, scale: 3.0, colorA: '#EFA6F0', colorB: '#4A67CE' },
      tentacle: { opacity: 0.25, area: 2000, color: '#997299' },
      post: { bloomStrength: 0.2, bloomRadius: 0.4, bloomThreshold: 0.7 },
    },
  },

  anemone: {
    id: 'anemone',
    name: 'Anemone Crown',
    spec: {
      id: 'anemone',
      archetypeId: 'jellyfish',
      bodyPlan: BodyPlan.Medusa,
      features: { tail: false, mouth: false, tentacles: true },
      symmetry: { kind: 'radial', order: 12, breaking: 0.18, phase: 0.0 },
      spine: { kind: 'none' },
      surface: {
        frill: { amplitude: 0.22, frequency: 18, tRange: [0.65, 1.0], phase: 0.7 },
      },
      geometry: {
        size: 38,
        ribsCount: 14,
        ribRadius: 20,
        tailRibsCount: 0,
        tailArmSegments: 0,
        tentacleSegments: 140,
        tentacleSegmentLength: 1.15,
        tentacleWeightFactor: 1.6,
      },
      profiles: {
        bulb: { kind: 'vesica', min: 0.35, max: 1.2, power: 0.8 },
        tail: { kind: 'constant', value: 0 },
      },
      emitters: {
        tentacles: { kind: 'spiral', groupCount: 6, ribRange: [6, 13], pitch: 0.9, jitter: 1 },
      },
      budget: { maxParticles: 9000, maxTentacleGroups: 6 },
    },
    look: {
      // Anemone Crown - warm orange/pink with tentacle crown
      bulb: {
        colorA: '#FFF3B0',
        colorB: '#FF4FD8',
        opacity: 0.55,
        patternScale0: 1.2,
        patternScale1: 1.6,
        rimBoost: 2.4,
      },
      gel: { color: '#FFE7FF', opacity: 0.18 },
      tail: { opacity: 0.0, scale: 2.0, colorA: '#FFFFFF', colorB: '#000000' },
      mouth: { opacity: 0.0, scale: 1.0, colorA: '#FFFFFF', colorB: '#000000' },
      tentacle: { opacity: 0.55, area: 1400, color: '#FFB7FF' },
      post: { bloomStrength: 0.2, bloomRadius: 0.4, bloomThreshold: 0.7 },
    },
  },

  glassSponge: {
    id: 'glassSponge',
    name: 'Glass Sponge',
    spec: {
      id: 'glassSponge',
      archetypeId: 'jellyfish',
      // Venus' flower basket - tall woven vase
      bodyPlan: BodyPlan.CombJelly,
      features: { tail: false, mouth: false, tentacles: false },
      symmetry: { kind: 'radial', order: 6, breaking: 0.02, phase: 0.0 },
      // Open top for the vase atrium
      topology: { capTop: false },
      // Hexagonal lattice pattern (6-rayed spicules)
      crossSection: { kind: 'superformula', rotation: 0.0, twist: 0.3, superformula: { m: 6, a: 1, b: 1, n1: 0.2, n2: 2.5, n3: 2.5 } },
      spine: { kind: 'none' },
      surface: {
        // Woven lattice pattern - intersecting diagonal ridges
        ridges: { count: 6, amplitude: 0.25, tRange: [0.0, 1.0], phase: 0.0 },
        // Cellular pattern for sponge texture
        cells: { scale: 1.4, warp: 0.15 },
      },
      geometry: {
        // Tall, narrow cylinder (2:1 height:width like real Euplectella)
        size: 72,
        ribsCount: 28,
        ribRadius: 14,
        tailRibsCount: 0,
        tentacleSegments: 0,
      },
      profiles: {
        // Tall vase: narrow base, slight flare at top (flower basket shape)
        bulb: {
          kind: 'polyline',
          points: [
            [0.0, 0.35],    // Bottom - narrow foot
            [0.15, 0.5],    // Lower section widening
            [0.5, 0.65],    // Mid section - widest
            [0.85, 0.6],    // Upper section slightly narrowing
            [1.0, 0.7],     // Top - flared rim
          ]
        },
        tail: { kind: 'constant', value: 0 },
      },
      budget: { maxParticles: 9000 },
    },
    look: {
      // Glass Sponge - crystalline/white geometric silica structure
      bulb: {
        colorA: '#C8FFF6',
        colorB: '#0A3BFF',
        opacity: 0.22,
        patternScale0: 2.1,
        patternScale1: 1.7,
        rimBoost: 2.6,
      },
      gel: { color: '#A9FFF8', opacity: 0.28 },
      tail: { opacity: 0.08, scale: 1.6, colorA: '#DAFFFB', colorB: '#001121' },
      mouth: { opacity: 0.0, scale: 1.0, colorA: '#FFFFFF', colorB: '#000000' },
      tentacle: { opacity: 0.0, area: 500, color: '#FFFFFF' },
      post: { bloomStrength: 0.2, bloomRadius: 0.4, bloomThreshold: 0.7 },
    },
  },

  ascidia: {
    id: 'ascidia',
    name: 'Ascidia Egg',
    spec: {
      id: 'ascidia',
      archetypeId: 'jellyfish',
      // Sea squirt - sac-like body with TWO SIPHONS (oral and atrial)
      bodyPlan: BodyPlan.CombJelly,
      features: { tail: false, mouth: false, tentacles: false },
      // Bilateral symmetry for the sac shape
      symmetry: { kind: 'bilateral', order: 2, breaking: 0.35, phase: 0.0 },
      // Slightly curved spine like real ascidians
      spine: { kind: 'polyline', points: [[0, -2, 0], [0.5, 0, -1], [1, 3, 0]] },
      surface: {
        // Organic wrinkled texture for leathery tunic
        cells: { scale: 3.5, warp: 0.8 },
        // Two prominent frills at top for siphons
        frill: { amplitude: 0.25, frequency: 12, tRange: [0.88, 1.0], phase: 0.0 }
      },
      geometry: {
        // Small sac-like body
        size: 28,
        ribsCount: 16,
        ribRadius: 16,
        tailRibsCount: 0,
        tentacleSegments: 0,
      },
      profiles: {
        // Sac shape: bulging middle, narrower at both ends
        // Top has two bumps for siphons
        bulb: {
          kind: 'polyline',
          points: [
            [0.0, 0.3],     // Bottom - attached base
            [0.12, 0.6],    // Lower section
            [0.35, 0.95],   // Middle bulge - widest
            [0.7, 0.85],    // Upper section
            [0.9, 0.65],    // Below siphons
            [1.0, 0.5],     // Top with siphons
          ]
        },
        tail: { kind: 'constant', value: 0 },
      },
      budget: { maxParticles: 5000 },
    },
    look: {
      // Ascidia - muted pale colors, sac-like sea squirt
      bulb: {
        colorA: '#FFB0E6',
        colorB: '#00E7FF',
        opacity: 0.48,
        patternScale0: 1.8,
        patternScale1: 2.2,
        rimBoost: 1.8,
      },
      gel: { color: '#FFFFFF', opacity: 0.12 },
      tail: { opacity: 0.0, scale: 2.0, colorA: '#FFFFFF', colorB: '#000000' },
      mouth: { opacity: 0.0, scale: 1.0, colorA: '#FFFFFF', colorB: '#000000' },
      tentacle: { opacity: 0.0, area: 500, color: '#FFFFFF' },
      post: { bloomStrength: 0.2, bloomRadius: 0.4, bloomThreshold: 0.7 },
    },
  },

  star: {
    id: 'star',
    name: 'Echinoderm Star',
    spec: {
      id: 'star',
      archetypeId: 'jellyfish',
      bodyPlan: BodyPlan.Medusa,
      features: { tail: false, mouth: false, tentacles: false },
      symmetry: { kind: 'radial', order: 5, breaking: 0.08, phase: 0.0 },
      // Sharper 5-point star cross-section (vs Anemone's smoother form)
      crossSection: { kind: 'superformula', rotation: 0.0, twist: 0.1, superformula: { m: 5, a: 1, b: 1, n1: 0.15, n2: 2.5, n3: 2.5 } },
      spine: { kind: 'none' },
      surface: {
        // Strong radial ridges creating star arms
        ridges: { count: 5, amplitude: 0.65, tRange: [0.2, 1.0], phase: 0.0 }
      },
      geometry: {
        // Flatter, wider star shape (vs Anemone's taller column)
        size: 28,
        ribsCount: 12,
        ribRadius: 26,
        tailRibsCount: 0,
        tentacleSegments: 0,
        tailArmSegments: 0,
      },
      profiles: {
        // Flattened disc shape with tapering edges (star-like)
        bulb: { kind: 'polyline', points: [[0, 0.15], [0.2, 0.95], [0.7, 1.0], [1.0, 0.4]] },
        tail: { kind: 'constant', value: 0 },
      },
      budget: { maxParticles: 6000 },
    },
    look: {
      // Echinoderm Star - green/yellow radial with spiny appearance
      bulb: {
        colorA: '#B9FFB2',
        colorB: '#FF6AE6',
        opacity: 0.5,
        patternScale0: 1.1,
        patternScale1: 1.3,
        rimBoost: 2.1,
      },
      gel: { color: '#B9FFB2', opacity: 0.18 },
      tail: { opacity: 0.0, scale: 2.0, colorA: '#FFFFFF', colorB: '#000000' },
      mouth: { opacity: 0.0, scale: 1.0, colorA: '#FFFFFF', colorB: '#000000' },
      tentacle: { opacity: 0.0, area: 500, color: '#FFFFFF' },
      post: { bloomStrength: 0.2, bloomRadius: 0.4, bloomThreshold: 0.7 },
    },
  },
  discJelly: {
    id: 'discJelly',
    name: 'Disc Jelly',
    spec: {
      id: 'discJelly',
      archetypeId: 'jellyfish',
      bodyPlan: BodyPlan.Disc,
      features: { tail: false, mouth: true, tentacles: true },
      symmetry: { kind: 'radial', order: 8, breaking: 0.08, phase: 0.0 },
      crossSection: { kind: 'circle' },
      spine: { kind: 'none' },
      geometry: {
        size: 22,
        ribsCount: 20,
        ribRadius: 32,
        tailRibsCount: 0,
        tailArmSegments: 20,
        tailArmSegmentLength: 0.6,
        tentacleSegments: 28,
        tentacleSegmentLength: 0.9,
        tentacleWeightFactor: 0.6,
      },
      profiles: {
        // Flat disc: rapid expansion at base, stays wide, thin top
        bulb: {
          kind: 'polyline',
          points: [
            [0.0, 0.25],
            [0.08, 0.85],
            [0.25, 1.0],
            [0.75, 0.95],
            [1.0, 0.3],
          ],
        },
        tail: { kind: 'constant', value: 0 },
      },
      emitters: {
        tentacles: { kind: 'phyllotaxis', groupCount: 10, ribRange: [1, 18], jitter: 0.5, golden: 0.618 },
      },
      budget: { maxParticles: 14000 },
    },
    look: {
      // Disc Jelly - pale translucent pink/blue, ethereal moon jelly
      bulb: {
        colorA: '#E8D5FF',
        colorB: '#6B8AFF',
        opacity: 0.35,
        patternScale0: 1.0,
        patternScale1: 1.2,
        rimBoost: 1.5,
      },
      gel: { color: '#D5E8FF', opacity: 0.2 },
      tail: { opacity: 0.0, scale: 1.0, colorA: '#FFFFFF', colorB: '#000000' },
      mouth: { opacity: 0.4, scale: 1.5, colorA: '#E8D5FF', colorB: '#6B8AFF' },
      tentacle: { opacity: 0.2, area: 600, color: '#B8D4FF' },
      post: { bloomStrength: 0.15, bloomRadius: 0.5, bloomThreshold: 0.6 },
    },
  },

  boxJelly: {
    id: 'boxJelly',
    name: 'Box Jelly',
    spec: {
      id: 'boxJelly',
      archetypeId: 'jellyfish',
      bodyPlan: BodyPlan.Box,
      features: { tail: false, mouth: true, tentacles: true },
      symmetry: { kind: 'radial', order: 4, breaking: 0.05, phase: 0.0 },
      crossSection: {
        kind: 'superformula',
        rotation: 0.0,
        twist: 0.15,
        superformula: { m: 4, a: 1, b: 1, n1: 0.8, n2: 8.0, n3: 8.0 },
      },
      spine: { kind: 'none' },
      surface: {
        ridges: { count: 4, amplitude: 0.12, tRange: [0.1, 0.95], phase: 0.0 },
      },
      geometry: {
        size: 38,
        ribsCount: 20,
        ribRadius: 18,
        tailRibsCount: 0,
        tailArmSegments: 30,
        tailArmSegmentLength: 0.8,
        tentacleSegments: 100,
        tentacleSegmentLength: 1.6,
        tentacleWeightFactor: 1.5,
      },
      profiles: {
        // Columnar with slight taper (box-like)
        bulb: {
          kind: 'polyline',
          points: [
            [0.0, 0.45],
            [0.1, 0.8],
            [0.35, 1.0],
            [0.7, 0.95],
            [1.0, 0.55],
          ],
        },
        tail: { kind: 'constant', value: 0 },
      },
      emitters: {
        tentacles: { kind: 'spiral', groupCount: 4, ribRange: [2, 16], pitch: 2.0, jitter: 0.3 },
      },
      budget: { maxParticles: 16000, maxTentacleGroups: 4 },
    },
    look: {
      // Box Jelly - nearly invisible pale blue, ghost-like
      bulb: {
        colorA: '#C8F0FF',
        colorB: '#1A6BFF',
        opacity: 0.2,
        patternScale0: 1.3,
        patternScale1: 1.5,
        rimBoost: 2.0,
      },
      gel: { color: '#C8F0FF', opacity: 0.15 },
      tail: { opacity: 0.0, scale: 1.0, colorA: '#FFFFFF', colorB: '#000000' },
      mouth: { opacity: 0.3, scale: 2.0, colorA: '#C8F0FF', colorB: '#1A6BFF' },
      tentacle: { opacity: 0.35, area: 1800, color: '#8DC8FF' },
      post: { bloomStrength: 0.25, bloomRadius: 0.6, bloomThreshold: 0.5 },
    },
  },

  seaNettle: {
    id: 'seaNettle',
    name: 'Sea Nettle',
    spec: {
      id: 'seaNettle',
      archetypeId: 'jellyfish',
      bodyPlan: BodyPlan.Nettle,
      features: { tail: true, mouth: true, tentacles: true },
      symmetry: { kind: 'radial', order: 8, breaking: 0.15, phase: 0.1 },
      crossSection: { kind: 'circle' },
      spine: { kind: 'none' },
      surface: {
        ridges: { count: 8, amplitude: 0.08, tRange: [0.15, 0.8], phase: 0.3 },
      },
      geometry: {
        size: 52,
        ribsCount: 22,
        ribRadius: 18,
        tailRibsCount: 8,
        tailArmSegments: 80,
        tailArmSegmentLength: 1.2,
        tentacleSegments: 140,
        tentacleSegmentLength: 1.3,
        tentacleWeightFactor: 1.2,
      },
      profiles: {
        // Tall dome: narrow base, widest at mid-shoulder, domed top
        bulb: {
          kind: 'polyline',
          points: [
            [0.0, 0.4],
            [0.1, 0.6],
            [0.3, 0.9],
            [0.55, 1.0],
            [0.8, 0.85],
            [1.0, 0.3],
          ],
        },
        tail: { kind: 'constant', value: 0.3 },
      },
      emitters: {
        tentacles: { kind: 'phyllotaxis', groupCount: 12, ribRange: [2, 18], jitter: 1.0, golden: 1.0 },
      },
      budget: { maxParticles: 60000, maxTentacleGroups: 12 },
    },
    look: {
      // Sea Nettle - warm golden/reddish with white stripes
      bulb: {
        colorA: '#FFD699',
        colorB: '#CC4422',
        opacity: 0.5,
        patternScale0: 1.4,
        patternScale1: 0.8,
        rimBoost: 1.8,
      },
      gel: { color: '#FFD699', opacity: 0.2 },
      tail: { opacity: 0.6, scale: 18.0, colorA: '#FFE4B5', colorB: '#8B2500' },
      mouth: { opacity: 0.5, scale: 2.5, colorA: '#FFE4B5', colorB: '#8B2500' },
      tentacle: { opacity: 0.3, area: 2200, color: '#FFCC88' },
      post: { bloomStrength: 0.2, bloomRadius: 0.4, bloomThreshold: 0.7 },
    },
  },

  lobeJelly: {
    id: 'lobeJelly',
    name: 'Lobe Jelly',
    spec: {
      id: 'lobeJelly',
      archetypeId: 'jellyfish',
      bodyPlan: BodyPlan.LobeJelly,
      features: { tail: true, mouth: true, tentacles: false },
      symmetry: { kind: 'radial', order: 4, breaking: 0.2, phase: 0.0 },
      crossSection: { kind: 'ellipse', xScale: 1.1, zScale: 0.9, rotation: 0.0, twist: 0.3 },
      spine: { kind: 'none' },
      surface: {
        cells: { scale: 2.5, warp: 0.4 },
      },
      geometry: {
        size: 36,
        ribsCount: 18,
        ribRadius: 20,
        tailRibsCount: 6,
        tailArmSegments: 60,
        tailArmSegmentLength: 1.0,
        tentacleSegments: 0,
      },
      profiles: {
        // Bilobed egg: two bulges with a waist dip
        bulb: {
          kind: 'polyline',
          points: [
            [0.0, 0.35],
            [0.12, 0.75],
            [0.25, 0.55],
            [0.45, 0.85],
            [0.65, 1.0],
            [0.85, 0.8],
            [1.0, 0.45],
          ],
        },
        tail: { kind: 'constant', value: 0 },
      },
      emitters: {
        tentacles: { kind: 'explicit', ribs: [] },
      },
      budget: { maxParticles: 8000 },
    },
    look: {
      // Lobe Jelly - deep purple/violet, rich colors
      bulb: {
        colorA: '#E0A0FF',
        colorB: '#4A0080',
        opacity: 0.45,
        patternScale0: 1.2,
        patternScale1: 1.8,
        rimBoost: 2.2,
      },
      gel: { color: '#D5A0FF', opacity: 0.2 },
      tail: { opacity: 0.55, scale: 14.0, colorA: '#E0A0FF', colorB: '#3A0060' },
      mouth: { opacity: 0.5, scale: 2.0, colorA: '#E0A0FF', colorB: '#3A0060' },
      tentacle: { opacity: 0.0, area: 500, color: '#FFFFFF' },
      post: { bloomStrength: 0.25, bloomRadius: 0.5, bloomThreshold: 0.6 },
    },
  },

  customLab: {
    id: 'customLab',
    name: 'Custom (Lab)',
    spec: {
      id: 'customLab',
      archetypeId: 'jellyfish',
      bodyPlan: BodyPlan.CombJelly,
      features: { tail: false, mouth: false, tentacles: false },
      geometry: { size: 40, ribsCount: 16, ribRadius: 15, tailRibsCount: 0, tentacleSegments: 0 },
      profiles: { bulb: { kind: 'constant', value: 1 }, tail: { kind: 'constant', value: 0 } },
      emitters: { tentacles: { kind: 'explicit', ribs: [] } },
      budget: { maxParticles: 6000 },
    },
    look: DEFAULT_LOOK_PRESET,
  },
};
