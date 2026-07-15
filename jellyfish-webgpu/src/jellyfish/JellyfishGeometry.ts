import * as THREE from 'three/webgpu';
import * as Particulate from 'particulate';
import {
  BodyPlan,
  evalRadiusProfile,
  evalSpineOffset,
  resolveGeometryConfig,
  resolveTentacleGroups,
  type CreatureSpec,
  type JellyfishSpec,
  type JellyfishGeometryConfig,
} from './creatures';

/**
 * JellyfishGeometry - Generates soft-body geometry for the jellyfish
 * 
 * Ported from temp-particulate-medusae/static/js/items/Medusae.js
 * Generates ~2000 particles with constraint-based soft-body structure
 */

// Types
export interface RibData {
  start: number;
  radius: number;
  centerX?: number;
  centerZ?: number;
  radiusSpine?: number;
  radiusOuter?: number;
  yParam: number;
  yPos: number;
  outer?: Particulate.DistanceConstraint;
  inner?: Particulate.DistanceConstraint;
  spine?: Particulate.DistanceConstraint;
  initialDistances?: {
    outer?: number[];
    inner?: number[];
  };
}

export interface SkinData {
  a: number;
  b: number;
}

export interface TentacleGroup {
  start: number;
}

export interface JellyfishGeometryData {
  spec: CreatureSpec;
  config: JellyfishGeometryConfig;
  geometry: THREE.BufferGeometry;
  system: Particulate.ParticleSystem;
  links: {
    bulb: number[];
    tail: number[];
    tentacles: number[];
    inner: number[];
    linesFore: number[];
    linesInner: number[];
  };
  faces: {
    bulb: number[];
    tail: number[];
    mouth: number[];
  };
  uvs: Float32Array;
  weights: number[];
  ribs: RibData[];
  tailRibs: RibData[];
  pins: {
    top: number;
    mid: number;
    bottom: number;
    tail: number;
    tentacle: number;
  };
  // Pin constraints for dynamic movement
  pinConstraints: {
    top: Particulate.PointConstraint;
    mid: Particulate.PointConstraint;
    bottom: Particulate.PointConstraint;
    tail: Particulate.PointConstraint;
    tentacle: Particulate.PointConstraint;
  };
  // Position tracking
  position: THREE.BufferAttribute;
  positionPrev: THREE.BufferAttribute;
}

// Helper functions ported from original Geometry.js
function point(x: number, y: number, z: number, buffer: number[]): number[] {
  buffer.push(x, y, z);
  return buffer;
}

function circle(segments: number, radius: number, y: number, buffer: number[], centerX: number = 0, centerZ: number = 0): number[] {
  const step = (Math.PI * 2) / segments;
  let angle = 0;

  for (let i = 0; i < segments; i++) {
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    buffer.push(x + centerX, y, z + centerZ);
    angle += step;
  }
  return buffer;
}

function circleModulated(
  segments: number,
  radius: number,
  y: number,
  buffer: number[],
  mod: ((angle: number) => number) | undefined,
  centerX: number,
  centerZ: number
): number[] {
  if (!mod) return circle(segments, radius, y, buffer, centerX, centerZ);

  const step = (Math.PI * 2) / segments;
  let angle = 0;

  for (let i = 0; i < segments; i++) {
    const m = mod(angle);
    const r = radius * Math.max(0.05, m);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    buffer.push(x + centerX, y, z + centerZ);
    angle += step;
  }
  return buffer;
}

// Helper functions ported from original Links.js
function line(index: number, howMany: number, buffer: number[]): number[] {
  for (let i = 0; i < howMany - 1; i++) {
    const a = index + i;
    const b = index + i + 1;
    buffer.push(a, b);
  }
  return buffer;
}

function loop(index: number, howMany: number, buffer: number[]): number[] {
  for (let i = 0; i < howMany - 1; i++) {
    const a = index + i;
    const b = index + i + 1;
    buffer.push(a, b);
  }
  // Close the loop
  buffer.push(index, index + howMany - 1);
  return buffer;
}

function rings(index0: number, index1: number, howMany: number, buffer: number[]): number[] {
  for (let i = 0; i < howMany; i++) {
    const a = index0 + i;
    const b = index1 + i;
    buffer.push(a, b);
  }
  return buffer;
}

function radial(indexCenter: number, index: number, howMany: number, buffer: number[]): number[] {
  for (let i = 0; i < howMany; i++) {
    const b = index + i;
    buffer.push(indexCenter, b);
  }
  return buffer;
}

// Helper functions ported from original Faces.js
function quadDoubleSide(a: number, b: number, c: number, d: number, buffer: number[]): number[] {
  buffer.push(
    a, b, c,
    c, d, a,
    d, c, b,
    b, a, d
  );
  return buffer;
}

function radialFaces(indexCenter: number, index: number, howMany: number, buffer: number[]): number[] {
  for (let i = 0, il = howMany - 1; i < il; i++) {
    const b = index + i + 1;
    const c = index + i;
    buffer.push(indexCenter, b, c);
  }
  // Close the fan
  buffer.push(indexCenter, index, index + howMany - 1);
  return buffer;
}

function ringFaces(index0: number, index1: number, howMany: number, buffer: number[]): number[] {
  for (let i = 0, il = howMany - 1; i < il; i++) {
    const a = index0 + i;
    const b = index0 + i + 1;
    const c = index1 + i + 1;
    const d = index1 + i;
    buffer.push(a, b, c, c, d, a);
  }
  // Close the ring
  const a = index0 + howMany - 1;
  const b = index0;
  const c = index1;
  const d = index1 + howMany - 1;
  buffer.push(a, b, c, c, d, a);
  return buffer;
}

// Utility functions
function tentacleWeight(t: number): number {
  return t * t * t;
}

function ribUvs(sv: number, howMany: number, buffer: number[]): number[] {
  for (let i = 1, il = howMany; i < il; i++) {
    const st = i / howMany;
    const su = (st <= 0.5 ? st : 1 - st) * 2;
    buffer.push(su, sv);
  }
  buffer.push(0, sv);
  return buffer;
}

function tentacleUvs(howMany: number, buffer: number[]): number[] {
  for (let i = 0, il = howMany; i < il; i++) {
    buffer.push(0, 0);
  }
  return buffer;
}

const LEGACY_SPEC: JellyfishSpec = {
  id: 'legacy',
  archetypeId: 'jellyfish',
  bodyPlan: BodyPlan.Medusa,
  features: { tail: true, mouth: true, tentacles: true },
  profiles: {
    bulb: { kind: 'legacy_bell' },
    tail: { kind: 'legacy_tail' },
  },
  emitters: {
    tentacles: {
      kind: 'legacy_tentacles',
      groupCount: 3,
      groupStartRib: 6,
      groupRibOffset: 4,
    },
  },
};

export interface JellyfishGeometryOptions {
  rng?: () => number;
}

export class JellyfishGeometry {
  private readonly spec: JellyfishSpec;
  private readonly cfg: JellyfishGeometryConfig;
  private readonly rng: () => number;
  private readonly tentacleAttachRibs: number[];

  // Temporary buffers
  private verts: number[] = [];
  private uvs: number[] = [];
  private links: number[] = [];
  private innerLinks: number[] = [];
  private tentLinks: number[] = [];
  private bulbFaces: number[] = [];
  private tailFaces: number[] = [];
  private mouthFaces: number[] = [];
  private weights: number[] = [];
  private queuedConstraints: Particulate.Constraint[] = [];
  private skins: SkinData[] = [];
  private tentacles: TentacleGroup[][] = [];
  private ribs: RibData[] = [];
  private tailRibs: RibData[] = [];

  // Pin indices
  private pinTop = 0;
  private pinMid = 1;
  private pinBottom = 2;
  private pinTail = 3;
  private pinTentacle = 4;
  private indexTop = 5;
  private indexMid = 6;
  private indexBottom = 7;
  private topStart = 8;

  // Position values
  private posTop: number;
  private posMid: number;
  private posBottom: number;
  private posTail: number;
  private posTentacle: number;

  private spineOffset(tParam: number): { x: number; z: number } {
    return evalSpineOffset(this.spec.spine, tParam);
  }

  private yToSpineT(y: number): number {
    // Map a y position into [0..1] using the core bulb range.
    const top = this.posTop;
    const bottom = this.posBottom;
    const denom = Math.max(1e-6, top - bottom);
    const t = (top - y) / denom;
    return Math.max(0, Math.min(1, t));
  }

  private getRadialMod(tParam: number): ((angle: number) => number) | undefined {
    const symmetry = this.spec.symmetry;
    const lobes = this.spec.lobes;
    const ridges = this.spec.surface?.ridges;
    const frill = this.spec.surface?.frill;

    const breaking = symmetry?.breaking ?? 0;
    const phaseJitter = (this.rng() * 2 - 1) * breaking * Math.PI;
    const ampMul = 1.0 - breaking * 0.25 + (this.rng() * 2 - 1) * breaking * 0.1;

    const lobeLayers: Array<{
      count: number;
      amp: number;
      phase: number;
      tRange?: [number, number];
    }> = [];

    if (lobes && lobes.count > 0 && lobes.amplitude > 0) {
      lobeLayers.push({
        count: lobes.count,
        amp: lobes.amplitude,
        phase: (lobes.phase ?? 0) + phaseJitter,
        tRange: lobes.tRange,
      });
    }

    if (ridges && ridges.count > 0 && ridges.amplitude > 0) {
      lobeLayers.push({
        count: ridges.count,
        amp: ridges.amplitude,
        phase: (ridges.phase ?? 0) + phaseJitter * 0.5,
        tRange: ridges.tRange,
      });
    } else if (!lobes && symmetry?.kind === 'radial' && symmetry.order > 1) {
      // Provide a gentle default ridge set when symmetry is specified.
      lobeLayers.push({
        count: symmetry.order,
        amp: 0.12 * (1 - breaking * 0.6),
        phase: (symmetry.phase ?? 0) + phaseJitter * 0.5,
        tRange: [0.15, 0.95],
      });
    }

    const fr = frill && frill.amplitude > 0 && frill.frequency > 0
      ? {
          amp: frill.amplitude * ampMul,
          freq: frill.frequency,
          phase: (frill.phase ?? 0) + phaseJitter,
          tRange: frill.tRange ?? [0.7, 1.0],
        }
      : undefined;

    const hasAny = lobeLayers.length > 0 || !!fr;
    if (!hasAny) return undefined;

    return (angle: number) => {
      let m = 1.0;

      for (const layer of lobeLayers) {
        if (layer.tRange) {
          const [a, b] = layer.tRange;
          if (tParam < a || tParam > b) continue;
        }
        m *= 1.0 + Math.cos(layer.count * angle + layer.phase) * (layer.amp * ampMul);
      }

      if (fr) {
        const [a, b] = fr.tRange;
        if (tParam >= a && tParam <= b) {
          m *= 1.0 + Math.sin(fr.freq * angle + fr.phase) * fr.amp;
        }
      }

      // Controlled imperfection: a subtle low-frequency wobble.
      if (breaking > 0) {
        m *= 1.0 + Math.cos(angle + phaseJitter) * (0.05 * breaking);
      }

      return m;
    };
  }

  constructor(spec?: CreatureSpec, options: JellyfishGeometryOptions = {}) {
    this.spec = (spec?.archetypeId === 'jellyfish' ? spec : LEGACY_SPEC) as JellyfishSpec;
    this.cfg = resolveGeometryConfig(this.spec);
    this.rng = options.rng ?? Math.random;

    // Calculate positions
    this.posTop = this.cfg.yOffset + this.cfg.size;
    this.posMid = this.cfg.yOffset;
    this.posBottom = this.cfg.yOffset - this.cfg.size;
    this.posTail = this.cfg.yOffset - this.cfg.tailArmSegments * this.cfg.tailArmSegmentLength;
    this.posTentacle = this.cfg.yOffset - this.cfg.tentacleSegments * this.cfg.tentacleSegmentLength * 1.5;

    const ribAtCount = this.cfg.tailRibsCount + this.cfg.ribsCount;
    const wantsTentacles = (this.spec.features?.tentacles ?? true) && this.cfg.tentacleSegments > 0;
    this.tentacleAttachRibs = wantsTentacles
      ? resolveTentacleGroups(this.spec.emitters?.tentacles, { rng: this.rng, ribCount: ribAtCount }).ribIndices
      : [];

    // Generate geometry
    this.createGeometry();
  }

  private shouldCapTop(): boolean {
    // Default intent is handled by validateCreatureSpec(), but keep a fallback for safety.
    const capTop = this.spec.topology?.capTop;
    if (typeof capTop === 'boolean') return capTop;
    return this.spec.bodyPlan !== BodyPlan.Salp;
  }

  private superformulaRadius(
    theta: number,
    sf: NonNullable<NonNullable<CreatureSpec['crossSection']>['superformula']>
  ): number {
    // r(θ) = ( |cos(mθ/4)/a|^n2 + |sin(mθ/4)/b|^n3 )^(-1/n1)
    const m = sf.m ?? 0;
    if (m <= 0) return 1.0;

    const a = sf.a ?? 1.0;
    const b = sf.b ?? 1.0;
    const n1 = sf.n1 ?? 0.35;
    const n2 = sf.n2 ?? 0.35;
    const n3 = sf.n3 ?? 0.35;

    const t = (m * theta) / 4.0;
    const c = Math.abs(Math.cos(t) / Math.max(1e-4, a));
    const s = Math.abs(Math.sin(t) / Math.max(1e-4, b));
    const v = Math.pow(c, n2) + Math.pow(s, n3);
    const r = v <= 1e-6 ? 1.0 : Math.pow(v, -1.0 / Math.max(1e-3, n1));

    // Keep it stable for constraints and avoid degenerate spikes.
    return Math.max(0.15, Math.min(2.25, r));
  }

  private ringVertex(theta: number, radius: number, yParam: number): { x: number; z: number } {
    const cs = this.spec.crossSection;
    const rot = (cs?.rotation ?? 0) + (cs?.twist ?? 0) * yParam;
    const a = theta + rot;

    let x = Math.cos(a) * radius;
    let z = Math.sin(a) * radius;

    if (!cs || cs.kind === 'circle') {
      return { x, z };
    }

    if (cs.kind === 'ellipse') {
      const xs = cs.xScale ?? 1.0;
      const zs = cs.zScale ?? 1.0;
      return { x: x * xs, z: z * zs };
    }

    if (cs.kind === 'superformula') {
      const sf = cs.superformula;
      const rMul = sf ? this.superformulaRadius(a, sf) : 1.0;
      return { x: x * rMul, z: z * rMul };
    }

    return { x, z };
  }

  private pushRingVertices(
    segments: number,
    radius: number,
    yPos: number,
    buffer: number[],
    mod: ((angle: number) => number) | undefined,
    centerX: number,
    centerZ: number,
    yParam: number
  ): void {
    const step = (Math.PI * 2) / segments;
    let angle = 0;

    for (let i = 0; i < segments; i++) {
      const m = mod ? mod(angle) : 1.0;
      const r = radius * Math.max(0.05, m);
      const v = this.ringVertex(angle, r, yParam);
      buffer.push(v.x + centerX, yPos, v.z + centerZ);
      angle += step;
    }
  }

  private ringSegmentStats(start: number, segments: number): { min: number; max: number; avg: number; circumference: number } {
    const base = start * 3;
    let min = Infinity;
    let max = 0;
    let sum = 0;

    for (let i = 0; i < segments; i++) {
      const ia = base + i * 3;
      const ib = base + ((i + 1) % segments) * 3;
      const dx = this.verts[ia] - this.verts[ib];
      const dy = this.verts[ia + 1] - this.verts[ib + 1];
      const dz = this.verts[ia + 2] - this.verts[ib + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      min = Math.min(min, d);
      max = Math.max(max, d);
      sum += d;
    }

    const avg = sum / Math.max(1, segments);
    return { min, max, avg, circumference: sum };
  }

  private createGeometry(): void {
    this.createCore();
    this.createBulb();

    if (this.spec.features?.tail ?? true) {
      this.createTail();
    }
    if (this.spec.features?.mouth ?? true) {
      this.createMouth();
    }
    if (this.spec.features?.tentacles ?? true) {
      this.createTentacles();
    }
  }

  // ...................................................
  // Core - Spine structure
  // ...................................................
  private createCore(): void {
    const segments = this.cfg.totalSegments;
    const size = this.cfg.size;

    // Define ranges for spine constraints
    const rangeTop = [0, size * 0.5];
    const rangeMid = [size * 0.5, size * 0.7];
    const rangeBottom = [0, size * 0.5];
    const rangeTopBottom = [size, size * 2];

    // Create spine constraints
    const spineA = Particulate.DistanceConstraint.create(rangeTop, [this.pinTop, this.indexTop]);
    const spineB = Particulate.DistanceConstraint.create(rangeMid, [this.indexTop, this.indexMid]);
    const spineC = Particulate.DistanceConstraint.create(rangeBottom, [this.pinBottom, this.indexBottom]);
    const spineD = Particulate.DistanceConstraint.create(rangeTopBottom, [this.indexTop, this.indexBottom]);
    const axis = Particulate.AxisConstraint.create(this.pinTop, this.pinMid, [this.indexTop, this.indexMid, this.indexBottom]);

    // Core positions (8 points: 5 pins + 3 floating)
    const offsetsY = [
      this.posTop, this.posMid, this.posBottom, this.posTail, this.posTentacle, // Pin offsets
      size * 1.5, -size * 0.5, -size // Floating pin offsets
    ];

    for (let i = 0, il = offsetsY.length; i < il; i++) {
      const y = offsetsY[i];
      const t = this.yToSpineT(y);
      const off = this.spineOffset(t);
      point(off.x, y, off.z, this.verts);
      this.uvs.push(0, 0);
    }

    this.queueConstraints(spineA, spineB, spineC, spineD, axis);
    if (this.shouldCapTop()) {
      radialFaces(this.indexTop, this.topStart, segments, this.bulbFaces);
    }
  }

  // ...................................................
  // Bulb - Bell geometry
  // ...................................................
  private createBulb(): void {
    const ribsCount = this.cfg.ribsCount;

    for (let i = 0, il = ribsCount; i < il; i++) {
      this.createRib(i, ribsCount);
      if (i > 0) {
        this.createSkin(i - 1, i);
      }
    }
  }

  private createRib(index: number, total: number): void {
    const segments = this.cfg.totalSegments;
    const size = this.cfg.size;
    const yParam = index / total;
    const yPos = size + this.cfg.yOffset - yParam * size;

    const start = index * segments + this.topStart;
    const radiusT = evalRadiusProfile(this.spec.profiles?.bulb, yParam);
    const radius = radiusT * this.cfg.ribRadius;

    // Generate circle vertices
    const center = this.spineOffset(yParam);
    const mod = this.getRadialMod(yParam);
    this.pushRingVertices(segments, radius, yPos, this.verts, mod, center.x, center.z, yParam);
    ribUvs(yParam, segments, this.uvs);

    // Outer rib structure
    const ribIndices = loop(start, segments, []);
    const segStats = this.ringSegmentStats(start, segments);
    const ampApprox =
      Math.abs(this.spec.lobes?.amplitude ?? 0) +
      Math.abs(this.spec.surface?.ridges?.amplitude ?? 0) +
      Math.abs(this.spec.surface?.frill?.amplitude ?? 0) * 0.5;
    const amp = Math.min(0.6, ampApprox);
    const outerLenMin = segStats.min * Math.max(0.65, 0.9 - 0.25 * amp);
    const outerLenMax = segStats.max * (1.05 + 1.5 * amp);
    const outerRib = Particulate.DistanceConstraint.create([outerLenMin, outerLenMax], ribIndices);

    // Inner rib sub-structure
    const innerLen = segStats.circumference / 3;
    const innerRib = this.createInnerRib(start, innerLen);

    // Attach bulb to spine at top and bottom
    let spine: Particulate.DistanceConstraint | undefined;
    let spineCenter: number | undefined;
    let radiusSpine: number | undefined;

    const isTop = index === 0;
    const isBottom = index === total - 1;

    if (isTop || isBottom) {
      spineCenter = isTop ? this.indexTop : this.indexBottom;
      radiusSpine = isTop ? radius * 1.25 : radius;
      spine = Particulate.DistanceConstraint.create(
        [radius * 0.5, radiusSpine],
        radial(spineCenter, start, segments, [])
      );

      this.queueConstraints(spine);
      if (isTop) {
        this.addLinks(spine.indices);
      } else {
        this.addLinks(spine.indices, this.innerLinks);
      }
    }

    this.addLinks(outerRib.indices, this.innerLinks);
    this.addLinks(innerRib.indices, this.innerLinks);
    this.queueConstraints(outerRib, innerRib);

    this.ribs.push({
      start,
      radius,
      centerX: center.x,
      centerZ: center.z,
      radiusSpine,
      yParam,
      yPos,
      outer: outerRib,
      inner: innerRib,
      spine,
      initialDistances: {
        outer: [outerLenMin, outerLenMax],
        inner: [innerLen * 0.8, innerLen],
      },
    });
  }

  private createInnerRib(start: number, length: number): Particulate.DistanceConstraint {
    const segmentGroups = this.cfg.segmentsCount;
    const segments = this.cfg.totalSegments;
    const indices: number[] = [];
    const step = Math.floor(segments / 3);

    for (let i = 0, il = segmentGroups; i < il; i++) {
      const offset = i * 3;
      for (let j = 0; j < 3; j++) {
        const a = offset + step * j;
        const b = offset + step * ((j + 1) % 3);
        indices.push(start + a % segments, start + b % segments);
      }
    }

    return Particulate.DistanceConstraint.create([length * 0.8, length], indices);
  }

  private createSkin(r0: number, r1: number): void {
    const segments = this.cfg.totalSegments;
    const rib0 = this.ribs[r0];
    const rib1 = this.ribs[r1];

    const dist = Particulate.Vec3.distance(this.verts, rib0.start, rib1.start);
    const skin = Particulate.DistanceConstraint.create(
      [dist * 0.5, dist],
      rings(rib0.start, rib1.start, segments, [])
    );

    this.queueConstraints(skin);
    this.addLinks(skin.indices);
    ringFaces(rib0.start, rib1.start, segments, this.bulbFaces);

    this.skins.push({ a: r0, b: r1 });
  }

  // ...................................................
  // Tail
  // ...................................................
  private createTail(): void {
    const ribsCount = this.cfg.tailRibsCount;

    for (let i = 0, il = ribsCount; i < il; i++) {
      this.createTailRib(i, ribsCount);
      this.createTailSkin(i - 1, i);
    }
  }

  private createTailRib(index: number, total: number): void {
    const lastRib = this.ribs[this.ribs.length - 1];
    const segments = this.cfg.totalSegments;
    const size = this.cfg.size;
    const yParam = index / total;
    const yPos = lastRib.yPos - yParam * size * 0.8;

    const start = this.verts.length / 3;
    const radiusT = evalRadiusProfile(this.spec.profiles?.tail, yParam);
    const radius = radiusT * lastRib.radius;
    const radiusOuter = radius + yParam * this.cfg.tailRibRadiusFactor;

    // Tail follows the last bulb rib center by default (stable + pretty).
    const centerX = lastRib.centerX ?? 0;
    const centerZ = lastRib.centerZ ?? 0;
    const mod = this.getRadialMod(1.0); // a touch of rim detail if present
    this.pushRingVertices(segments, radius, yPos, this.verts, mod, centerX, centerZ, yParam);
    ribUvs(yParam, segments, this.uvs);

    // Main folding structure
    const mainIndices = loop(start, segments, []);
    const segStats = this.ringSegmentStats(start, segments);
    const outerScale = radius > 1e-4 ? radiusOuter / radius : 1.0;
    const mainLen = segStats.avg * outerScale;
    const mainRib = Particulate.DistanceConstraint.create([mainLen * 0.85, mainLen * 1.45], mainIndices);

    // Inner rib sub-structure
    const innerLen = segStats.circumference / 3;
    const innerRib = this.createInnerRib(start, innerLen);

    // Attach to spine at end
    let spine: Particulate.DistanceConstraint | undefined;
    if (index === total - 1) {
      const spineCenter = this.indexMid;
      spine = Particulate.DistanceConstraint.create(
        [radius * 0.8, radius],
        radial(spineCenter, start, segments, [])
      );
      this.queueConstraints(spine);
      this.addLinks(spine.indices, this.innerLinks);
    }

    this.queueConstraints(mainRib, innerRib);
    if (index > this.cfg.tailLinkOffset) {
      this.addLinks(mainRib.indices);
    }

    this.tailRibs.push({
      start,
      yParam: 1 - yParam,
      yPos,
      radius,
      radiusOuter,
      centerX,
      centerZ,
      inner: innerRib,
      outer: mainRib,
      spine,
      initialDistances: {
        outer: [mainLen * 0.85, mainLen * 1.45],
      },
    });
  }

  private createTailSkin(r0: number, r1: number): void {
    const segments = this.cfg.totalSegments;
    const rib0 = r0 < 0 ? this.ribs[this.ribs.length - 1] : this.tailRibs[r0];
    const rib1 = this.tailRibs[r1];

    const dist = Particulate.Vec3.distance(this.verts, rib0.start, rib1.start);
    const skin = Particulate.DistanceConstraint.create(
      [dist * 0.5, dist],
      rings(rib0.start, rib1.start, segments, [])
    );

    this.queueConstraints(skin);
    this.addLinks(skin.indices, this.innerLinks);
    ringFaces(rib0.start, rib1.start, segments, this.tailFaces);
  }

  // ...................................................
  // Tentacles
  // ...................................................
  private createTentacles(): void {
    if (this.cfg.tentacleSegments <= 0) return;
    if (this.tentacleAttachRibs.length === 0) return;

    const tentacleGroupCount = this.tentacleAttachRibs.length;
    for (let i = 0; i < tentacleGroupCount; i++) {
      this.createTentacleGroup(i, tentacleGroupCount, this.tentacleAttachRibs[i]);
    }
  }

  private createTentacleGroup(groupIndex: number, totalGroups: number, ribAtIndex: number): void {
    const rib = this.ribAt(ribAtIndex);
    const ratio = totalGroups <= 1 ? 1 : 1 - groupIndex / (totalGroups - 1);
    const segments = this.cfg.tentacleSegments;
    const count = Math.floor(segments * (0.75 + 0.25 * ratio));
    if (count <= 0) return;

    for (let i = 0, il = count; i < il; i++) {
      this.createTentacleSegment(groupIndex, i, count, rib);

      if (i > 0) {
        this.linkTentacle(groupIndex, i - 1, i);
      } else {
        this.attachTentacles(groupIndex, rib);
      }
    }

    this.attachTentaclesSpine(groupIndex, count);
  }

  private createTentacleSegment(groupIndex: number, index: number, total: number, rib: RibData): void {
    const segments = this.cfg.totalSegments;
    const radius = rib.radius * (0.25 * Math.sin(index * 0.25) + 0.5);
    const yPos = -index * this.cfg.tentacleSegmentLength + this.cfg.yOffset;
    const start = this.verts.length / 3;
    const weight = tentacleWeight(index / total) * this.cfg.tentacleWeightFactor;

    circle(segments, radius, yPos, this.verts, rib.centerX ?? 0, rib.centerZ ?? 0);
    tentacleUvs(segments, this.uvs);
    this.queueWeights(start, segments, weight);

    if (index === 0) {
      this.tentacles[groupIndex] = [];
    }

    this.tentacles[groupIndex].push({ start });
  }

  private attachTentacles(groupIndex: number, rib: RibData): void {
    const tent = this.tentacles[groupIndex][0];
    const segments = this.cfg.totalSegments;
    const dist = this.cfg.tentacleSegmentLength;

    const tentacle = Particulate.DistanceConstraint.create(
      [dist * 0.5, dist],
      rings(rib.start, tent.start, segments, [])
    );

    this.queueConstraints(tentacle);
    this.addLinks(tentacle.indices, this.tentLinks);
  }

  private attachTentaclesSpine(groupIndex: number, segmentCount: number): void {
    const group = this.tentacles[groupIndex];
    const tent = group[group.length - 1];
    const start = tent.start;
    const center = this.pinTentacle;
    const segments = this.cfg.totalSegments;
    const dist = segmentCount * this.cfg.tentacleSegmentLength;

    const spine = Particulate.DistanceConstraint.create(
      [dist * 0.5, dist],
      radial(center, start, segments, [])
    );

    this.queueConstraints(spine);
  }

  private linkTentacle(groupIndex: number, i0: number, i1: number): void {
    const segments = this.cfg.totalSegments;
    const tentacleGroup = this.tentacles[groupIndex];
    const tent0 = tentacleGroup[i0];
    const tent1 = tentacleGroup[i1];
    const dist = this.cfg.tentacleSegmentLength;

    const tentacle = Particulate.DistanceConstraint.create(
      [dist * 0.5, dist],
      rings(tent0.start, tent1.start, segments, [])
    );

    this.queueConstraints(tentacle);
    this.addLinks(tentacle.indices, this.tentLinks);
    this.addLinks(tentacle.indices, this.innerLinks);
  }

  // ...................................................
  // Mouth (Arms)
  // ...................................................
  private createMouth(): void {
    this.createMouthArmGroup(1.0, 0, 4, 3);
    this.createMouthArmGroup(0.8, 1, 8, 3, 3);
    this.createMouthArmGroup(0.5, 7, 9, 6);
  }

  private createMouthArmGroup(vScale: number, r0: number, r1: number, count: number, offset?: number): void {
    for (let i = 0, il = count; i < il; i++) {
      this.createMouthArm(vScale, r0, r1, i, count, offset);
    }
  }

  private createMouthArm(vScale: number, r0: number, r1: number, index: number, total: number, offset?: number): void {
    const tParam = index / total;
    const startOffset = this.posMid;

    const ribInner = this.ribAt(r0);
    const ribOuter = this.ribAt(r1);
    const ribSegments = this.cfg.totalSegments;
    const ribIndex = (Math.round(ribSegments * tParam) + (offset || 0)) % ribSegments;

    const innerPin = ribInner.start + ribIndex;
    const outerPin = ribOuter.start + ribIndex;
    const scale = Particulate.Vec3.distance(this.verts, innerPin, outerPin);

    const maxSegments = this.cfg.tailArmSegments;
    const segments = Math.round(vScale * maxSegments);
    const innerSize = this.cfg.tailArmSegmentLength;
    const outerSize = innerSize * 2.4;
    const bottomPinMax = 20 + (maxSegments - segments) * this.cfg.tailArmSegmentLength;

    const innerStart = this.verts.length / 3;
    const innerEnd = innerStart + segments - 1;
    const outerStart = innerStart + segments;

    const innerIndices = line(innerStart, segments, [innerPin, innerStart]);
    const outerIndices = line(outerStart, segments, [outerPin, outerStart]);

    const linkConstraints: Particulate.DistanceConstraint[] = [];
    const braceIndices: number[] = [];
    const linkIndices: number[] = [];

    const outerAngle = Math.PI * 2 * tParam;
    const baseX = Math.cos(outerAngle);
    const baseZ = Math.sin(outerAngle);

    // Generate inner points
    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1);
      point(0, startOffset - i * innerSize, 0, this.verts);
      this.uvs.push(t, 0);
    }

    // Generate outer points and constraints
    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1);
      const innerIndex = innerStart + i;
      const outerIndex = outerStart + i;

      const linkSize = scale *
        (Math.sin(Math.PI * 0.5 + 10 * t) * 0.25 + 0.75) *
        (Math.sin(Math.PI * 0.5 + 20 * t) * 0.25 + 0.75) *
        (Math.sin(Math.PI * 0.5 + 26 * t) * 0.15 + 0.85) *
        (Math.sin(Math.PI * 0.5 + Math.PI * 0.45 * t));

      const outerX = baseX * linkSize;
      const outerZ = baseZ * linkSize;
      const outerY = startOffset - i * innerSize;

      point(outerX, outerY, outerZ, this.verts);
      this.uvs.push(t, 1);

      linkConstraints.push(Particulate.DistanceConstraint.create(linkSize, [innerIndex, outerIndex]));

      if (i > 10) {
        braceIndices.push(innerIndex - 10, outerIndex);
      }

      if (i > 1) {
        linkIndices.push(innerIndex - 1, outerIndex);
        quadDoubleSide(innerIndex - 1, outerIndex - 1, outerIndex, innerIndex, this.mouthFaces);
      }
    }

    const inner = Particulate.DistanceConstraint.create([innerSize * 0.25, innerSize], innerIndices);
    const outer = Particulate.DistanceConstraint.create([outerSize * 0.25, outerSize], outerIndices);
    const brace = Particulate.DistanceConstraint.create([0, Infinity], braceIndices);
    const pin = Particulate.DistanceConstraint.create([0, bottomPinMax], [innerEnd, this.pinTail]);

    this.queueConstraints(inner, outer, brace, pin);
    this.queueConstraints(linkConstraints);

    this.queueWeights(innerStart, segments * 2, this.cfg.tailArmWeight);

    this.addLinks(innerIndices);
    this.addLinks(outerIndices);
    this.addLinks(linkIndices, this.tentLinks);
    this.addLinks(braceIndices, this.tentLinks);
    this.addLinks(innerIndices, this.innerLinks);
    this.addLinks(outerIndices, this.innerLinks);
    this.addLinks(linkIndices, this.innerLinks);
    this.addLinks(braceIndices, this.innerLinks);
    this.addLinks(pin.indices, this.innerLinks);
  }

  // ...................................................
  // Helper methods
  // ...................................................
  private ribAt(index: number): RibData {
    return this.tailRibs[this.tailRibs.length - index - 1] ||
      this.ribs[this.ribs.length - index + this.tailRibs.length - 1];
  }

  private queueConstraints(...constraints: (Particulate.Constraint | Particulate.Constraint[])[]): void {
    for (const constraint of constraints) {
      if (Array.isArray(constraint)) {
        this.queuedConstraints.push(...constraint);
      } else {
        this.queuedConstraints.push(constraint);
      }
    }
  }

  private queueWeights(start: number, howMany: number, weight: number): void {
    const end = start + howMany;

    // Extend weights array if needed
    if (this.weights.length < end) {
      for (let i = this.weights.length; i < end; i++) {
        this.weights.push(1);
      }
    }

    for (let i = start; i < end; i++) {
      this.weights[i] = weight;
    }
  }

  private addLinks(indices: number[], target?: number[]): void {
    const buffer = target || this.links;
    for (let i = 0, il = indices.length; i < il; i++) {
      buffer.push(indices[i]);
    }
  }

  // ...................................................
  // Public API - Create the full geometry data
  // ...................................................
  public static create(spec?: CreatureSpec): JellyfishGeometryData {
    const geometry = new JellyfishGeometry(spec);
    return geometry.generate();
  }

  public generate(): JellyfishGeometryData {
    // Create particle system
    const system = Particulate.ParticleSystem.create(this.verts, 2);

    // Add constraints
    for (const constraint of this.queuedConstraints) {
      system.addConstraint(constraint);
    }

    // Set weights
    for (let i = 0, il = this.weights.length; i < il; i++) {
      system.setWeight(i, this.weights[i]);
    }

    // Pin the core (zero weight)
    system.setWeight(this.pinTop, 0);
    system.setWeight(this.pinMid, 0);
    system.setWeight(this.pinBottom, 0);
    system.setWeight(this.pinTail, 0);

    // Add pin constraints
    const topOff = this.spineOffset(0.0);
    const midOff = this.spineOffset(0.5);
    const botOff = this.spineOffset(1.0);

    const pinConstraintTop = Particulate.PointConstraint.create([topOff.x, this.posTop, topOff.z], this.pinTop);
    const pinConstraintMid = Particulate.PointConstraint.create([midOff.x, this.posMid, midOff.z], this.pinMid);
    const pinConstraintBottom = Particulate.PointConstraint.create([botOff.x, this.posBottom, botOff.z], this.pinBottom);
    const pinConstraintTail = Particulate.PointConstraint.create([botOff.x, this.posTail, botOff.z], this.pinTail);
    const pinConstraintTentacle = Particulate.PointConstraint.create([botOff.x, this.posTentacle, botOff.z], this.pinTentacle);

    system.addPinConstraint(pinConstraintTop);
    system.addPinConstraint(pinConstraintMid);
    system.addPinConstraint(pinConstraintBottom);
    system.addPinConstraint(pinConstraintTail);
    system.addPinConstraint(pinConstraintTentacle);

    // Create buffer geometry
    const geometry = new THREE.BufferGeometry();
    const uvsArray = new Float32Array(this.uvs);

    // Create buffer attributes that share the particle system position arrays
    const position = new THREE.BufferAttribute(system.positions, 3);
    const positionPrev = new THREE.BufferAttribute(system.positionsPrev, 3);
    const uvs = new THREE.BufferAttribute(uvsArray, 2);

    geometry.setAttribute('position', position);
    geometry.setAttribute('positionPrev', positionPrev);
    geometry.setAttribute('uv', uvs);

    // Create an empty normal attribute to satisfy TSL requirements and suppress warnings
    // for meshes that don't need lighting but use materials that may check for it.
    const normals = new Float32Array(system.positions.length);
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    return {
      spec: this.spec,
      config: this.cfg,
      geometry,
      system,
      links: {
        bulb: this.links,
        tail: [], // Tail links are in links array
        tentacles: this.tentLinks,
        inner: this.innerLinks,
        linesFore: this.generateLinesFore(),
        linesInner: this.generateLinesInner(),
      },
      faces: {
        bulb: this.bulbFaces,
        tail: this.tailFaces,
        mouth: this.mouthFaces,
      },
      uvs: uvsArray,
      weights: this.weights,
      ribs: this.ribs,
      tailRibs: this.tailRibs,
      pins: {
        top: this.pinTop,
        mid: this.pinMid,
        bottom: this.pinBottom,
        tail: this.pinTail,
        tentacle: this.pinTentacle,
      },
      pinConstraints: {
        top: pinConstraintTop,
        mid: pinConstraintMid,
        bottom: pinConstraintBottom,
        tail: pinConstraintTail,
        tentacle: pinConstraintTentacle,
      },
      position,
      positionPrev,
    };
  }

  // ...................................................
  // Visual line generators for rib structure
  // Matching original Medusae.js approach exactly
  // ....................................................
  private generateLinesFore(): number[] {
    // Use skin constraint indices directly like original Medusae.js
    // Skin constraints (this.links) connect vertices between adjacent ribs
    // These naturally follow the curved surface created by physics
    // LineSegments with these indices creates smooth organic curves
    return [...this.links];
  }

  private generateLinesInner(): number[] {
    // Use inner constraint indices like original Medusae.js
    // Inner links form the structural framework
    return [...this.innerLinks];
  }
}

export default JellyfishGeometry;
