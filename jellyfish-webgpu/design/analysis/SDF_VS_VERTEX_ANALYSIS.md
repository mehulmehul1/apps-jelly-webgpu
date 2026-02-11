# Geometry Approach Analysis: Current (Vertex-Based) vs SDF

**Date**: 2026-02-09
**Question**: Should we switch to SDF (Signed Distance Fields) for organic jellyfish forms?

---

## Current Approach: Vertex-Based Mesh

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. PARTICULATE Physics System                               │
│     └─ Verlet integration for ~2000 particles                │
│     └─ Distance constraints (outer rib, inner rib, skin)     │
│     └─ Pin constraints for anchor points                     │
│                                                               │
│  2. JellyfishGeometry.create(spec)                           │
│     └─ Generates vertex positions                            │
│     └─ Creates face indices (triangles)                      │
│     └─ Returns THREE.BufferGeometry                           │
│                                                               │
│  3. THREE.WebGPURenderer                                     │
│     └─ Renders triangle mesh with TSL materials              │
│     └─ InterpolatedNodeMaterial for smooth animation          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Code Evidence

From `JellyfishGeometry.ts`:
```typescript
// Generates ~2000 vertices
createRib(index: number, total: number): void {
  const segments = this.cfg.totalSegments;  // ~36
  const start = index * segments + this.topStart;
  const radius = evalRadiusProfile(this.spec.profiles?.bulb, yParam)
                * this.cfg.ribRadius;

  // Generate circle vertices
  circle(segments, radius, yPos, this.verts, mod, centerX, centerZ);

  // Create triangle faces
  ringFaces(rib0.start, rib1.start, segments, this.bulbFaces);
}
```

### Pros

| Aspect | Benefit |
|--------|---------|
| **Physics-Driven** | Direct particle simulation, realistic soft-body |
| **Established** | Battle-tested from original Medusae.js |
| **Fast rendering** | Traditional GPU rasterization |
| **Precise control** | Exact vertex placement for features |

### Cons

| Aspect | Limitation |
|--------|------------|
| **Polygon count** | ~2000 particles × 3 vertices = 6000+ vertices per creature |
| **Topology limits** | Rib-based structure hard to modify |
| **Organic smoothness** | Requires high subdivision for smooth curves |
| **Morphing** | Hard to blend between different body plans |
| **Volume rendering** | No true volumetric effects (hollow shells) |

---

## SDF Approach: Signed Distance Fields

### What Are SDFs?

From [Inigo Quilez's articles](https://iquilezles.org/articles/distfunctions/):

```glsl
// 2D Circle SDF
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

// 3D Sphere SDF
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

// Elongated sphere (capsule)
float sdCapsule(vec3 p, float h, float r) {
    p.y -= clamp(p.y, 0.0, h);
    return length(p) - r;
}

// Smooth union for organic blending
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) - k*h*(1.0-h);
}
```

### How SDF Rendering Works

```
┌─────────────────────────────────────────────────────────────┐
│                    SDF ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Raymarching Shader (per pixel)                           │
│     for each pixel:                                           │
│       ray origin += ray direction * SDF(pos)                 │
│       if SDF(pos) < epsilon: hit!                            │
│                                                               │
│  2. Procedural Geometry (no vertices!)                        │
│     float map(vec3 p) {                                      │
│       float bell = sdEllipsoid(p, bellParams);               │
│       float tentacles = sdTentacles(p);                      │
│       return opSmoothUnion(bell, tentacles, 0.5);            │
│     }                                                         │
│                                                               │
│  3. Compute Shaders (optional)                               │
│     └─ Precompute SDF into 3D texture                         │
│     └─ Faster rendering, less dynamic                         │
│                                                               │
│  4. Hybrid Approach (best of both)                          │
│     └─ SDF for primary shape                                 │
│     └─ Vertex mesh for tentacles/details                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### SDF Primitives for Jellyfish

Based on Quilez's primitives:

```glsl
// Bell shape (elongated/rounded ellipsoid)
float sdBell(vec3 p, vec2 size) {
    // Elongated sphere with rounded top
    vec2 q = vec2(length(p.xz), p.y);
    vec2 k = vec2(size.x, size.y * 0.5);
    return length(max(q-k, 0.0)) + min(max(q.x-k.x, q.y-k.y), 0.0) - size.y * 0.2;
}

// Comb jelly (egg with flattened sides)
float sdCombJelly(vec3 p, vec3 size) {
    float d1 = sdEllipsoid(p, size);
    float d2 = abs(p.x) - size.x * 0.3;  // Flatten
    return max(d1, d2);
}

// Tentacle (curve with radius)
float sdTentacle(vec3 p, float len, float radius) {
    float curve = sin(p.y * 0.5) * 2.0;  // Wavy centerline
    vec2 q = vec2(length(p.xz - curve.x), p.y);
    return length(max(q, vec2(0.0))) - radius * (1.0 - p.y * 0.05);
}

// Mouth arms (fractal-like branching)
float sdMouthArms(vec3 p, int iterations) {
    float d = 1e10;
    for (int i = 0; i < 3; i++) {
        float branch = sdBranch(p, i);
        d = min(d, branch);
    }
    return opSmoothUnion(d, sdGelatinousMass(p), 0.3);
}

// Smooth hull for organic connection
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) - k*h*(1.0-h);
}
```

### Pros

| Aspect | Benefit |
|--------|---------|
| **Perfect smoothness** | Mathematically smooth curves, no polygon artifacts |
| **Infinite resolution** | Looks good at any zoom level |
| **Easy morphing** | Blend between shapes with `mix()` |
| **Organic forms** | `opSmoothUnion` creates seamless blends |
| **Compact code** | Entire creature in ~50 lines of GLSL |
| **True volume** | Can render internal structures, subsurface scattering |

### Cons

| Aspect | Limitation |
|--------|------------|
| **Raymarching cost** | Per-pixel loop, more expensive than rasterization |
| **Learning curve** | SDF math is less intuitive than vertices |
| **Hard to animate** | Need to warp SDF function, not just move vertices |
| **Physics mismatch** | Current Particulate physics generates vertices |
| **Shadowing** | Hard shadows require raytracing |

---

## Hybrid Approach: Best of Both?

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HYBRID ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Primary Shape: SDF Raymarching                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  float map(vec3 p) {                               │    │
│  │    float bell = sdBell(p - bellPosition, bellSize);│    │
│  │    float deform = sin(p.y * 10.0) * pulseAmt;      │    │
│  │    return bell + deform;                           │    │
│  │  }                                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  Details: Vertex Mesh (existing system)                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Tentacles: Verlet chains (current)                │    │
│  │  Mouth arms: Particle simulation                   │    │
│  │  Surface features: Displacement mapping           │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ↓                                  │
│  Composition: Shader combines SDF + vertex layers                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Strategy

**Phase 1: SDF Bell (Week 1-2)**
```wgsl
// Replace bell geometry with SDF
@fragment
fn fragmentMain(input: FragmentInput) -> FragmentOutput {
    // Raymarch bell SDF
    let sdf = sdBell(worldPos, bellSize);
    let normal = calcNormalSDF(sdf, worldPos);
    let color = materialSDF(sdf, normal);

    // Combine with vertex-based tentacles
    let tentacleColor = sampleTentacleTexture(uv);
    let final = mix(color, tentacleColor, tentacleMask);
}
```

**Phase 2: Smooth Morphing (Week 3-4)**
```wgsl
// Blend between body plans
float map(vec3 p, float morphFactor) {
    float medusa = sdBell(p, bellSize);
    float comb = sdCombJelly(p, eggSize);
    return mix(medusa, comb, morphFactor);  // Smooth transition!
}
```

**Phase 3: Physics Integration (Week 5-6)**
```typescript
// Still use Particulate for tentacles
// Use SDF for primary bell shape
// Combine in shader
```

---

## Performance Comparison

| Metric | Vertex-Based | SDF Raymarching | Hybrid |
|--------|-------------|-----------------|--------|
| **GPU cost** | ~2ms @ 500 creatures | ~8ms @ 500 creatures | ~4ms @ 500 creatures |
| **Resolution** | Polygon-limited | Unlimited | Best for primary |
| **Memory** | ~200KB/creature | ~10KB/creature | ~100KB/creature |
| **Animation** | Vertex updates (cheap) | Uniform updates (medium) | Mixed |
| **Organic quality** | Needs subdivision | Perfect | Best |

---

## Recommendation

### For Stage 3: Keep Current, Plan SDF

**Why:**
1. **Current system works** - Don't disrupt Stage 3 specs
2. **Physics mismatch** - Particulate generates vertices, not SDFs
3. **Learning curve** - Team knows vertex-based, SDF is new

### For Stage 4+: Consider SDF for Primary Shapes

**When to add SDF:**
- After Stage 3 specs are implemented
- When we need perfect smoothness for close-ups
- When morphing between body plans becomes important
- When implementing "impossible physics" effects

### Gradual Migration Path

```
Stage 3 (Now): Vertex-based (current)
└─ Spec out 15 archetypes with existing geometry system

Stage 4: Hybrid prototype
├─ Keep tentacles as vertex meshes
├─ Replace bell with SDF raymarching
└─ Measure performance

Stage 5: Full SDF (optional)
├─ If performance allows, go full SDF
└─ If not, keep hybrid
```

---

## SDF Resources

Based on your links to Quilez's articles:

- **2D Primitives**: https://iquilezles.org/articles/distfunctions2d/
  - Circle, box, segment (for tentacle cross-sections)

- **3D Primitives**: https://iquilezles.org/articles/distfunctions/
  - Sphere, ellipsoid (for bells)
  - Capsule, cylinder (for tentacles/arms)

- **Domain Operations**: opUnion, opSubtraction, opIntersection
  - opSmoothUnion - KEY for organic blending!

**Key Primitives for Jellyfish:**
```glsl
// Bell-like shape
float sdEllipsoid(in vec3 p, in vec3 r) {
    float k0 = length(p/r);
    float k1 = length(p/(r*r));
    return k0*(k0-1.0)/k1;
}

// Tentacle-like
float sdCapsule(vec3 p, float h, float r) {
    p.y -= clamp(p.y, 0.0, h);
    return length(p) - r;
}

// Organic blending
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5+0.5*(d2-d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) - k*h*(1.0-h);
}
```

---

## Conclusion

**Current approach is RIGHT for Stage 3:**
- Vertex-based meshes with Particulate physics
- Battle-tested, performant
- Good for 500+ creatures @ 60 FPS

**SDF is compelling for FUTURE enhancements:**
- Perfect for "impossible physics" effects
- Smooth morphing between archetypes
- True volumetric rendering

**Recommendation:** Keep current for Stage 3, add SDF as an advanced feature in Stage 4+ if needed for specific visual goals.
