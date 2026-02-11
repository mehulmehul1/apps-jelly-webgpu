import * as THREE from 'three';
import type { CreatureGraph } from '../graph/CreatureGraph';
import type { FormDefinition } from '../graph/FormDefinition';
import { GraphTraverser } from '../graph/GraphTraverser';
import { GeometryGenerator } from './GeometryGenerator';
import { BulbNodeMaterial } from '../materials';

export class CreatureAssembler {
    private generator: GeometryGenerator;
    private formRegistry: Map<string, FormDefinition>;

    constructor(forms: FormDefinition[]) {
        this.generator = new GeometryGenerator();
        this.formRegistry = new Map(forms.map(f => [f.id, f]));
    }

    public assemble(graph: CreatureGraph): {
        group: THREE.Group,
        materials: BulbNodeMaterial[],
        physics: {
            particles: Float32Array,
            constraints: { indices: number[], distances: number[] }[],
            radials: { indices: number[], distances: number[] }[],
            ribs: { start: number, count: number, radius: number, v: number }[],
            spine: { indices: number[], distances: number[] }[],
            axis: { indices: number[] }[],
            anchors: { top: number, mid: number, bottom: number }
        }
    } {
        const rootGroup = new THREE.Group();
        const materials: BulbNodeMaterial[] = [];
        const allParticles: number[] = [];
        const allConstraints: { indices: number[], distances: number[] }[] = [];
        const allRadials: { indices: number[], distances: number[] }[] = [];
        const allRibs: { start: number, count: number, radius: number, v: number }[] = [];
        let vertexOffset = 0;
        const allSpine: { indices: number[], distances: number[] }[] = [];
        const allAxis: { indices: number[] }[] = [];
        let rootAnchors = { top: 0, mid: 0, bottom: 0 };

        // 1. Setup Resolver
        const resolver = (formId: string, socketName: string, u?: number, v?: number, ribIndex?: number) => {
            const form = this.formRegistry.get(formId);
            if (!form) throw new Error(`Form ${formId} not found`);
            return this.generator.resolveSocket(form, socketName, u, v, ribIndex);
        };

        // 2. Traverse
        const traverser = new GraphTraverser(resolver);
        const nodes = traverser.traverse(graph);

        // 3. Build Meshes
        for (const item of nodes) {
            if (item.node.type !== 'Part') continue;

            const form = this.formRegistry.get(item.node.formId);
            if (!form) {
                console.warn(`Missing form definition: ${item.node.formId}`);
                continue;
            }

            // Generate Geometry
            const generated = this.generator.generate(form);

            // Create Mesh with High-Quality Shaders
            const material = new BulbNodeMaterial();
            material.setDiffuse(new THREE.Color(form.material.colorA));
            material.setDiffuseB(new THREE.Color(form.material.colorB));
            // form.material doesn't have opacity yet in some versions, fallback to default
            material.setOpacity(0.75);

            materials.push(material);
            const mesh = new THREE.Mesh(generated.geometry, material);

            // Apply Transform
            mesh.position.copy(item.worldPosition);
            mesh.quaternion.copy(item.worldRotation);
            mesh.scale.setScalar(item.worldScale);

            rootGroup.add(mesh);

            vertexOffset += generated.geometry.attributes.position.count;

            // Collect physics data
            const partVertices = generated.particles;
            for (let i = 0; i < partVertices.length; i++) allParticles.push(partVertices[i]);

            const currentOffset = vertexOffset - generated.geometry.attributes.position.count;

            // Offset and collect constraints
            generated.constraints.rings.forEach(ring => {
                allConstraints.push({
                    indices: ring.indices.map(idx => idx + currentOffset),
                    distances: ring.initialDistances
                });
            });

            generated.constraints.verticals.forEach(vert => {
                allConstraints.push({
                    indices: vert.indices.map(idx => idx + currentOffset),
                    distances: vert.initialDistances
                });
            });

            generated.constraints.radials.forEach(rad => {
                allRadials.push({
                    indices: rad.indices.map(idx => idx + currentOffset),
                    distances: rad.initialDistances
                });
            });

            generated.constraints.spine.forEach(spn => {
                allSpine.push({
                    indices: spn.indices.map(idx => idx + currentOffset),
                    distances: spn.initialDistances
                });
            });

            allAxis.push({
                indices: generated.constraints.axis.indices.map(idx => idx + currentOffset)
            });

            generated.ribs.forEach(rib => {
                allRibs.push({
                    start: rib.start + currentOffset,
                    count: rib.count,
                    radius: rib.radius,
                    v: rib.v
                });
            });

            if (item.node.id === 'root') { // Changed 'node.id' to 'item.node.id' for correct scope
                rootAnchors = generated.constraints.anchors;
            }

            // Handle Emitters (Legacy Tentacles)
            if (form.emitter) {
                const count = form.emitter.count;
                const length = form.emitter.length;

                // Create a simple visual representation for now (Lines)
                const geometry = new THREE.BufferGeometry();
                const positions: number[] = [];

                for (let i = 0; i < count; i++) {
                    // Random point on the rim (roughly) creates a cylinder-like curtain
                    const angle = (i / count) * Math.PI * 2;
                    const r = 10; // Approximate radius, should technically come from Form size
                    const x = Math.cos(angle) * r;
                    const z = Math.sin(angle) * r;

                    positions.push(x, 0, z);
                    positions.push(x, -length, z);
                }

                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                const lineMaterial = new THREE.LineBasicMaterial({
                    color: form.material.colorB,
                    opacity: 0.5,
                    transparent: true
                });
                const lines = new THREE.LineSegments(geometry, lineMaterial);

                // Attach to mesh so it moves with it
                mesh.add(lines);
            }
        }

        return {
            group: rootGroup,
            materials,
            physics: {
                particles: new Float32Array(allParticles),
                constraints: allConstraints,
                radials: allRadials,
                ribs: allRibs,
                spine: allSpine,
                axis: allAxis,
                anchors: rootAnchors
            }
        };
    }
}
