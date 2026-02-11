import type { Connection, Edge } from '@xyflow/react';
import type { SocketType } from '../../jellyfish/graph/Socket';

export const SLOT_COLORS: Record<SocketType, string> = {
    rib: '#ff00ff',     // Magenta
    surface: '#00ffff', // Cyan
    tip: '#ffff00',     // Yellow
    root: '#ffffff',    // White
    center: '#00ff00',  // Green
};

export function isValidConnection(connection: Connection, edges: Edge[]): boolean {
    // Prevent self-connections
    if (connection.source === connection.target) return false;

    // TODO: Add type checking based on socket types
    // For now, allow all connections between distinct nodes
    return true;
}

export function getSocketColor(type: SocketType): string {
    return SLOT_COLORS[type] || '#888';
}
