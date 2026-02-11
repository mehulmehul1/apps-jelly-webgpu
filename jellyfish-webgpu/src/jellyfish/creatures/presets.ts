import { type LookConfig, DEFAULT_LOOK_PRESET } from '../../editor/look-presets';
import { BodyPlan } from './BodyPlan';
import type { CreatureSpec } from './CreatureSpec';

export type ArchetypeId =
  | 'combJelly'
  | 'salp'
  | 'siphonophore'
  | 'anemone'
  | 'glassSponge'
  | 'ascidia'
  | 'star'
  | 'customLab';

export interface ArchetypePreset {
  id: ArchetypeId;
  name: string;
  spec: CreatureSpec;
  look: Partial<LookConfig>;
}

export const ARCHETYPES: Record<ArchetypeId, ArchetypePreset> = {
  combJelly: {
    id: 'combJelly',
    name: 'Comb Jelly',
    spec: {
      id: 'combJelly',
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
  customLab: {
    id: 'customLab',
    name: 'Custom (Lab)',
    spec: {
      id: 'customLab',
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
