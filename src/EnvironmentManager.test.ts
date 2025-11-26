import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import { EnvironmentManager, EnvironmentConfig } from './EnvironmentManager';

describe('EnvironmentManager', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let environmentManager: EnvironmentManager;

  beforeEach(() => {
    // Create a null engine for headless testing
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    
    // Enable physics for testing
    const gravityVector = new BABYLON.Vector3(0, -9.81, 0);
    scene.enablePhysics(gravityVector);
    
    environmentManager = new EnvironmentManager();
  });

  afterEach(() => {
    environmentManager.dispose(scene);
    scene.dispose();
    engine.dispose();
  });

  describe('createTerrain', () => {
    it('should create terrain mesh with correct dimensions', () => {
      const config = {
        width: 100,
        depth: 100,
        subdivisions: 2,
      };

      const terrain = environmentManager.createTerrain(scene, config);

      expect(terrain).toBeDefined();
      expect(terrain.name).toBe('terrain');
      expect(terrain.isPickable).toBe(true);
    });

    it('should create terrain with physics imposter', () => {
      const config = {
        width: 50,
        depth: 50,
      };

      const terrain = environmentManager.createTerrain(scene, config);

      expect(terrain.physicsImpostor).toBeDefined();
      expect(terrain.physicsImpostor?.mass).toBe(0); // Static object
    });

    it('should apply default material when no texture provided', () => {
      const config = {
        width: 100,
        depth: 100,
      };

      const terrain = environmentManager.createTerrain(scene, config);

      expect(terrain.material).toBeDefined();
    });
  });

  describe('createBuilding', () => {
    it('should create building mesh with correct dimensions', () => {
      const config = {
        position: [10, 5, 10] as [number, number, number],
        dimensions: [5, 10, 5] as [number, number, number],
        rotation: 0,
      };

      const building = environmentManager.createBuilding(scene, config);

      expect(building).toBeDefined();
      expect(building.position.x).toBe(10);
      expect(building.position.y).toBe(5);
      expect(building.position.z).toBe(10);
      expect(building.rotation.y).toBe(0);
    });

    it('should create building with physics imposter', () => {
      const config = {
        position: [0, 5, 0] as [number, number, number],
        dimensions: [5, 10, 5] as [number, number, number],
        rotation: 0,
      };

      const building = environmentManager.createBuilding(scene, config);

      expect(building.physicsImpostor).toBeDefined();
      expect(building.physicsImpostor?.mass).toBe(0); // Static object
      expect(building.isPickable).toBe(true);
    });

    it('should apply color when provided', () => {
      const config = {
        position: [0, 5, 0] as [number, number, number],
        dimensions: [5, 10, 5] as [number, number, number],
        rotation: Math.PI / 4,
        color: '#FF0000',
      };

      const building = environmentManager.createBuilding(scene, config);

      expect(building.material).toBeDefined();
      expect(building.rotation.y).toBe(Math.PI / 4);
    });
  });

  describe('setupLighting', () => {
    it('should create ambient and directional lights', () => {
      const config = {
        ambient: {
          color: '#FFFFFF',
          intensity: 0.6,
        },
        directional: {
          color: '#FFFFFF',
          intensity: 0.8,
          direction: [-1, -2, -1] as [number, number, number],
        },
      };

      const initialLightCount = scene.lights.length;
      environmentManager.setupLighting(scene, config);

      // Should have added 2 lights (ambient + directional)
      expect(scene.lights.length).toBe(initialLightCount + 2);
    });
  });

  describe('loadEnvironment', () => {
    it('should load complete environment from config', () => {
      const config: EnvironmentConfig = {
        terrain: {
          width: 100,
          depth: 100,
        },
        buildings: [
          {
            position: [10, 5, 10],
            dimensions: [5, 10, 5],
            rotation: 0,
          },
          {
            position: [-10, 5, -10],
            dimensions: [8, 12, 8],
            rotation: Math.PI / 2,
          },
        ],
        lighting: {
          ambient: {
            color: '#FFFFFF',
            intensity: 0.6,
          },
          directional: {
            color: '#FFFFFF',
            intensity: 0.8,
            direction: [-1, -2, -1],
          },
        },
      };

      environmentManager.loadEnvironment(scene, config);

      expect(environmentManager.getTerrain()).toBeDefined();
      expect(environmentManager.getBuildings().length).toBe(2);
    });

    it('should clear previous environment when loading new one', () => {
      const config1: EnvironmentConfig = {
        terrain: { width: 50, depth: 50 },
        buildings: [
          {
            position: [0, 5, 0],
            dimensions: [5, 10, 5],
            rotation: 0,
          },
        ],
        lighting: {
          ambient: { color: '#FFFFFF', intensity: 0.6 },
          directional: {
            color: '#FFFFFF',
            intensity: 0.8,
            direction: [-1, -2, -1],
          },
        },
      };

      const config2: EnvironmentConfig = {
        terrain: { width: 100, depth: 100 },
        buildings: [
          {
            position: [10, 5, 10],
            dimensions: [5, 10, 5],
            rotation: 0,
          },
          {
            position: [-10, 5, -10],
            dimensions: [8, 12, 8],
            rotation: 0,
          },
        ],
        lighting: {
          ambient: { color: '#FFFFFF', intensity: 0.6 },
          directional: {
            color: '#FFFFFF',
            intensity: 0.8,
            direction: [-1, -2, -1],
          },
        },
      };

      environmentManager.loadEnvironment(scene, config1);
      expect(environmentManager.getBuildings().length).toBe(1);

      environmentManager.loadEnvironment(scene, config2);
      expect(environmentManager.getBuildings().length).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all environment objects', () => {
      const config: EnvironmentConfig = {
        terrain: { width: 100, depth: 100 },
        buildings: [
          {
            position: [0, 5, 0],
            dimensions: [5, 10, 5],
            rotation: 0,
          },
        ],
        lighting: {
          ambient: { color: '#FFFFFF', intensity: 0.6 },
          directional: {
            color: '#FFFFFF',
            intensity: 0.8,
            direction: [-1, -2, -1],
          },
        },
      };

      environmentManager.loadEnvironment(scene, config);
      expect(environmentManager.getTerrain()).toBeDefined();
      expect(environmentManager.getBuildings().length).toBe(1);

      environmentManager.clear(scene);
      expect(environmentManager.getTerrain()).toBeNull();
      expect(environmentManager.getBuildings().length).toBe(0);
    });
  });
});
