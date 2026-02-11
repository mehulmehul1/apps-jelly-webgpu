import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { ProfileEditor } from './ProfileEditor';
import { CrossSectionEditor } from './CrossSectionEditor';
import { SpineEditor } from './SpineEditor';
import { NodeGraph } from './NodeGraph';
import { useVisualLabState } from './useVisualLabState';
import type { CreatureGraph } from '../../jellyfish/graph/CreatureGraph';
import type { FormDefinition } from '../../jellyfish/graph/FormDefinition';

import { PartNode, DistributorNode } from './NodeTypes';
import {
    MIGRATED_FORMS,
    COMB_JELLY_GRAPH,
    MOON_JELLY_GRAPH,
    SIPHONOPHORE_GRAPH
} from '../../jellyfish/creatures/migrated/forms';

const nodeTypes = {
    part: PartNode,
    distributor: DistributorNode
};

interface VisualLabProps {
    onUpdate?: (graph: CreatureGraph, forms: FormDefinition[]) => void;
    visible: boolean;
    onClose: () => void;
}

import { TweakpaneEditor } from './TweakpaneEditor';

export const VisualLab: React.FC<VisualLabProps> = ({ onUpdate, visible, onClose }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'crossSection'>('profile');
    const {
        currentForm,
        updateForm,
        updateGeometry,
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        setActiveNodeId,
        activeNodeId,
        savedForms,
        saveForm,
        loadForm,
        updateNodeData
    } = useVisualLabState();
    const [overrideGraph, setOverrideGraph] = useState<CreatureGraph | null>(null);

    // Feature Toggles (managed by Tweakpane now)
    const [enabledFeatures, setEnabledFeatures] = useState({
        profile: true,
        crossSection: true,
        spine: true
    });

    const [isGraphCollapsed, setIsGraphCollapsed] = useState(false);

    const loadPreset = (name: string) => {
        console.log('[VisualLab] Loading preset:', name);
        if (name === 'Comb Jelly') {
            updateForm(MIGRATED_FORMS[0]);
            setOverrideGraph(COMB_JELLY_GRAPH);
        } else if (name === 'Moon Jelly') {
            updateForm(MIGRATED_FORMS[1]);
            setOverrideGraph(MOON_JELLY_GRAPH);
        } else if (name === 'Siphonophore') {
            updateForm(MIGRATED_FORMS[2]);
            setOverrideGraph(SIPHONOPHORE_GRAPH);
        }
    };

    // Unified Update Trigger
    const triggerUpdate = useCallback(() => {
        if (!onUpdate) return;

        // Get the constructed graph from state (currently isolated active node)
        // const { graph, forms } = constructGraph(); 
        // We need to expose constructGraph from hook, or just build it here?
        // Hook exposes it.

        // For now, simpler: Just use the active form and wrap it, preserving Toggles.
        // The constructGraph logic in useVisualLabState is good but we need to apply toggles again.

        // Actually, let's just stick to the current logic for a bit:
        // Render existing 'currentForm' which is now the 'activeNode' form.

        const activeForm = JSON.parse(JSON.stringify(currentForm));
        if (!enabledFeatures.profile) activeForm.geometry.profile = { kind: 'constant', value: 1 };
        if (!enabledFeatures.crossSection) activeForm.geometry.crossSection = { m: 0, n1: 1, n2: 1, n3: 1, a: 1, b: 1 };
        if (!enabledFeatures.spine) activeForm.geometry.spine = { kind: 'none' };

        let graphToRender: CreatureGraph;
        if (overrideGraph) {
            graphToRender = overrideGraph;
        } else {
            graphToRender = {
                root: { id: 'root', type: 'Part', formId: currentForm.id, children: [] }
            };
        }
        onUpdate(graphToRender, [activeForm]);

    }, [currentForm, overrideGraph, onUpdate, enabledFeatures]);

    // Auto-update
    useEffect(() => {
        if (visible) {
            const timeout = setTimeout(triggerUpdate, 50);
            return () => clearTimeout(timeout);
        }
    }, [triggerUpdate, visible]);

    if (!visible) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            display: 'flex',
            zIndex: 9999
        }}>
            {/* Sidebar Container */}
            <div style={{
                width: '320px',
                height: '100%',
                background: 'rgba(20, 20, 30, 0.95)',
                borderRight: '1px solid #333',
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ padding: '15px', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: '#ff00ff', fontFamily: 'monospace', fontSize: '1.2em' }}>JELLY_LAB</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #555', color: '#888', cursor: 'pointer', fontSize: '0.8em', padding: '2px 5px' }}>✖</button>
                </div>

                {/* Visualizations Area */}
                <div style={{ padding: '15px', borderBottom: '1px solid #444', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                        <button
                            onClick={() => setActiveTab('profile')}
                            style={{ flex: 1, padding: '5px', background: activeTab === 'profile' ? '#444' : '#222', border: 'none', color: '#fff', cursor: 'pointer' }}
                        >
                            Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('crossSection')}
                            style={{ flex: 1, padding: '5px', background: activeTab === 'crossSection' ? '#444' : '#222', border: 'none', color: '#fff', cursor: 'pointer' }}
                        >
                            Section
                        </button>
                    </div>

                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {activeTab === 'profile' && (
                            <ProfileEditor
                                profile={currentForm.geometry.profile}
                                onChange={() => { }} // Read-only here, controlled by pane
                                visualOnly={true}
                            />
                        )}
                        {activeTab === 'crossSection' && (
                            <CrossSectionEditor
                                config={currentForm.geometry.crossSection}
                                onChange={() => { }}
                                visualOnly={true}
                            />
                        )}
                    </div>
                </div>

                {/* Tweakpane Area */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <TweakpaneEditor
                        activeNodeId={activeNodeId}
                        nodes={nodes}
                        currentForm={currentForm}
                        onUpdateForm={updateForm}
                        onUpdateGeometry={updateGeometry}
                        onRefresh={triggerUpdate}
                        onLoadPreset={loadPreset}
                        onToggleFeature={(feat, on) => setEnabledFeatures(p => ({ ...p, [feat]: on }))}
                        enabledFeatures={enabledFeatures}
                        savedForms={savedForms}
                        onSaveForm={saveForm}
                        onLoadForm={loadForm}
                        onUpdateNodeData={updateNodeData}
                    />
                </div>
            </div>

            {/* Graph Editor Overlay (Floating) */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                width: isGraphCollapsed ? '200px' : '600px',
                height: isGraphCollapsed ? '40px' : '400px',
                pointerEvents: 'auto',
                border: '1px solid #444',
                background: '#111',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.3s, height 0.3s'
            }}>
                <div style={{
                    padding: '5px 10px',
                    borderBottom: isGraphCollapsed ? 'none' : '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#222',
                    cursor: 'pointer'
                }} onClick={() => setIsGraphCollapsed(!isGraphCollapsed)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#ccc', fontSize: '0.9em', fontWeight: 'bold' }}>Node Graph</span>
                        {!isGraphCollapsed && <button onClick={(e) => { e.stopPropagation(); addNode('part'); }} style={{ cursor: 'pointer', fontSize: '0.8em', padding: '2px 8px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px' }}>+ Add Part</button>}
                    </div>
                    <span style={{ color: '#888', fontSize: '0.8em' }}>{isGraphCollapsed ? '▲' : '▼'}</span>
                </div>

                {!isGraphCollapsed && (
                    <div style={{ flex: 1 }}>
                        <NodeGraph
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={(_, node) => setActiveNodeId(node.id)}
                            nodeTypes={nodeTypes}
                        />
                    </div>
                )}
            </div>

        </div>
    );
};
