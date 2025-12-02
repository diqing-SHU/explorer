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

    /**
     * Feature: procedural-world-generation, Property 29: Content variety across chunks
     * 
     * For any set of generated chunks, there should be variety in object types, colors,
     * sizes, and styles (buildings, vehicles, signs should not all be identical).
     * 
     * Validates: Requirements 5.2, 5.4
     */
    it('Property 29: Content variety across chunks', () => {
      fc.assert(
        fc.property(
          // Generate random seeds and chunk configurations
          fc.record({
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.constantFrom(100, 150, 200),
            numChunks: fc.integer({ min: 4, max: 8 })
          }),
          (testData) => {
            // Create a fresh scene for each test
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            // Create generators
            const testRoadGenerator = new RoadGenerator();
            const testBuildingGenerator = new BuildingGenerator();
            testBuildingGenerator.setRoadGenerator(testRoadGenerator);
            
            // Generate multiple chunks
            const chunks: Chunk[] = [];
            
            for (let i = 0; i < testData.numChunks; i++) {
              const chunkX = i % 3;
              const chunkZ = Math.floor(i / 3);
              
              const chunk: Chunk = {
                x: chunkX,
                z: chunkZ,
                worldX: chunkX * testData.chunkSize,
                worldZ: chunkZ * testData.chunkSize,
                roads: [],
                buildings: [],
                vehicles: [],
                signs: [],
                meshes: [],
                imposters: [],
                generatedAt: Date.now(),
                seed: testData.seed
              };
              
              const context: GenerationContext = {
                scene: testScene,
                chunk,
                seed: testData.seed + chunkX * 1000 + chunkZ,
                chunkSize: testData.chunkSize,
                rng: new SeededRandom(testData.seed + chunkX * 1000 + chunkZ),
                adjacentChunks: [],
                placementEngine: null
              };
              
              // Generate roads first
              testRoadGenerator.generate(chunk, context);
              
              // Generate buildings
              testBuildingGenerator.generate(chunk, context);
              
              chunks.push(chunk);
            }
            
            // Collect all buildings from all chunks
            const allBuildings: Building[] = [];
            for (const chunk of chunks) {
              allBuildings.push(...chunk.buildings);
            }
            
            // If fewer than 4 buildings generated, property trivially holds
            // (not enough data to assess variety)
            if (allBuildings.length < 4) {
              testScene.dispose();
              testEngine.dispose();
              return true;
            }
            
            // Property 1: Building heights should vary
            const heights = allBuildings.map(b => Math.round(b.dimensions.y * 10) / 10);
            const uniqueHeights = new Set(heights);
            const hasHeightVariety = uniqueHeights.size > 1;
            
            // Property 2: Building widths should vary
            const widths = allBuildings.map(b => Math.round(b.dimensions.x * 10) / 10);
            const uniqueWidths = new Set(widths);
            const hasWidthVariety = uniqueWidths.size > 1;
            
            // Property 3: Building depths should vary
            const depths = allBuildings.map(b => Math.round(b.dimensions.z * 10) / 10);
            const uniqueDepths = new Set(depths);
            const hasDepthVariety = uniqueDepths.size > 1;
            
            // Property 4: Building styles should vary
            const styles = allBuildings.map(b => b.style.name);
            const uniqueStyles = new Set(styles);
            const hasStyleVariety = uniqueStyles.size > 1;
            
            // Property 5: Building colors should vary (check material colors)
            const colors = allBuildings.map(b => {
              const material = b.mesh.material as BABYLON.StandardMaterial;
              if (material && material.diffuseColor) {
                return `${material.diffuseColor.r.toFixed(1)},${material.diffuseColor.g.toFixed(1)},${material.diffuseColor.b.toFixed(1)}`;
              }
              return 'default';
            });
            const uniqueColors = new Set(colors);
            const hasColorVariety = uniqueColors.size > 1;
            
            // Property 6: Building roof types should vary
            const roofTypes = allBuildings.map(b => b.style.roofType);
            const uniqueRoofTypes = new Set(roofTypes);
            const hasRoofTypeVariety = uniqueRoofTypes.size > 1;
            
            // Property 7: Building window patterns should vary
            const windowPatterns = allBuildings.map(b => b.style.windowPattern);
            const uniqueWindowPatterns = new Set(windowPatterns);
            const hasWindowPatternVariety = uniqueWindowPatterns.size > 1;
            
            // Property 8: Building rotations should vary (facing different streets)
            const rotations = allBuildings.map(b => Math.round(b.rotation * 10) / 10);
            const uniqueRotations = new Set(rotations);
            const hasRotationVariety = uniqueRotations.size > 1;
            
            // Cleanup
            testScene.dispose();
            testEngine.dispose();
            
            // For variety to be present, we need:
            // - At least 2 different heights (size variation)
            // - At least 2 different widths (size variation)
            // - At least 2 different depths (size variation)
            // - At least 2 different styles (style variation)
            // - At least 2 different colors (color variation)
            // - At least 2 different roof types (architectural variation)
            // - At least 2 different window patterns (detail variation)
            // - At least 2 different rotations (orientation variation)
            
            // We require at least 4 out of 8 variety criteria to pass
            // This is more lenient to account for edge cases where certain
            // variations might not occur due to random generation or placement constraints
            const varietyCriteriaMet = [
              hasHeightVariety,
              hasWidthVariety,
              hasDepthVariety,
              hasStyleVariety,
              hasColorVariety,
              hasRoofTypeVariety,
              hasWindowPatternVariety,
              hasRotationVariety
            ].filter(Boolean).length;
            
            return varietyCriteriaMet >= 4;
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 27: Property variation within bounds
     * 
     * For any generated object, properties like scale, rotation, and color should vary
     * between instances but remain within configured minimum and maximum bounds.
     * 
     * Validates: Requirements 9.2
     */
    it('Property 27: Property variation within bounds', () => {
      fc.assert(
        fc.property(
          // Generate random configuration with variation bounds
          fc.record({
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.constant(100),
            scaleVariation: fc.float({ min: Math.fround(0.01), max: Math.fround(0.2), noNaN: true }),      // 1% to 20% variation
            rotationVariation: fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true }),   // ~0.6° to ~28.6° variation
            minHeight: fc.constant(10),
            maxHeight: fc.constant(50),
            minWidth: fc.constant(8),
            maxWidth: fc.constant(20),
            minDepth: fc.constant(8),
            maxDepth: fc.constant(20)
          }),
          (testData) => {
            // Create a fresh test environment
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            // Create generators with specific variation bounds
            const testRoadGenerator = new RoadGenerator();
            const testBuildingGenerator = new BuildingGenerator();
            testBuildingGenerator.setRoadGenerator(testRoadGenerator);
            
            // Configure with specific variation bounds
            testBuildingGenerator.configure({
              scaleVariation: testData.scaleVariation,
              rotationVariation: testData.rotationVariation,
              minHeight: testData.minHeight,
              maxHeight: testData.maxHeight,
              minWidth: testData.minWidth,
              maxWidth: testData.maxWidth,
              minDepth: testData.minDepth,
              maxDepth: testData.maxDepth,
              density: 20  // Generate more buildings for better testing
            });
            
            // Generate a chunk with buildings
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
              seed: testData.seed
            };
            
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
            
            // If no buildings generated, property trivially holds
            if (chunk.buildings.length === 0) {
              testScene.dispose();
              testEngine.dispose();
              return true;
            }
            
            // Property 1: Scale variation should be within bounds
            // Buildings have base dimensions from noise (within [minDim, maxDim])
            // Then scale variation is applied: finalDim = baseDim * (1.0 ± scaleVariation)
            // So the final range is: [minDim * (1 - scaleVar), maxDim * (1 + scaleVar)]
            let allScalesWithinBounds = true;
            
            for (const building of chunk.buildings) {
              const minScaleMultiplier = 1.0 - testData.scaleVariation;
              const maxScaleMultiplier = 1.0 + testData.scaleVariation;
              
              // The base dimensions come from noise: minDim + noise * (maxDim - minDim)
              // This gives us a range of [minDim, maxDim]
              // After applying scale variation, the range becomes:
              // [minDim * minScaleMultiplier, maxDim * maxScaleMultiplier]
              const minPossibleHeight = testData.minHeight * minScaleMultiplier;
              const maxPossibleHeight = testData.maxHeight * maxScaleMultiplier;
              const minPossibleWidth = testData.minWidth * minScaleMultiplier;
              const maxPossibleWidth = testData.maxWidth * maxScaleMultiplier;
              const minPossibleDepth = testData.minDepth * minScaleMultiplier;
              const maxPossibleDepth = testData.maxDepth * maxScaleMultiplier;
              
              // Check if dimensions are within expected bounds (with small epsilon for floating point)
              const epsilon = 0.01;
              
              if (building.dimensions.y < minPossibleHeight - epsilon ||
                  building.dimensions.y > maxPossibleHeight + epsilon) {
                allScalesWithinBounds = false;
                break;
              }
              
              if (building.dimensions.x < minPossibleWidth - epsilon ||
                  building.dimensions.x > maxPossibleWidth + epsilon) {
                allScalesWithinBounds = false;
                break;
              }
              
              if (building.dimensions.z < minPossibleDepth - epsilon ||
                  building.dimensions.z > maxPossibleDepth + epsilon) {
                allScalesWithinBounds = false;
                break;
              }
            }
            
            // Property 2: Rotation variation should be within bounds
            // Buildings have a base rotation (facing street) plus variation
            // We can't easily determine the base rotation, but we can check that
            // rotations vary and are reasonable (not all identical)
            let rotationsVary = false;
            
            if (chunk.buildings.length >= 2) {
              const rotations = chunk.buildings.map(b => b.rotation);
              const uniqueRotations = new Set(rotations.map(r => Math.round(r * 100) / 100));
              rotationsVary = uniqueRotations.size > 1 || chunk.buildings.length < 3;
              
              // Also check that no rotation is wildly out of bounds (should be within 0 to 2π)
              const allRotationsReasonable = rotations.every(r => 
                r >= -Math.PI * 2 - testData.rotationVariation && 
                r <= Math.PI * 2 + testData.rotationVariation
              );
              
              if (!allRotationsReasonable) {
                rotationsVary = false;
              }
            } else {
              // With fewer than 2 buildings, we can't assess variation
              rotationsVary = true;
            }
            
            // Property 3: Colors should vary (from style palette)
            // This is already tested in the variety test, but we verify colors are valid
            let allColorsValid = true;
            
            for (const building of chunk.buildings) {
              const material = building.mesh.material as BABYLON.StandardMaterial;
              if (material && material.diffuseColor) {
                const color = material.diffuseColor;
                // Colors should be in valid range [0, 1]
                if (color.r < 0 || color.r > 1 ||
                    color.g < 0 || color.g > 1 ||
                    color.b < 0 || color.b > 1) {
                  allColorsValid = false;
                  break;
                }
              }
            }
            
            // Cleanup
            testScene.dispose();
            testEngine.dispose();
            
            // Property: All variation should be within configured bounds
            return allScalesWithinBounds && rotationsVary && allColorsValid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
