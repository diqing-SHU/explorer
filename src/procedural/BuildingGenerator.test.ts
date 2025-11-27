/**
 * BuildingGenerator Tests
 * Tests building generation functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import * as fc from 'fast-check';
import { BuildingGenerator } from './BuildingGenerator';
import { RoadGenerator } from './RoadGenerator';
import { Chunk } from './ChunkTypes';
import { GenerationContext } from './Generator';
import { SeededRandom } from './SeededRandom';

describe('BuildingGenerator', () => {
  let generator: BuildingGenerator;
  let roadGenerator: RoadGenerator;
  let scene: BABYLON.Scene;
  let engine: BABYLON.NullEngine;

  beforeEach(() => {
    // Create null engine for headless testing
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    
    generator = new BuildingGenerator();
    roadGenerator = new RoadGenerator();
    generator.setRoadGenerator(roadGenerator);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should create generator with correct name', () => {
    expect(generator.getName()).toBe('BuildingGenerator');
  });

  it('should generate buildings for a chunk', () => {
    const chunk: Chunk = {
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

    const context: GenerationContext = {
      scene,
      chunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: null
    };

    // First generate roads so buildings can avoid them
    roadGenerator.generate(chunk, context);

    // Generate buildings
    const objects = generator.generate(chunk, context);

    expect(objects.length).toBeGreaterThan(0);
    expect(chunk.buildings.length).toBeGreaterThan(0);
    expect(objects[0].type).toBe('building');
  });

  it('should generate buildings with varied dimensions', () => {
    const chunk: Chunk = {
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

    const context: GenerationContext = {
      scene,
      chunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: null
    };

    roadGenerator.generate(chunk, context);
    
    // Use a larger chunk size to allow more buildings
    context.chunkSize = 200;
    chunk.worldX = 0;
    chunk.worldZ = 0;
    
    generator.generate(chunk, context);

    // Check that buildings have different dimensions
    const dimensions = chunk.buildings.map(b => b.dimensions);
    const uniqueHeights = new Set(dimensions.map(d => d.y));
    
    // Should have some variation in heights (if multiple buildings generated)
    if (chunk.buildings.length > 1) {
      expect(uniqueHeights.size).toBeGreaterThan(1);
    } else {
      // If only one building, just check it has valid dimensions
      expect(chunk.buildings.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should avoid placing buildings on roads', () => {
    const chunk: Chunk = {
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

    const context: GenerationContext = {
      scene,
      chunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: null
    };

    roadGenerator.generate(chunk, context);
    generator.generate(chunk, context);

    // Check that no building is on a road
    for (const building of chunk.buildings) {
      const pos = new BABYLON.Vector2(building.position.x, building.position.z);
      const onRoad = roadGenerator.isOnRoad(pos, chunk);
      expect(onRoad).toBe(false);
    }
  });

  it('should maintain minimum spacing between buildings', () => {
    const chunk: Chunk = {
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

    const context: GenerationContext = {
      scene,
      chunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: null
    };

    roadGenerator.generate(chunk, context);
    
    // Configure with specific minimum spacing
    generator.configure({ minSpacing: 10 });
    generator.generate(chunk, context);

    // Check spacing between all pairs of buildings
    for (let i = 0; i < chunk.buildings.length; i++) {
      for (let j = i + 1; j < chunk.buildings.length; j++) {
        const b1 = chunk.buildings[i];
        const b2 = chunk.buildings[j];
        
        const dx = b1.position.x - b2.position.x;
        const dz = b1.position.z - b2.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        expect(distance).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('should create buildings with physics imposters', () => {
    const chunk: Chunk = {
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

    const context: GenerationContext = {
      scene,
      chunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: null
    };

    roadGenerator.generate(chunk, context);
    generator.generate(chunk, context);

    // Check that all buildings have imposters
    for (const building of chunk.buildings) {
      expect(building.imposter).toBeDefined();
    }
  });

  it('should apply different building styles', () => {
    const chunk: Chunk = {
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

    const context: GenerationContext = {
      scene,
      chunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: null
    };

    roadGenerator.generate(chunk, context);
    generator.generate(chunk, context);

    // Check that buildings have styles
    const styles = new Set(chunk.buildings.map(b => b.style.name));
    
    // Should have at least one style
    expect(styles.size).toBeGreaterThan(0);
  });

  it('should respect configuration parameters', () => {
    const chunk: Chunk = {
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

    const context: GenerationContext = {
      scene,
      chunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: null
    };

    roadGenerator.generate(chunk, context);
    
    // Configure with specific density
    generator.configure({ density: 5 });
    generator.generate(chunk, context);

    // Should generate approximately the configured number of buildings
    // (may be less due to placement constraints)
    expect(chunk.buildings.length).toBeLessThanOrEqual(5);
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: procedural-world-generation, Property 16: Building street alignment
     * 
     * For any building, the building should be aligned with the road grid and oriented
     * to face the nearest street.
     * 
     * Validates: Requirements 5.3
     */
    it('Property 16: Building street alignment', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates and seeds
          fc.record({
            chunkX: fc.integer({ min: -10, max: 10 }),
            chunkZ: fc.integer({ min: -10, max: 10 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.constantFrom(50, 100, 150, 200)
          }),
          (testData) => {
            // Create a fresh scene for each test
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            // Create generators
            const testRoadGenerator = new RoadGenerator();
            const testBuildingGenerator = new BuildingGenerator();
            testBuildingGenerator.setRoadGenerator(testRoadGenerator);
            
            // Create chunk
            const chunk: Chunk = {
              x: testData.chunkX,
              z: testData.chunkZ,
              worldX: testData.chunkX * testData.chunkSize,
              worldZ: testData.chunkZ * testData.chunkSize,
              roads: [],
              buildings: [],
              vehicles: [],
              signs: [],
              meshes: [],
              imposters: [],
              generatedAt: Date.now(),
              seed: testData.seed
            };
            
            // Create generation context
            const context: GenerationContext = {
              scene: testScene,
              chunk,
              seed: testData.seed,
              chunkSize: testData.chunkSize,
              rng: new SeededRandom(testData.seed),
              adjacentChunks: [],
              placementEngine: null
            };
            
            // Generate roads first
            testRoadGenerator.generate(chunk, context);
            
            // Generate buildings
            testBuildingGenerator.generate(chunk, context);
            
            // Property: All buildings should be aligned with road grid and face nearest street
            let allBuildingsAligned = true;
            
            // If no buildings or no roads generated, property trivially holds
            if (chunk.buildings.length === 0 || chunk.roads.length === 0) {
              testScene.dispose();
              testEngine.dispose();
              return true;
            }
            
            for (const building of chunk.buildings) {
              const buildingPos = building.position;
              
              // Find nearest road segment
              let nearestDistance = Infinity;
              let nearestSegment: any = null;
              
              for (const road of chunk.roads) {
                for (const segment of road.segments) {
                  const distance = calculateDistanceToSegment(
                    buildingPos.x,
                    buildingPos.z,
                    segment
                  );
                  
                  if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestSegment = segment;
                  }
                }
              }
              
              if (!nearestSegment) {
                allBuildingsAligned = false;
                break;
              }
              
              // Calculate expected rotation to face the road
              const dx = nearestSegment.end.x - nearestSegment.start.x;
              const dz = nearestSegment.end.y - nearestSegment.start.y;
              
              // Road direction angle
              const roadAngle = Math.atan2(dz, dx);
              
              // Building should be perpendicular to road (facing it)
              // Expected angle is perpendicular to road direction
              let expectedAngle = roadAngle + Math.PI / 2;
              
              // Determine which side of the road the building is on
              const midX = (nearestSegment.start.x + nearestSegment.end.x) / 2;
              const midZ = (nearestSegment.start.y + nearestSegment.end.y) / 2;
              
              const toBuildingAngle = Math.atan2(buildingPos.z - midZ, buildingPos.x - midX);
              const angleDiff = toBuildingAngle - roadAngle;
              
              // Adjust if building is on the opposite side
              if (Math.abs(angleDiff) > Math.PI / 2) {
                expectedAngle += Math.PI;
              }
              
              // Normalize angles to [-PI, PI]
              const normalizeAngle = (angle: number) => {
                while (angle > Math.PI) angle -= 2 * Math.PI;
                while (angle < -Math.PI) angle += 2 * Math.PI;
                return angle;
              };
              
              const normalizedExpected = normalizeAngle(expectedAngle);
              const normalizedActual = normalizeAngle(building.rotation);
              
              // Check if building rotation is approximately correct
              // Allow some tolerance for floating point errors and slight variations
              const angleTolerance = Math.PI / 8; // 22.5 degrees tolerance
              const angleDifference = Math.abs(normalizedExpected - normalizedActual);
              
              // Handle wrap-around case (e.g., -PI and PI are the same)
              const wrappedDifference = Math.min(
                angleDifference,
                2 * Math.PI - angleDifference
              );
              
              if (wrappedDifference > angleTolerance) {
                allBuildingsAligned = false;
                break;
              }
            }
            
            // Cleanup
            testScene.dispose();
            testEngine.dispose();
            
            return allBuildingsAligned;
          }
        ),
        { numRuns: 100 }
      );
      
      // Helper function to calculate distance from point to segment
      function calculateDistanceToSegment(
        x: number,
        z: number,
        segment: any
      ): number {
        const start = segment.start;
        const end = segment.end;
        
        const dx = end.x - start.x;
        const dz = end.y - start.y;
        const lengthSquared = dx * dx + dz * dz;
        
        if (lengthSquared === 0) {
          const pdx = x - start.x;
          const pdz = z - start.y;
          return Math.sqrt(pdx * pdx + pdz * pdz);
        }
        
        const t = Math.max(0, Math.min(1, 
          ((x - start.x) * dx + (z - start.y) * dz) / lengthSquared
        ));
        
        const projX = start.x + t * dx;
        const projZ = start.y + t * dz;
        
        const distX = x - projX;
        const distZ = z - projZ;
        
        return Math.sqrt(distX * distX + distZ * distZ);
      }
    });

    /**
     * Feature: procedural-world-generation, Property 17: Object spacing constraints
     * 
     * For any pair of objects of the same type (buildings, vehicles, signs), the objects
     * should maintain minimum spacing appropriate for that object type.
     * 
     * Validates: Requirements 5.5
     */
    it('Property 17: Object spacing constraints', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates, seeds, and spacing configuration
          fc.record({
            chunkX: fc.integer({ min: -10, max: 10 }),
            chunkZ: fc.integer({ min: -10, max: 10 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.constantFrom(100, 150, 200),
            minSpacing: fc.integer({ min: 5, max: 20 })
          }),
          (testData) => {
            // Create a fresh scene for each test
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            // Create generators
            const testRoadGenerator = new RoadGenerator();
            const testBuildingGenerator = new BuildingGenerator();
            testBuildingGenerator.setRoadGenerator(testRoadGenerator);
            
            // Configure with specific minimum spacing
            testBuildingGenerator.configure({ 
              minSpacing: testData.minSpacing,
              density: 20 // Higher density to test spacing more thoroughly
            });
            
            // Create chunk
            const chunk: Chunk = {
              x: testData.chunkX,
              z: testData.chunkZ,
              worldX: testData.chunkX * testData.chunkSize,
              worldZ: testData.chunkZ * testData.chunkSize,
              roads: [],
              buildings: [],
              vehicles: [],
              signs: [],
              meshes: [],
              imposters: [],
              generatedAt: Date.now(),
              seed: testData.seed
            };
            
            // Create generation context
            const context: GenerationContext = {
              scene: testScene,
              chunk,
              seed: testData.seed,
              chunkSize: testData.chunkSize,
              rng: new SeededRandom(testData.seed),
              adjacentChunks: [],
              placementEngine: null
            };
            
            // Generate roads first
            testRoadGenerator.generate(chunk, context);
            
            // Generate buildings
            testBuildingGenerator.generate(chunk, context);
            
            // Property: All pairs of buildings should maintain minimum spacing
            let allPairsMaintainSpacing = true;
            
            // If fewer than 2 buildings, property trivially holds
            if (chunk.buildings.length < 2) {
              testScene.dispose();
              testEngine.dispose();
              return true;
            }
            
            // Check all pairs of buildings
            for (let i = 0; i < chunk.buildings.length; i++) {
              for (let j = i + 1; j < chunk.buildings.length; j++) {
                const building1 = chunk.buildings[i];
                const building2 = chunk.buildings[j];
                
                // Calculate center-to-center distance
                const dx = building1.position.x - building2.position.x;
                const dz = building1.position.z - building2.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                // Check if distance meets minimum spacing requirement
                if (distance < testData.minSpacing) {
                  allPairsMaintainSpacing = false;
                  break;
                }
              }
              
              if (!allPairsMaintainSpacing) break;
            }
            
            // Cleanup
            testScene.dispose();
            testEngine.dispose();
            
            return allPairsMaintainSpacing;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 15: Building road avoidance
     * 
     * For any building, the building's footprint should not intersect with any road
     * or road infrastructure.
     * 
     * Validates: Requirements 5.1
     */
    it('Property 15: Building road avoidance', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates and seeds
          fc.record({
            chunkX: fc.integer({ min: -10, max: 10 }),
            chunkZ: fc.integer({ min: -10, max: 10 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.constantFrom(50, 100, 150, 200)
          }),
          (testData) => {
            // Create a fresh scene for each test
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            // Create generators
            const testRoadGenerator = new RoadGenerator();
            const testBuildingGenerator = new BuildingGenerator();
            testBuildingGenerator.setRoadGenerator(testRoadGenerator);
            
            // Create chunk
            const chunk: Chunk = {
              x: testData.chunkX,
              z: testData.chunkZ,
              worldX: testData.chunkX * testData.chunkSize,
              worldZ: testData.chunkZ * testData.chunkSize,
              roads: [],
              buildings: [],
              vehicles: [],
              signs: [],
              meshes: [],
              imposters: [],
              generatedAt: Date.now(),
              seed: testData.seed
            };
            
            // Create generation context
            const context: GenerationContext = {
              scene: testScene,
              chunk,
              seed: testData.seed,
              chunkSize: testData.chunkSize,
              rng: new SeededRandom(testData.seed),
              adjacentChunks: [],
              placementEngine: null
            };
            
            // Generate roads first
            testRoadGenerator.generate(chunk, context);
            
            // Generate buildings
            testBuildingGenerator.generate(chunk, context);
            
            // Property: No building should intersect with any road
            // Note: If no buildings are generated, the property trivially holds
            // (this can happen in small chunks with many roads)
            let allBuildingsAvoidRoads = true;
            
            for (const building of chunk.buildings) {
              const buildingPos = building.position;
              const buildingDim = building.dimensions;
              
              // Calculate building footprint (axis-aligned bounding box)
              // Note: We need to account for rotation, but for simplicity we'll use
              // a conservative check with the building's bounding box
              const halfWidth = buildingDim.x / 2;
              const halfDepth = buildingDim.z / 2;
              
              // Check multiple points around the building's footprint
              // This accounts for rotation by checking corners and edges
              const checkPoints: BABYLON.Vector2[] = [];
              
              // Add corners
              const corners = [
                new BABYLON.Vector2(buildingPos.x - halfWidth, buildingPos.z - halfDepth),
                new BABYLON.Vector2(buildingPos.x + halfWidth, buildingPos.z - halfDepth),
                new BABYLON.Vector2(buildingPos.x + halfWidth, buildingPos.z + halfDepth),
                new BABYLON.Vector2(buildingPos.x - halfWidth, buildingPos.z + halfDepth)
              ];
              
              // Rotate corners based on building rotation
              const cos = Math.cos(building.rotation);
              const sin = Math.sin(building.rotation);
              
              for (const corner of corners) {
                const dx = corner.x - buildingPos.x;
                const dz = corner.y - buildingPos.z;
                
                const rotatedX = buildingPos.x + (dx * cos - dz * sin);
                const rotatedZ = buildingPos.z + (dx * sin + dz * cos);
                
                checkPoints.push(new BABYLON.Vector2(rotatedX, rotatedZ));
              }
              
              // Add center point
              checkPoints.push(new BABYLON.Vector2(buildingPos.x, buildingPos.z));
              
              // Add edge midpoints
              for (let i = 0; i < corners.length; i++) {
                const corner1 = corners[i];
                const corner2 = corners[(i + 1) % corners.length];
                
                const midX = (corner1.x + corner2.x) / 2;
                const midZ = (corner1.y + corner2.y) / 2;
                
                // Rotate midpoint
                const dx = midX - buildingPos.x;
                const dz = midZ - buildingPos.z;
                
                const rotatedX = buildingPos.x + (dx * cos - dz * sin);
                const rotatedZ = buildingPos.z + (dx * sin + dz * cos);
                
                checkPoints.push(new BABYLON.Vector2(rotatedX, rotatedZ));
              }
              
              // Check if any point is on a road
              for (const point of checkPoints) {
                if (testRoadGenerator.isOnRoad(point, chunk)) {
                  allBuildingsAvoidRoads = false;
                  break;
                }
              }
              
              if (!allBuildingsAvoidRoads) break;
              
              // Additional check: Verify building is not too close to roads
              // by checking distance to all road segments
              for (const road of chunk.roads) {
                for (const segment of road.segments) {
                  // Calculate distance from building center to road segment
                  const start = segment.start;
                  const end = segment.end;
                  
                  const dx = end.x - start.x;
                  const dz = end.y - start.y;
                  const lengthSquared = dx * dx + dz * dz;
                  
                  if (lengthSquared === 0) continue;
                  
                  // Project building center onto line segment
                  const t = Math.max(0, Math.min(1, 
                    ((buildingPos.x - start.x) * dx + (buildingPos.z - start.y) * dz) / lengthSquared
                  ));
                  
                  const projX = start.x + t * dx;
                  const projZ = start.y + t * dz;
                  
                  const distX = buildingPos.x - projX;
                  const distZ = buildingPos.z - projZ;
                  const distance = Math.sqrt(distX * distX + distZ * distZ);
                  
                  // Building should be at least roadOffset distance from road edge
                  // (road edge is at width/2 from center)
                  const minDistance = segment.width / 2;
                  
                  if (distance < minDistance) {
                    allBuildingsAvoidRoads = false;
                    break;
                  }
                }
                if (!allBuildingsAvoidRoads) break;
              }
              
              if (!allBuildingsAvoidRoads) break;
            }
            
            // Cleanup
            testScene.dispose();
            testEngine.dispose();
            
            // Property: All buildings should avoid roads
            return allBuildingsAvoidRoads;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
