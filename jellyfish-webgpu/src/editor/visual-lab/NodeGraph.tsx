import * as React from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    Node,
    Edge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';



interface NodeGraphProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    onNodeClick: (event: React.MouseEvent, node: Node) => void;
    nodeTypes?: any;
}

export const NodeGraph: React.FC<NodeGraphProps> = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    nodeTypes
}) => {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                colorMode="dark"
                fitView
            >
                <Controls />
                <Background />
            </ReactFlow>
        </div>
    );
};
