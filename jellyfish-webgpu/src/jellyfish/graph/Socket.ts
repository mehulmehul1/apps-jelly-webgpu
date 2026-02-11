
export type SocketType =
    | 'rib'       // Attaches to specific rib index (0..N)
    | 'surface'   // Attaches to parametric surface (u, v)
    | 'tip'       // Attaches to the end of the spine
    | 'root'      // Attaches to the start of the spine
    | 'center';   // Attaches to the volumetric center

export interface SocketDefinition {
    type: SocketType;
    /**
     * Optional restrictions on what form categories can attach here.
     * e.g. ['Appendage', 'Colony']
     */
    allowedCategories?: string[];

    /**
     * For 'rib' sockets, creates a socket for EVERY rib?
     * If true, this definition spawns N actual connection points.
     */
    perRib?: boolean;

    /**
     * Descriptive name for the UI (e.g., "Bell Rim", "Stem Surface")
     */
    label?: string;
}
