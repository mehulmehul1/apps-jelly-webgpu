import * as THREE from 'three';

export type NodeId = string;

/**
 * Where a node attaches to its parent.
 */
export interface Placement {
    /** The socket on the parent node to attach to */
    socket: string;

    /** 
     * For 'rib' sockets: which rib index?
     * For 'surface' sockets: not used (u,v handled below)
     */
    ribIndex?: number;

    /** Parametric position along the socket/surface (0..1) */
    u?: number;
    /** Parametric position around the socket/surface (0..1) */
    v?: number;

    /** Local transform relative to the attachment point */
    offset: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: number;
}

/**
 * A standard instance of a Form.
 */
export interface CreatureNode {
    id: NodeId;
    type: 'Part';

    /** Reference to the FormDefinition */
    formId: string;

    /** Attachment to parent (undefined for Root) */
    placement?: Placement;

    /** Child nodes attached to this node */
    children: CreatureNode[];
}

/**
 * A generative node that spawns multiple children using a rule.
 * The Builder resolves this into multiple 'Part' nodes at runtime/build-time.
 */
export interface DistributorNode {
    id: NodeId;
    type: 'Distributor';

    /** What to spawn */
    targetFormId: string;

    /** Attachment to parent */
    placement: Placement;

    distribution: {
        mode: 'Ring' | 'Line' | 'Spiral' | 'RandomSurface';
        count: number;

        /** Parameter range (0..1) to distribute over */
        start?: number;
        end?: number;

        /** Random jitter on position */
        jitter?: number;

        /** Random variance on child scale */
        scaleVariance?: number;
    };

    /** Children attached to EACH distributed instance */
    children?: CreatureNode[];
}

export type AnyNode = CreatureNode | DistributorNode;

export interface CreatureGraph {
    root: AnyNode;

    /** Optional metadata about the graph */
    metadata?: {
        name: string;
        version: number;
        author?: string;
    };
}
