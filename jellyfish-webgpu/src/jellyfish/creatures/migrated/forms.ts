import type { FormDefinition } from '../../graph/FormDefinition';
import type { CreatureGraph } from '../../graph/CreatureGraph';

export const COMB_JELLY_FORM: FormDefinition = {
    id: 'comb_jelly_bell',
    name: 'Comb Jelly Bell',
    category: 'Body',
    geometry: {
        profile: { kind: 'legacy_bell' },
        crossSection: { m: 8, n1: 0.2, n2: 1.5, n3: 1.5, a: 1, b: 1 },
        spine: { kind: 'none' },
        scale: { x: 1, y: 1, z: 1 }
    },
    material: {
        colorA: 0xff00ff,
        colorB: 0x00ffff,
        glow: 0.8,
        roughness: 0.1,
        transmission: 0.95,
        ior: 1.3
    },
    sockets: {}
};

export const MOON_JELLY_FORM: FormDefinition = {
    id: 'moon_jelly_bell',
    name: 'Moon Jelly Bell',
    category: 'Body',
    geometry: {
        profile: { kind: 'legacy_bell' },
        crossSection: { m: 4, n1: 1, n2: 1, n3: 1, a: 1, b: 1 }, // Circle-ish
        spine: { kind: 'none' },
        scale: { x: 1, y: 0.6, z: 1 } // Flatter
    },
    emitter: {
        kind: 'hair',
        count: 200,
        length: 20,
        segments: 5
    },
    material: {
        colorA: 0xffffff,
        colorB: 0xaa00ff,
        glow: 0.5,
        roughness: 0.4,
        transmission: 0.8,
        ior: 1.4
    },
    sockets: {}
};

// Siphonophore Bell (Small unit)
export const SIPHONOPHORE_UNIT_FORM: FormDefinition = {
    id: 'siph_unit',
    name: 'Siphonophore Bell',
    category: 'ColonyBase',
    geometry: {
        profile: { kind: 'legacy_tail' }, // Cone shape
        crossSection: { m: 3, n1: 1, n2: 1, n3: 1, a: 1, b: 1 },
        spine: { kind: 'none' },
        scale: { x: 0.5, y: 0.5, z: 0.5 }
    },
    material: {
        colorA: 0xffaa00,
        colorB: 0xff4400,
        glow: 1.0,
        roughness: 0.2,
        transmission: 0.9,
        ior: 1.5
    },
    sockets: {}
};

export const COMB_JELLY_GRAPH: CreatureGraph = {
    root: {
        id: 'root',
        type: 'Part',
        formId: 'comb_jelly_bell',
        children: []
    }
};

export const MOON_JELLY_GRAPH: CreatureGraph = {
    root: {
        id: 'root',
        type: 'Part',
        formId: 'moon_jelly_bell',
        children: []
    }
};

export const SIPHONOPHORE_GRAPH: CreatureGraph = {
    root: {
        id: 'root',
        type: 'Distributor',
        targetFormId: 'siph_unit',
        placement: { // Dummy placement for root distributor
            socket: 'none',
            offset: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: 1
        },
        distribution: {
            mode: 'Line',
            count: 10,
            start: 0,
            end: 1,
            scaleVariance: 0.2
        },
        children: [] // No children attached to the units yet
    }
};

export const MIGRATED_FORMS = [COMB_JELLY_FORM, MOON_JELLY_FORM, SIPHONOPHORE_UNIT_FORM];
