import * as React from 'react';
import { RadiusProfileCurve, evalRadiusProfile } from '../../jellyfish/creatures/RadiusProfileCurve';

interface ProfileEditorProps {
    profile: RadiusProfileCurve;
    onChange: (profile: RadiusProfileCurve) => void;
    visualOnly?: boolean;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onChange, visualOnly }) => {

    // Generate SVG Path for visualization
    const generatePath = () => {
        const width = 250;
        const height = 250;
        const padding = 10;
        const drawW = width - padding * 2;
        const drawH = height - padding * 2;

        let d = `M ${padding} ${height - padding}`; // Start bottom-left (t=0)? 
        // Actually t usually goes top-down or bottom-up?
        // Let's assume t=0 is top (0) and t=1 is bottom (1) for organism growth?
        // Or t=0 is connection point.
        // Let's map t: 0..1 along Y axis (downwards), value: 0..1 along X axis (radius).

        // Let's draw it vertical:
        // t=0 -> Y=padding
        // t=1 -> Y=height-padding
        // val=0 -> X=center (width/2)
        // val=1 -> X=center + drawW/2

        const center = width / 2;
        const scaleX = drawW / 2;
        const scaleY = drawH;

        let path = "";
        for (let i = 0; i <= 50; i++) {
            const t = i / 50;
            const r = evalRadiusProfile(profile, t);

            const x = center + r * scaleX;
            const y = padding + t * scaleY; // t goes 0 to 1 down

            if (i === 0) path += `M ${center} ${padding} L ${x} ${y}`;
            else path += ` L ${x} ${y}`;
        }

        // Mirror it for visual effect (jellyfish profile)
        for (let i = 50; i >= 0; i--) {
            const t = i / 50;
            const r = evalRadiusProfile(profile, t);
            const x = center - r * scaleX;
            const y = padding + t * scaleY;
            path += ` L ${x} ${y}`;
        }
        path += " Z"; // Close

        return path;
    };

    const handleChange = (updates: Partial<RadiusProfileCurve>) => {
        onChange({ ...profile, ...updates } as RadiusProfileCurve);
    };

    return (
        <div className="editor-panel">
            <div style={{ marginBottom: '10px', fontSize: '0.9em', color: '#888' }}>Radius Profile</div>
            <svg width="250" height="250" style={{ background: '#111', border: '1px solid #444', borderRadius: '4px' }}>
                <path d={generatePath()} stroke="#ff00ff" strokeWidth="2" fill="rgba(255, 0, 255, 0.1)" />
                <line x1="125" y1="0" x2="125" y2="250" stroke="#333" strokeDasharray="4" />
            </svg>
        </div>
    );
};
