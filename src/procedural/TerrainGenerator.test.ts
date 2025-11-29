/**
 * TerrainGenerator Tests
 * Tests terrain generation with smooth boundaries
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import { TerrainGenerator, TerrainConfig } from './TerrainGenerator';
import { Chunk } from './ChunkTypes';
import { GenerationContext } from './Generator';
import { SeededRandom } from './SeededRandom';

describe('TerrainGenerator', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let generator: TerrainGenerator;
  let config: TerrainConfig;

  beforeEach(() => {
    // Create headless engine and scene
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    // Default terrain configuration
    config = {
      heightScale: 10,
      noiseScale: 50,
      octaves: 3,
      persistence: 0.5,
      resolution: 20
    };

    generator = new TerrainGenerator(config);
  });

  describe('Basic Functionality', () => {
    it('should have correct name', () => {
      expect(generator.getName()).toBe('terrain');
    });

    it('should allow configuration', () => {
      const newConfig: TerrainConfig = {
        heightScale: 20,
        noiseScale: 100,
        octaves: 4,
        persistence: 0.6,
        resolution: 30
      };

      generator.configure(newConfig);
      const currentConfig = generator.getConfig();

      expect(currentConfig.heightScale).toBe(20);
      expect(currentConfig.noiseScale).toBe(100);
      expect(currentConfig.octaves).toBe(4);
      expect(currentConfig.persistence).toBe(0.6);
      expect(currentConfig.resolution).toBe(30);
    });

    it('should return empty placement rules', () => {
      const rules = generator.getPlacementRules();
      expect(rules).toEqual([]);
    });
  });

  describe('Terrain Generation', () => {
    it('should generate terrain mesh for chunk', () => {
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

      expect(objects).toHaveLength(1);
      expect(objects[0].type).toBe('terrain');
      expect(objects[0].mesh).toBeDefined();
      expect(objects[0].imposter).toBeDefined();
      expect(chunk.meshes).toHaveLength(1);
      expect(chunk.imposters).toHaveLength(1);
    });

    it('should create mesh with correct vertex count', () => {
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
      const mesh = objects[0].mesh;

      // Resolution 20 means 21x21 vertices = 441 vertices
      const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      expect(positions).toBeDefined();
      expect(positions!.length).toBe((config.resolution + 1) * (config.resolution + 1) * 3);
    });

    it('should store height map in mesh metadata', () => {
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
      const mesh = objects[0].mesh;

      expect(mesh.metadata).toBeDefined();
      expect(mesh.metadata.type).toBe('terrain');
      expect(mesh.metadata.heightMap).toBeDefined();
      expect(mesh.metadata.heightMap).toHaveLength(config.resolution + 1);
      expect(mesh.metadata.heightMap[0]).toHaveLength(config.resolution + 1);
    });
  });

  describe('Deterministic Generation', () => {
    it('should generate identical terrain for same seed', () => {
      const chunk1: Chunk = {
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

      const chunk2: Chunk = {
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

      const context1: GenerationContext = {
        scene,
        chunk: chunk1,
        seed: 12345,
        chunkSize: 100,
        rng: new SeededRandom(12345),
        adjacentChunks: [],
        placementEngine: null
      };

      const context2: GenerationContext = {
        scene,
        chunk: chunk2,
        seed: 12345,
        chunkSize: 100,
        rng: new SeededRandom(12345),
        adjacentChunks: [],
        placementEngine: null
      };

      const objects1 = generator.generate(chunk1, context1);
      const objects2 = generator.generate(chunk2, context2);

      const heightMap1 = objects1[0].mesh.metadata.heightMap;
      const heightMap2 = objects2[0].mesh.metadata.heightMap;

      // Compare height maps
      for (let z = 0; z <= config.resolution; z++) {
        for (let x = 0; x <= config.resolution; x++) {
          expect(heightMap1[z][x]).toBe(heightMap2[z][x]);
        }
      }
    });
  });

  describe('Boundary Matching', () => {
    it('should match heights at left boundary with adjacent chunk', () => {
      // Generate left chunk first
      const leftChunk: Chunk = {
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
        seed: 11111
      };

      const leftContext: GenerationContext = {
        scene,
        chunk: leftChunk,
        seed: 11111,
        chunkSize: 100,
        rng: new SeededRandom(11111),
        adjacentChunks: [],
        placementEngine: null
      };

      const leftObjects = generator.generate(leftChunk, leftContext);
      const leftHeightMap = leftObjects[0].mesh.metadata.heightMap;

      // Generate right chunk with left chunk as adjacent
      const rightChunk: Chunk = {
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
        seed: 22222
      };

      const rightContext: GenerationContext = {
        scene,
        chunk: rightChunk,
        seed: 22222,
        chunkSize: 100,
        rng: new SeededRandom(22222),
        adjacentChunks: [leftChunk],
        placementEngine: null
      };

      const rightObjects = generator.generate(rightChunk, rightContext);
      const rightHeightMap = rightObjects[0].mesh.metadata.heightMap;

      // Check that right chunk's left boundary matches left chunk's right boundary
      for (let z = 0; z <= config.resolution; z++) {
        expect(rightHeightMap[z][0]).toBe(leftHeightMap[z][config.resolution]);
      }
    });

    it('should match heights at top boundary with adjacent chunk', () => {
      // Generate top chunk first
      const topChunk: Chunk = {
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
        seed: 33333
      };

      const topContext: GenerationContext = {
        scene,
        chunk: topChunk,
        seed: 33333,
        chunkSize: 100,
        rng: new SeededRandom(33333),
        adjacentChunks: [],
        placementEngine: null
      };

      const topObjects = generator.generate(topChunk, topContext);
      const topHeightMap = topObjects[0].mesh.metadata.heightMap;

      // Generate bottom chunk with top chunk as adjacent
      const bottomChunk: Chunk = {
        x: 0,
        z: 1,
        worldX: 0,
        worldZ: 100,
        roads: [],
        buildings: [],
        vehicles: [],
        signs: [],
        meshes: [],
        imposters: [],
        generatedAt: Date.now(),
        seed: 44444
      };

      const bottomContext: GenerationContext = {
        scene,
        chunk: bottomChunk,
        seed: 44444,
        chunkSize: 100,
        rng: new SeededRandom(44444),
        adjacentChunks: [topChunk],
        placementEngine: null
      };

      const bottomObjects = generator.generate(bottomChunk, bottomContext);
      const bottomHeightMap = bottomObjects[0].mesh.metadata.heightMap;

      // Check that bottom chunk's top boundary matches top chunk's bottom boundary
      for (let x = 0; x <= config.resolution; x++) {
        expect(bottomHeightMap[0][x]).toBe(topHeightMap[config.resolution][x]);
      }
    });
  });

  describe('Height Variation', () => {
    it('should have height variation (not flat)', () => {
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
      const heightMap = objects[0].mesh.metadata.heightMap;

      // Calculate variance
      let sum = 0;
      let count = 0;
      
      for (let z = 0; z <= config.resolution; z++) {
        for (let x = 0; x <= config.resolution; x++) {
          sum += heightMap[z][x];
          count++;
        }
      }

      const mean = sum / count;
      
      let variance = 0;
      for (let z = 0; z <= config.resolution; z++) {
        for (let x = 0; x <= config.resolution; x++) {
          variance += Math.pow(heightMap[z][x] - mean, 2);
        }
      }
      variance /= count;

      // Terrain should have some variation (variance > 0.1)
      expect(variance).toBeGreaterThan(0.1);
    });

    it('should respect height scale configuration', () => {
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
      const heightMap = objects[0].mesh.metadata.heightMap;

      // All heights should be within [-heightScale, heightScale]
      for (let z = 0; z <= config.resolution; z++) {
        for (let x = 0; x <= config.resolution; x++) {
          expect(Math.abs(heightMap[z][x])).toBeLessThanOrEqual(config.heightScale);
        }
      }
    });
  });

  describe('Physics Integration', () => {
    it('should create physics imposter with correct properties', () => {
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
      const imposter = objects[0].imposter;

      expect(imposter).toBeDefined();
      expect(imposter!.mass).toBe(0); // Static terrain
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: procedural-world-generation, Property 28: Terrain height variation
     * 
     * For any generated terrain, the terrain should have height variation (not perfectly flat)
     * with variance above a minimum threshold.
     * 
     * Validates: Requirements 9.3
     */
    it('Property 28: Terrain height variation', () => {
      const fc = require('fast-check');

      fc.assert(
        fc.property(
          // Generate random chunk coordinates, seeds, and configuration
          fc.record({
            chunkX: fc.integer({ min: -100, max: 100 }),
            chunkZ: fc.integer({ min: -100, max: 100 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.integer({ min: 50, max: 200 }),
            heightScale: fc.integer({ min: 5, max: 50 }),
            noiseScale: fc.integer({ min: 20, max: 100 }),
            resolution: fc.integer({ min: 10, max: 30 })
          }),
          (testData) => {
            // Create test engine and scene
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);

            // Create terrain generator with test configuration
            const testConfig: TerrainConfig = {
              heightScale: testData.heightScale,
              noiseScale: testData.noiseScale,
              octaves: 3,
              persistence: 0.5,
              resolution: testData.resolution
            };
            const testGenerator = new TerrainGenerator(testConfig);

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

            // Generate terrain
            const objects = testGenerator.generate(chunk, context);
            const heightMap = objects[0].mesh.metadata.heightMap;

            // Calculate variance to measure height variation
            let sum = 0;
            let count = 0;
            const resolution = testData.resolution;
            
            for (let z = 0; z <= resolution; z++) {
              for (let x = 0; x <= resolution; x++) {
                sum += heightMap[z][x];
                count++;
              }
            }

            const mean = sum / count;
            
            let variance = 0;
            for (let z = 0; z <= resolution; z++) {
              for (let x = 0; x <= resolution; x++) {
                variance += Math.pow(heightMap[z][x] - mean, 2);
              }
            }
            variance /= count;

            // Cleanup
            testScene.dispose();
            testEngine.dispose();

            // Property: Terrain should have height variation (not perfectly flat)
            // Variance should be greater than a minimum threshold
            // A variance of 0.1 is reasonable - it means heights vary by at least ~0.3 units
            // This ensures the terrain is not flat and has organic variation
            const minVariance = 0.1;
            return variance > minVariance;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 19: Terrain smoothness
     * 
     * For any terrain within a chunk, the height gradient should not have discontinuities
     * (smooth transitions using interpolation).
     * 
     * Validates: Requirements 6.2
     */
    it('Property 19: Terrain smoothness', () => {
      const fc = require('fast-check');

      fc.assert(
        fc.property(
          // Generate random chunk coordinates, seeds, and configuration
          fc.record({
            chunkX: fc.integer({ min: -100, max: 100 }),
            chunkZ: fc.integer({ min: -100, max: 100 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.integer({ min: 50, max: 200 }),
            heightScale: fc.integer({ min: 5, max: 50 }),
            resolution: fc.integer({ min: 10, max: 30 })
          }),
          (testData) => {
            // Create test engine and scene
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);

            // Create terrain generator with test configuration
            const testConfig: TerrainConfig = {
              heightScale: testData.heightScale,
              noiseScale: 50,
              octaves: 3,
              persistence: 0.5,
              resolution: testData.resolution
            };
            const testGenerator = new TerrainGenerator(testConfig);

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

            // Generate terrain
            const objects = testGenerator.generate(chunk, context);
            const heightMap = objects[0].mesh.metadata.heightMap;

            // Check smoothness: calculate maximum gradient between adjacent vertices
            // A smooth terrain should not have sudden jumps in height
            let maxGradient = 0;
            const resolution = testData.resolution;
            
            // Calculate the distance between adjacent vertices in world space
            const vertexSpacing = testData.chunkSize / resolution;

            // Check horizontal gradients (x direction)
            for (let z = 0; z <= resolution; z++) {
              for (let x = 0; x < resolution; x++) {
                const heightDiff = Math.abs(heightMap[z][x + 1] - heightMap[z][x]);
                const gradient = heightDiff / vertexSpacing;
                maxGradient = Math.max(maxGradient, gradient);
              }
            }

            // Check vertical gradients (z direction)
            for (let z = 0; z < resolution; z++) {
              for (let x = 0; x <= resolution; x++) {
                const heightDiff = Math.abs(heightMap[z + 1][x] - heightMap[z][x]);
                const gradient = heightDiff / vertexSpacing;
                maxGradient = Math.max(maxGradient, gradient);
              }
            }

            // Check diagonal gradients (for complete smoothness check)
            for (let z = 0; z < resolution; z++) {
              for (let x = 0; x < resolution; x++) {
                const heightDiff = Math.abs(heightMap[z + 1][x + 1] - heightMap[z][x]);
                const diagonalDistance = Math.sqrt(2) * vertexSpacing;
                const gradient = heightDiff / diagonalDistance;
                maxGradient = Math.max(maxGradient, gradient);
              }
            }

            // Cleanup
            testScene.dispose();
            testEngine.dispose();

            // Property: The maximum gradient should be reasonable (not infinite/discontinuous)
            // A gradient of 2.0 means a 45-degree slope, which is reasonable for terrain
            // Anything above 3.0 would indicate a discontinuity or unrealistic cliff
            // This ensures smooth interpolation is working correctly
            const maxReasonableGradient = 3.0;
            return maxGradient < maxReasonableGradient;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 18: Terrain boundary continuity
     * 
     * For any two adjacent chunks, the terrain height values at the shared boundary
     * should match exactly.
     * 
     * Validates: Requirements 6.1
     */
    it('Property 18: Terrain boundary continuity', () => {
      const fc = require('fast-check');

      fc.assert(
        fc.property(
          // Generate random chunk coordinates and seeds
          fc.record({
            chunkX: fc.integer({ min: -100, max: 100 }),
            chunkZ: fc.integer({ min: -100, max: 100 }),
            seed1: fc.integer({ min: 1, max: 1000000 }),
            seed2: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.integer({ min: 50, max: 200 }),
            // Test all four directions: right (1,0), bottom (0,1), left (-1,0), top (0,-1)
            direction: fc.constantFrom(
              { dx: 1, dz: 0, name: 'right' },
              { dx: 0, dz: 1, name: 'bottom' },
              { dx: -1, dz: 0, name: 'left' },
              { dx: 0, dz: -1, name: 'top' }
            )
          }),
          (testData) => {
            // Create test engine and scene
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);

            // Create terrain generator with test configuration
            const testConfig: TerrainConfig = {
              heightScale: 10,
              noiseScale: 50,
              octaves: 3,
              persistence: 0.5,
              resolution: 20
            };
            const testGenerator = new TerrainGenerator(testConfig);

            // Create first chunk
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
              seed: testData.seed1
            };

            const context1: GenerationContext = {
              scene: testScene,
              chunk: chunk1,
              seed: testData.seed1,
              chunkSize: testData.chunkSize,
              rng: new SeededRandom(testData.seed1),
              adjacentChunks: [],
              placementEngine: null
            };

            // Generate first chunk
            const objects1 = testGenerator.generate(chunk1, context1);
            const heightMap1 = objects1[0].mesh.metadata.heightMap;

            // Create adjacent chunk based on direction
            const chunk2: Chunk = {
              x: testData.chunkX + testData.direction.dx,
              z: testData.chunkZ + testData.direction.dz,
              worldX: (testData.chunkX + testData.direction.dx) * testData.chunkSize,
              worldZ: (testData.chunkZ + testData.direction.dz) * testData.chunkSize,
              roads: [],
              buildings: [],
              vehicles: [],
              signs: [],
              meshes: [],
              imposters: [],
              generatedAt: Date.now(),
              seed: testData.seed2
            };

            const context2: GenerationContext = {
              scene: testScene,
              chunk: chunk2,
              seed: testData.seed2,
              chunkSize: testData.chunkSize,
              rng: new SeededRandom(testData.seed2),
              adjacentChunks: [chunk1], // Pass first chunk as adjacent
              placementEngine: null
            };

            // Generate second chunk with first chunk as adjacent
            const objects2 = testGenerator.generate(chunk2, context2);
            const heightMap2 = objects2[0].mesh.metadata.heightMap;

            // Check boundary continuity based on direction
            let boundariesMatch = true;
            const resolution = testConfig.resolution;

            if (testData.direction.dx === 1 && testData.direction.dz === 0) {
              // chunk2 is to the right of chunk1
              // chunk1's right boundary (x=resolution) should match chunk2's left boundary (x=0)
              for (let z = 0; z <= resolution; z++) {
                if (heightMap1[z][resolution] !== heightMap2[z][0]) {
                  boundariesMatch = false;
                  break;
                }
              }
            } else if (testData.direction.dx === 0 && testData.direction.dz === 1) {
              // chunk2 is below chunk1
              // chunk1's bottom boundary (z=resolution) should match chunk2's top boundary (z=0)
              for (let x = 0; x <= resolution; x++) {
                if (heightMap1[resolution][x] !== heightMap2[0][x]) {
                  boundariesMatch = false;
                  break;
                }
              }
            } else if (testData.direction.dx === -1 && testData.direction.dz === 0) {
              // chunk2 is to the left of chunk1
              // chunk1's left boundary (x=0) should match chunk2's right boundary (x=resolution)
              for (let z = 0; z <= resolution; z++) {
                if (heightMap1[z][0] !== heightMap2[z][resolution]) {
                  boundariesMatch = false;
                  break;
                }
              }
            } else if (testData.direction.dx === 0 && testData.direction.dz === -1) {
              // chunk2 is above chunk1
              // chunk1's top boundary (z=0) should match chunk2's bottom boundary (z=resolution)
              for (let x = 0; x <= resolution; x++) {
                if (heightMap1[0][x] !== heightMap2[resolution][x]) {
                  boundariesMatch = false;
                  break;
                }
              }
            }

            // Cleanup
            testScene.dispose();
            testEngine.dispose();

            // Property: Boundaries between adjacent chunks should match exactly
            return boundariesMatch;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
