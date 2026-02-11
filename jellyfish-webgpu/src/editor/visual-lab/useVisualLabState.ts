import { useState, useCallback } from 'react';
import type { FormDefinition } from '../../jellyfish/graph/FormDefinition';
import type { CreatureGraph, AnyNode, NodeId } from '../../jellyfish/graph/CreatureGraph';
import { Node, Edge, applyNodeChanges, applyEdgeChanges, addEdge, NodeChange, EdgeChange, Connection } from '@xyflow/react';

const DEFAULT_FORM: FormDefinition = {
    id: 'form_root',
    name: 'Root Bell',
    category: 'Body',
    geometry: {
        profile: { kind: 'legacy_bell' },
        crossSection: { m: 4, n1: 1, n2: 1, n3: 1, a: 1, b: 1 },
        spine: { kind: 'none' },
        scale: { x: 1, y: 1, z: 1 }
    },
    material: {
        colorA: 0xff00ff,
        colorB: 0x00ffff,
        glow: 1.0,
        roughness: 0.2,
        transmission: 0.9,
        ior: 1.5
    },
    physics: {
        stiffness: 1.0,
        damping: 0.05,
        gravity: 0,
        pulseAmplitude: 0.15,
        pulseWave: 0
    },
    sockets: {}
};

// Default Graph State
const INITIAL_NODES: Node[] = [
    { id: 'root', type: 'part', position: { x: 0, y: 0 }, data: { label: 'Root Bell', formId: 'form_root' } }
];
const INITIAL_EDGES: Edge[] = [];
const INITIAL_FORMS: Record<string, FormDefinition> = {
    'form_root': DEFAULT_FORM
};

export function useVisualLabState() {
    // React Flow State
    const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
    const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);

    // Creature Data State
    const [forms, setForms] = useState<Record<string, FormDefinition>>(INITIAL_FORMS);
    const [activeNodeId, setActiveNodeId] = useState<string>('root');

    // --- Graph Actions ---
    // --- Node Data Actions ---
    const updateNodeData = useCallback((nodeId: string, data: any) => {
        setNodes(nds => nds.map(n => {
            if (n.id === nodeId) {
                return { ...n, data: { ...n.data, ...data } };
            }
            return n;
        }));
    }, []);

    // --- Graph Actions ---
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
    }, []);

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        setEdges((eds) => applyEdgeChanges(changes, eds));
    }, []);

    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => addEdge(params, eds));
    }, []);

    const addNode = useCallback((type: 'part' | 'distributor') => {
        const id = `node_${Date.now()}`;

        // For Distributor, we might NOT need a new Form? 
        // Actually, Distributor distributes a TARGET form.
        // But for now, let's create a placeholder form for it or reuse?
        // If type is 'distributor', we do NOT create a form for IT, but it needs a targetFormId later.
        // For now, let's just create a form for consistency OR skip it.
        // Let's create a form so it has a name/label managed same way.
        const newFormId = `form_${id}`;
        const newForm: FormDefinition = {
            ...DEFAULT_FORM,
            id: newFormId,
            name: type === 'part' ? 'New Part' : 'Distributor',
            geometry: { ...DEFAULT_FORM.geometry, scale: { x: 0.5, y: 0.5, z: 0.5 } }
        };

        setForms(prev => ({ ...prev, [newFormId]: newForm }));

        const newNode: Node = {
            id,
            type,
            position: { x: 100, y: 100 + nodes.length * 50 },
            data: {
                label: newForm.name,
                formId: newFormId,
                // Distributor Defaults
                ...(type === 'distributor' ? {
                    distribution: { count: 3, mode: 'Ring', radius: 5 }
                } : {})
            }
        };

        setNodes(prev => [...prev, newNode]);
        setActiveNodeId(id);
    }, [nodes]);

    // --- Form Actions ---
    // Update the Form of the *active* node
    const updateForm = useCallback((updates: Partial<FormDefinition>) => {
        setForms(prev => {
            const activeNode = nodes.find(n => n.id === activeNodeId);
            if (!activeNode) return prev;

            const formId = activeNode.data.formId as string;
            // For Distributor, we update the Form name/metadata, but not geometry?
            if (!prev[formId]) return prev;

            return {
                ...prev,
                [formId]: { ...prev[formId], ...updates }
            };
        });
    }, [activeNodeId, nodes]);

    const updateGeometry = useCallback((updates: Partial<FormDefinition['geometry']>) => {
        setForms(prev => {
            const activeNode = nodes.find(n => n.id === activeNodeId);
            if (!activeNode) return prev;

            const formId = activeNode.data.formId as string;
            const currentForm = prev[formId];
            if (!currentForm) return prev;

            return {
                ...prev,
                [formId]: {
                    ...currentForm,
                    geometry: { ...currentForm.geometry, ...updates }
                }
            };
        });
    }, [activeNodeId, nodes]);

    // Construct the CreatureGraph object on demand for the renderer
    const constructGraph = useCallback((): { graph: CreatureGraph, forms: FormDefinition[] } => {
        // Needs a recursive builder to map React Flow nodes/edges to CreatureGraph tree
        // For now, simplified flat "root" logic just to keep 3D working with active form

        // TODO: Real traversal logic

        const activeNode = nodes.find(n => n.id === activeNodeId);
        if (!activeNode) {
            return { graph: { root: { id: 'empty', type: 'Part', formId: 'missing', children: [] } }, forms: [] };
        }

        const activeFormId = activeNode.data.formId as string || 'form_root';

        let rootNode: AnyNode;
        if (activeNode.type === 'distributor') {
            rootNode = {
                id: activeNode.id,
                type: 'Distributor',
                targetFormId: activeFormId, // The form of the distributor acts as the template
                placement: { socket: 'none', offset: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1 }, // Root has no relative placement
                distribution: activeNode.data.distribution as any || { count: 3, mode: 'Ring' },
                children: []
            };
        } else {
            rootNode = {
                id: activeNode.id,
                type: 'Part',
                formId: activeFormId,
                children: []
            };
        }

        const graph: CreatureGraph = {
            root: rootNode
        };

        return { graph, forms: Object.values(forms) };
    }, [nodes, edges, forms, activeNodeId]);

    const activeForm = (() => {
        const node = nodes.find(n => n.id === activeNodeId);
        if (node && typeof node.data.formId === 'string') {
            return forms[node.data.formId] || DEFAULT_FORM;
        }
        return DEFAULT_FORM;
    })();

    // --- Persistence ---
    const [savedForms, setSavedForms] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem('jelly_saved_forms');
            return stored ? Object.keys(JSON.parse(stored)) : [];
        } catch (e) {
            console.error(e);
            return [];
        }
    });

    const saveForm = useCallback((name: string) => {
        const activeNode = nodes.find(n => n.id === activeNodeId);
        const formId = activeNode?.data.formId as string;
        if (!formId || !forms[formId]) return;

        const formToSave = { ...forms[formId], name };

        try {
            const stored = localStorage.getItem('jelly_saved_forms');
            const library = stored ? JSON.parse(stored) : {};
            library[name] = formToSave;
            localStorage.setItem('jelly_saved_forms', JSON.stringify(library));
            setSavedForms(Object.keys(library));
            console.log('Saved form:', name);
        } catch (e) {
            console.error('Failed to save', e);
        }
    }, [activeNodeId, nodes, forms]);

    const loadForm = useCallback((name: string) => {
        try {
            const stored = localStorage.getItem('jelly_saved_forms');
            const library = stored ? JSON.parse(stored) : {};
            const loadedForm = library[name];
            if (!loadedForm) return;

            // Apply to active node
            const activeNode = nodes.find(n => n.id === activeNodeId);
            if (!activeNode) return;

            const formId = activeNode.data.formId as string;
            setForms(prev => ({
                ...prev,
                [formId]: { ...loadedForm, id: formId } // Keep ID, overwrite data
            }));
            console.log('Loaded form:', name);
        } catch (e) {
            console.error('Failed to load', e);
        }
    }, [activeNodeId, nodes]);

    return {
        // Graph State
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        setActiveNodeId,
        activeNodeId,

        // Form State
        currentForm: forms[nodes.find(n => n.id === activeNodeId)?.data.formId as string] || DEFAULT_FORM,
        updateForm, // Updates the active form
        updateGeometry,
        updateNodeData, // NEW: Updates Node Data (Distributor props)

        // Persistence
        savedForms,
        saveForm,
        loadForm,

        // Selector
        constructGraph
    };
}
