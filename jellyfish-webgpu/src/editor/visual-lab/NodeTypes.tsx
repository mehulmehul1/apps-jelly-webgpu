import * as React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export const PartNode = ({ data }: NodeProps) => {
    return (
        <div style={{ padding: '10px', border: '1px solid #777', borderRadius: '5px', background: '#222', color: '#fff', minWidth: '150px' }}>
            <div style={{ borderBottom: '1px solid #555', marginBottom: '5px', paddingBottom: '5px', fontWeight: 'bold', color: '#ff00ff' }}>
                {data.label as string}
            </div>

            {/* Target Handle (Input from Parent) */}
            <div style={{ position: 'relative', padding: '5px 0' }}>
                <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
                <span style={{ fontSize: '10px', color: '#aaa' }}>Parent</span>
            </div>

            {/* Source Handles (Output Sockets) */}
            <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '4px' }}>Sockets</div>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Tip</span>
                    <Handle type="source" position={Position.Bottom} id="tip" style={{ background: '#00ffff' }} />
                </div>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span>Result</span>
                    <Handle type="source" position={Position.Bottom} id="surface" style={{ left: '20%', background: '#ff00ff' }} />
                </div>
            </div>
        </div>
    );
};

export { DistributorNode } from './DistributorNode';
