# BMad PM Agent Analysis: jellyfish-webgpu

> **Agent**: John (Product Manager)
> **Module**: BMad Method (BMM)
> **Role**: Assess project context and recommend workflow

---

## Project Context Analysis

**Input**: PROJECT_CONTEXT.md for jellyfish-webgpu

**Project Type Assessment**:
- **Category**: Creative Coding / Technical Demo
- **Current State**: Existing codebase, functional but needs refinement
- **Complexity**: Medium (WebGPU graphics, physics simulation, 5 TSL materials)
- **Status**: 0.1.0 - Active Development

**Current Assets**:
- ✅ 37 TypeScript files (complete implementation)
- ✅ 5 TSL materials (Bulb, Tentacles, Tail, Gel, Dust)
- ✅ Soft-body physics (~2000 particles)
- ✅ Live editor (Tweakpane integration)
- ✅ Post-processing (Bloom, Lens Dirt, Vignette)
- ✅ Build system (Vite)
- ⚠️ Tests not runnable (WSL binary issue)
- ⚠️ Large bundle (1.3MB)
- ⚠️ No git history
- ⚠️ No documentation

---

## Critical Questions for Product Owner

**Before recommending workflow, I need to understand:**

### 1. What is the PRIMARY GOAL?

Choose one:

**A) Portfolio Piece / Art Project**
- Goal: Showcase technical skills, creative coding
- Audience: Employers, art/tech community, github visitors
- Success: Visual impact, code quality, "wow" factor
- Timeline: Flexible, polish when satisfied

**B) Production Application**
- Goal: Build something people actually use
- Audience: End users who interact with jellyfish
- Success: User engagement, functionality, reliability
- Timeline: Defined milestones, ship dates

**C) Learning/Exploration**
- Goal: Learn WebGPU, TSL, physics simulation
- Audience: Personal growth, skill development
- Success: Understanding gained, experiments tried
- Timeline: Until satisfied with learning

**D) Open Source Contribution**
- Goal: Create library/tool for others to use
- Audience: Other developers
- Success: Adoption, contributions, community engagement
- Timeline: Community-driven

### 2. What is the IMMEDIATE NEED?

**A) Fix Technical Issues**
- Tests not running
- Bundle size optimization
- Git/repository setup
- CI/CD pipeline

**B) Add New Features**
- More jellyfish types/archetypes
- More visual effects
- Better interactions (mouse, touch, gesture)
- Performance improvements
- New scenes/environments

**C) Polish & Deploy**
- Fix all issues
- Add documentation
- Prepare for deployment
- Choose hosting platform

**D) Something Else**
- Migration (React, Svelte, etc.)
- API integration
- Multiplayer features
- Audio/sound design

### 3. What is the SCOPE?

**A) Small** (1-3 days work)
- Fix tests
- Optimize bundle
- Basic documentation

**B) Medium** (1-2 weeks)
- Fix issues + add features
- Deploy to hosting
- Full documentation

**C) Large** (1-2 months)
- Major feature additions
- Complete overhaul
- Production-ready application

---

## Workflow Recommendation Matrix

Based on your answers, here's my recommended BMad workflow:

| Goal | Need | Scope | Recommended Workflow |
|------|------|-------|---------------------|
| Portfolio | Fix issues | Small | **Quick-Spec** → Quick-Dev |
| Portfolio | Add features | Medium | **Quick-Spec** → Epic breakdown |
| Portfolio | Polish/Deploy | Medium | **Quick-Spec** (deployment focus) |
| Production | Fix issues | Small | **Quick-Spec** → Quick-Dev |
| Production | Add features | Medium | **Full GDS** (PRD + Architecture + Stories) |
| Production | Polish/Deploy | Large | **Full GDS** (complete pipeline) |
| Learning | Any | Any | **Quick-Spec** (learning-focused) |
| Open Source | Fix issues | Medium | **Quick-Spec** → Quick-Dev |
| Open Source | Add features | Large | **Full GDS** (community input) |

---

## My Preliminary Recommendation

**Given what I see:**

**Likely Scenario**: This appears to be a **portfolio/creative coding project** that needs technical polish and possibly feature expansion.

**Best Guess Workflow**: **Quick-Spec** (if small scope) or **Full GDS** (if larger scope)

**Rationale**:
- Existing codebase is functional but needs refinement
- Technical issues are clear (tests, bundle size)
- Architecture is solid (WebGPU, physics, TSL materials)
- Feature set is well-defined (5 materials, creature system)

**However** - I cannot make a definitive recommendation without YOUR input on:
1. Primary goal (portfolio vs production vs learning)
2. Immediate need (fix vs add vs polish)
3. Scope (small vs medium vs large)

---

## Next Steps

**For the Product Owner (You):**

1. **Answer the 3 questions above**
   - What is the PRIMARY GOAL?
   - What is the IMMEDIATE NEED?
   - What is the SCOPE?

2. **Once you answer**, I (BMad PM) will:
   - Confirm the recommended workflow
   - Create appropriate BMad artifacts (PRD if Full GDS, tech-spec if Quick-Spec)
   - Break down into actionable work items
   - Set up Gas Town beads for tracking

3. **Then we proceed** with:
   - Development workflow (if Quick-Spec)
   - Full planning pipeline (if Full GDS)

---

## Alternative: Quick-Dev

**If you already know what you want** and just want to start coding:

**Skip straight to Quick-Dev**: Tell me exactly what to implement and I'll create tech-spec and execute.

Example:
> "Make the tests work and optimize the bundle size"

I'll then:
1. Scan codebase
2. Create tech-spec
3. Execute implementation

---

## Summary

**Current Status**: ✅ Project context analyzed
**Blocker**: ⏳ Awaiting Product Owner input on goals and scope
**Recommendation**: Depends on your answers to the 3 questions above

**When you're ready**, tell me:
1. Your primary goal (A/B/C/D)
2. Your immediate need (A/B/C/D)
3. Your scope (Small/Medium/Large)

Then I'll recommend the exact BMad workflow and we can get started!

---

**Agent**: BMad PM (John)
**Module**: BMad Method (BMM)
**Workflow**: Assessment & Recommendation Complete

**Next**: Awaiting Product Owner input
