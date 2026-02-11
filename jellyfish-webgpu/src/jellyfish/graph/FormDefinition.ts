import * as THREE from 'three';
import type { RadiusProfileCurve } from '../creatures/RadiusProfileCurve';
import type { SpineCurve } from '../creatures/SpineCurve';
import type { SocketDefinition } from './Socket';

/**
 * Superformula parameters for 2D cross-sections.
 * r = ( |cos(m*phi/4)/a|^n2 + |sin(m*phi/4)/b|^n3 ) ^ (-1/n1)
 */
export interface SuperformulaConfig {
    m: number;  // Rotational symmetry (e.g., 5 for star, 6 for hex)
    n1: number; // Shape hardness
    n2: number; // Shape bulge
    n3: number; // Shape pinch
    a: number;  // X-axis scale
    b: number;  // Z-axis scale
}

export type FormCategory = 'Body' | 'Appendage' | 'ColonyBase' | 'Emitter';

/**
 * A FormDefinition is a reusable "Part" or "Vessel" design.
 * It does not exist in the world until instantiated as a Node.
 */
export interface FormDefinition {
    id: string;
    name: string;
    category: FormCategory;

    geometry: {
        /** 2D radius profile (Radius along Spine) */
        profile: RadiusProfileCurve;

        /** 2D cross-section shape */
        crossSection: SuperformulaConfig;

        /** 3D spine/axis definition */
        spine: SpineCurve;

        /** Base scale factors */
        scale: { x: number; y: number; z: number };
    };

    /**
     * Material / Shader configuration
     */
    material: {
        colorA: number; // Hex
        colorB: number;
        glow: number;
        roughness: number;
        transmission: number;
        ior: number;
    };

    /**
     * Usage:
     * sockets['rim'] = { type: 'rib', perRib: true }
     * sockets['tip'] = { type: 'tip' }
     */
    sockets: Record<string, SocketDefinition>;

    /**
     * Optional particle emitter configuration (for legacy tentacles/hair)
     */
    emitter?: {
        kind: 'hair' | 'tentacles';
        count: number;
        length: number;
        segments: number;
    };

    /**
     * Physics & Animation tuning
     */
    physics?: {
        stiffness?: number;
        damping?: number;
        gravity?: number;
        anchorOffset?: number; // 0 = top, 1 = bottom
        pulseAmplitude?: number;
        pulseWave?: number;    // 0 = uniform pulse, > 0 = peristaltic wave offset
    };
}
