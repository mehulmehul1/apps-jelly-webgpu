import * as React from 'react';
import type { SpineCurve } from '../../jellyfish/creatures/SpineCurve';

interface SpineEditorProps {
    curve: SpineCurve;
    onChange: (curve: SpineCurve) => void;
}

export const SpineEditor: React.FC<SpineEditorProps> = ({ curve }) => {
    return (
        <div>
            <div style={{ marginBottom: '5px', fontSize: '0.9em', color: '#888' }}>Spine Axis</div>
            {/* Visual placeholder for spine - ideally this would be a 2D projection or mini 3D view */}
            <div style={{
                width: '250px',
                height: '100px',
                background: '#111',
                border: '1px solid #444',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#555',
                fontSize: '0.8em'
            }}>
                3D Spine Visualization
            </div>
        </div>
    );
};
