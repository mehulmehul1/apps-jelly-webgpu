import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import type { FormDefinition, SuperformulaConfig } from '../../jellyfish/graph/FormDefinition';
import type { RadiusProfileCurve } from '../../jellyfish/creatures/RadiusProfileCurve';
import type { SpineCurve } from '../../jellyfish/creatures/SpineCurve';

interface TweakpaneEditorProps {
    activeNodeId: string;
    nodes: any[];
    currentForm: FormDefinition;
    onUpdateForm: (updates: Partial<FormDefinition>) => void;
    onUpdateGeometry: (updates: Partial<FormDefinition['geometry']>) => void;
    onRefresh: () => void;
    onLoadPreset: (name: string) => void;
    onToggleFeature: (feature: 'profile' | 'crossSection' | 'spine', enabled: boolean) => void;
    enabledFeatures: { profile: boolean; crossSection: boolean; spine: boolean };

    // Persistence
    savedForms: string[];
    onSaveForm: (name: string) => void;
    onLoadForm: (name: string) => void;

    // Node Data (Distributor)
    onUpdateNodeData: (nodeId: string, data: any) => void;
}

export const TweakpaneEditor: React.FC<TweakpaneEditorProps> = (props) => {
    const {
        currentForm,
        onRefresh,
        onLoadPreset,
        onToggleFeature,
        enabledFeatures,
        savedForms,
        onSaveForm,
        onLoadForm
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const paneRef = useRef<any>(null);

    // 1. Keep a Ref to latest props to avoid stale closures in Tweakpane callbacks
    const propsRef = useRef(props);
    propsRef.current = props;

    // 2. Mutable Params Object for Tweakpane
    const paramsRef = useRef({
        // Library
        saveName: '',
        loadName: '',

        // Top Level
        preset: '',
        refresh: onRefresh,

        // Profile
        profileEnabled: enabledFeatures.profile,
        profileKind: currentForm.geometry.profile.kind,
        profileV0: (currentForm.geometry.profile as any).v0 ?? 0,
        profileV1: (currentForm.geometry.profile as any).v1 ?? 0,
        profileV2: (currentForm.geometry.profile as any).v2 ?? 0,
        profileV3: (currentForm.geometry.profile as any).v3 ?? 0,

        // Cross Section
        sectionEnabled: enabledFeatures.crossSection,
        m: currentForm.geometry.crossSection.m,
        n1: currentForm.geometry.crossSection.n1,
        n2: currentForm.geometry.crossSection.n2,
        n3: currentForm.geometry.crossSection.n3,
        a: currentForm.geometry.crossSection.a,
        b: currentForm.geometry.crossSection.b,

        // Spine
        spineEnabled: enabledFeatures.spine,
        spineKind: currentForm.geometry.spine.kind,
        spineFreq: (currentForm.geometry.spine as any).freq ?? 0,
        spineAmpX: (currentForm.geometry.spine as any).ampX ?? 0,
        spineAmpZ: (currentForm.geometry.spine as any).ampZ ?? 0,
        spineTurns: (currentForm.geometry.spine as any).turns ?? 0,
        spineRadius: (currentForm.geometry.spine as any).radius ?? 0,

        // Scale
        scaleX: currentForm.geometry.scale.x,
        scaleY: currentForm.geometry.scale.y,
        scaleZ: currentForm.geometry.scale.z,

        // Distributor
        distCount: 6,
        distMode: 'Ring',
        distRadius: 5,

        // Physics
        stiffness: currentForm.physics?.stiffness ?? 1.0,
        damping: currentForm.physics?.damping ?? 0.05,
        pulseAmplitude: currentForm.physics?.pulseAmplitude ?? 0.15,
        pulseWave: currentForm.physics?.pulseWave ?? 0
    });

    useEffect(() => {
        if (!containerRef.current) return;

        // Dispose previous if any (Strict Mode double-mount protection)
        if (paneRef.current) {
            try { paneRef.current.dispose(); } catch (e) { /* ignore */ }
            paneRef.current = null;
        }

        const pane = new Pane({
            container: containerRef.current,
            title: 'Visual Editor',
        }) as any;
        paneRef.current = pane;

        const params = paramsRef.current;
        const activeNode = propsRef.current.nodes.find(n => n.id === propsRef.current.activeNodeId);
        const isDistributor = activeNode?.type === 'distributor';

        // --- DISTRIBUTOR SETTINGS (Conditional) ---
        if (isDistributor) {
            const distData = activeNode?.data?.distribution || { count: 3, mode: 'Ring', radius: 5 };
            params.distCount = distData.count;
            params.distMode = distData.mode;
            params.distRadius = distData.radius || 5;

            const fDist = pane.addFolder({ title: 'Distributor Settings', expanded: true });

            fDist.addBinding(params, 'distMode', {
                options: { Ring: 'Ring', Line: 'Line' }
            }).on('change', (ev) => {
                propsRef.current.onUpdateNodeData(propsRef.current.activeNodeId, {
                    distribution: { ...activeNode.data.distribution, mode: ev.value }
                });
            });

            fDist.addBinding(params, 'distCount', { min: 1, max: 20, step: 1 })
                .on('change', (ev) => {
                    propsRef.current.onUpdateNodeData(propsRef.current.activeNodeId, {
                        distribution: { ...activeNode.data.distribution, count: ev.value }
                    });
                });

            fDist.addBinding(params, 'distRadius', { min: 0.1, max: 20 })
                .on('change', (ev) => {
                    propsRef.current.onUpdateNodeData(propsRef.current.activeNodeId, {
                        distribution: { ...activeNode.data.distribution, radius: ev.value }
                    });
                });

            // If it's a distributor, we might NOT show the geometry editors?
            // Or maybe we treat the distributor as having a "Form" that acts as the template?
            // For now, let's allow editing the "Template Form" below as usual.
            fDist.addBlade({ view: 'separator' });
        }

        // Helpers using Refs
        const getForm = () => propsRef.current.currentForm;
        const updateGeo = (updates: Partial<FormDefinition['geometry']>) => propsRef.current.onUpdateGeometry(updates);

        // --- LIBRARY ---
        const fLibrary = pane.addFolder({ title: 'Library (Save/Load)', expanded: true });

        // SAVE
        fLibrary.addBinding(params, 'saveName', { label: 'Save As' });
        fLibrary.addButton({ title: 'Save Form' }).on('click', () => {
            const name = paramsRef.current.saveName;
            if (name) propsRef.current.onSaveForm(name);
        });

        // LOAD
        // Dynamic options for Load dropdown are tricky in Tweakpane v3/v4 without rebuilding or accessing internal controller.
        // We might need to refresh options when `savedForms` changes.
        // For now, simpler: Use 'binding' with initial options, and we might need to recreate the pane if options change?
        // Or simpler: Type the name to load? No, dropdown is better.
        // Let's rely on React Key to force re-mount if savedForms changes, OR just add a separate effect to update options?
        // Updating options in TP is hard. Let's try forcing re-creation of this folder/binding if savedForms changes.
        // But `useEffect` dep array handles re-creation! 
        // We added `savedForms` to the dependency array of this useEffect? No, it's currently empty `[]`.
        // We should add `savedForms` to dependency array to re-create pane when list changes.

        const loadOptions = propsRef.current.savedForms.reduce((acc, name) => ({ ...acc, [name]: name }), { 'Select...': '' });

        fLibrary.addBinding(params, 'loadName', {
            label: 'Load',
            options: loadOptions
        }).on('change', (ev: any) => {
            if (ev.value) propsRef.current.onLoadForm(ev.value);
        });

        fLibrary.addBlade({ view: 'separator' });


        // --- PRESETS ---
        const fPresets = pane.addFolder({ title: 'Presets', expanded: false }); // Collapsed by default now
        fPresets.addBinding(params, 'preset', {
            options: {
                Select: '',
                'Comb Jelly': 'Comb Jelly',
                'Moon Jelly': 'Moon Jelly',
                'Siphonophore': 'Siphonophore'
            }
        }).on('change', (ev: any) => {
            if (ev.value) propsRef.current.onLoadPreset(ev.value);
        });
        fPresets.addButton({ title: 'REFRESH MODEL' }).on('click', () => propsRef.current.onRefresh());

        // --- PROFILE ---
        const fProfile = pane.addFolder({ title: 'Radius Profile', expanded: true });
        fProfile.addBinding(params, 'profileEnabled', { label: 'Enable' })
            .on('change', (ev: any) => propsRef.current.onToggleFeature('profile', ev.value));

        fProfile.addBinding(params, 'profileKind', {
            options: {
                'Legacy Bell': 'legacy_bell',
                'Power Function': 'power',
                'Log Spiral': 'log_spiral',
                'Vesica': 'vesica',
                'Constant': 'constant'
            }
        }).on('change', (ev: any) => {
            const currentForm = getForm();
            const kind = ev.value as any;
            let newProfile: any = { kind };

            // Initialize defaults for new kind
            switch (kind) {
                case 'power':
                    newProfile = { kind, exponent: 1, min: 0, max: 1 };
                    break;
                case 'log_spiral':
                    newProfile = { kind, a: 1, b: 0.2, min: 0, max: 1 };
                    break;
                case 'vesica':
                    newProfile = { kind, power: 1, min: 0, max: 1 };
                    break;
                case 'constant':
                    newProfile = { kind, value: 1 };
                    break;
                case 'legacy_bell':
                case 'legacy_tail':
                default:
                    newProfile = { kind };
                    break;
            }

            updateGeo({
                profile: newProfile
            });
        });

        const updateProfileParam = (key: string, val: number) => {
            const currentForm = getForm();
            const p = { ...currentForm.geometry.profile } as any;
            p[key] = val;
            updateGeo({ profile: p });
        };

        fProfile.addBinding(params, 'profileV0', { min: 0, max: 20, label: 'Param A' })
            .on('change', (ev: any) => updateProfileParam('v0', ev.value));
        fProfile.addBinding(params, 'profileV1', { min: 0, max: 20, label: 'Param B' })
            .on('change', (ev: any) => updateProfileParam('v1', ev.value));

        // --- CROSS SECTION ---
        const fSection = pane.addFolder({ title: 'Cross Section', expanded: false });
        fSection.addBinding(params, 'sectionEnabled', { label: 'Enable' })
            .on('change', (ev: any) => propsRef.current.onToggleFeature('crossSection', ev.value));

        const updateSection = (vals: Partial<SuperformulaConfig>) => {
            const currentForm = getForm();
            updateGeo({ crossSection: { ...currentForm.geometry.crossSection, ...vals } });
        };

        fSection.addBinding(params, 'm', { min: 0, max: 20, step: 1, label: 'Symmetry (m)' })
            .on('change', (ev: any) => updateSection({ m: ev.value }));
        fSection.addBinding(params, 'n1', { min: 0.1, max: 10, label: 'N1 (Shape)' })
            .on('change', (ev: any) => updateSection({ n1: ev.value }));
        fSection.addBinding(params, 'n2', { min: 0.1, max: 10, label: 'N2 (Squeeze)' })
            .on('change', (ev: any) => updateSection({ n2: ev.value }));
        fSection.addBinding(params, 'n3', { min: 0.1, max: 10, label: 'N3 (Squash)' })
            .on('change', (ev: any) => updateSection({ n3: ev.value }));

        // --- SPINE ---
        const fSpine = pane.addFolder({ title: 'Spine Axis', expanded: false });
        fSpine.addBinding(params, 'spineEnabled', { label: 'Enable' })
            .on('change', (ev: any) => propsRef.current.onToggleFeature('spine', ev.value));

        fSpine.addBinding(params, 'spineKind', {
            options: {
                'None (Straight)': 'none',
                'Sine Wave': 'sine',
                'Helix': 'helix'
            }
        }).on('change', (ev: any) => {
            const currentForm = getForm();
            const kind = ev.value as any;
            let newSpine: any = { kind };

            switch (kind) {
                case 'sine':
                    newSpine = { kind, freq: 1, ampX: 1, ampZ: 1, phase: 0 };
                    break;
                case 'helix':
                    newSpine = { kind, turns: 2, radius: 1, phase: 0 };
                    break;
                case 'none':
                default:
                    newSpine = { kind: 'none' };
                    break;
            }

            updateGeo({
                spine: newSpine
            });
        });

        const updateSpine = (vals: any) => {
            const currentForm = getForm();
            updateGeo({ spine: { ...currentForm.geometry.spine, ...vals } });
        };

        fSpine.addBinding(params, 'spineFreq', { min: 0, max: 5, label: 'Frequency' })
            .on('change', (ev: any) => updateSpine({ freq: ev.value }));
        fSpine.addBinding(params, 'spineAmpX', { min: 0, max: 10, label: 'Amplitude X' })
            .on('change', (ev: any) => updateSpine({ ampX: ev.value }));
        fSpine.addBinding(params, 'spineTurns', { min: 0, max: 5, label: 'Turns (Helix)' })
            .on('change', (ev: any) => updateSpine({ turns: ev.value }));
        fSpine.addBinding(params, 'spineRadius', { min: 0, max: 10, label: 'Radius (Helix)' })
            .on('change', (ev: any) => updateSpine({ radius: ev.value }));

        // --- PHYSICS ---
        const fPhysics = pane.addFolder({ title: 'Physics & Animation', expanded: true });

        const updatePhysics = (vals: any) => {
            const currentForm = getForm();
            propsRef.current.onUpdateForm({ physics: { ...currentForm.physics, ...vals } });
        };

        fPhysics.addBinding(params, 'stiffness', { min: 0.1, max: 3.0, label: 'Stiffness (Salp < 0.5)' })
            .on('change', (ev: any) => updatePhysics({ stiffness: ev.value }));
        fPhysics.addBinding(params, 'damping', { min: 0, max: 0.2, label: 'Damping' })
            .on('change', (ev: any) => updatePhysics({ damping: ev.value }));
        fPhysics.addBinding(params, 'pulseAmplitude', { min: 0, max: 0.5, label: 'Pulse Amp' })
            .on('change', (ev: any) => updatePhysics({ pulseAmplitude: ev.value }));
        fPhysics.addBinding(params, 'pulseWave', { min: 0, max: 10, label: 'Pulse Wave (Salp > 1.0)' })
            .on('change', (ev: any) => updatePhysics({ pulseWave: ev.value }));

        return () => {
            try { pane.dispose(); } catch (e) { /* ignore */ }
            if (paneRef.current === pane) paneRef.current = null;
        };
    }, [savedForms, propsRef.current.activeNodeId]);

    // 4. Sync Params from props -> Tweakpane
    // This runs on every render to ensure Tweakpane UI matches the React State
    useEffect(() => {
        if (!paneRef.current) return;
        const p = paramsRef.current;
        const { geometry } = currentForm;

        // Update mutable params
        p.preset = '';

        p.profileEnabled = enabledFeatures.profile;
        if (geometry.profile.kind === 'legacy_bell') {
            p.profileKind = 'legacy_bell';
        } else if (geometry.profile.kind === 'constant') {
            p.profileKind = 'constant';
            p.profileV0 = (geometry.profile as any).value; // Changed from v0 to value for constant
        }
        // Other profile kinds and their specific params would go here if needed
        // For now, we only explicitly handle 'constant' for profileV0.

        p.sectionEnabled = enabledFeatures.crossSection; // Changed from sectionEnabled
        p.m = geometry.crossSection.m; // Changed from m
        p.n1 = geometry.crossSection.n1; // Changed from n1
        p.n2 = geometry.crossSection.n2; // Changed from n2
        p.n3 = geometry.crossSection.n3; // Changed from n3
        p.a = geometry.crossSection.a; // Changed from a
        p.b = geometry.crossSection.b; // Changed from b

        p.spineEnabled = enabledFeatures.spine;
        p.spineKind = geometry.spine.kind;
        p.spineFreq = (geometry.spine as any).freq ?? 0;
        p.spineAmpX = (geometry.spine as any).ampX ?? 0;
        p.spineAmpZ = (geometry.spine as any).ampZ ?? 0;
        p.spineTurns = (geometry.spine as any).turns ?? 0;
        p.spineRadius = (geometry.spine as any).radius ?? 0;

        // Scale
        p.scaleX = geometry.scale.x;
        p.scaleY = geometry.scale.y;
        p.scaleZ = geometry.scale.z;

        // Physics
        p.stiffness = currentForm.physics?.stiffness ?? 1.0;
        p.damping = currentForm.physics?.damping ?? 0.05;
        p.pulseAmplitude = currentForm.physics?.pulseAmplitude ?? 0.15;
        p.pulseWave = currentForm.physics?.pulseWave ?? 0;

        paneRef.current.refresh();
    }, [currentForm, enabledFeatures]);


    return (
        <div ref={containerRef} style={{ width: '100%' }} />
    );
};
