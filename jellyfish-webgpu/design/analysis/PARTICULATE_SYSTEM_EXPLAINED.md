# Particulate System: How Jellyfish Geometry is Made

**Date**: 2026-02-09
**Subject**: Complete explanation of the Particulate physics system and how it generates jellyfish shapes

---

## Overview

The jellyfish geometry is created using **Particulate.js**, a lightweight particle physics library (~3.7kb) based on Thomas Jakobsen's Verlet integration (advanced character physics).

```
┌─────────────────────────────────────────────────────────────┐
│                   PARTICULATE ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. PARTICLES (Points in 3D space)                            │
│     ┌─────────────────────────────────────────────┐          │
│     │  ~2000 particles with positions (x,y,z)      │          │
│     │  Each particle has:                          │          │
│     │  - position (current frame)                  │          │
│     │  - positionPrev (previous frame)             │          │
│     │  - weight (physics influence)                │          │
│     └─────────────────────────────────────────────┘          │
│                          ↓                                   │
│  2. CONSTRAINTS (Rules connecting particles)                   │
│     ┌─────────────────────────────────────────────┐          │
│     │  DistanceConstraint: keep 2 points apart     │          │
│     │  PointConstraint: pin point to fixed loc     │          │
│     │  AxisConstraint: align points along axis     │          │
│     └─────────────────────────────────────────────┘          │
│                          ↓                                   │
│  3. VERLET INTEGRATION (Physics simulation)                    │
│     ┌─────────────────────────────────────────────┐          │
│     │  each frame:                                 │          │
│     │    1. Apply forces (gravity, nudges)         │          │
│     │    2. Satisfy constraints (iterative)        │          │
│     │    3. Update positions                       │          │
│     └─────────────────────────────────────────────┘          │
│                          ↓                                   │
│  4. RENDERING (Three.js WebGPU)                               │
│     ┌─────────────────────────────────────────────┐          │
│     │  - Vertex positions = particle positions    │          │
│     │  - Triangle faces connect vertices           │          │
│     │  - InterpolatedNodeMaterial smooths motion   │          │
│     └─────────────────────────────────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Particle Creation

### The Core Structure (Spine)

First, 8 particles form the central spine:

```typescript
// From JellyfishGeometry.ts createCore()

const corePositions = [
  // Pin particles (fixed in space)
  posTop,     // Apex of bell
  posMid,     // Center of bell
  posBottom,  // Bottom of bell
  posTail,    // Tail anchor
  posTentacle, // Tentacle anchor

  // Floating particles (controlled by constraints)
  size * 1.5,   // Above top
  -size * 0.5,  // Between top and mid
  -size         // Below mid
];
```

**Visual:**
```
        ● pinTop (apex)
        |
    ●───●───● (spine constraints)
    │   │   │
●─pinMid─●   │
    │       │
 ●pinBottom  │
    │       │
    ●───●───●
    │
●pinTail
```

---

## Step 2: Rib Generation (The Bell Shape)

### Creating Horizontal Rings

For each rib (18-20 ribs total):

```typescript
private createRib(index: number, total: number): void {
  const segments = 36;  // Vertices around the circle
  const yParam = index / total;  // 0 at top, 1 at bottom
  const yPos = size + yOffset - yParam * size;

  // 1. Calculate radius from profile curve
  const radiusT = evalRadiusProfile(spec.profiles?.bulb, yParam);
  const radius = radiusT * ribRadius;

  // 2. Generate circle vertices with modifications
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const mod = getRadialMod(yParam)(angle);  // Lobes, ridges, etc.

    // Apply cross-section deformation
    const v = ringVertex(angle, radius * mod, yParam);
    verts.push(v.x + centerX, yPos, v.z + centerZ);
  }

  // 3. Create outer rib constraint (keeps vertices in a ring)
  const outerRib = DistanceConstraint.create([minLen, maxLen], ribIndices);

  // 4. Create inner rib constraint (triangulates the ring)
  const innerRib = createInnerRib(start, circumference / 3);

  // 5. Attach top/bottom ribs to spine
  if (isTop || isBottom) {
    const spine = DistanceConstraint.create([min, max], radialIndices);
  }
}
```

### What This Creates

For each rib, we get ~36 vertices in a circle:

```
     Top View (looking down on a rib):
              ●
           ●     ●
         ●         ●
        ●  CENTER   ●
         ●         ●
           ●     ●
              ●
```

With modifications applied:
- **Lobes**: Radial sine wave modulation
- **Ridges**: Comb-row style protrusions
- **Frills**: Rim ruffles at bottom
- **Cross-section**: Circle → Ellipse → Superformula

---

## Step 3: Skin Creation (Connecting Ribs)

### Vertical Faces Between Ribs

```typescript
private createSkin(ribIndexA: number, ribIndexB: number): void {
  const rib0 = ribs[ribIndexA];
  const rib1 = ribs[ribIndexB];
  const segments = 36;

  // 1. Create skin constraint (connects corresponding vertices)
  const dist = Vec3.distance(verts, rib0.start, rib1.start);
  const skin = DistanceConstraint.create([dist * 0.5, dist], ringIndices);

  // 2. Create triangle faces
  for (let i = 0; i < segments - 1; i++) {
    const a = rib0.start + i;
    const b = rib0.start + i + 1;
    const c = rib1.start + i + 1;
    const d = rib1.start + i;

    // Two triangles per quad
    faces.push(a, b, c);  // First triangle
    faces.push(c, d, a);  // Second triangle (double-sided)
  }
}
```

**Visual (unrolled):**
```
Rib 0:  ●━━━●━━━●━━━●  ← 36 vertices
         │╱  │╱  │╱
Rib 1:  ●━━━●━━━●━━━●
         │╱  │╱  │╱
Rib 2:  ●━━━●━━━●━━━●
```

---

## Step 4: Tail, Mouth, Tentacles

### Tail (Cone-like structure)

Similar to bulb, but ribs get progressively smaller and follow tail profile curve.

```typescript
private createTailRib(index: number, total: number): void {
  const yParam = index / total;
  const lastRib = ribs[ribs.length - 1];

  // Tail follows last bulb rib's center (stable)
  const centerX = lastRib.centerX;
  const centerZ = lastRib.centerZ;

  // Radius shrinks based on tail profile
  const radiusT = evalRadiusProfile(spec.profiles?.tail, yParam);
  const radius = radiusT * lastRib.radius;

  // ... generate vertices like bulb ribs
}
```

### Mouth Arms (Fractal-like branching)

```typescript
private createMouthArm(vScale: number, r0: number, r1: number, count: number) {
  // For each arm:
  // 1. Find attachment point on rib
  const ribIndex = (Math.round(ribSegments * tParam) + offset) % ribSegments;

  // 2. Create inner spine (points going down)
  const innerStart = verts.length / 3;
  for (let i = 0; i < segments; i++) {
    point(0, startY - i * innerSize, 0, verts);  // Center line
  }

  // 3. Create outer spine (curved outward)
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const linkSize = scale * sinPattern(t);  // Wavy pattern
    point(baseX * linkSize, startY - i * innerSize, baseZ * linkSize, verts);
  }

  // 4. Connect inner and outer with links (like ladder rungs)
  // 5. Add braces for stability
  // 6. Pin end to tail anchor
}
```

**Visual:**
```
Rib attachment
      │
      ├─╲  (outer curves outward)
      │   ╲
      │    ●─●─●  (rungs)
      │   ╱
      ├─╱
      │
    (pinned)
```

### Tentacles (Hanging chains)

```typescript
private createTentacleSegment(groupIndex: number, index: number, total: number, rib: RibData) {
  const radius = rib.radius * (0.25 * Math.sin(index * 0.25) + 0.5);
  const yPos = -index * tentacleSegmentLength + yOffset;
  const start = verts.length / 3;

  // Create circle at this segment
  circle(segments, radius, yPos, verts, rib.centerX, rib.centerZ);

  // Weight determines how much physics affects this particle
  const weight = tentacleWeight(index / total) * tentacleWeightFactor;
  // Higher index = more weight = less affected by physics
}
```

**Visual:**
```
     Rib attachment
         │
         ● (thick, heavy)
         │
         ●
         │
         ● (thinner)
         │
         ● (thin, light)
```

---

## Step 5: Constraint System

### Distance Constraint (Spring-like)

```typescript
DistanceConstraint.create([minDistance, maxDistance], [p0, p1, p2, ...])
```

Keeps particles at a specific distance range. In Verlet integration:

```javascript
// During physics tick:
for (const constraint of distanceConstraints) {
  for (const [i, j] of constraint.pairs) {
    const dx = positions[j*3] - positions[i*3];
    const dy = positions[j*3+1] - positions[i*3+1];
    const dz = positions[j*3+2] - positions[i*3+2];
    const currentDist = sqrt(dx*dx + dy*dy + dz*dz);

    if (currentDist < min || currentDist > max) {
      // Push/pull particles to satisfy constraint
      const diff = (currentDist - targetDist) / currentDist;
      const offsetX = dx * diff * 0.5;
      const offsetY = dy * diff * 0.5;
      const offsetZ = dz * diff * 0.5;

      positions[i*3] += offsetX;
      positions[i*3+1] += offsetY;
      positions[i*3+2] += offsetZ;
      positions[j*3] -= offsetX;
      // ...
    }
  }
}
```

### Point Constraint (Pinning)

```typescript
PointConstraint.create([x, y, z], particleIndex)
```

Locks a particle to a fixed position (doesn't move during physics).

### Axis Constraint (Alignment)

```typescript
AxisConstraint.create(centerParticle, [p1, p2, p3])
```

Keeps particles aligned along an axis through the center particle.

---

## Step 6: Physics Simulation (Verlet Integration)

### The Verlet Integration Loop

```typescript
// In Particulate.ParticleSystem.tick(deltaTime)

// 1. Apply forces (gravity, user nudges)
for (let i = 0; i < particleCount; i++) {
  const idx = i * 3;
  // Verlet integration: position = 2*current - previous + acceleration*dt²
  const vx = positions[idx] - positionsPrev[idx];
  const vy = positions[idx+1] - positionsPrev[idx+1];
  const vz = positions[idx+2] - positionsPrev[idx+2];

  positionsPrev[idx] = positions[idx];
  positions[idx] += vx + forces[idx] * dt * dt;
  // ...
}

// 2. Satisfy constraints (iterative relaxation)
for (let iter = 0; iter < relaxIterations; iter++) {
  for (const constraint of constraints) {
    constraint.solve(positions);
  }
}

// 3. Update positionPrev for next frame
```

### Why Verlet?

**Traditional integration:**
```javascript
velocity += acceleration * dt;
position += velocity * dt;
```

**Verlet integration:**
```javascript
temp = position;
position = 2*position - positionPrev + acceleration*dt*dt;
positionPrev = temp;
```

Advantages for soft-body:
- **Implicit velocity**: No need to store velocity separately
- **Stable**: Less prone to explosion
- **Easy constraints**: Distance constraints naturally form structures
- **Time-step independent**: Works well with variable frame rates

---

## Step 7: Triangle Face Generation

### From Particles to Renderable Mesh

```typescript
private generate(): JellyfishGeometryData {
  // 1. Create particle system from generated vertices
  const system = Particulate.ParticleSystem.create(verts, 2);
  // 2 = number of relaxation iterations per tick

  // 2. Add all queued constraints
  for (const constraint of queuedConstraints) {
    system.addConstraint(constraint);
  }

  // 3. Set weights for different regions
  for (const [i, weight] of weights) {
    system.setWeight(i, weight);
  }

  // 4. Pin core particles (weight = 0 = fixed)
  system.setWeight(pinTop, 0);
  system.setWeight(pinMid, 0);
  system.setWeight(pinBottom, 0);

  // 5. Add pin constraints
  system.addPinConstraint(pinConstraintTop);
  system.addPinConstraint(pinConstraintMid);
  // ...

  // 6. Create BufferGeometry for Three.js
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(system.positions, 3);
  const positionPrev = new THREE.BufferAttribute(system.positionsPrev, 3);
  const uvs = new THREE.BufferAttribute(new Float32Array(uvsArray), 2);

  geometry.setAttribute('position', position);
  geometry.setAttribute('positionPrev', positionPrev);
  geometry.setAttribute('uv', uvs);

  // 7. Set face indices for rendering
  geometry.setIndex(faces.bulb);  // Triangle indices

  return { geometry, system, /* ... */ };
}
```

---

## Step 8: Rendering (Three.js)

### The Interpolation Trick

Physics runs at 30 FPS, rendering at 60 FPS. How do we get smooth motion?

```typescript
// InterpolatedNodeMaterial

positionNode = mix(
  attribute('positionPrev', 'vec3'),
  attribute('position', 'vec3'),
  uniform(0.0)  // stepProgress
);
```

In the render loop:

```typescript
// InterpolationSystem.update() returns 0.0 to 1.0
const stepProgress = interpolation.update(deltaTime, (physicsDelta) => {
  jellyfish.updatePhysics(physicsDelta);  // Called at 30 FPS
});

// Update material interpolation
jellyfish.setStepProgress(stepProgress);  // Smooth 60 FPS
```

**Visual:**
```
Frame 0 (physics):  ●────────●  (positionPrev)
Frame 1 (render):   ●───────●   (0.5 mix)
Frame 2 (physics):  ○────────○  (position)
Frame 3 (render):   ○───────○   (0.5 mix)
```

---

## Particle Count Breakdown

For a typical jellyfish:

| Component | Particles | Notes |
|-----------|-----------|-------|
| Core (spine) | 8 | 5 pins + 3 floating |
| Bulb ribs (20 × 36) | 720 | Main bell |
| Tail ribs (15 × 36) | 540 | Tail cone |
| Mouth arms | ~400 | 3 arms × ~130 each |
| Tentacles | ~200-400 | Depends on config |
| **Total** | **~1,900-2,100** | Per jellyfish |

For 500 jellyfish: ~1,000,000 particles total!

---

## Summary: How the Shape is Made

1. **Start with spine** (8 core particles)
2. **Create ribs** (horizontal rings of 36 vertices each)
3. **Apply modifications** (lobes, ridges, cross-section changes)
4. **Connect ribs** with skin constraints + triangle faces
5. **Add appendages** (tail, mouth arms, tentacles)
6. **Generate constraints** (outer rib, inner rib, skin, spine)
7. **Run Verlet physics** (particles move within constraints)
8. **Render with interpolation** (smooth 60 FPS from 30 FPS physics)

The result is a soft-body simulation where:
- The **bell shape** emerges from rib constraints
- **Pulsing motion** comes from changing constraint distances
- **Organic movement** is natural Verlet physics
- **Smooth rendering** uses TSL interpolation between frames

---

## Key Takeaways for Stage 3

1. **Rib-based architecture** is fundamental - cannot easily change to pure SDF
2. **Constraints define shape** - changing constraint ranges changes the form
3. **Profile curves control silhouette** - `evalRadiusProfile()` is key
4. **Cross-section enables variety** - circle/ellipse/superformula changes 3D form
5. **Physics = rendering** - particle positions ARE vertex positions

**For new archetypes**, we primarily:
- Adjust rib count and spacing
- Modify profile curves
- Change cross-section type
- Add/remove surface features
- Modify constraint ranges
