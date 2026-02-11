declare module 'particulate' {
  export interface Vec3 extends Float32Array {
    // Vec3 operations
  }

  export namespace Vec3 {
    function distance(buffer: number[] | Float32Array, indexA: number, indexB: number): number;
  }

  export class Constraint {
    indices: number[];
  }

  export class DistanceConstraint extends Constraint {
    static create(distance: number | number[], indices: number[]): DistanceConstraint;
    setDistance(min: number, max: number): void;
  }

  export class PointConstraint extends Constraint {
    static create(position: number[], index: number): PointConstraint;
    setPosition(x: number, y: number, z: number): void;
  }

  export class AxisConstraint extends Constraint {
    static create(pinA: number, pinB: number, indices: number[]): AxisConstraint;
  }

  export class ParticleSystem {
    positions: Float32Array;
    positionsPrev: Float32Array;
    weights: Float32Array;

    static create(vertices: number[] | Float32Array, iterations?: number): ParticleSystem;

    addConstraint(constraint: Constraint): void;
    addPinConstraint(constraint: PointConstraint): void;
    setWeight(index: number, weight: number): void;
    tick(dt: number): void;
  }
}
