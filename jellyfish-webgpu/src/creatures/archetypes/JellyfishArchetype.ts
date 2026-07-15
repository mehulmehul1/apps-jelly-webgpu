/**
 * JellyfishArchetype.ts
 *
 * Concrete CreatureArchetype for jellyfish creatures.  Registered once
 * on import so that getArchetype('jellyfish') resolves immediately.
 *
 * Extracted from JellyfishMaterialTest.ts where it previously lived as
 * an inline fallback.  The logic is a 1:1 copy — no behavioural changes.
 */

import * as THREE from 'three/webgpu';
import {
  CreatureArchetype,
  BodyData,
  PhysicsConfig,
  SeededRNG,
  UnitMaterialPack,
  MeshOptions,
  UnitRuntime,
} from './CreatureArchetype';
import { JellyfishGeometry, JellyfishGeometryData } from '../../jellyfish/JellyfishGeometry';
import {
  BulbNodeMaterial,
  TentacleNodeMaterial,
  TailNodeMaterial,
  GelNodeMaterial,
  InterpolatedLineMaterial,
} from '../../jellyfish/materials';
import { CreatureSpec } from '../../jellyfish/creatures/CreatureSpec';
import { createCreatureRig } from '../../jellyfish/creatures';
import { LookConfig } from '../../editor/look-presets';
import { registerArchetype } from './archetypeRegistry';

export const jellyfishArchetype: CreatureArchetype = {
  id: 'jellyfish',
  label: 'Jellyfish',

  buildBody(spec: CreatureSpec, _config: PhysicsConfig, _rng: SeededRNG): BodyData {
    const rig = createCreatureRig(spec);
    const unitData = rig.units.map((u) => {
      const geometryData = JellyfishGeometry.create(u.spec);
      return { id: u.id, transform: u.transform, geometryData };
    });
    return {
      geometryData: { rig, units: unitData },
      physicsComponents: {},
      animationState: { pulseSpeed: 0.5, pulseAmplitude: 0.15 },
    } as BodyData;
  },

  createMaterials(_lookConfig: LookConfig, refractionTarget: unknown): UnitMaterialPack {
    return { refractionTarget } as unknown as UnitMaterialPack;
  },

  buildMeshes(
    data: BodyData,
    materials: UnitMaterialPack,
    options: MeshOptions,
  ): UnitRuntime[] {
    const d = data as any;
    const matPack = materials as any;
    const refractionTarget = matPack.refractionTarget as THREE.RenderTarget | undefined;
    const showConstraints = !!(options as any).showConstraints;
    const units: any[] = [];

    for (const ud of d.geometryData.units) {
      const gd = ud.geometryData as JellyfishGeometryData;

      // ── Per-unit materials ──
      const bulbMaterial = new BulbNodeMaterial();
      bulbMaterial.setDiffuse(0xFFA9D2);
      bulbMaterial.setDiffuseB(0x70256C);
      bulbMaterial.setOpacity(0.75);
      if (refractionTarget) {
        bulbMaterial.setRefractionTexture(refractionTarget.texture);
        bulbMaterial.setRefractionStrength(0);
        bulbMaterial.setIor(1.33);
        bulbMaterial.setDispersion(0.03);
        bulbMaterial.setRefractionResolution(refractionTarget.width, refractionTarget.height);
      }

      const gelMaterial = new GelNodeMaterial({
        diffuse: 0x415AB5,
        opacity: 0.25,
      });

      const tailMaterial = new TailNodeMaterial();
      tailMaterial.setDiffuse(0xE4BBEE);
      tailMaterial.setDiffuseB(0x241138);
      tailMaterial.updateOpacity(0.75);

      const mouthMaterial = new TailNodeMaterial();
      mouthMaterial.setDiffuse(0xEFA6F0);
      mouthMaterial.setDiffuseB(0x4A67CE);
      mouthMaterial.setScale(3);
      mouthMaterial.updateOpacity(0.65);

      const tentacleMaterial = new TentacleNodeMaterial({
        color: 0x997299,
        transparent: true,
        opacity: 0.25,
        depthTest: true,
        depthWrite: false,
      });
      tentacleMaterial.setArea(2000);

      // ── Mesh group ──
      const group = new THREE.Group();

      // Bulb mesh
      const bulbGeo = new THREE.BufferGeometry();
      bulbGeo.setAttribute('position', gd.position);
      bulbGeo.setAttribute('positionPrev', gd.positionPrev);
      bulbGeo.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
      bulbGeo.setAttribute('normal', gd.geometry.attributes.normal);
      bulbGeo.setIndex(gd.faces.bulb);
      bulbGeo.computeVertexNormals();
      const bulbMesh = new THREE.Mesh(bulbGeo, bulbMaterial);
      bulbMesh.scale.setScalar(0.95);
      group.add(bulbMesh);

      // Gel overlay mesh (slightly larger)
      const gelGeo = new THREE.BufferGeometry();
      gelGeo.setAttribute('position', gd.position);
      gelGeo.setAttribute('positionPrev', gd.positionPrev);
      gelGeo.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
      gelGeo.setAttribute('normal', gd.geometry.attributes.normal);
      gelGeo.setIndex(gd.faces.bulb);
      gelGeo.computeVertexNormals();
      const gelMesh = new THREE.Mesh(gelGeo, gelMaterial);
      gelMesh.scale.setScalar(1.05);
      group.add(gelMesh);

      // Tail mesh
      if (gd.faces.tail.length > 0) {
        const tailGeo = new THREE.BufferGeometry();
        tailGeo.setAttribute('position', gd.position);
        tailGeo.setAttribute('positionPrev', gd.positionPrev);
        tailGeo.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
        tailGeo.setAttribute('normal', gd.geometry.attributes.normal);
        tailGeo.setIndex(gd.faces.tail);
        tailGeo.computeVertexNormals();
        const tailMesh = new THREE.Mesh(tailGeo, tailMaterial);
        tailMesh.scale.setScalar(0.95);
        group.add(tailMesh);
      }

      // Mouth mesh
      if (gd.faces.mouth.length > 0) {
        const mouthGeo = new THREE.BufferGeometry();
        mouthGeo.setAttribute('position', gd.position);
        mouthGeo.setAttribute('positionPrev', gd.positionPrev);
        mouthGeo.setAttribute('uv', new THREE.BufferAttribute(gd.uvs, 2));
        mouthGeo.setAttribute('normal', gd.geometry.attributes.normal);
        mouthGeo.setIndex(gd.faces.mouth);
        mouthGeo.computeVertexNormals();
        const mouthMesh = new THREE.Mesh(mouthGeo, mouthMaterial);
        group.add(mouthMesh);
      }

      // Tentacle lines
      if (gd.links.tentacles.length > 0) {
        const tentGeo = new THREE.BufferGeometry();
        tentGeo.setAttribute('position', gd.position);
        tentGeo.setAttribute('positionPrev', gd.positionPrev);
        tentGeo.setAttribute('normal', gd.geometry.attributes.normal);
        tentGeo.setIndex(gd.links.tentacles);
        group.add(new THREE.LineSegments(tentGeo, tentacleMaterial));
      }

      // LinesFore - smooth curved lines
      if (gd.links.linesFore.length > 0) {
        const lfGeo = new THREE.BufferGeometry();
        lfGeo.setAttribute('position', gd.position);
        lfGeo.setAttribute('positionPrev', gd.positionPrev);
        lfGeo.setIndex(gd.links.linesFore);
        const lfMat = new InterpolatedLineMaterial({
          color: 0xffdde9,
          transparent: true,
          opacity: 0.1,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
        });
        group.add(new THREE.LineSegments(lfGeo, lfMat));
      }

      // LinesInner - smooth inner structure lines
      if (gd.links.linesInner.length > 0) {
        const liGeo = new THREE.BufferGeometry();
        liGeo.setAttribute('position', gd.position);
        liGeo.setAttribute('positionPrev', gd.positionPrev);
        liGeo.setIndex(gd.links.linesInner);
        const liMat = new InterpolatedLineMaterial({
          color: 0xf99ebd,
          transparent: true,
          opacity: 0.06,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
        });
        group.add(new THREE.LineSegments(liGeo, liMat));
      }

      // Inner constraint lines (for visual structure)
      if (showConstraints) {
        const cGeo = new THREE.BufferGeometry();
        cGeo.setAttribute('position', gd.position);
        cGeo.setAttribute('positionPrev', gd.positionPrev);
        cGeo.setIndex(gd.links.bulb);
        const cMat = new InterpolatedLineMaterial({
          color: 0xff00ff,
          transparent: true,
          opacity: 0.3,
        });
        group.add(new THREE.LineSegments(cGeo, cMat));
      }

      // Apply unit transform
      group.position.set(ud.transform.position.x, ud.transform.position.y, ud.transform.position.z);
      group.scale.setScalar(ud.transform.scale);

      units.push({
        id: ud.id,
        geometryData: gd,
        group,
        bulbMaterial,
        gelMaterial,
        tailMaterial,
        mouthMaterial,
        tentacleMaterial,
      });
    }

    return units as any;
  },

  animateBody(data: BodyData, time: number, delta: number, amplitude: number): void {
    const d = data as any;
    const phase = (Math.sin(time * Math.PI - Math.PI * 0.5) + 1) * 0.5;

    for (const ud of d.geometryData.units) {
      const gd = ud.geometryData as JellyfishGeometryData;
      const expansion = 1.0 + phase * amplitude;

      // Pulse bell ribs
      gd.ribs.forEach((rib: any) => {
        if (rib.initialDistances) {
          if (rib.outer && rib.initialDistances.outer) {
            rib.outer.setDistance(
              rib.initialDistances.outer[0] * expansion,
              rib.initialDistances.outer[1] * expansion,
            );
          }
          if (rib.inner && rib.initialDistances.inner) {
            rib.inner.setDistance(
              rib.initialDistances.inner[0] * expansion,
              rib.initialDistances.inner[1] * expansion,
            );
          }
        }
      });

      // Pulse tail ribs for secondary motion
      gd.tailRibs.forEach((rib: any) => {
        if (rib.initialDistances && rib.outer && rib.initialDistances.outer) {
          rib.outer.setDistance(
            rib.initialDistances.outer[0] * expansion,
            rib.initialDistances.outer[1] * expansion,
          );
        }
      });

      // Tick physics
      gd.system.tick(delta * 0.001);

      // Mark buffers for update
      gd.position.needsUpdate = true;
      gd.positionPrev.needsUpdate = true;
    }
  },

  applyInteraction(data: BodyData, force: number, origin: THREE.Vector3): void {
    const d = data as any;

    for (const ud of d.geometryData.units) {
      const gd = ud.geometryData as JellyfishGeometryData;
      const size = gd.config.size;

      // Move anchor pins to target
      gd.pinConstraints.top.setPosition(origin.x, origin.y + size, 0);
      gd.pinConstraints.mid.setPosition(origin.x, origin.y, 0);
      gd.pinConstraints.bottom.setPosition(origin.x, origin.y - size, 0);
      gd.pinConstraints.tail.setPosition(origin.x, origin.y - size * 2, 0);
      gd.pinConstraints.tentacle.setPosition(origin.x, origin.y - size * 2.5, 0);

      // Direction from unit pivot toward target
      const ux = ud.transform.position.x;
      const uy = ud.transform.position.y;
      const dx = origin.x - ux;
      const dy = origin.y - uy;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = len > 0 ? dx / len : 0;
      const ny = len > 0 ? dy / len : 0;

      // Apply nudge force to particles
      const system = gd.system;
      const positions = system.positions;
      const particleCount = positions.length / 3;
      for (let i = 5; i < particleCount; i++) {
        const idx = i * 3;
        const px = positions[idx];
        const pz = positions[idx + 2];
        const dist = Math.sqrt(px * px + pz * pz);
        const factor = Math.min(1, dist / 20) * force;
        positions[idx] += nx * factor;
        positions[idx + 1] += ny * factor;
      }
    }
  },

  dispose(_data: BodyData): void {
    // Particle systems are cleaned up by the scene's disposeUnits.
    // Resources will be GC'd once references are dropped.
  },
};

// Register so getArchetype('jellyfish') works immediately.
registerArchetype(jellyfishArchetype);
