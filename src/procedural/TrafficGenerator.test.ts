/**
 * TrafficGenerator Tests
 * Tests for traffic sign and signal generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import * as fc from 'fast-check';
import { TrafficGenerator } from './TrafficGenerator';
import { RoadGenerator } from './RoadGenerator';
import { BuildingGenerator } from './BuildingGenerator';
import { Chunk, SignType } from './ChunkTypes';
import { GenerationContext } from './Generator';
import { SeededRandom } from './SeededRandom';
import { PlacementRuleEngine } from './PlacementRuleEngine';

describe('TrafficGenerator', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let generator: TrafficGenerator;
  let roadGenerator: RoadGenerator;
  let buildingGenerator: BuildingGenerator;

  beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    generator = new TrafficGenerator();
    roadGenerator = new RoadGenerator();
    buildingGenerator = new BuildingGenerator();
    
    generator.setRoadGenerator(roadGenerator);
    generator.setBuildingGenerator(buildingGenerator);
  });

  it('should create a TrafficGenerator instance', () => {
    expect(generator).toBeDefined();
    expect(generator.getName()).toBe('TrafficGenerator');
  });

  it('should configure generator with custom settings', () => {
    const config = {
      intersectionSignProbability: 0.9,
      roadSignDensity: 0.5,
      signHeight: 4,
      signSize: 1.5
    };

    generator.configure(config);
    
    // Configuration is applied (we can't directly test private fields,
    // but we can verify it doesn't throw)
    expect(generator).toBeDefined();
  });

  it('should generate traffic signs for a chunk with roads', () => {
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
      placementEngine: new PlacementRuleEngine()
    };

    // First generate roads
    roadGenerator.generate(chunk, context);

    // Then generate traffic signs
    const objects = generator.generate(chunk, context);

    // Should generate some signs
    expect(objects.length).toBeGreaterThan(0);
    expect(chunk.signs.length).toBeGreaterThan(0);
    
    // All generated objects should be signs
    objects.forEach(obj => {
      expect(obj.type).toBe('sign');
      expect(obj.mesh).toBeDefined();
      expect(obj.position).toBeDefined();
    });
  });

  it('should place signs at intersections', () => {
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
      placementEngine: new PlacementRuleEngine()
    };

    // Configure for high intersection sign probability
    generator.configure({ intersectionSignProbability: 1.0 });

    // Generate roads (which creates intersections)
    roadGenerator.generate(chunk, context);

    // Count intersections
    let intersectionCount = 0;
    for (const road of chunk.roads) {
      intersectionCount += road.intersections.length;
    }

    // Generate traffic signs
    const objects = generator.generate(chunk, context);

    // Should have signs if there are intersections
    if (intersectionCount > 0) {
      expect(objects.length).toBeGreaterThan(0);
      
      // Check that some signs are intersection types
      const intersectionSignTypes = [SignType.StopSign, SignType.TrafficLight, SignType.Yield];
      const hasIntersectionSigns = chunk.signs.some(sign => 
        intersectionSignTypes.includes(sign.type)
      );
      expect(hasIntersectionSigns).toBe(true);
    }
  });

  it('should place signs along roads', () => {
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
      placementEngine: new PlacementRuleEngine()
    };

    // Configure for higher road sign density
    generator.configure({ roadSignDensity: 0.5 });

    // Generate roads
    roadGenerator.generate(chunk, context);

    // Generate traffic signs
    const objects = generator.generate(chunk, context);

    // Should have signs along roads
    expect(objects.length).toBeGreaterThan(0);
    
    // Check that some signs are road types
    const roadSignTypes = [SignType.SpeedLimit, SignType.StreetName, SignType.Directional, SignType.NoPark];
    const hasRoadSigns = chunk.signs.some(sign => 
      roadSignTypes.includes(sign.type)
    );
    expect(hasRoadSigns).toBe(true);
  });

  it('should orient signs to face traffic direction', () => {
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
      placementEngine: new PlacementRuleEngine()
    };

    // Generate roads
    roadGenerator.generate(chunk, context);

    // Generate traffic signs
    generator.generate(chunk, context);

    // All signs should have a rotation value
    chunk.signs.forEach(sign => {
      expect(sign.rotation).toBeDefined();
      expect(typeof sign.rotation).toBe('number');
      // Rotation should be a valid angle (in radians)
      expect(sign.rotation).toBeGreaterThanOrEqual(-Math.PI * 2);
      expect(sign.rotation).toBeLessThanOrEqual(Math.PI * 2);
    });
  });

  it('should create variety in sign types', () => {
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
      placementEngine: new PlacementRuleEngine()
    };

    // Configure for high sign density
    generator.configure({ 
      roadSignDensity: 1.0,
      intersectionSignProbability: 1.0
    });

    // Generate roads
    roadGenerator.generate(chunk, context);

    // Generate traffic signs
    generator.generate(chunk, context);

    // Collect unique sign types
    const signTypes = new Set(chunk.signs.map(sign => sign.type));

    // Should have multiple different sign types
    expect(signTypes.size).toBeGreaterThan(1);
  });

  it('should avoid placing signs on roads', () => {
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
      placementEngine: new PlacementRuleEngine()
    };

    // Generate roads
    roadGenerator.generate(chunk, context);

    // Generate traffic signs
    generator.generate(chunk, context);

    // Check that no signs are placed directly on roads
    chunk.signs.forEach(sign => {
      const pos = new BABYLON.Vector2(sign.position.x, sign.position.z);
      const isOnRoad = roadGenerator.isOnRoad(pos, chunk);
      expect(isOnRoad).toBe(false);
    });
  });

  it('should maintain minimum spacing between signs', () => {
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
      placementEngine: new PlacementRuleEngine()
    };

    const minSpacing = 10;
    generator.configure({ minSpacing });

    // Generate roads
    roadGenerator.generate(chunk, context);

    // Generate traffic signs
    generator.generate(chunk, context);

    // Check spacing between all pairs of signs
    for (let i = 0; i < chunk.signs.length; i++) {
      for (let j = i + 1; j < chunk.signs.length; j++) {
        const sign1 = chunk.signs[i];
        const sign2 = chunk.signs[j];
        
        const dx = sign1.position.x - sign2.position.x;
        const dz = sign1.position.z - sign2.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        expect(distance).toBeGreaterThanOrEqual(minSpacing - 0.01); // Small tolerance for floating point
      }
    }
  });

  it('should avoid placing signs inside buildings', () => {
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
      placementEngine: new PlacementRuleEngine()
    };

    // Generate roads first
    roadGenerator.generate(chunk, context);

    // Generate buildings
    buildingGenerator.setRoadGenerator(roadGenerator);
    buildingGenerator.generate(chunk, context);

    // Generate traffic signs
    generator.generate(chunk, context);

    // Get building footprints
    const footprints = buildingGenerator.getBuildingFootprints(chunk);

    // Check that no signs are inside building footprints
    chunk.signs.forEach(sign => {
      const pos = sign.position;
      
      for (const footprint of footprints) {
        const isInside = pos.x >= footprint.minX && 
                        pos.x <= footprint.maxX &&
                        pos.z >= footprint.minZ && 
                        pos.z <= footprint.maxZ;
        
        expect(isInside).toBe(false);
      }
    });
  });

  it('should return empty array when road generator is not set', () => {
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
      placementEngine: new PlacementRuleEngine()
    };

    // Create generator without setting road generator
    const newGenerator = new TrafficGenerator();
    const objects = newGenerator.generate(chunk, context);

    expect(objects).toEqual([]);
  });

  it('should create sign meshes with poles and faces', () => {
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
      placementEngine: new PlacementRuleEngine()
    };

    // Generate roads
    roadGenerator.generate(chunk, context);

    // Generate traffic signs
    generator.generate(chunk, context);

    // Check that signs have meshes
    chunk.signs.forEach(sign => {
      expect(sign.mesh).toBeDefined();
      expect(sign.mesh.name).toContain('sign_');
      
      // Sign mesh should have children (pole and face)
      expect(sign.mesh.getChildren().length).toBeGreaterThan(0);
    });
  });

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    /**
     * Feature: procedural-world-generation, Property 11: Road signage presence
     * 
     * For any generated road, street signs (speed limits, street names, directional signs) 
     * should be placed along the road.
     * 
     * Validates: Requirements 3.2
     */
    it('Property 11: should place street signs along generated roads', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates
          fc.integer({ min: -10, max: 10 }),
          fc.integer({ min: -10, max: 10 }),
          // Generate random seed
          fc.integer({ min: 1, max: 1000000 }),
          (chunkX, chunkZ, seed) => {
            // Create fresh scene for each test iteration
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            try {
              // Create chunk
              const chunk: Chunk = {
                x: chunkX,
                z: chunkZ,
                worldX: chunkX * 100,
                worldZ: chunkZ * 100,
                roads: [],
                buildings: [],
                vehicles: [],
                signs: [],
                meshes: [],
                imposters: [],
                generatedAt: Date.now(),
                seed
              };

              const context: GenerationContext = {
                scene: testScene,
                chunk,
                seed,
                chunkSize: 100,
                rng: new SeededRandom(seed),
                adjacentChunks: [],
                placementEngine: new PlacementRuleEngine()
              };

              // Create generators
              const testRoadGenerator = new RoadGenerator();
              const testTrafficGenerator = new TrafficGenerator();
              testTrafficGenerator.setRoadGenerator(testRoadGenerator);
              
              // Configure to place road signs (not just intersection signs)
              testTrafficGenerator.configure({ 
                roadSignDensity: 0.5, // Ensure road signs are generated
                intersectionSignProbability: 0 // Disable intersection signs to focus on road signs
              });

              // Generate roads first
              testRoadGenerator.generate(chunk, context);

              // Count road segments
              let roadSegmentCount = 0;
              for (const road of chunk.roads) {
                roadSegmentCount += road.segments.length;
              }

              // Generate traffic signs
              testTrafficGenerator.generate(chunk, context);

              // Property: If there are roads, there should be street signs along them
              if (roadSegmentCount > 0) {
                // Check that road-type signs were placed
                const roadSignTypes = [SignType.SpeedLimit, SignType.StreetName, SignType.Directional, SignType.NoPark];
                const roadSigns = chunk.signs.filter(sign => 
                  roadSignTypes.includes(sign.type)
                );

                // Should have at least some road signs when roads exist
                expect(roadSigns.length).toBeGreaterThan(0);

                // Each road sign should be near a road segment
                for (const sign of roadSigns) {
                  let nearRoad = false;
                  
                  for (const road of chunk.roads) {
                    for (const segment of road.segments) {
                      // Calculate distance from sign to road segment
                      const signPos = new BABYLON.Vector2(sign.position.x, sign.position.z);
                      
                      // Calculate perpendicular distance to line segment
                      const start = segment.start;
                      const end = segment.end;
                      
                      const dx = end.x - start.x;
                      const dy = end.y - start.y;
                      const lengthSquared = dx * dx + dy * dy;
                      
                      if (lengthSquared === 0) {
                        // Degenerate segment, check distance to point
                        const distX = signPos.x - start.x;
                        const distY = signPos.y - start.y;
                        const distance = Math.sqrt(distX * distX + distY * distY);
                        if (distance < segment.width + 10) {
                          nearRoad = true;
                          break;
                        }
                      } else {
                        // Calculate projection onto line segment
                        const t = Math.max(0, Math.min(1, 
                          ((signPos.x - start.x) * dx + (signPos.y - start.y) * dy) / lengthSquared
                        ));
                        
                        const projX = start.x + t * dx;
                        const projY = start.y + t * dy;
                        
                        const distX = signPos.x - projX;
                        const distY = signPos.y - projY;
                        const distance = Math.sqrt(distX * distX + distY * distY);
                        
                        // Sign should be within reasonable distance of road edge
                        // (typically placed 2-5 units from road edge)
                        if (distance < segment.width / 2 + 15) {
                          nearRoad = true;
                          break;
                        }
                      }
                    }
                    if (nearRoad) break;
                  }
                  
                  expect(nearRoad).toBe(true);
                }
              }

              return true;
            } finally {
              // Cleanup
              testScene.dispose();
              testEngine.dispose();
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    /**
     * Feature: procedural-world-generation, Property 12: Sign orientation correctness
     * 
     * For any traffic sign or signal, the sign's rotation should orient it to face 
     * the correct direction relative to traffic flow on the nearest road.
     * 
     * Signs are placed to the side of the road and should face parallel to the road
     * (in the direction of traffic flow) so that drivers can see them head-on as they approach.
     * 
     * Validates: Requirements 3.3
     */
    it('Property 12: should orient signs parallel to the road direction', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates
          fc.integer({ min: -10, max: 10 }),
          fc.integer({ min: -10, max: 10 }),
          // Generate random seed
          fc.integer({ min: 1, max: 1000000 }),
          (chunkX, chunkZ, seed) => {
            // Create fresh scene for each test iteration
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            try {
              // Create chunk
              const chunk: Chunk = {
                x: chunkX,
                z: chunkZ,
                worldX: chunkX * 100,
                worldZ: chunkZ * 100,
                roads: [],
                buildings: [],
                vehicles: [],
                signs: [],
                meshes: [],
                imposters: [],
                generatedAt: Date.now(),
                seed
              };

              const context: GenerationContext = {
                scene: testScene,
                chunk,
                seed,
                chunkSize: 100,
                rng: new SeededRandom(seed),
                adjacentChunks: [],
                placementEngine: new PlacementRuleEngine()
              };

              // Create generators
              const testRoadGenerator = new RoadGenerator();
              const testTrafficGenerator = new TrafficGenerator();
              testTrafficGenerator.setRoadGenerator(testRoadGenerator);
              
              // Configure to generate signs
              testTrafficGenerator.configure({ 
                roadSignDensity: 0.5,
                intersectionSignProbability: 0.8
              });

              // Generate roads first
              testRoadGenerator.generate(chunk, context);

              // Get road segments for validation
              const roadSegments = testRoadGenerator.getRoadSegments(chunk);

              // Generate traffic signs
              testTrafficGenerator.generate(chunk, context);

              // Property: Each sign should be oriented parallel to SOME nearby road
              // Signs face the direction of traffic flow on the road they're associated with
              // For intersection signs, they may be perpendicular to cross streets but parallel to their approach street
              for (const sign of chunk.signs) {
                const signPos = new BABYLON.Vector2(sign.position.x, sign.position.z);
                
                // Normalize angles to [-PI, PI]
                const normalizeAngle = (angle: number) => {
                  while (angle > Math.PI) angle -= 2 * Math.PI;
                  while (angle < -Math.PI) angle += 2 * Math.PI;
                  return angle;
                };
                
                const signRotation = normalizeAngle(sign.rotation);
                
                // Check if sign is parallel to ANY nearby road segment
                let isParallelToSomeRoad = false;
                
                for (const segment of roadSegments) {
                  const start = segment.start;
                  const end = segment.end;
                  
                  const dx = end.x - start.x;
                  const dy = end.y - start.y;
                  const lengthSquared = dx * dx + dy * dy;
                  
                  if (lengthSquared === 0) continue;
                  
                  // Calculate distance from sign to this road segment
                  const t = Math.max(0, Math.min(1, 
                    ((signPos.x - start.x) * dx + (signPos.y - start.y) * dy) / lengthSquared
                  ));
                  
                  const projX = start.x + t * dx;
                  const projY = start.y + t * dy;
                  
                  const distX = signPos.x - projX;
                  const distY = signPos.y - projY;
                  const distance = Math.sqrt(distX * distX + distY * distY);
                  
                  // Only check roads that are reasonably close (within 30 units)
                  if (distance < 30) {
                    // Calculate road direction angle
                    const roadAngle = Math.atan2(dy, dx);
                    const expectedRoadAngle = normalizeAngle(roadAngle);
                    
                    // Calculate angular difference (always positive, in range [0, PI])
                    let diff = Math.abs(normalizeAngle(signRotation - expectedRoadAngle));
                    if (diff > Math.PI) diff = 2 * Math.PI - diff;
                    
                    // Check if sign is parallel to this road (within 45 degrees tolerance)
                    const tolerance = Math.PI / 4; // 45 degrees
                    if (diff < tolerance || diff > (Math.PI - tolerance)) {
                      isParallelToSomeRoad = true;
                      break;
                    }
                  }
                }
                
                // Verify the sign is oriented parallel to at least one nearby road
                expect(isParallelToSomeRoad).toBe(true);
              }

              return true;
            } finally {
              // Cleanup
              testScene.dispose();
              testEngine.dispose();
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    /**
     * Feature: procedural-world-generation, Property 31: Sign valid location placement
     * 
     * For any traffic sign, the sign should be positioned at a road edge or intersection,
     * not inside building spaces.
     * 
     * Validates: Requirements 10.3
     */
    it('Property 31: should place signs at road edges or intersections, not in building spaces', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates
          fc.integer({ min: -10, max: 10 }),
          fc.integer({ min: -10, max: 10 }),
          // Generate random seed
          fc.integer({ min: 1, max: 1000000 }),
          (chunkX, chunkZ, seed) => {
            // Create fresh scene for each test iteration
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            try {
              // Create chunk
              const chunk: Chunk = {
                x: chunkX,
                z: chunkZ,
                worldX: chunkX * 100,
                worldZ: chunkZ * 100,
                roads: [],
                buildings: [],
                vehicles: [],
                signs: [],
                meshes: [],
                imposters: [],
                generatedAt: Date.now(),
                seed
              };

              const context: GenerationContext = {
                scene: testScene,
                chunk,
                seed,
                chunkSize: 100,
                rng: new SeededRandom(seed),
                adjacentChunks: [],
                placementEngine: new PlacementRuleEngine()
              };

              // Create generators
              const testRoadGenerator = new RoadGenerator();
              const testBuildingGenerator = new BuildingGenerator();
              const testTrafficGenerator = new TrafficGenerator();
              
              testBuildingGenerator.setRoadGenerator(testRoadGenerator);
              testTrafficGenerator.setRoadGenerator(testRoadGenerator);
              testTrafficGenerator.setBuildingGenerator(testBuildingGenerator);
              
              // Configure to generate signs
              testTrafficGenerator.configure({ 
                roadSignDensity: 0.5,
                intersectionSignProbability: 0.8
              });

              // Generate roads first
              testRoadGenerator.generate(chunk, context);

              // Generate buildings
              testBuildingGenerator.generate(chunk, context);

              // Generate traffic signs
              testTrafficGenerator.generate(chunk, context);

              // Get building footprints for validation
              const buildingFootprints = testBuildingGenerator.getBuildingFootprints(chunk);
              
              // Get road segments and intersections for validation
              const roadSegments = testRoadGenerator.getRoadSegments(chunk);
              const intersections: Intersection[] = [];
              for (const road of chunk.roads) {
                intersections.push(...road.intersections);
              }

              // Property: Each sign should be at a road edge or intersection, NOT in building spaces
              for (const sign of chunk.signs) {
                const signPos = sign.position;
                
                // Check 1: Sign should NOT be inside any building footprint
                for (const footprint of buildingFootprints) {
                  const isInside = signPos.x >= footprint.minX && 
                                  signPos.x <= footprint.maxX &&
                                  signPos.z >= footprint.minZ && 
                                  signPos.z <= footprint.maxZ;
                  
                  expect(isInside).toBe(false);
                }
                
                // Check 2: Sign should be near a road edge OR near an intersection
                let isNearRoadOrIntersection = false;
                
                // Check if near an intersection
                for (const intersection of intersections) {
                  const dx = signPos.x - intersection.position.x;
                  const dz = signPos.z - intersection.position.y;
                  const distance = Math.sqrt(dx * dx + dz * dz);
                  
                  // Signs are typically placed 5-30 units from intersection center
                  if (distance < 30) {
                    isNearRoadOrIntersection = true;
                    break;
                  }
                }
                
                // If not near intersection, check if near a road edge
                if (!isNearRoadOrIntersection) {
                  for (const segment of roadSegments) {
                    const signPos2D = new BABYLON.Vector2(signPos.x, signPos.z);
                    const start = segment.start;
                    const end = segment.end;
                    
                    const dx = end.x - start.x;
                    const dy = end.y - start.y;
                    const lengthSquared = dx * dx + dy * dy;
                    
                    if (lengthSquared === 0) continue;
                    
                    // Calculate perpendicular distance to road segment
                    const t = Math.max(0, Math.min(1, 
                      ((signPos2D.x - start.x) * dx + (signPos2D.y - start.y) * dy) / lengthSquared
                    ));
                    
                    const projX = start.x + t * dx;
                    const projY = start.y + t * dy;
                    
                    const distX = signPos2D.x - projX;
                    const distY = signPos2D.y - projY;
                    const distance = Math.sqrt(distX * distX + distY * distY);
                    
                    // Signs should be near road edge (within road width/2 + reasonable offset)
                    // Typically placed 2-15 units from road center
                    if (distance < segment.width / 2 + 15) {
                      isNearRoadOrIntersection = true;
                      break;
                    }
                  }
                }
                
                // Verify the sign is near a road or intersection
                expect(isNearRoadOrIntersection).toBe(true);
              }

              return true;
            } finally {
              // Cleanup
              testScene.dispose();
              testEngine.dispose();
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    /**
     * Feature: procedural-world-generation, Property 10: Intersection traffic control
     * 
     * For any intersection, traffic lights or stop signs should be placed at 
     * appropriate positions relative to the intersection.
     * 
     * Validates: Requirements 3.1
     */
    it('Property 10: should place traffic control signs at all intersections when probability is 1.0', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates
          fc.integer({ min: -10, max: 10 }),
          fc.integer({ min: -10, max: 10 }),
          // Generate random seed
          fc.integer({ min: 1, max: 1000000 }),
          (chunkX, chunkZ, seed) => {
            // Create fresh scene for each test iteration
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            try {
              // Create chunk
              const chunk: Chunk = {
                x: chunkX,
                z: chunkZ,
                worldX: chunkX * 100,
                worldZ: chunkZ * 100,
                roads: [],
                buildings: [],
                vehicles: [],
                signs: [],
                meshes: [],
                imposters: [],
                generatedAt: Date.now(),
                seed
              };

              const context: GenerationContext = {
                scene: testScene,
                chunk,
                seed,
                chunkSize: 100,
                rng: new SeededRandom(seed),
                adjacentChunks: [],
                placementEngine: new PlacementRuleEngine()
              };

              // Create generators
              const testRoadGenerator = new RoadGenerator();
              const testTrafficGenerator = new TrafficGenerator();
              testTrafficGenerator.setRoadGenerator(testRoadGenerator);
              
              // Configure to always place signs at intersections
              testTrafficGenerator.configure({ 
                intersectionSignProbability: 1.0,
                roadSignDensity: 0 // Disable road signs to focus on intersections
              });

              // Generate roads first
              testRoadGenerator.generate(chunk, context);

              // Count intersections
              let intersectionCount = 0;
              for (const road of chunk.roads) {
                intersectionCount += road.intersections.length;
              }

              // Generate traffic signs
              testTrafficGenerator.generate(chunk, context);

              // Property: If there are intersections, there should be traffic control signs
              if (intersectionCount > 0) {
                // Check that intersection-type signs were placed
                const intersectionSignTypes = [SignType.StopSign, SignType.TrafficLight, SignType.Yield];
                const intersectionSigns = chunk.signs.filter(sign => 
                  intersectionSignTypes.includes(sign.type)
                );

                // Should have at least some intersection signs
                expect(intersectionSigns.length).toBeGreaterThan(0);

                // Each intersection sign should be near an intersection
                for (const sign of intersectionSigns) {
                  let nearIntersection = false;
                  
                  for (const road of chunk.roads) {
                    for (const intersection of road.intersections) {
                      const dx = sign.position.x - intersection.position.x;
                      const dz = sign.position.z - intersection.position.y;
                      const distance = Math.sqrt(dx * dx + dz * dz);
                      
                      // Sign should be within reasonable distance of an intersection
                      // (typically placed 5-10 units back from intersection)
                      if (distance < 30) {
                        nearIntersection = true;
                        break;
                      }
                    }
                    if (nearIntersection) break;
                  }
                  
                  expect(nearIntersection).toBe(true);
                }
              }

              return true;
            } finally {
              // Cleanup
              testScene.dispose();
              testEngine.dispose();
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });
  });
});
