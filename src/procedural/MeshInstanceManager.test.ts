/**
 * MeshInstanceManager Tests
 * Tests for mesh instancing functionality
 * Validates: Requirement 8.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import { MeshInstanceManager, InstanceData } from './MeshInstanceManager';

describe('MeshInstanceManager', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let instanceManager: MeshInstanceManager;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    instanceManager = new MeshInstanceManager(scene);
  });

  afterEach(() => {
    instanceManager.dispose();
    scene.dispose();
    engine.dispose();
  });

  describe('master mesh registration', () => {
    it('should register a master mesh', () => {
      const mesh = BABYLON.MeshBuilder.CreateBox('testBox', { size: 1 }, scene);
      
      instanceManager.registerMasterMesh('box', mesh);
      
      const retrieved = instanceManager.getMasterMesh('box');
      expect(retrieved).toBe(mesh);
    });

    it('should make master mesh invisible', () => {
      const mesh = BABYLON.MeshBuilder.CreateBox('testBox', { size: 1 }, scene);
      mesh.isVisible = true;
      
      instanceManager.registerMasterMesh('box', mesh);
      
      expect(mesh.isVisible).toBe(false);
    });

    it('should allow overwriting master mesh', () => {
      const mesh1 = BABYLON.MeshBuilder.CreateBox('testBox1', { size: 1 }, scene);
      const mesh2 = BABYLON.MeshBuilder.CreateBox('testBox2', { size: 2 }, scene);
      
      instanceManager.registerMasterMesh('box', mesh1);
      instanceManager.registerMasterMesh('box', mesh2);
      
      const retrieved = instanceManager.getMasterMesh('box');
      expect(retrieved).toBe(mesh2);
    });
  });

  describe('instance creation', () => {
    let masterMesh: BABYLON.Mesh;

    beforeEach(() => {
      masterMesh = BABYLON.MeshBuilder.CreateBox('testBox', { size: 1 }, scene);
      instanceManager.registerMasterMesh('box', masterMesh);
    });

    it('should create an instance', () => {
      const data: InstanceData = {
        position: new BABYLON.Vector3(10, 0, 10),
        rotation: Math.PI / 4,
        scale: new BABYLON.Vector3(1, 1, 1)
      };
      
      const instance = instanceManager.createInstance('box', data);
      
      expect(instance).not.toBeNull();
      expect(instance!.position.x).toBe(10);
      expect(instance!.position.z).toBe(10);
      expect(instance!.rotation.y).toBe(Math.PI / 4);
    });

    it('should return null for non-existent master mesh', () => {
      const data: InstanceData = {
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      };
      
      const instance = instanceManager.createInstance('nonexistent', data);
      
      expect(instance).toBeNull();
    });

    it('should create multiple instances', () => {
      const dataArray: InstanceData[] = [
        {
          position: new BABYLON.Vector3(0, 0, 0),
          rotation: 0,
          scale: new BABYLON.Vector3(1, 1, 1)
        },
        {
          position: new BABYLON.Vector3(10, 0, 10),
          rotation: Math.PI / 2,
          scale: new BABYLON.Vector3(2, 2, 2)
        },
        {
          position: new BABYLON.Vector3(20, 0, 20),
          rotation: Math.PI,
          scale: new BABYLON.Vector3(1, 2, 1)
        }
      ];
      
      const instances = instanceManager.createInstances('box', dataArray);
      
      expect(instances).toHaveLength(3);
      expect(instances[0].position.x).toBe(0);
      expect(instances[1].position.x).toBe(10);
      expect(instances[2].position.x).toBe(20);
    });

    it('should track instance count', () => {
      expect(instanceManager.getInstanceCount('box')).toBe(0);
      
      instanceManager.createInstance('box', {
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      expect(instanceManager.getInstanceCount('box')).toBe(1);
      
      instanceManager.createInstance('box', {
        position: new BABYLON.Vector3(10, 0, 10),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      expect(instanceManager.getInstanceCount('box')).toBe(2);
    });

    it('should apply scale to instances', () => {
      const data: InstanceData = {
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        scale: new BABYLON.Vector3(2, 3, 4)
      };
      
      const instance = instanceManager.createInstance('box', data);
      
      expect(instance!.scaling.x).toBe(2);
      expect(instance!.scaling.y).toBe(3);
      expect(instance!.scaling.z).toBe(4);
    });
  });

  describe('instance queries', () => {
    let masterMesh: BABYLON.Mesh;

    beforeEach(() => {
      masterMesh = BABYLON.MeshBuilder.CreateBox('testBox', { size: 1 }, scene);
      instanceManager.registerMasterMesh('box', masterMesh);
    });

    it('should get all instances of a type', () => {
      instanceManager.createInstance('box', {
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      instanceManager.createInstance('box', {
        position: new BABYLON.Vector3(10, 0, 10),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      const instances = instanceManager.getInstances('box');
      expect(instances).toHaveLength(2);
    });

    it('should return empty array for non-existent type', () => {
      const instances = instanceManager.getInstances('nonexistent');
      expect(instances).toEqual([]);
    });

    it('should get total instance count', () => {
      const sphere = BABYLON.MeshBuilder.CreateSphere('testSphere', { diameter: 1 }, scene);
      instanceManager.registerMasterMesh('sphere', sphere);
      
      instanceManager.createInstance('box', {
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      instanceManager.createInstance('box', {
        position: new BABYLON.Vector3(10, 0, 10),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      instanceManager.createInstance('sphere', {
        position: new BABYLON.Vector3(20, 0, 20),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      expect(instanceManager.getTotalInstanceCount()).toBe(3);
    });
  });

  describe('instance disposal', () => {
    let masterMesh: BABYLON.Mesh;

    beforeEach(() => {
      masterMesh = BABYLON.MeshBuilder.CreateBox('testBox', { size: 1 }, scene);
      instanceManager.registerMasterMesh('box', masterMesh);
    });

    it('should dispose instances of a specific type', () => {
      const instance1 = instanceManager.createInstance('box', {
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      const instance2 = instanceManager.createInstance('box', {
        position: new BABYLON.Vector3(10, 0, 10),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      expect(instance1!.isDisposed()).toBe(false);
      expect(instance2!.isDisposed()).toBe(false);
      
      instanceManager.disposeInstances('box');
      
      expect(instance1!.isDisposed()).toBe(true);
      expect(instance2!.isDisposed()).toBe(true);
      expect(instanceManager.getInstanceCount('box')).toBe(0);
    });

    it('should dispose all instances and master meshes', () => {
      const sphere = BABYLON.MeshBuilder.CreateSphere('testSphere', { diameter: 1 }, scene);
      instanceManager.registerMasterMesh('sphere', sphere);
      
      const boxInstance = instanceManager.createInstance('box', {
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      const sphereInstance = instanceManager.createInstance('sphere', {
        position: new BABYLON.Vector3(10, 0, 10),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      expect(boxInstance!.isDisposed()).toBe(false);
      expect(sphereInstance!.isDisposed()).toBe(false);
      expect(masterMesh.isDisposed()).toBe(false);
      expect(sphere.isDisposed()).toBe(false);
      
      instanceManager.dispose();
      
      expect(boxInstance!.isDisposed()).toBe(true);
      expect(sphereInstance!.isDisposed()).toBe(true);
      expect(masterMesh.isDisposed()).toBe(true);
      expect(sphere.isDisposed()).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should provide accurate statistics', () => {
      const box = BABYLON.MeshBuilder.CreateBox('testBox', { size: 1 }, scene);
      const sphere = BABYLON.MeshBuilder.CreateSphere('testSphere', { diameter: 1 }, scene);
      
      instanceManager.registerMasterMesh('box', box);
      instanceManager.registerMasterMesh('sphere', sphere);
      
      instanceManager.createInstance('box', {
        position: new BABYLON.Vector3(0, 0, 0),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      instanceManager.createInstance('box', {
        position: new BABYLON.Vector3(10, 0, 10),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      instanceManager.createInstance('sphere', {
        position: new BABYLON.Vector3(20, 0, 20),
        rotation: 0,
        scale: new BABYLON.Vector3(1, 1, 1)
      });
      
      const stats = instanceManager.getStats();
      
      expect(stats.masterMeshCount).toBe(2);
      expect(stats.totalInstanceCount).toBe(3);
      expect(stats.instancesByType.get('box')).toBe(2);
      expect(stats.instancesByType.get('sphere')).toBe(1);
    });

    it('should return zero statistics for empty manager', () => {
      const stats = instanceManager.getStats();
      
      expect(stats.masterMeshCount).toBe(0);
      expect(stats.totalInstanceCount).toBe(0);
      expect(stats.instancesByType.size).toBe(0);
    });
  });

  describe('performance benefits', () => {
    it('should reduce draw calls by using instances', () => {
      const masterMesh = BABYLON.MeshBuilder.CreateBox('testBox', { size: 1 }, scene);
      instanceManager.registerMasterMesh('box', masterMesh);
      
      // Create many instances
      for (let i = 0; i < 100; i++) {
        instanceManager.createInstance('box', {
          position: new BABYLON.Vector3(i * 2, 0, 0),
          rotation: 0,
          scale: new BABYLON.Vector3(1, 1, 1)
        });
      }
      
      // Verify all instances were created
      expect(instanceManager.getInstanceCount('box')).toBe(100);
      
      // All instances share the same master mesh
      const instances = instanceManager.getInstances('box');
      for (const instance of instances) {
        expect(instance.sourceMesh).toBe(masterMesh);
      }
    });
  });
});
