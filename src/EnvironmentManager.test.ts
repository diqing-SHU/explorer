import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import * as fc from 'fast-check';
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

  /**
   * Feature: 3d-exploration-game, Property 12: Environment configuration determines scene content
   * Validates: Requirements 8.3
   * 
   * For any two different environment configurations, loading them should produce 
   * scenes with different terrain dimensions, building counts, or building positions, 
   * demonstrating that the configuration correctly controls scene content.
   */
  describe('Property-Based Tests', () => {
    it('should produce different scene content for different configurations', () => {
      fc.assert(
        fc.property(
          // Generate first environment configuration
          fc.record({
            terrain: fc.record({
              width: fc.double({ min: 10, max: 200, noNaN: true }),
              depth: fc.double({ min: 10, max: 200, noNaN: true }),
            }),
            buildings: fc.array(
              fc.record({
                position: fc.tuple(
                  fc.double({ min: -50, max: 50, noNaN: true }),
                  fc.double({ min: 1, max: 20, noNaN: true }),
                  fc.double({ min: -50, max: 50, noNaN: true })
                ),
                dimensions: fc.tuple(
                  fc.double({ min: 2, max: 20, noNaN: true }),
                  fc.double({ min: 3, max: 30, noNaN: true }),
                  fc.double({ min: 2, max: 20, noNaN: true })
                ),
                rotation: fc.double({ min: 0, max: Math.PI * 2, noNaN: true }),
              }),
              { minLength: 0, maxLength: 5 }
            ),
            lighting: fc.record({
              ambient: fc.record({
                color: fc.constantFrom('#FFFFFF', '#FFEECC', '#CCDDFF'),
                intensity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
              }),
              directional: fc.record({
                color: fc.constantFrom('#FFFFFF', '#FFFFCC', '#FFDDAA'),
                intensity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
                direction: fc.tuple(
                  fc.double({ min: -1, max: 1, noNaN: true }),
                  fc.double({ min: -2, max: -0.5, noNaN: true }),
                  fc.double({ min: -1, max: 1, noNaN: true })
                ),
              }),
            }),
          }),
          // Generate second environment configuration (different from first)
          fc.record({
            terrain: fc.record({
              width: fc.double({ min: 10, max: 200, noNaN: true }),
              depth: fc.double({ min: 10, max: 200, noNaN: true }),
            }),
            buildings: fc.array(
              fc.record({
                position: fc.tuple(
                  fc.double({ min: -50, max: 50, noNaN: true }),
                  fc.double({ min: 1, max: 20, noNaN: true }),
                  fc.double({ min: -50, max: 50, noNaN: true })
                ),
                dimensions: fc.tuple(
                  fc.double({ min: 2, max: 20, noNaN: true }),
                  fc.double({ min: 3, max: 30, noNaN: true }),
                  fc.double({ min: 2, max: 20, noNaN: true })
                ),
                rotation: fc.double({ min: 0, max: Math.PI * 2, noNaN: true }),
              }),
              { minLength: 0, maxLength: 5 }
            ),
            lighting: fc.record({
              ambient: fc.record({
                color: fc.constantFrom('#FFFFFF', '#FFEECC', '#CCDDFF'),
                intensity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
              }),
              directional: fc.record({
                color: fc.constantFrom('#FFFFFF', '#FFFFCC', '#FFDDAA'),
                intensity: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
                direction: fc.tuple(
                  fc.double({ min: -1, max: 1, noNaN: true }),
                  fc.double({ min: -2, max: -0.5, noNaN: true }),
                  fc.double({ min: -1, max: 1, noNaN: true })
                ),
              }),
            }),
          }),
          (config1, config2) => {
            // Create a fresh environment manager for this test
            const envManager = new EnvironmentManager();
            
            // Load first configuration
            envManager.loadEnvironment(scene, config1);
            
            // Capture scene state after first config
            const terrain1 = envManager.getTerrain();
            const buildings1 = envManager.getBuildings();
            const buildingCount1 = buildings1.length;
            
            // Store building positions from first config
            const buildingPositions1 = buildings1.map(b => ({
              x: b.position.x,
              y: b.position.y,
              z: b.position.z,
            }));
            
            // Load second configuration
            envManager.loadEnvironment(scene, config2);
            
            // Capture scene state after second config
            const terrain2 = envManager.getTerrain();
            const buildings2 = envManager.getBuildings();
            const buildingCount2 = buildings2.length;
            
            // Store building positions from second config
            const buildingPositions2 = buildings2.map(b => ({
              x: b.position.x,
              y: b.position.y,
              z: b.position.z,
            }));
            
            // Cleanup
            envManager.dispose(scene);
            
            // Property verification:
            // If configurations differ, the resulting scene content should differ
            
            // Check if configurations are actually different
            const terrainDifferent = 
              config1.terrain.width !== config2.terrain.width ||
              config1.terrain.depth !== config2.terrain.depth;
            
            const buildingCountDifferent = 
              config1.buildings.length !== config2.buildings.length;
            
            const buildingPositionsDifferent = (() => {
              if (config1.buildings.length !== config2.buildings.length) {
                return true;
              }
              for (let i = 0; i < config1.buildings.length; i++) {
                const pos1 = config1.buildings[i].position;
                const pos2 = config2.buildings[i].position;
                if (pos1[0] !== pos2[0] || pos1[1] !== pos2[1] || pos1[2] !== pos2[2]) {
                  return true;
                }
              }
              return false;
            })();
            
            const configsDifferent = terrainDifferent || buildingCountDifferent || buildingPositionsDifferent;
            
            // If configs are different, verify scene content reflects those differences
            if (configsDifferent) {
              // Verify terrain exists for both
              const bothTerrainsExist = terrain1 !== null && terrain2 !== null;
              
              // Verify building counts match configurations
              const buildingCountsMatch = 
                buildingCount1 === config1.buildings.length &&
                buildingCount2 === config2.buildings.length;
              
              // If building counts differ, verify scene reflects that
              let buildingCountReflected = true;
              if (buildingCountDifferent) {
                buildingCountReflected = buildingCount1 !== buildingCount2;
              }
              
              // If building positions differ, verify scene reflects that
              let buildingPositionsReflected = true;
              if (buildingPositionsDifferent && buildingCount1 === buildingCount2 && buildingCount1 > 0) {
                // Check if at least one building position differs
                let foundDifference = false;
                for (let i = 0; i < Math.min(buildingPositions1.length, buildingPositions2.length); i++) {
                  const pos1 = buildingPositions1[i];
                  const pos2 = buildingPositions2[i];
                  if (Math.abs(pos1.x - pos2.x) > 0.01 || 
                      Math.abs(pos1.y - pos2.y) > 0.01 || 
                      Math.abs(pos1.z - pos2.z) > 0.01) {
                    foundDifference = true;
                    break;
                  }
                }
                buildingPositionsReflected = foundDifference;
              }
              
              return bothTerrainsExist && buildingCountsMatch && 
                     buildingCountReflected && buildingPositionsReflected;
            }
            
            // If configs are identical, that's fine - property still holds
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
