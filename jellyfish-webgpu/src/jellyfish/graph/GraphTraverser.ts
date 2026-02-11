import * as THREE from 'three';
import type { CreatureGraph, CreatureNode, AnyNode, Placement } from './CreatureGraph';

export interface TraversedNode {
    node: AnyNode;
    parent: TraversedNode | undefined;

    /** 
     * The calculated world transform of this node's ORIGIN 
     * (Before applying internal form offsets)
     */
    worldPosition: THREE.Vector3;
    worldRotation: THREE.Quaternion;
    worldScale: number; // Uniform scale for now
}

/**
 * callback to get the transform of a socket on a parent form.
 * Should return the transform relative to the parent's origin.
 */
export type SocketResolver = (
    formId: string,
    socketName: string,
    u?: number,
    v?: number,
    ribIndex?: number
) => { position: THREE.Vector3; rotation: THREE.Quaternion };

export class GraphTraverser {
    private socketResolver: SocketResolver;

    constructor(socketResolver: SocketResolver) {
        this.socketResolver = socketResolver;
    }

    /**
     * Flatten the graph into a list of nodes with calculated world transforms.
     */
    public traverse(graph: CreatureGraph): TraversedNode[] {
        const result: TraversedNode[] = [];

        // Root has no parent, default transform
        this.traverseNode(
            graph.root,
            undefined,
            new THREE.Vector3(0, 0, 0),
            new THREE.Quaternion(),
            1.0,
            result
        );

        return result;
    }

    private traverseNode(
        node: AnyNode,
        parent: TraversedNode | undefined,
        position: THREE.Vector3,
        rotation: THREE.Quaternion,
        scale: number,
        result: TraversedNode[]
    ) {
        // 1. Create the traversal record
        const record: TraversedNode = {
            node,
            parent,
            worldPosition: position.clone(),
            worldRotation: rotation.clone(),
            worldScale: scale
        };
        result.push(record);

        // 2. Handle 'Part' nodes (standard recursion)
        if (node.type === 'Part') {
            if (node.children) {
                for (const child of node.children) {
                    this.processChild(child, record, result);
                }
            }
        }
        // 3. Handle 'Distributor' nodes (Generative logic)
        else if (node.type === 'Distributor') {
            const count = node.distribution.count;
            const mode = node.distribution.mode;
            const start = node.distribution.start ?? 0;
            const end = node.distribution.end ?? 1;

            for (let i = 0; i < count; i++) {
                // Calculate t (0..1) for this instance
                const t = count === 1 ? 0.5 : start + (end - start) * (i / (count - 1));

                // Create a virtual "Part" node for this instance
                // It inherits properties from the Distributor but acts as a concrete Part
                const instanceId = `${node.id}_${i}`;
                const virtualNode: CreatureNode = {
                    id: instanceId,
                    type: 'Part',
                    formId: node.targetFormId,
                    placement: node.placement, // Inherit base placement? No, placement is relative to PARENT.
                    // Actually, the Distributor ITSELF has a placement (where the group is).
                    // The instances are children of the Distributor group?
                    // OR, the Distributor replaces itself with N children?
                    // Let's assume Distributor IS the parent container, and instances are attached to IT.
                    // But Distributor has no geometry. 
                    // Let's treat the Distributor as a phantom parent.
                    children: node.children || []
                };

                // Calculate Transform for this instance relative to the Distributor's placement
                // Note: The Distributor Node passed in `node` ALREADY has `position`, `rotation`, `scale` passed to this function.
                // So we just need to calculate the Local Offset for this specific instance `i`.

                const instanceOffset = new THREE.Vector3();
                const instanceRot = new THREE.Quaternion();

                if (mode === 'Ring') {
                    const angle = t * Math.PI * 2;
                    const radius = node.distribution.radius || 1.0;
                    
                    instanceOffset.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
                    instanceRot.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle); // Look outward
                } else if (mode === 'Line') {
                    instanceOffset.set(0, (t - 0.5) * 2, 0); // Vertical line
                }

                // Apply Instance Transform to Distributor's World Transform
                const finalPos = instanceOffset.clone()
                    .applyQuaternion(rotation)
                    .multiplyScalar(scale)
                    .add(position);

                const finalRot = rotation.clone().multiply(instanceRot);

                // Recurse on this virtual node
                // Note: We pass `virtualNode` as the "Node" in the record, so Assembler sees a Part.
                this.traverseNode(virtualNode, parent, finalPos, finalRot, scale, result);
            }
        }
    }

    private processChild(
        child: AnyNode,
        parentRecord: TraversedNode,
        result: TraversedNode[]
    ) {
        if (!child.placement) {
            console.warn(`Child ${child.id} has no placement!`);
            return;
        }

        const P = child.placement;

        // A. Get Parent's Socket Transform (Local to Parent)
        // The parent node has a FormId. We ask the resolver where the socket is on that Form.
        // Note: If parent is a Distributor, it might not have a FormId in the same way.
        // Assuming parent is 'Part' for now.
        let parentFormId = 'unknown';
        if (parentRecord.node.type === 'Part') {
            parentFormId = parentRecord.node.formId;
        }

        const socketXform = this.socketResolver(
            parentFormId,
            P.socket,
            P.u,
            P.v,
            P.ribIndex
        );

        // B. Apply Parent's World Transform to the Socket (to get Socket World Transform)
        const socketWorldPos = socketXform.position.clone()
            .applyQuaternion(parentRecord.worldRotation)
            .multiplyScalar(parentRecord.worldScale)
            .add(parentRecord.worldPosition);

        const socketWorldRot = parentRecord.worldRotation.clone().multiply(socketXform.rotation);

        // C. Apply Child's Offset from the Socket (Child Local -> Socket)
        // Offset is in the coordinate space of the SOCKET.
        const childOffset = new THREE.Vector3(P.offset.x, P.offset.y, P.offset.z);
        const childRotOffset = new THREE.Euler(P.rotation.x, P.rotation.y, P.rotation.z);
        const childQuat = new THREE.Quaternion().setFromEuler(childRotOffset);

        const childWorldPos = childOffset.clone()
            .applyQuaternion(socketWorldRot)
            .multiplyScalar(parentRecord.worldScale) // Child offset scales with parent? Usually yes.
            .add(socketWorldPos);

        const childWorldRot = socketWorldRot.clone().multiply(childQuat);
        const childWorldScale = parentRecord.worldScale * P.scale;

        // D. Recurse
        this.traverseNode(child, parentRecord, childWorldPos, childWorldRot, childWorldScale, result);
    }
}
