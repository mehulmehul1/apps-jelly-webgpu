import * as React from 'react';
import type { SuperformulaConfig } from '../../jellyfish/graph/FormDefinition';

interface CrossSectionEditorProps {
    config: SuperformulaConfig;
    onChange: (config: SuperformulaConfig) => void;
    visualOnly?: boolean;
}

export const CrossSectionEditor: React.FC<CrossSectionEditorProps> = ({ config, onChange, visualOnly }) => {

    // Simple superformula evaluator for visualization
    const generatePath = () => {
        // r = ( |cos(m*phi/4)/a|^n2 + |sin(m*phi/4)/b|^n3 )^(-1/n1)
        const { m, n1, n2, n3, a, b } = config;
        const width = 250;
        const center = width / 2;
        const scale = 80;

        let path = "";
        const steps = 100;
        for (let i = 0; i <= steps; i++) {
            const phi = (i / steps) * Math.PI * 2;

            const cosTerm = Math.pow(Math.abs(Math.cos(m * phi / 4) / a), n2);
            const sinTerm = Math.pow(Math.abs(Math.sin(m * phi / 4) / b), n3);
            const r = Math.pow(cosTerm + sinTerm, -1 / n1);

            // Polar to Cartesian
            const x = center + r * Math.cos(phi) * scale;
            const y = center + r * Math.sin(phi) * scale;

            if (i === 0) path += `M ${x} ${y}`;
            else path += ` L ${x} ${y}`;
        }
        path += " Z";
        return path;
    };


    const handleChange = (key: keyof SuperformulaConfig, value: number) => {
        onChange({ ...config, [key]: value });
    };

    const renderSlider = (label: string, field: keyof SuperformulaConfig, min: number, max: number, step: number = 0.1) => (
        <label>
            {label}: {(config[field] ?? 1).toFixed(2)}
            <input
                type="range" min={min} max={max} step={step}
                value={config[field] ?? 1}
                onChange={e => handleChange(field, parseFloat(e.target.value))}
                style={{ width: '100%' }}
            />
        </label>
    );

    return (
        <div>
            <div style={{ marginBottom: '10px', fontSize: '0.9em', color: '#888' }}>Cross Section</div>
            <svg width="250" height="250" style={{ background: '#111', border: '1px solid #444', borderRadius: '4px' }}>
                <path d={generatePath()} stroke="#00ffff" strokeWidth="2" fill="rgba(0, 255, 255, 0.1)" />
            </svg>
        </div>
    );
};
