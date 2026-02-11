import * as THREE from 'three';
import type { FormDefinition, SuperformulaConfig } from '../graph/FormDefinition';
import type { SpineCurve } from '../creatures/SpineCurve';
import { evalRadiusProfile } from '../creatures/RadiusProfileCurve';

export interface GeneratedForm {
    geometry: THREE.BufferGeometry;
    particles: Float32Array;
    ribPath: THREE.CurvePath<THREE.Vector3>[];
    constraints: {
        rings: { indices: number[], initialDistances: number[] }[];
        verticals: { indices: number[], initialDistances: number[] }[];
        radials: { indices: number[], initialDistances: number[] }[];
        spine: { indices: number[], initialDistances: number[] }[]; // Center-to-center vertical
        axis: { indices: number[] }; // For Particulate.AxisConstraint
        anchors: { top: number, mid: number, bottom: number };
    };
    ribs: { start: number, count: number, radius: number, v: number }[]; // For pulsing
}

// Helper: Evaluate Superformula for a given angle phi
function evalSuperformula(phi: number, config: SuperformulaConfig): number {
    const { m, n1, n2, n3, a, b } = config;
    if (m === 0) return 1; // Safety

    const cosTerm = Math.pow(Math.abs(Math.cos(m * phi / 4) / a), n2);
    const sinTerm = Math.pow(Math.abs(Math.sin(m * phi / 4) / b), n3);

    // r = (cosTerm + sinTerm)^(-1/n1)
    return Math.pow(cosTerm + sinTerm, -1 / n1);
}

// Helper: Evaluate Spine Position & Frame
function evalSpine(t: number, config: SpineCurve): { position: THREE.Vector3; tangent: THREE.Vector3; binormal: THREE.Vector3; normal: THREE.Vector3 } {
    // t goes 0 (top/start) to 1 (bottom/end)
    const pos = new THREE.Vector3(0, 0, 0);
    const tangent = new THREE.Vector3(0, -1, 0); // Default down
    const normal = new THREE.Vector3(1, 0, 0);
    const binormal = new THREE.Vector3(0, 0, 1);

    const H = 20; // Base height

    if (config.kind === 'none' || !config.kind) {
        // Straight line downwards
        pos.y = (0.5 - t) * H;
    } else if (config.kind === 'sine') {
        // Sine wave
        // x = amp * sin(freq * t * PI2)
        const angle = t * Math.PI * 2 * config.freq;
        pos.x = config.ampX * Math.sin(angle);
        pos.z = config.ampZ * Math.cos(angle); // Spiral helix? Or just 2D sine?
        // Let's do simple planar sine if ampZ is 0, or helix if both present.

        pos.y = (0.5 - t) * H;

        // Approximate tangent (derivative)
        // dx/dt = amp * freq * 2PI * cos(...)
        const dx = config.ampX * Math.PI * 2 * config.freq * Math.cos(angle);
        const dz = -config.ampZ * Math.PI * 2 * config.freq * Math.sin(angle);
        const dy = -H; // constant derivative of y

        tangent.set(dx, dy, dz).normalize();
    } else if (config.kind === 'helix') {
        const turns = config.turns;
        const radius = config.radius;
        const angle = t * Math.PI * 2 * turns;

        pos.x = Math.cos(angle) * radius;
        pos.z = Math.sin(angle) * radius;
        pos.y = (0.5 - t) * H;

        // Derivative
        const dx = -Math.sin(angle) * radius * Math.PI * 2 * turns;
        const dz = Math.cos(angle) * radius * Math.PI * 2 * turns;
        const dy = -H;
        tangent.set(dx, dy, dz).normalize();
    }

    // Compute frame using Frenet-Serret approx or simple Up-vector
    // Standard "Up" is +X? Or +Z? 
    // Tangent is roughly -Y.
    // Let's use specific generic up unless tangent is parallel.
    let up = new THREE.Vector3(0, 0, 1);
    if (Math.abs(tangent.dot(up)) > 0.9) up.set(1, 0, 0);

    normal.crossVectors(tangent, up).normalize();
    binormal.crossVectors(tangent, normal).normalize();
    // Recompute normal to be orthogonal
    normal.crossVectors(binormal, tangent);

    return { position: pos, tangent, binormal, normal };
}

export class GeometryGenerator {

    /**
     * Generates a generative mesh based on Form Definition.
     */
    public generate(form: FormDefinition): GeneratedForm {
        const { profile, crossSection, spine, scale } = form.geometry;

        // Resolution settings
        const radialSegments = 64;
        const heightSegments = 32;

        const indices: number[] = [];
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];

        // Physics tracking
        const ringConstraints: { indices: number[], initialDistances: number[] }[] = [];
        const verticalConstraints: { indices: number[], initialDistances: number[] }[] = [];
        const radialConstraints: { indices: number[], initialDistances: number[] }[] = [];
        const spineConstraints: { indices: number[], initialDistances: number[] }[] = [];
        const spineIndices: number[] = [];
        const ribs: { start: number, count: number, radius: number, v: number }[] = [];

        // Generate vertices
        for (let y = 0; y <= heightSegments; y++) {
            const v = y / heightSegments; // 0 (top) to 1 (bottom)

            const radiusScale = evalRadiusProfile(profile, v);
            const frame = evalSpine(v, spine);

            // 1. Add Center (Spine) Vertex for this ring
            const centerIndex = vertices.length / 3;
            vertices.push(frame.position.x, frame.position.y, frame.position.z);
            normals.push(frame.tangent.x, frame.tangent.y, frame.tangent.z);
            uvs.push(0.5, v);
            spineIndices.push(centerIndex);

            const radIndices: number[] = [];
            const radDistances: number[] = [];

            for (let x = 0; x <= radialSegments; x++) {
                const u = x / radialSegments;
                const phi = u * Math.PI * 2;

                const rBase = evalSuperformula(phi, crossSection);
                const r = rBase * radiusScale * 10;

                const localX = r * Math.cos(phi) * scale.x;
                const localZ = r * Math.sin(phi) * scale.z;

                const px = frame.position.x + localX * frame.normal.x + localZ * frame.binormal.x;
                const py = frame.position.y + localX * frame.normal.y + localZ * frame.binormal.y;
                const pz = frame.position.z + localX * frame.normal.z + localZ * frame.binormal.z;

                vertices.push(px, py, pz);

                const vNormal = new THREE.Vector3(px, py, pz).sub(frame.position).normalize();
                normals.push(vNormal.x, vNormal.y, vNormal.z);
                uvs.push(u, v);

                // Create radial constraint from center to this point
                const pointIndex = vertices.length / 3 - 1;
                // Physics Index handles the seam: if x is at the end, use the particle at the start (overlap)
                const pIndex = (x === radialSegments) ? (pointIndex - radialSegments) : pointIndex;
                radIndices.push(centerIndex, pIndex);
                radDistances.push(new THREE.Vector3(px, py, pz).distanceTo(frame.position));
            }

            radialConstraints.push({ indices: radIndices, initialDistances: radDistances });

            // Horizontal ring constraints
            const ringStart = centerIndex + 1;
            const ringIndices: number[] = [];
            const ringDistances: number[] = [];

            for (let x = 0; x < radialSegments; x++) {
                const a = ringStart + x;
                const b = (x === radialSegments - 1) ? ringStart : (a + 1); // Wrap around for physics seam

                ringIndices.push(a, b);

                const va = new THREE.Vector3(vertices[a * 3], vertices[a * 3 + 1], vertices[a * 3 + 2]);
                const vb = new THREE.Vector3(vertices[b * 3], vertices[b * 3 + 1], vertices[b * 3 + 2]);
                ringDistances.push(va.distanceTo(vb));
            }

            ringConstraints.push({ indices: ringIndices, initialDistances: ringDistances });
            ribs.push({ start: ringStart, count: radialSegments, radius: radiusScale * 10, v: v });

            // Vertical constraints (connecting to previous ring)
            if (y > 0) {
                const prevRingStart = (y - 1) * (radialSegments + 2) + 1;
                const vertIndices: number[] = [];
                const vertDistances: number[] = [];

                for (let x = 0; x < radialSegments; x++) {
                    const a = prevRingStart + x;
                    const b = ringStart + x;
                    vertIndices.push(a, b);

                    const va = new THREE.Vector3(vertices[a * 3], vertices[a * 3 + 1], vertices[a * 3 + 2]);
                    const vb = new THREE.Vector3(vertices[b * 3], vertices[b * 3 + 1], vertices[b * 3 + 2]);
                    vertDistances.push(va.distanceTo(vb));

                    // REMOVED rigid Diagonal Skins (Shear stability) which were too stiff for Salp motion.
                }
                verticalConstraints.push({ indices: vertIndices, initialDistances: vertDistances });

                // Also connect centers vertically (Spine)
                const prevCenter = spineIndices[y - 1];
                const currCenter = spineIndices[y];
                const cd = new THREE.Vector3(vertices[prevCenter * 3], vertices[prevCenter * 3 + 1], vertices[prevCenter * 3 + 2])
                    .distanceTo(new THREE.Vector3(vertices[currCenter * 3], vertices[currCenter * 3 + 1], vertices[currCenter * 3 + 2]));

                spineConstraints.push({ indices: [prevCenter, currCenter], initialDistances: [cd] });
            }
        }

        // Generate Indices (Grid)
        for (let y = 0; y < heightSegments; y++) {
            const ringStart = y * (radialSegments + 2) + 1;
            const nextRingStart = (y + 1) * (radialSegments + 2) + 1;

            for (let x = 0; x < radialSegments; x++) {
                const a = ringStart + x;
                const b = nextRingStart + x;
                const c = nextRingStart + (x + 1);
                const d = ringStart + (x + 1);

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('positionPrev', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

        return {
            geometry,
            particles: new Float32Array(vertices),
            ribPath: [],
            constraints: {
                rings: ringConstraints,
                verticals: verticalConstraints,
                radials: radialConstraints,
                spine: spineConstraints,
                axis: { indices: spineIndices },
                anchors: {
                    top: spineIndices[0],
                    mid: spineIndices[Math.floor(heightSegments / 2)],
                    bottom: spineIndices[heightSegments]
                }
            },
            ribs
        };
    }

    public resolveSocket(form: FormDefinition, socketName: string, u: number = 0, v: number = 0, ribIndex: number = 0): { position: THREE.Vector3; rotation: THREE.Quaternion } {
        const pos = new THREE.Vector3();
        const rot = new THREE.Quaternion();

        const { spine } = form.geometry;

        // Resolve socket based on Spine frame at socket location
        let targetV = 0;
        if (socketName === 'tip') targetV = 1;
        else if (socketName === 'root') targetV = 0;

        const frame = evalSpine(targetV, spine);
        pos.copy(frame.position);

        const up = new THREE.Vector3(0, 1, 0);
        rot.setFromUnitVectors(up, frame.tangent);

        return { position: pos, rotation: rot };
    }
}
