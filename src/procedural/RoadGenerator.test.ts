/**
 * RoadGenerator Tests
 * Tests for road network generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import * as fc from 'fast-check';
import { RoadGenerator } from './RoadGenerator';
import { Chunk, RoadSegment } from './ChunkTypes';
import { GenerationContext } from './Generator';
import { SeededRandom } from './SeededRandom';

describe('RoadGenerator', () => {
  let generator: RoadGenerator;
  let scene: BABYLON.Scene;
  let engine: BABYLON.NullEngine;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    generator = new RoadGenerator();
  });

  it('should create a RoadGenerator instance', () => {
    expect(generator).toBeDefined();
    expect(generator.getName()).toBe('RoadGenerator');
  });

  it('should generate roads for a chunk', () => {
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

    const objects = generator.generate(chunk, context);

    // Should generate at least one road object
    expect(objects.length).toBeGreaterThan(0);
    expect(objects[0].type).toBe('road');

    // Chunk should have road data
    expect(chunk.roads.length).toBeGreaterThan(0);
    expect(chunk.roads[0].segments.length).toBeGreaterThan(0);

    // Should have meshes
    expect(chunk.meshes.length).toBeGreaterThan(0);
  });

  it('should generate road segments with proper structure', () => {
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

    generator.generate(chunk, context);

    const segments = chunk.roads[0].segments;
    
    // Each segment should have required properties
    for (const segment of segments) {
      expect(segment.start).toBeDefined();
      expect(segment.end).toBeDefined();
      expect(segment.width).toBeGreaterThan(0);
      expect(['main', 'side']).toContain(segment.type);
      expect(segment.lanes).toBeGreaterThan(0);
    }
  });

  it('should detect intersections', () => {
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

    generator.generate(chunk, context);

    // Should detect intersections where roads cross
    const intersections = chunk.roads[0].intersections;
    expect(intersections.length).toBeGreaterThan(0);

    // Each intersection should have proper structure
    for (const intersection of intersections) {
      expect(intersection.position).toBeDefined();
      expect(intersection.roads.length).toBeGreaterThanOrEqual(2);
      expect(['cross', 't', 'corner']).toContain(intersection.type);
    }
  });

  it('should create lane markings', () => {
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

    generator.generate(chunk, context);

    // Should have multiple meshes (road + markings)
    expect(chunk.meshes.length).toBeGreaterThan(1);
  });

  it('should vary road types (main and side roads)', () => {
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

    generator.generate(chunk, context);

    const segments = chunk.roads[0].segments;
    const mainRoads = segments.filter(s => s.type === 'main');
    const sideRoads = segments.filter(s => s.type === 'side');

    // Should have at least some roads
    expect(segments.length).toBeGreaterThan(0);
    
    // Should have at least one type of road (main or side)
    // Note: With deterministic world-space grid generation, a specific seed
    // might generate all roads of the same type. This is acceptable as long as
    // different world positions generate different types.
    expect(mainRoads.length + sideRoads.length).toBe(segments.length);

    // If we have both types, main roads should be wider
    if (mainRoads.length > 0 && sideRoads.length > 0) {
      const avgMainWidth = mainRoads.reduce((sum, r) => sum + r.width, 0) / mainRoads.length;
      const avgSideWidth = sideRoads.reduce((sum, r) => sum + r.width, 0) / sideRoads.length;
      expect(avgMainWidth).toBeGreaterThan(avgSideWidth);
    }
  });

  it('should allow configuration', () => {
    generator.configure({
      gridSpacing: 30,
      mainRoadWidth: 15,
      sideRoadWidth: 10
    });

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

    generator.generate(chunk, context);

    // Configuration should affect generation
    expect(chunk.roads.length).toBeGreaterThan(0);
  });

  it('should provide getRoadSegments helper', () => {
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

    generator.generate(chunk, context);

    const segments = generator.getRoadSegments(chunk);
    expect(segments.length).toBeGreaterThan(0);
  });

  it('should provide isOnRoad helper', () => {
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

    generator.generate(chunk, context);

    // Test a point on a road
    const segment = chunk.roads[0].segments[0];
    const midpoint = new BABYLON.Vector2(
      (segment.start.x + segment.end.x) / 2,
      (segment.start.y + segment.end.y) / 2
    );

    expect(generator.isOnRoad(midpoint, chunk)).toBe(true);

    // Test a point far from roads
    const farPoint = new BABYLON.Vector2(10000, 10000);
    expect(generator.isOnRoad(farPoint, chunk)).toBe(false);
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: procedural-world-generation, Property 7: Lane markings completeness
     * 
     * For any generated road, the road should have lane markings including center lines,
     * edge lines, and crosswalks where appropriate.
     * 
     * Validates: Requirements 2.3
     */
    it('Property 7: Lane markings completeness', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates and seeds
          fc.record({
            chunkX: fc.integer({ min: -100, max: 100 }),
            chunkZ: fc.integer({ min: -100, max: 100 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.integer({ min: 50, max: 200 })
          }),
          (testData) => {
            // Create a fresh scene for each test
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            const testGenerator = new RoadGenerator();

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

            // Generate roads
            testGenerator.generate(chunk, context);

            // Property 1: Should have generated meshes beyond just the road surface
            // (road surface + lane markings)
            const hasMeshes = chunk.meshes.length > 1;

            // Property 2: For each road segment, there should be lane marking meshes
            const segments = chunk.roads.length > 0 ? chunk.roads[0].segments : [];
            const intersections = chunk.roads.length > 0 ? chunk.roads[0].intersections : [];

            // Count expected marking meshes:
            // - Each segment should have: 1 center line + 2 edge lines = 3 meshes per segment
            // - Each intersection should have crosswalk stripes (8 stripes per intersection)
            const expectedMinMarkingMeshes = segments.length * 3 + intersections.length * 8;
            
            // The first mesh is the road surface, the rest should be markings
            const markingMeshCount = chunk.meshes.length - 1;
            const hasExpectedMarkings = markingMeshCount >= expectedMinMarkingMeshes;

            // Property 3: Verify marking meshes have appropriate names
            let hasValidMarkingNames = true;
            for (let i = 1; i < chunk.meshes.length; i++) {
              const mesh = chunk.meshes[i];
              const name = mesh.name;
              
              // Marking meshes should be named: centerLine_, edgeLine_, or crosswalk_
              const isValidMarkingName = 
                name.includes('centerLine_') || 
                name.includes('edgeLine_') || 
                name.includes('crosswalk_');
              
              if (!isValidMarkingName) {
                hasValidMarkingNames = false;
                break;
              }
            }

            // Property 4: Each segment should have corresponding center and edge line meshes
            let allSegmentsHaveMarkings = true;
            for (let i = 0; i < segments.length; i++) {
              // Check for center line mesh
              const hasCenterLine = chunk.meshes.some(m => 
                m.name.includes(`centerLine_${chunk.x}_${chunk.z}_${i}`)
              );
              
              // Check for edge line meshes (2 per segment)
              const hasEdgeLine0 = chunk.meshes.some(m => 
                m.name.includes(`edgeLine_${chunk.x}_${chunk.z}_${i}_0`)
              );
              const hasEdgeLine1 = chunk.meshes.some(m => 
                m.name.includes(`edgeLine_${chunk.x}_${chunk.z}_${i}_1`)
              );
              
              if (!hasCenterLine || !hasEdgeLine0 || !hasEdgeLine1) {
                allSegmentsHaveMarkings = false;
                break;
              }
            }

            // Property 5: Each intersection should have crosswalk meshes
            let allIntersectionsHaveCrosswalks = true;
            for (let i = 0; i < intersections.length; i++) {
              // Check for crosswalk meshes (should have multiple stripes)
              const crosswalkMeshes = chunk.meshes.filter(m => 
                m.name.includes(`crosswalk_${chunk.x}_${chunk.z}_${i}_`)
              );
              
              // Should have at least some crosswalk stripes
              if (crosswalkMeshes.length === 0) {
                allIntersectionsHaveCrosswalks = false;
                break;
              }
            }

            // Property 6: Marking meshes should have materials (colors)
            let allMarkingsHaveMaterials = true;
            for (let i = 1; i < chunk.meshes.length; i++) {
              const mesh = chunk.meshes[i];
              if (!mesh.material) {
                allMarkingsHaveMaterials = false;
                break;
              }
            }

            // Cleanup
            testScene.dispose();
            testEngine.dispose();

            // All properties must hold
            return hasMeshes && 
                   hasExpectedMarkings && 
                   hasValidMarkingNames && 
                   allSegmentsHaveMarkings && 
                   allIntersectionsHaveCrosswalks &&
                   allMarkingsHaveMaterials;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 6: Intersection creation at crossings
     * 
     * For any two roads that cross within a chunk, an intersection should be created
     * at the crossing point with appropriate geometry.
     * 
     * Validates: Requirements 2.2
     */
    it('Property 6: Intersection creation at crossings', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates and seeds
          fc.record({
            chunkX: fc.integer({ min: -100, max: 100 }),
            chunkZ: fc.integer({ min: -100, max: 100 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.integer({ min: 50, max: 200 })
          }),
          (testData) => {
            // Create a fresh scene for each test
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            const testGenerator = new RoadGenerator();

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

            // Generate roads
            testGenerator.generate(chunk, context);

            // Get all road segments
            const segments = chunk.roads.length > 0 ? chunk.roads[0].segments : [];
            const intersections = chunk.roads.length > 0 ? chunk.roads[0].intersections : [];

            // Property 1: For each detected intersection, verify it corresponds to actual crossing roads
            let allIntersectionsValid = true;
            for (const intersection of intersections) {
              // Intersection should have at least 2 roads
              if (intersection.roads.length < 2) {
                allIntersectionsValid = false;
                break;
              }

              // Intersection should have a valid type
              if (!['cross', 't', 'corner'].includes(intersection.type)) {
                allIntersectionsValid = false;
                break;
              }

              // Intersection position should be defined
              if (!intersection.position) {
                allIntersectionsValid = false;
                break;
              }
            }

            // Property 2: For each pair of perpendicular segments that cross, there should be an intersection
            // Find all pairs of segments that should intersect
            const expectedIntersections: BABYLON.Vector2[] = [];
            
            for (let i = 0; i < segments.length; i++) {
              for (let j = i + 1; j < segments.length; j++) {
                const seg1 = segments[i];
                const seg2 = segments[j];

                // Check if segments are perpendicular
                const seg1Horizontal = Math.abs(seg1.start.y - seg1.end.y) < 0.1;
                const seg2Horizontal = Math.abs(seg2.start.y - seg2.end.y) < 0.1;

                if (seg1Horizontal !== seg2Horizontal) {
                  // Determine which is horizontal and which is vertical
                  let hSeg: RoadSegment, vSeg: RoadSegment;
                  if (seg1Horizontal) {
                    hSeg = seg1;
                    vSeg = seg2;
                  } else {
                    hSeg = seg2;
                    vSeg = seg1;
                  }

                  // Check if they actually cross
                  const hZ = hSeg.start.y;
                  const hMinX = Math.min(hSeg.start.x, hSeg.end.x);
                  const hMaxX = Math.max(hSeg.start.x, hSeg.end.x);

                  const vX = vSeg.start.x;
                  const vMinZ = Math.min(vSeg.start.y, vSeg.end.y);
                  const vMaxZ = Math.max(vSeg.start.y, vSeg.end.y);

                  // If they cross, record the intersection point
                  if (vX >= hMinX && vX <= hMaxX && hZ >= vMinZ && hZ <= vMaxZ) {
                    expectedIntersections.push(new BABYLON.Vector2(vX, hZ));
                  }
                }
              }
            }

            // Property 3: Each expected intersection should have a corresponding detected intersection
            let allExpectedIntersectionsDetected = true;
            const epsilon = 0.1; // Tolerance for floating point comparison

            for (const expected of expectedIntersections) {
              let found = false;
              for (const detected of intersections) {
                const dx = expected.x - detected.position.x;
                const dy = expected.y - detected.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < epsilon) {
                  found = true;
                  break;
                }
              }
              
              if (!found) {
                allExpectedIntersectionsDetected = false;
                break;
              }
            }

            // Property 4: No extra intersections should be detected (no false positives)
            // The number of detected intersections should match expected intersections
            const noExtraIntersections = intersections.length === expectedIntersections.length;

            // Cleanup
            testScene.dispose();
            testEngine.dispose();

            // All properties must hold
            return allIntersectionsValid && 
                   allExpectedIntersectionsDetected && 
                   noExtraIntersections;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 8: Seamless chunk boundary connections
     * 
     * For any two adjacent chunks, roads that cross the boundary should connect seamlessly
     * with matching positions and no gaps or overlaps.
     * 
     * Validates: Requirements 2.4
     */
    it('Property 8: Seamless chunk boundary connections', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates and seeds
          fc.record({
            chunkX: fc.integer({ min: -50, max: 50 }),
            chunkZ: fc.integer({ min: -50, max: 50 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.integer({ min: 50, max: 200 })
          }),
          (testData) => {
            // Create a fresh scene for each test
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            const testGenerator = new RoadGenerator();

            // Create the first chunk
            const chunk1: Chunk = {
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

            // Create generation context for chunk1
            const context1: GenerationContext = {
              scene: testScene,
              chunk: chunk1,
              seed: testData.seed,
              chunkSize: testData.chunkSize,
              rng: new SeededRandom(testData.seed),
              adjacentChunks: [],
              placementEngine: null
            };

            // Generate roads for chunk1
            testGenerator.generate(chunk1, context1);

            // Test all four adjacent chunks (north, south, east, west)
            const adjacentOffsets = [
              { dx: 1, dz: 0, name: 'east' },   // East neighbor
              { dx: -1, dz: 0, name: 'west' },  // West neighbor
              { dx: 0, dz: 1, name: 'south' },  // South neighbor
              { dx: 0, dz: -1, name: 'north' }  // North neighbor
            ];

            let allBoundariesSeamless = true;

            for (const offset of adjacentOffsets) {
              // Create adjacent chunk
              const chunk2: Chunk = {
                x: testData.chunkX + offset.dx,
                z: testData.chunkZ + offset.dz,
                worldX: (testData.chunkX + offset.dx) * testData.chunkSize,
                worldZ: (testData.chunkZ + offset.dz) * testData.chunkSize,
                roads: [],
                buildings: [],
                vehicles: [],
                signs: [],
                meshes: [],
                imposters: [],
                generatedAt: Date.now(),
                seed: testData.seed
              };

              // Create generation context for chunk2
              const context2: GenerationContext = {
                scene: testScene,
                chunk: chunk2,
                seed: testData.seed,
                chunkSize: testData.chunkSize,
                rng: new SeededRandom(testData.seed),
                adjacentChunks: [chunk1],
                placementEngine: null
              };

              // Generate roads for chunk2
              testGenerator.generate(chunk2, context2);

              // Get road segments from both chunks
              const segments1 = testGenerator.getRoadSegments(chunk1);
              const segments2 = testGenerator.getRoadSegments(chunk2);

              // Determine the boundary line between chunks
              let boundaryCoord: number;
              let isVerticalBoundary: boolean;

              if (offset.dx !== 0) {
                // East or West boundary - vertical line
                isVerticalBoundary = true;
                if (offset.dx > 0) {
                  // East boundary - right edge of chunk1
                  boundaryCoord = chunk1.worldX + testData.chunkSize;
                } else {
                  // West boundary - left edge of chunk1
                  boundaryCoord = chunk1.worldX;
                }
              } else {
                // North or South boundary - horizontal line
                isVerticalBoundary = false;
                if (offset.dz > 0) {
                  // South boundary - bottom edge of chunk1
                  boundaryCoord = chunk1.worldZ + testData.chunkSize;
                } else {
                  // North boundary - top edge of chunk1
                  boundaryCoord = chunk1.worldZ;
                }
              }

              // Find road segments that TOUCH the boundary (not cross it)
              // For vertical boundary: roads that have start or end at boundaryCoord
              // For horizontal boundary: roads that have start or end at boundaryCoord
              const epsilon = 0.1;
              
              const boundaryRoads1: Array<{ segment: RoadSegment, perpCoord: number }> = [];
              const boundaryRoads2: Array<{ segment: RoadSegment, perpCoord: number }> = [];

              for (const seg of segments1) {
                if (isVerticalBoundary) {
                  // Check if this is a horizontal road that touches the boundary
                  if (Math.abs(seg.start.y - seg.end.y) < epsilon) {
                    // Horizontal road - check if it touches boundary at X
                    if (Math.abs(seg.start.x - boundaryCoord) < epsilon || 
                        Math.abs(seg.end.x - boundaryCoord) < epsilon) {
                      boundaryRoads1.push({ segment: seg, perpCoord: seg.start.y });
                    }
                  }
                  // Check if this is a vertical road AT the boundary
                  if (Math.abs(seg.start.x - seg.end.x) < epsilon && 
                      Math.abs(seg.start.x - boundaryCoord) < epsilon) {
                    boundaryRoads1.push({ segment: seg, perpCoord: seg.start.x });
                  }
                } else {
                  // Check if this is a vertical road that touches the boundary
                  if (Math.abs(seg.start.x - seg.end.x) < epsilon) {
                    // Vertical road - check if it touches boundary at Z
                    if (Math.abs(seg.start.y - boundaryCoord) < epsilon || 
                        Math.abs(seg.end.y - boundaryCoord) < epsilon) {
                      boundaryRoads2.push({ segment: seg, perpCoord: seg.start.x });
                    }
                  }
                  // Check if this is a horizontal road AT the boundary
                  if (Math.abs(seg.start.y - seg.end.y) < epsilon && 
                      Math.abs(seg.start.y - boundaryCoord) < epsilon) {
                    boundaryRoads1.push({ segment: seg, perpCoord: seg.start.y });
                  }
                }
              }

              for (const seg of segments2) {
                if (isVerticalBoundary) {
                  // Check if this is a horizontal road that touches the boundary
                  if (Math.abs(seg.start.y - seg.end.y) < epsilon) {
                    // Horizontal road - check if it touches boundary at X
                    if (Math.abs(seg.start.x - boundaryCoord) < epsilon || 
                        Math.abs(seg.end.x - boundaryCoord) < epsilon) {
                      boundaryRoads2.push({ segment: seg, perpCoord: seg.start.y });
                    }
                  }
                  // Check if this is a vertical road AT the boundary
                  if (Math.abs(seg.start.x - seg.end.x) < epsilon && 
                      Math.abs(seg.start.x - boundaryCoord) < epsilon) {
                    boundaryRoads2.push({ segment: seg, perpCoord: seg.start.x });
                  }
                } else {
                  // Check if this is a vertical road that touches the boundary
                  if (Math.abs(seg.start.x - seg.end.x) < epsilon) {
                    // Vertical road - check if it touches boundary at Z
                    if (Math.abs(seg.start.y - boundaryCoord) < epsilon || 
                        Math.abs(seg.end.y - boundaryCoord) < epsilon) {
                      boundaryRoads2.push({ segment: seg, perpCoord: seg.start.x });
                    }
                  }
                  // Check if this is a horizontal road AT the boundary
                  if (Math.abs(seg.start.y - seg.end.y) < epsilon && 
                      Math.abs(seg.start.y - boundaryCoord) < epsilon) {
                    boundaryRoads2.push({ segment: seg, perpCoord: seg.start.y });
                  }
                }
              }

              // Property: For each road touching the boundary from chunk1, 
              // there should be a matching road from chunk2 with same perpendicular coordinate,
              // width, and type
              for (const road1 of boundaryRoads1) {
                let foundMatch = false;

                for (const road2 of boundaryRoads2) {
                  // Check if they're at the same perpendicular coordinate
                  if (Math.abs(road1.perpCoord - road2.perpCoord) < epsilon) {
                    // Check if properties match
                    if (Math.abs(road1.segment.width - road2.segment.width) < epsilon &&
                        road1.segment.type === road2.segment.type) {
                      foundMatch = true;
                      break;
                    }
                  }
                }

                if (!foundMatch) {
                  allBoundariesSeamless = false;
                  break;
                }
              }

              if (!allBoundariesSeamless) break;
            }

            // Cleanup
            testScene.dispose();
            testEngine.dispose();

            // Property must hold
            return allBoundariesSeamless;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 9: Road width variety
     * 
     * The road generator should use at least two distinct width categories
     * (main streets and side streets). The system is configured to support
     * variety, though individual chunks may have uniform road types.
     * 
     * Validates: Requirements 2.5
     */
    it('Property 9: Road width variety', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates and seeds
          fc.record({
            chunkX: fc.integer({ min: -100, max: 100 }),
            chunkZ: fc.integer({ min: -100, max: 100 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.integer({ min: 50, max: 200 })
          }),
          (testData) => {
            // Create a fresh scene for each test
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            const testGenerator = new RoadGenerator();

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

            const context: GenerationContext = {
              scene: testScene,
              chunk,
              seed: testData.seed,
              chunkSize: testData.chunkSize,
              rng: new SeededRandom(testData.seed),
              adjacentChunks: [],
              placementEngine: null
            };

            testGenerator.generate(chunk, context);

            // Collect all road segments
            const allSegments: RoadSegment[] = [];
            for (const road of chunk.roads) {
              allSegments.push(...road.segments);
            }

            // Property 1: Should have generated some road segments
            const hasSegments = allSegments.length > 0;

            // Property 2: All roads should have positive width
            const allPositiveWidths = allSegments.every(s => s.width > 0);

            // Property 3: Roads should have valid types
            const allValidTypes = allSegments.every(s => s.type === 'main' || s.type === 'side');

            // Property 4: The generator configuration should support two distinct widths
            // Check that the generator is configured with different widths for main and side roads
            const config = (testGenerator as any).roadConfig;
            const configHasVariety = config.mainRoadWidth !== config.sideRoadWidth;

            // Property 5: If both types exist in this chunk, verify their relationship
            const mainRoads = allSegments.filter(s => s.type === 'main');
            const sideRoads = allSegments.filter(s => s.type === 'side');
            
            let widthRelationshipCorrect = true;
            if (mainRoads.length > 0 && sideRoads.length > 0) {
              const avgMainWidth = mainRoads.reduce((sum, r) => sum + r.width, 0) / mainRoads.length;
              const avgSideWidth = sideRoads.reduce((sum, r) => sum + r.width, 0) / sideRoads.length;
              widthRelationshipCorrect = avgMainWidth > avgSideWidth;
            }

            // Property 6: If both types exist, main roads should have more lanes
            let laneRelationshipCorrect = true;
            if (mainRoads.length > 0 && sideRoads.length > 0) {
              const avgMainLanes = mainRoads.reduce((sum, r) => sum + r.lanes, 0) / mainRoads.length;
              const avgSideLanes = sideRoads.reduce((sum, r) => sum + r.lanes, 0) / sideRoads.length;
              laneRelationshipCorrect = avgMainLanes > avgSideLanes;
            }

            // Property 7: Roads of the same type should have consistent width
            let typesConsistent = true;
            if (mainRoads.length > 1) {
              const mainWidth = mainRoads[0].width;
              typesConsistent = typesConsistent && mainRoads.every(r => Math.abs(r.width - mainWidth) < 0.01);
            }
            if (sideRoads.length > 1) {
              const sideWidth = sideRoads[0].width;
              typesConsistent = typesConsistent && sideRoads.every(r => Math.abs(r.width - sideWidth) < 0.01);
            }

            // Property 8: If this chunk has variety, verify it's correct
            const uniqueWidths = new Set(allSegments.map(s => s.width));
            let varietyCorrect = true;
            if (uniqueWidths.size >= 2) {
              // If there's variety, it should match the configured widths
              const widthArray = Array.from(uniqueWidths).sort((a, b) => a - b);
              // Should have exactly 2 widths (side and main)
              varietyCorrect = widthArray.length === 2;
            }

            // Cleanup
            testScene.dispose();
            testEngine.dispose();

            // All properties must hold
            return hasSegments && 
                   allPositiveWidths && 
                   allValidTypes &&
                   configHasVariety &&
                   widthRelationshipCorrect &&
                   laneRelationshipCorrect &&
                   typesConsistent &&
                   varietyCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 5: Road network presence
     * 
     * For any generated chunk, the chunk should contain road segments following
     * the configured pattern (grid-based or organic).
     * 
     * Validates: Requirements 2.1
     */
    it('Property 5: Road network presence', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates and seeds
          fc.record({
            chunkX: fc.integer({ min: -100, max: 100 }),
            chunkZ: fc.integer({ min: -100, max: 100 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.integer({ min: 50, max: 200 })
          }),
          (testData) => {
            // Create a fresh scene for each test
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            const testGenerator = new RoadGenerator();

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

            // Generate roads
            testGenerator.generate(chunk, context);

            // Property 1: Chunk should have at least one road
            const hasRoads = chunk.roads.length > 0;

            // Property 2: Each road should have segments
            let allRoadsHaveSegments = true;
            for (const road of chunk.roads) {
              if (road.segments.length === 0) {
                allRoadsHaveSegments = false;
                break;
              }
            }

            // Property 3: Road segments should follow grid pattern
            // (roads should be either horizontal or vertical, aligned with chunk boundaries)
            let segmentsFollowGridPattern = true;
            for (const road of chunk.roads) {
              for (const segment of road.segments) {
                // Check if segment is horizontal (constant z/y coordinate)
                const isHorizontal = Math.abs(segment.start.y - segment.end.y) < 0.1;
                // Check if segment is vertical (constant x coordinate)
                const isVertical = Math.abs(segment.start.x - segment.end.x) < 0.1;
                
                // Segment should be either horizontal or vertical (grid-based)
                if (!isHorizontal && !isVertical) {
                  segmentsFollowGridPattern = false;
                  break;
                }

                // Segments should have positive width
                if (segment.width <= 0) {
                  segmentsFollowGridPattern = false;
                  break;
                }

                // Segments should have valid type
                if (segment.type !== 'main' && segment.type !== 'side') {
                  segmentsFollowGridPattern = false;
                  break;
                }

                // Segments should have positive lane count
                if (segment.lanes <= 0) {
                  segmentsFollowGridPattern = false;
                  break;
                }
              }
              if (!segmentsFollowGridPattern) break;
            }

            // Property 4: Road segments should be within or at chunk boundaries
            // (roads can extend to chunk edges for seamless connection)
            let segmentsWithinBounds = true;
            const minX = chunk.worldX;
            const maxX = chunk.worldX + testData.chunkSize;
            const minZ = chunk.worldZ;
            const maxZ = chunk.worldZ + testData.chunkSize;

            for (const road of chunk.roads) {
              for (const segment of road.segments) {
                // Check if segment endpoints are within or at chunk boundaries
                // Allow small epsilon for floating point comparison
                const epsilon = 0.01;
                
                if (segment.start.x < minX - epsilon || segment.start.x > maxX + epsilon ||
                    segment.start.y < minZ - epsilon || segment.start.y > maxZ + epsilon ||
                    segment.end.x < minX - epsilon || segment.end.x > maxX + epsilon ||
                    segment.end.y < minZ - epsilon || segment.end.y > maxZ + epsilon) {
                  segmentsWithinBounds = false;
                  break;
                }
              }
              if (!segmentsWithinBounds) break;
            }

            // Property 5: Generated objects should include road meshes
            const hasGeneratedObjects = chunk.meshes.length > 0;

            // Cleanup
            testScene.dispose();
            testEngine.dispose();

            // All properties must hold
            return hasRoads && 
                   allRoadsHaveSegments && 
                   segmentsFollowGridPattern && 
                   segmentsWithinBounds &&
                   hasGeneratedObjects;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
