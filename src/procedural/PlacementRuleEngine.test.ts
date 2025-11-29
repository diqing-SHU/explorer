/**
 * PlacementRuleEngine Tests
 * Tests placement rule validation and collision detection
 * Validates: Requirements 10.4, 11.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import * as BABYLON from '@babylonjs/core';
import { 
  PlacementRuleEngine, 
  NoRoadOverlapRule, 
  NoObjectCollisionRule, 
  MinimumSpacingRule,
  BoundaryIntegrityRule,
  BoundingBox
} from './PlacementRuleEngine';
import { GeneratedObject, GenerationContext, PlacementRule, RuleViolation } from './Generator';
import { Chunk, Road, RoadSegment } from './ChunkTypes';
import { SeededRandom } from './SeededRandom';

describe('PlacementRuleEngine', () => {
  let engine: PlacementRuleEngine;
  let mockContext: GenerationContext;
  let mockChunk: Chunk;

  beforeEach(() => {
    engine = new PlacementRuleEngine(10);
    
    // Create mock chunk
    mockChunk = {
      x: 0,
      z: 0,
      worldX: 0,
      worldZ: 0,
      roads: [],
      buildings: [],
      vehicles: [],
      signs: [],
      meshes: [],
      imposters: [],
      generatedAt: Date.now(),
      seed: 12345
    };

    // Create mock context
    mockContext = {
      scene: {} as BABYLON.Scene,
      chunk: mockChunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: engine
    };
  });

  describe('Rule Registration', () => {
    it('should register rules', () => {
      const rule: PlacementRule = {
        name: 'TestRule',
        objectTypes: ['building'],
        check: () => null
      };

      engine.registerRule(rule);
      
      const object = createMockObject('building', 10, 10);
      const violations = engine.getViolations(object, mockContext);
      
      // Should not violate (rule returns null)
      expect(violations).toHaveLength(0);
    });

    it('should apply multiple rules', () => {
      const rule1: PlacementRule = {
        name: 'Rule1',
        objectTypes: ['building'],
        check: () => ({ rule: 'Rule1', message: 'Violation 1', severity: 'error' })
      };

      const rule2: PlacementRule = {
        name: 'Rule2',
        objectTypes: ['building'],
        check: () => ({ rule: 'Rule2', message: 'Violation 2', severity: 'warning' })
      };

      engine.registerRule(rule1);
      engine.registerRule(rule2);
      
      const object = createMockObject('building', 10, 10);
      const violations = engine.getViolations(object, mockContext);
      
      expect(violations).toHaveLength(2);
      expect(violations[0].rule).toBe('Rule1');
      expect(violations[1].rule).toBe('Rule2');
    });
  });

  describe('Placement Validation', () => {
    it('should validate placement with no violations', () => {
      const rule: PlacementRule = {
        name: 'TestRule',
        objectTypes: ['building'],
        check: () => null
      };

      engine.registerRule(rule);
      
      const object = createMockObject('building', 10, 10);
      const isValid = engine.isValidPlacement(object, mockContext);
      
      expect(isValid).toBe(true);
    });

    it('should reject placement with error violations', () => {
      const rule: PlacementRule = {
        name: 'TestRule',
        objectTypes: ['building'],
        check: () => ({ rule: 'TestRule', message: 'Error', severity: 'error' })
      };

      engine.registerRule(rule);
      
      const object = createMockObject('building', 10, 10);
      const isValid = engine.isValidPlacement(object, mockContext);
      
      expect(isValid).toBe(false);
    });

    it('should allow placement with only warning violations', () => {
      const rule: PlacementRule = {
        name: 'TestRule',
        objectTypes: ['building'],
        check: () => ({ rule: 'TestRule', message: 'Warning', severity: 'warning' })
      };

      engine.registerRule(rule);
      
      const object = createMockObject('building', 10, 10);
      const isValid = engine.isValidPlacement(object, mockContext);
      
      expect(isValid).toBe(true);
    });

    it('should only apply rules to matching object types', () => {
      const rule: PlacementRule = {
        name: 'BuildingRule',
        objectTypes: ['building'],
        check: () => ({ rule: 'BuildingRule', message: 'Error', severity: 'error' })
      };

      engine.registerRule(rule);
      
      const vehicle = createMockObject('vehicle', 10, 10);
      const violations = engine.getViolations(vehicle, mockContext);
      
      // Rule should not apply to vehicles
      expect(violations).toHaveLength(0);
    });

    it('should apply rules with empty objectTypes to all objects', () => {
      const rule: PlacementRule = {
        name: 'UniversalRule',
        objectTypes: [],
        check: () => ({ rule: 'UniversalRule', message: 'Error', severity: 'error' })
      };

      engine.registerRule(rule);
      
      const building = createMockObject('building', 10, 10);
      const vehicle = createMockObject('vehicle', 20, 20);
      
      expect(engine.getViolations(building, mockContext)).toHaveLength(1);
      expect(engine.getViolations(vehicle, mockContext)).toHaveLength(1);
    });
  });

  describe('Spatial Hash', () => {
    it('should add objects to spatial hash', () => {
      const obj1 = createMockObject('building', 10, 10);
      const obj2 = createMockObject('building', 20, 20);

      engine.addObject(obj1);
      engine.addObject(obj2);

      const allObjects = engine.getAllObjects();
      expect(allObjects).toHaveLength(2);
    });

    it('should query objects near a position', () => {
      const obj1 = createMockObject('building', 10, 10);
      const obj2 = createMockObject('building', 50, 50);

      engine.addObject(obj1);
      engine.addObject(obj2);

      const nearObjects = engine.getObjectsNear(10, 10, 15);
      
      // Should find obj1 but not obj2
      expect(nearObjects).toContain(obj1);
      expect(nearObjects.length).toBeGreaterThanOrEqual(1);
    });

    it('should query objects in a bounding box', () => {
      const obj1 = createMockObject('building', 10, 10, 5, 5);
      const obj2 = createMockObject('building', 50, 50, 5, 5);

      engine.addObject(obj1);
      engine.addObject(obj2);

      const bbox: BoundingBox = {
        minX: 5,
        maxX: 15,
        minZ: 5,
        maxZ: 15,
        centerX: 10,
        centerZ: 10,
        width: 10,
        depth: 10
      };

      const objects = engine.getObjectsInBox(bbox);
      
      expect(objects).toContain(obj1);
    });

    it('should clear all objects', () => {
      const obj1 = createMockObject('building', 10, 10);
      const obj2 = createMockObject('building', 20, 20);

      engine.addObject(obj1);
      engine.addObject(obj2);
      
      expect(engine.getAllObjects()).toHaveLength(2);

      engine.clear();
      
      expect(engine.getAllObjects()).toHaveLength(0);
    });
  });

  describe('Bounding Box Collision', () => {
    it('should detect intersecting boxes', () => {
      const box1: BoundingBox = {
        minX: 0, maxX: 10, minZ: 0, maxZ: 10,
        centerX: 5, centerZ: 5, width: 10, depth: 10
      };

      const box2: BoundingBox = {
        minX: 5, maxX: 15, minZ: 5, maxZ: 15,
        centerX: 10, centerZ: 10, width: 10, depth: 10
      };

      expect(PlacementRuleEngine.boxesIntersect(box1, box2)).toBe(true);
    });

    it('should detect non-intersecting boxes', () => {
      const box1: BoundingBox = {
        minX: 0, maxX: 10, minZ: 0, maxZ: 10,
        centerX: 5, centerZ: 5, width: 10, depth: 10
      };

      const box2: BoundingBox = {
        minX: 20, maxX: 30, minZ: 20, maxZ: 30,
        centerX: 25, centerZ: 25, width: 10, depth: 10
      };

      expect(PlacementRuleEngine.boxesIntersect(box1, box2)).toBe(false);
    });

    it('should get bounding box from object', () => {
      const object = createMockObject('building', 10, 10, 6, 8);
      const bbox = PlacementRuleEngine.getBoundingBox(object);

      expect(bbox.centerX).toBe(10);
      expect(bbox.centerZ).toBe(10);
      expect(bbox.width).toBe(6);
      expect(bbox.depth).toBe(8);
      expect(bbox.minX).toBe(7);
      expect(bbox.maxX).toBe(13);
      expect(bbox.minZ).toBe(6);
      expect(bbox.maxZ).toBe(14);
    });
  });

  describe('NoRoadOverlapRule', () => {
    it('should allow placement away from roads', () => {
      const rule = new NoRoadOverlapRule(['building']);
      engine.registerRule(rule);

      // Add a road to the chunk
      mockChunk.roads = [createMockRoad(0, 0, 100, 0, 10)];

      // Place building far from road
      const building = createMockObject('building', 50, 50, 10, 10);
      const isValid = engine.isValidPlacement(building, mockContext);

      expect(isValid).toBe(true);
    });

    it('should reject placement on roads', () => {
      const rule = new NoRoadOverlapRule(['building']);
      engine.registerRule(rule);

      // Add a road to the chunk
      mockChunk.roads = [createMockRoad(0, 0, 100, 0, 10)];

      // Place building on road
      const building = createMockObject('building', 50, 0, 10, 10);
      const isValid = engine.isValidPlacement(building, mockContext);

      expect(isValid).toBe(false);
    });

    it('should not check objects not in objectTypes list', () => {
      const rule = new NoRoadOverlapRule(['building']);
      engine.registerRule(rule);

      mockChunk.roads = [createMockRoad(0, 0, 100, 0, 10)];

      // Place vehicle on road (not in rule's objectTypes)
      const vehicle = createMockObject('vehicle', 50, 0, 5, 5);
      const violations = engine.getViolations(vehicle, mockContext);

      expect(violations).toHaveLength(0);
    });
  });

  describe('NoObjectCollisionRule', () => {
    it('should allow placement without collisions', () => {
      const rule = new NoObjectCollisionRule(engine);
      engine.registerRule(rule);

      const obj1 = createMockObject('building', 10, 10, 5, 5);
      engine.addObject(obj1);

      const obj2 = createMockObject('vehicle', 30, 30, 5, 5);
      const isValid = engine.isValidPlacement(obj2, mockContext);

      expect(isValid).toBe(true);
    });

    it('should reject placement with collisions', () => {
      const rule = new NoObjectCollisionRule(engine);
      engine.registerRule(rule);

      const obj1 = createMockObject('building', 10, 10, 10, 10);
      engine.addObject(obj1);

      // Place vehicle overlapping building
      const obj2 = createMockObject('vehicle', 12, 12, 5, 5);
      const isValid = engine.isValidPlacement(obj2, mockContext);

      expect(isValid).toBe(false);
    });

    it('should allow same-type objects to overlap (handled by MinimumSpacing)', () => {
      const rule = new NoObjectCollisionRule(engine);
      engine.registerRule(rule);

      const obj1 = createMockObject('building', 10, 10, 10, 10);
      engine.addObject(obj1);

      // Place another building overlapping (same type)
      const obj2 = createMockObject('building', 12, 12, 10, 10);
      const violations = engine.getViolations(obj2, mockContext);

      // NoObjectCollision only checks different types
      expect(violations).toHaveLength(0);
    });
  });

  describe('MinimumSpacingRule', () => {
    it('should allow placement with sufficient spacing', () => {
      const rule = new MinimumSpacingRule(engine, 20, ['building']);
      engine.registerRule(rule);

      const obj1 = createMockObject('building', 10, 10);
      engine.addObject(obj1);

      const obj2 = createMockObject('building', 40, 40);
      const isValid = engine.isValidPlacement(obj2, mockContext);

      expect(isValid).toBe(true);
    });

    it('should reject placement too close to same type', () => {
      const rule = new MinimumSpacingRule(engine, 20, ['building']);
      engine.registerRule(rule);

      const obj1 = createMockObject('building', 10, 10);
      engine.addObject(obj1);

      const obj2 = createMockObject('building', 15, 15);
      const isValid = engine.isValidPlacement(obj2, mockContext);

      expect(isValid).toBe(false);
    });

    it('should not check spacing for different types', () => {
      const rule = new MinimumSpacingRule(engine, 20, ['building']);
      engine.registerRule(rule);

      const obj1 = createMockObject('building', 10, 10);
      engine.addObject(obj1);

      // Place vehicle close to building (different type)
      const obj2 = createMockObject('vehicle', 15, 15);
      const violations = engine.getViolations(obj2, mockContext);

      expect(violations).toHaveLength(0);
    });

    it('should calculate distance correctly', () => {
      const rule = new MinimumSpacingRule(engine, 10, ['building']);
      engine.registerRule(rule);

      const obj1 = createMockObject('building', 0, 0);
      engine.addObject(obj1);

      // Place at exactly 10 units distance (should pass)
      const obj2 = createMockObject('building', 10, 0);
      const isValid = engine.isValidPlacement(obj2, mockContext);

      expect(isValid).toBe(true);
    });
  });

  describe('BoundaryIntegrityRule', () => {
    it('should allow objects fully within chunk boundaries', () => {
      const rule = new BoundaryIntegrityRule(5, ['building']);
      engine.registerRule(rule);

      // Object well within chunk (chunk is 0-100)
      const building = createMockObject('building', 50, 50, 10, 10);
      const isValid = engine.isValidPlacement(building, mockContext);

      expect(isValid).toBe(true);
    });

    it('should reject objects that extend beyond chunk boundaries', () => {
      const rule = new BoundaryIntegrityRule(5, ['building']);
      engine.registerRule(rule);

      // Object extends beyond right boundary (chunk is 0-100)
      const building = createMockObject('building', 98, 50, 10, 10);
      const isValid = engine.isValidPlacement(building, mockContext);

      expect(isValid).toBe(false);
    });

    it('should reject objects that extend beyond left boundary', () => {
      const rule = new BoundaryIntegrityRule(5, ['building']);
      engine.registerRule(rule);

      // Object extends beyond left boundary
      const building = createMockObject('building', 2, 50, 10, 10);
      const isValid = engine.isValidPlacement(building, mockContext);

      expect(isValid).toBe(false);
    });

    it('should reject objects that extend beyond top boundary', () => {
      const rule = new BoundaryIntegrityRule(5, ['building']);
      engine.registerRule(rule);

      // Object extends beyond top boundary
      const building = createMockObject('building', 50, 2, 10, 10);
      const isValid = engine.isValidPlacement(building, mockContext);

      expect(isValid).toBe(false);
    });

    it('should reject objects that extend beyond bottom boundary', () => {
      const rule = new BoundaryIntegrityRule(5, ['building']);
      engine.registerRule(rule);

      // Object extends beyond bottom boundary
      const building = createMockObject('building', 50, 98, 10, 10);
      const isValid = engine.isValidPlacement(building, mockContext);

      expect(isValid).toBe(false);
    });

    it('should prevent duplication in adjacent chunks', () => {
      const rule = new BoundaryIntegrityRule(5, ['building']);
      engine.registerRule(rule);

      // Create adjacent chunk with a building near the boundary
      const adjacentChunk: Chunk = {
        x: 1,
        z: 0,
        worldX: 100,
        worldZ: 0,
        roads: [],
        buildings: [{
          id: 'adjacent-building',
          position: new BABYLON.Vector3(101, 0, 50),
          dimensions: new BABYLON.Vector3(10, 10, 10),
          rotation: 0,
          style: { name: 'test', colorPalette: [], windowPattern: 'grid', roofType: 'flat' },
          mesh: {} as BABYLON.Mesh,
          imposter: {} as BABYLON.PhysicsImpostor
        }],
        vehicles: [],
        signs: [],
        meshes: [],
        imposters: [],
        generatedAt: Date.now(),
        seed: 12345
      };

      mockContext.adjacentChunks = [adjacentChunk];

      // Try to place a building at almost the same position in current chunk
      const building = createMockObject('building', 99, 50, 10, 10);
      const isValid = engine.isValidPlacement(building, mockContext);

      // Should be rejected because adjacent chunk should own this object
      expect(isValid).toBe(false);
    });

    it('should allow objects owned by current chunk near boundaries', () => {
      const rule = new BoundaryIntegrityRule(5, ['building']);
      engine.registerRule(rule);

      // Create adjacent chunk (to the right)
      const adjacentChunk: Chunk = {
        x: 1,
        z: 0,
        worldX: 100,
        worldZ: 0,
        roads: [],
        buildings: [],
        vehicles: [],
        signs: [],
        meshes: [],
        imposters: [],
        generatedAt: Date.now(),
        seed: 12345
      };

      mockContext.adjacentChunks = [adjacentChunk];

      // Place building near boundary but clearly in current chunk
      const building = createMockObject('building', 90, 50, 10, 10);
      const isValid = engine.isValidPlacement(building, mockContext);

      expect(isValid).toBe(true);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: procedural-world-generation, Property 32: Collision-free object placement
     * 
     * For any generated object, the object should not intersect or collide with other
     * objects of different types (buildings don't overlap vehicles, signs don't overlap
     * buildings, etc.).
     * 
     * Validates: Requirements 3.5, 4.4, 10.4
     */
    it('Property 32: Collision-free object placement', () => {
      fc.assert(
        fc.property(
          // Generate a collection of objects with different types
          fc.array(
            fc.record({
              type: fc.constantFrom('building', 'vehicle', 'sign'),
              x: fc.float({ min: -100, max: 100, noNaN: true }),
              z: fc.float({ min: -100, max: 100, noNaN: true }),
              scaleX: fc.float({ min: 2, max: 20, noNaN: true }),
              scaleZ: fc.float({ min: 2, max: 20, noNaN: true })
            }),
            { minLength: 2, maxLength: 20 }
          ),
          (objectSpecs) => {
            // Create a fresh engine for each test
            const testEngine = new PlacementRuleEngine(10);
            const testContext: GenerationContext = {
              scene: {} as BABYLON.Scene,
              chunk: mockChunk,
              seed: 12345,
              chunkSize: 100,
              rng: new SeededRandom(12345),
              adjacentChunks: [],
              placementEngine: testEngine
            };

            // Register the NoObjectCollision rule
            const collisionRule = new NoObjectCollisionRule(testEngine);
            testEngine.registerRule(collisionRule);

            // Track successfully placed objects
            const placedObjects: GeneratedObject[] = [];

            // Try to place each object
            for (const spec of objectSpecs) {
              const obj = createMockObject(spec.type, spec.x, spec.z, spec.scaleX, spec.scaleZ);
              
              // Check if placement is valid
              const isValid = testEngine.isValidPlacement(obj, testContext);
              
              if (isValid) {
                // If valid, add to engine and track it
                testEngine.addObject(obj);
                placedObjects.push(obj);
              }
            }

            // Property: For all placed objects, no two objects of different types should collide
            let noCollisions = true;

            for (let i = 0; i < placedObjects.length; i++) {
              for (let j = i + 1; j < placedObjects.length; j++) {
                const obj1 = placedObjects[i];
                const obj2 = placedObjects[j];

                // Only check collisions between different types
                if (obj1.type !== obj2.type) {
                  const bbox1 = PlacementRuleEngine.getBoundingBox(obj1);
                  const bbox2 = PlacementRuleEngine.getBoundingBox(obj2);

                  if (PlacementRuleEngine.boxesIntersect(bbox1, bbox2)) {
                    noCollisions = false;
                    break;
                  }
                }
              }
              if (!noCollisions) break;
            }

            // Property: All placed objects should pass validation
            let allPlacedObjectsValid = true;
            for (const obj of placedObjects) {
              // Re-check each object (excluding itself from the engine temporarily)
              const violations = testEngine.getViolations(obj, testContext);
              const hasErrors = violations.some(v => v.severity === 'error');
              
              if (hasErrors) {
                allPlacedObjectsValid = false;
                break;
              }
            }

            return noCollisions && allPlacedObjectsValid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Helper functions

function createMockObject(
  type: string, 
  x: number, 
  z: number, 
  scaleX: number = 5, 
  scaleZ: number = 5
): GeneratedObject {
  return {
    type,
    position: new BABYLON.Vector3(x, 0, z),
    rotation: 0,
    scale: new BABYLON.Vector3(scaleX, 1, scaleZ),
    mesh: {} as BABYLON.Mesh,
    metadata: {}
  };
}

function createMockRoad(
  startX: number, 
  startZ: number, 
  endX: number, 
  endZ: number, 
  width: number
): Road {
  const segment: RoadSegment = {
    start: new BABYLON.Vector2(startX, startZ),
    end: new BABYLON.Vector2(endX, endZ),
    width,
    type: 'main',
    lanes: 2
  };

  return {
    id: 'test-road',
    segments: [segment],
    intersections: [],
    mesh: {} as BABYLON.Mesh,
    imposter: {} as BABYLON.PhysicsImpostor
  };
}
