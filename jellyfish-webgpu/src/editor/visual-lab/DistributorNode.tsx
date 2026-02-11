import * as React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export const DistributorNode = ({ data }: NodeProps) => {
    // We can interact with the node data directly here, or rely on Tweakpane?
    // For specific node properties like "Count" and "Mode", having them on the node is handy.
    // Let's assume data has: { label, count, mode, radius }
    // AND callbacks to update them? 
    // For now, read-only display + Handles.

    return (
        <div style={{ padding: '10px', border: '1px solid #4aa', borderRadius: '5px', background: '#122', color: '#fff', minWidth: '150px' }}>
            <div style={{ borderBottom: '1px solid #366', marginBottom: '5px', paddingBottom: '5px', fontWeight: 'bold', color: '#00ffff' }}>
                {data.label as string || 'Distributor'}
            </div>

            {/* Target Handle (Input from Parent) */}
            <div style={{ position: 'relative', padding: '5px 0' }}>
                <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
                <span style={{ fontSize: '10px', color: '#aaa' }}>Parent Socket</span>
            </div>

            {/* Info */}
            <div style={{ fontSize: '10px', color: '#8cc', marginBottom: '8px' }}>
                <div>Mode: {data.mode as string || 'Ring'}</div>
                <div>Count: {data.count as number || 1}</div>
            </div>

            {/* Source Handle (Output to Children) */}
            <div style={{ marginTop: '5px', background: '#233', padding: '5px', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '4px', textAlign: 'right' }}>Distributed Parts</div>
                <div style={{ position: 'relative', height: '10px' }}>
                    <Handle type="source" position={Position.Bottom} style={{ background: '#00ffff' }} />
                </div>
            </div>
        </div>
    );
};
