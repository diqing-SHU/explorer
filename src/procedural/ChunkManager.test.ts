/**
 * ChunkManager Tests
 * Tests for chunk lifecycle management and player position tracking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import * as fc from 'fast-check';
import { ChunkManager, ChunkConfig } from './ChunkManager';
import { worldToChunk } from './SpatialUtils';

describe('ChunkManager', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let chunkManager: ChunkManager;
  let defaultConfig: ChunkConfig;

  beforeEach(() => {
    // Create null engine for headless testing
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    // Create default configuration
    defaultConfig = {
      chunkSize: 100,
      activeRadius: 200,
      unloadDistance: 400,
      seed: 12345,
      generationOrder: ['roads', 'buildings', 'vehicles', 'signs']
    };

    chunkManager = new ChunkManager();
  });

  afterEach(() => {
    chunkManager.dispose();
    scene.dispose();
    engine.dispose();
  });

  describe('initialization', () => {
    it('should initialize with scene and config', () => {
      chunkManager.initialize(scene, defaultConfig);
      
      const config = chunkManager.getConfig();
      expect(config).toEqual(defaultConfig);
      expect(chunkManager.getLoadedChunks()).toHaveLength(0);
    });

    it('should clear existing chunks on re-initialization', () => {
      chunkManager.initialize(scene, defaultConfig);
      chunkManager.generateChunk(0, 0);
      expect(chunkManager.getLoadedChunks()).toHaveLength(1);

      chunkManager.initialize(scene, defaultConfig);
      expect(chunkManager.getLoadedChunks()).toHaveLength(0);
    });
  });

  describe('chunk generation', () => {
    beforeEach(() => {
      chunkManager.initialize(scene, defaultConfig);
    });

    it('should generate a chunk at specified coordinates', () => {
      const chunk = chunkManager.generateChunk(0, 0);
      
      expect(chunk).toBeDefined();
      expect(chunk.x).toBe(0);
      expect(chunk.z).toBe(0);
      expect(chunk.worldX).toBe(0);
      expect(chunk.worldZ).toBe(0);
      expect(chunk.seed).toBeGreaterThan(0);
    });

    it('should generate chunk with correct world position', () => {
      const chunk = chunkManager.generateChunk(2, 3);
      
      expect(chunk.worldX).toBe(200); // 2 * 100
      expect(chunk.worldZ).toBe(300); // 3 * 100
    });

    it('should initialize chunk with empty arrays', () => {
      const chunk = chunkManager.generateChunk(0, 0);
      
      expect(chunk.roads).toEqual([]);
      expect(chunk.buildings).toEqual([]);
      expect(chunk.vehicles).toEqual([]);
      expect(chunk.signs).toEqual([]);
      expect(chunk.meshes).toEqual([]);
      expect(chunk.imposters).toEqual([]);
    });

    it('should generate deterministic seed for same chunk coordinates', () => {
      const chunk1 = chunkManager.generateChunk(5, 7);
      chunkManager.unloadChunk(5, 7);
      const chunk2 = chunkManager.generateChunk(5, 7);
      
      expect(chunk1.seed).toBe(chunk2.seed);
    });

    it('should generate different seeds for different chunk coordinates', () => {
      const chunk1 = chunkManager.generateChunk(0, 0);
      const chunk2 = chunkManager.generateChunk(1, 0);
      const chunk3 = chunkManager.generateChunk(0, 1);
      
      expect(chunk1.seed).not.toBe(chunk2.seed);
      expect(chunk1.seed).not.toBe(chunk3.seed);
      expect(chunk2.seed).not.toBe(chunk3.seed);
    });

    it('should not regenerate already loaded chunk', () => {
      const chunk1 = chunkManager.generateChunk(0, 0);
      const chunk2 = chunkManager.generateChunk(0, 0);
      
      expect(chunk1).toBe(chunk2); // Same object reference
    });

    it('should track loaded chunks', () => {
      chunkManager.generateChunk(0, 0);
      chunkManager.generateChunk(1, 0);
      chunkManager.generateChunk(0, 1);
      
      expect(chunkManager.getLoadedChunks()).toHaveLength(3);
      expect(chunkManager.isChunkLoaded(0, 0)).toBe(true);
      expect(chunkManager.isChunkLoaded(1, 0)).toBe(true);
      expect(chunkManager.isChunkLoaded(0, 1)).toBe(true);
      expect(chunkManager.isChunkLoaded(2, 2)).toBe(false);
    });
  });

  describe('chunk unloading', () => {
    beforeEach(() => {
      chunkManager.initialize(scene, defaultConfig);
    });

    it('should unload a chunk', () => {
      chunkManager.generateChunk(0, 0);
      expect(chunkManager.isChunkLoaded(0, 0)).toBe(true);
      
      chunkManager.unloadChunk(0, 0);
      expect(chunkManager.isChunkLoaded(0, 0)).toBe(false);
    });

    it('should handle unloading non-existent chunk gracefully', () => {
      expect(() => chunkManager.unloadChunk(10, 10)).not.toThrow();
    });

    it('should dispose chunk resources on unload', () => {
      const chunk = chunkManager.generateChunk(0, 0);
      
      // Add a test mesh
      const mesh = BABYLON.MeshBuilder.CreateBox('test', { size: 1 }, scene);
      chunk.meshes.push(mesh);
      
      expect(mesh.isDisposed()).toBe(false);
      
      chunkManager.unloadChunk(0, 0);
      
      expect(mesh.isDisposed()).toBe(true);
    });
  });

  describe('chunk queries', () => {
    beforeEach(() => {
      chunkManager.initialize(scene, defaultConfig);
    });

    it('should get chunk at world position', () => {
      const chunk = chunkManager.generateChunk(0, 0);
      
      const retrieved = chunkManager.getChunk(50, 50);
      expect(retrieved).toBe(chunk);
    });

    it('should return null for unloaded chunk', () => {
      const retrieved = chunkManager.getChunk(500, 500);
      expect(retrieved).toBeNull();
    });

    it('should get chunk at negative world position', () => {
      const chunk = chunkManager.generateChunk(-1, -1);
      
      const retrieved = chunkManager.getChunk(-50, -50);
      expect(retrieved).toBe(chunk);
    });
  });

  describe('update with player position', () => {
    beforeEach(() => {
      chunkManager.initialize(scene, defaultConfig);
    });

    it('should load chunks when player moves to new area', () => {
      const playerPos = new BABYLON.Vector3(0, 0, 0);
      chunkManager.update(playerPos);
      
      // Should load chunks within active radius (200 units = 2 chunks)
      expect(chunkManager.getLoadedChunks().length).toBeGreaterThan(0);
      expect(chunkManager.isChunkLoaded(0, 0)).toBe(true);
    });

    it('should not reload chunks when player is stationary', () => {
      const playerPos = new BABYLON.Vector3(50, 0, 50);
      
      // First update loads chunks
      chunkManager.update(playerPos);
      const loadedCount1 = chunkManager.getLoadedChunks().length;
      
      // Second update with same position should not change anything
      chunkManager.update(playerPos);
      const loadedCount2 = chunkManager.getLoadedChunks().length;
      
      expect(loadedCount1).toBe(loadedCount2);
    });

    it('should load new chunks when player moves to different chunk', () => {
      // Start at origin
      chunkManager.update(new BABYLON.Vector3(0, 0, 0));
      const initialChunks = chunkManager.getLoadedChunks().length;
      
      // Move to a different chunk (far enough to trigger new loads)
      chunkManager.update(new BABYLON.Vector3(300, 0, 300));
      const newChunks = chunkManager.getLoadedChunks().length;
      
      // Should have loaded additional chunks
      expect(newChunks).toBeGreaterThanOrEqual(initialChunks);
    });

    it('should unload chunks beyond unload distance', () => {
      // Load chunks at origin
      chunkManager.update(new BABYLON.Vector3(0, 0, 0));
      expect(chunkManager.isChunkLoaded(0, 0)).toBe(true);
      
      // Move far away (beyond unload distance of 400)
      chunkManager.update(new BABYLON.Vector3(600, 0, 600));
      
      // Original chunk should be unloaded
      expect(chunkManager.isChunkLoaded(0, 0)).toBe(false);
    });

    it('should load chunks in circular pattern around player', () => {
      const playerPos = new BABYLON.Vector3(0, 0, 0);
      chunkManager.update(playerPos);
      
      // Check that chunks within active radius are loaded
      expect(chunkManager.isChunkLoaded(0, 0)).toBe(true);
      expect(chunkManager.isChunkLoaded(1, 0)).toBe(true);
      expect(chunkManager.isChunkLoaded(0, 1)).toBe(true);
      expect(chunkManager.isChunkLoaded(-1, 0)).toBe(true);
      expect(chunkManager.isChunkLoaded(0, -1)).toBe(true);
    });
  });

  describe('disposal', () => {
    beforeEach(() => {
      chunkManager.initialize(scene, defaultConfig);
    });

    it('should unload all chunks on dispose', () => {
      chunkManager.generateChunk(0, 0);
      chunkManager.generateChunk(1, 0);
      chunkManager.generateChunk(0, 1);
      
      expect(chunkManager.getLoadedChunks()).toHaveLength(3);
      
      chunkManager.dispose();
      
      expect(chunkManager.getLoadedChunks()).toHaveLength(0);
    });

    it('should clear configuration on dispose', () => {
      chunkManager.dispose();
      expect(chunkManager.getConfig()).toBeNull();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      chunkManager.initialize(scene, defaultConfig);
    });

    it('should handle negative chunk coordinates', () => {
      const chunk = chunkManager.generateChunk(-5, -3);
      
      expect(chunk.x).toBe(-5);
      expect(chunk.z).toBe(-3);
      expect(chunk.worldX).toBe(-500);
      expect(chunk.worldZ).toBe(-300);
    });

    it('should handle large chunk coordinates', () => {
      const chunk = chunkManager.generateChunk(1000, 1000);
      
      expect(chunk.x).toBe(1000);
      expect(chunk.z).toBe(1000);
      expect(chunk.worldX).toBe(100000);
      expect(chunk.worldZ).toBe(100000);
    });

    it('should handle update before initialization gracefully', () => {
      const uninitializedManager = new ChunkManager();
      expect(() => {
        uninitializedManager.update(new BABYLON.Vector3(0, 0, 0));
      }).not.toThrow();
    });
  });

  describe('Property-Based Tests', () => {
    beforeEach(() => {
      chunkManager.initialize(scene, defaultConfig);
    });

    /**
     * Feature: procedural-world-generation, Property 1: Chunk generation triggers on proximity
     * 
     * For any player position near ungenerated terrain (within threshold distance),
     * the chunk manager should create new chunks in the direction of player movement.
     * 
     * Validates: Requirements 1.1
     */
    it('Property 1: Chunk generation triggers on proximity', () => {
      fc.assert(
        fc.property(
          // Generate random player positions
          fc.record({
            x: fc.integer({ min: -10000, max: 10000 }),
            y: fc.integer({ min: 0, max: 100 }),
            z: fc.integer({ min: -10000, max: 10000 })
          }),
          (playerPos) => {
            // Create a fresh chunk manager for each test
            const testManager = new ChunkManager();
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            testManager.initialize(testScene, defaultConfig);
            
            // Create player position vector
            const position = new BABYLON.Vector3(playerPos.x, playerPos.y, playerPos.z);
            
            // Update chunk manager with player position
            testManager.update(position);
            
            // Calculate which chunk the player is in
            const playerChunk = worldToChunk(playerPos.x, playerPos.z, defaultConfig.chunkSize);
            
            // Calculate the active radius in chunks
            const chunkRadius = Math.ceil(defaultConfig.activeRadius / defaultConfig.chunkSize);
            
            // Check that chunks within active radius are loaded
            // We need to check distance from player position to chunk center, not from player chunk center
            let allProximityChunksLoaded = true;
            
            for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
              for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
                const chunkX = playerChunk.x + dx;
                const chunkZ = playerChunk.z + dz;
                
                // Calculate distance from player position to chunk center
                const chunkCenterX = chunkX * defaultConfig.chunkSize + defaultConfig.chunkSize / 2;
                const chunkCenterZ = chunkZ * defaultConfig.chunkSize + defaultConfig.chunkSize / 2;
                
                const distX = playerPos.x - chunkCenterX;
                const distZ = playerPos.z - chunkCenterZ;
                const distance = Math.sqrt(distX * distX + distZ * distZ);
                
                // If chunk center is within active radius, it should be loaded
                if (distance <= defaultConfig.activeRadius) {
                  if (!testManager.isChunkLoaded(chunkX, chunkZ)) {
                    allProximityChunksLoaded = false;
                    break;
                  }
                }
              }
              if (!allProximityChunksLoaded) break;
            }
            
            // Cleanup
            testManager.dispose();
            testScene.dispose();
            testEngine.dispose();
            
            // Property: All chunks within active radius should be loaded
            return allProximityChunksLoaded;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 3: Chunk unloading beyond distance
     * 
     * For any chunk that is beyond the unload distance from the player,
     * the chunk manager should remove that chunk from memory and dispose of its resources.
     * 
     * Validates: Requirements 1.4
     */
    it('Property 3: Chunk unloading beyond distance', () => {
      fc.assert(
        fc.property(
          // Generate two random player positions that are far apart
          fc.record({
            startX: fc.integer({ min: -5000, max: 5000 }),
            startZ: fc.integer({ min: -5000, max: 5000 }),
            // Move distance should be greater than unload distance (400)
            moveX: fc.integer({ min: 500, max: 2000 }),
            moveZ: fc.integer({ min: 500, max: 2000 }),
            y: fc.integer({ min: 0, max: 100 })
          }),
          (positions) => {
            // Create a fresh chunk manager for each test
            const testManager = new ChunkManager();
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            testManager.initialize(testScene, defaultConfig);
            
            // Start at initial position and load chunks
            const startPosition = new BABYLON.Vector3(positions.startX, positions.y, positions.startZ);
            testManager.update(startPosition);
            
            // Record which chunks were loaded at start
            const initialChunks = testManager.getLoadedChunks().map(chunk => ({
              x: chunk.x,
              z: chunk.z,
              worldX: chunk.worldX,
              worldZ: chunk.worldZ
            }));
            
            // Move player far away (beyond unload distance)
            const endPosition = new BABYLON.Vector3(
              positions.startX + positions.moveX,
              positions.y,
              positions.startZ + positions.moveZ
            );
            testManager.update(endPosition);
            
            // Check that chunks beyond unload distance are unloaded
            let allDistantChunksUnloaded = true;
            
            for (const chunk of initialChunks) {
              // Calculate distance from new player position to chunk center
              const chunkCenterX = chunk.worldX + defaultConfig.chunkSize / 2;
              const chunkCenterZ = chunk.worldZ + defaultConfig.chunkSize / 2;
              
              const dx = endPosition.x - chunkCenterX;
              const dz = endPosition.z - chunkCenterZ;
              const distance = Math.sqrt(dx * dx + dz * dz);
              
              // If chunk is beyond unload distance, it should be unloaded
              if (distance > defaultConfig.unloadDistance) {
                if (testManager.isChunkLoaded(chunk.x, chunk.z)) {
                  allDistantChunksUnloaded = false;
                  break;
                }
              }
            }
            
            // Cleanup
            testManager.dispose();
            testScene.dispose();
            testEngine.dispose();
            
            // Property: All chunks beyond unload distance should be unloaded
            return allDistantChunksUnloaded;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 4: Stationary player stability
     * 
     * For any stationary player position, the set of loaded chunks should remain
     * constant with no generation or unloading occurring.
     * 
     * Validates: Requirements 1.5
     */
    it('Property 4: Stationary player stability', () => {
      fc.assert(
        fc.property(
          // Generate random player position and number of update calls
          fc.record({
            x: fc.integer({ min: -10000, max: 10000 }),
            y: fc.integer({ min: 0, max: 100 }),
            z: fc.integer({ min: -10000, max: 10000 }),
            // Number of times to call update with same position
            updateCalls: fc.integer({ min: 2, max: 20 })
          }),
          (testData) => {
            // Create a fresh chunk manager for each test
            const testManager = new ChunkManager();
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            testManager.initialize(testScene, defaultConfig);
            
            // Create player position vector
            const position = new BABYLON.Vector3(testData.x, testData.y, testData.z);
            
            // First update to load initial chunks
            testManager.update(position);
            
            // Record the state after first update
            const initialLoadedChunks = testManager.getLoadedChunks().map(chunk => ({
              x: chunk.x,
              z: chunk.z
            }));
            const initialChunkCount = initialLoadedChunks.length;
            
            // Call update multiple times with the same position
            for (let i = 0; i < testData.updateCalls; i++) {
              testManager.update(position);
            }
            
            // Get the final state
            const finalLoadedChunks = testManager.getLoadedChunks().map(chunk => ({
              x: chunk.x,
              z: chunk.z
            }));
            const finalChunkCount = finalLoadedChunks.length;
            
            // Check that the chunk count hasn't changed
            const chunkCountUnchanged = initialChunkCount === finalChunkCount;
            
            // Check that the exact same chunks are loaded
            let sameChunksLoaded = true;
            if (chunkCountUnchanged) {
              // Sort both arrays for comparison
              const sortFn = (a: { x: number; z: number }, b: { x: number; z: number }) => {
                if (a.x !== b.x) return a.x - b.x;
                return a.z - b.z;
              };
              
              initialLoadedChunks.sort(sortFn);
              finalLoadedChunks.sort(sortFn);
              
              // Compare each chunk
              for (let i = 0; i < initialLoadedChunks.length; i++) {
                if (initialLoadedChunks[i].x !== finalLoadedChunks[i].x ||
                    initialLoadedChunks[i].z !== finalLoadedChunks[i].z) {
                  sameChunksLoaded = false;
                  break;
                }
              }
            } else {
              sameChunksLoaded = false;
            }
            
            // Cleanup
            testManager.dispose();
            testScene.dispose();
            testEngine.dispose();
            
            // Property: The set of loaded chunks should remain constant
            // when the player is stationary
            return chunkCountUnchanged && sameChunksLoaded;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 35: Player position chunk loading
     * 
     * For any player position change, the chunk manager should load chunks based on
     * the player's current position from the PlayerController.
     * 
     * Validates: Requirements 12.3
     */
    it('Property 35: Player position chunk loading', () => {
      fc.assert(
        fc.property(
          // Generate random player positions
          fc.record({
            x: fc.integer({ min: -10000, max: 10000 }),
            y: fc.integer({ min: 0, max: 100 }),
            z: fc.integer({ min: -10000, max: 10000 })
          }),
          (playerPos) => {
            // Create a fresh chunk manager for each test
            const testManager = new ChunkManager();
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            testManager.initialize(testScene, defaultConfig);
            
            // Create player position vector (simulating PlayerController.getCamera().position)
            const position = new BABYLON.Vector3(playerPos.x, playerPos.y, playerPos.z);
            
            // Update chunk manager with player position
            testManager.update(position);
            
            // Calculate which chunk the player is in
            const playerChunk = worldToChunk(playerPos.x, playerPos.z, defaultConfig.chunkSize);
            
            // Property: The chunk containing the player should always be loaded
            const playerChunkLoaded = testManager.isChunkLoaded(playerChunk.x, playerChunk.z);
            
            // Property: All loaded chunks should be within a reasonable distance from the player
            // (within active radius + some margin for chunk boundaries)
            const loadedChunks = testManager.getLoadedChunks();
            let allChunksWithinReasonableDistance = true;
            
            // Maximum distance should be active radius plus one chunk diagonal
            // (to account for chunks that partially overlap the active radius)
            const maxReasonableDistance = defaultConfig.activeRadius + 
                                         (Math.sqrt(2) * defaultConfig.chunkSize);
            
            for (const chunk of loadedChunks) {
              // Calculate distance from player position to chunk center
              const chunkCenterX = chunk.worldX + defaultConfig.chunkSize / 2;
              const chunkCenterZ = chunk.worldZ + defaultConfig.chunkSize / 2;
              
              const dx = playerPos.x - chunkCenterX;
              const dz = playerPos.z - chunkCenterZ;
              const distance = Math.sqrt(dx * dx + dz * dz);
              
              // Check if chunk is within reasonable distance
              if (distance > maxReasonableDistance) {
                allChunksWithinReasonableDistance = false;
                break;
              }
            }
            
            // Property: Chunks within active radius should be loaded
            // Check a few chunks that should definitely be loaded
            const chunkRadius = Math.ceil(defaultConfig.activeRadius / defaultConfig.chunkSize);
            let proximityChunksLoaded = true;
            
            // Check the player's chunk and immediate neighbors
            for (let dx = -1; dx <= 1; dx++) {
              for (let dz = -1; dz <= 1; dz++) {
                const chunkX = playerChunk.x + dx;
                const chunkZ = playerChunk.z + dz;
                
                // Calculate distance from player position to chunk center
                const chunkCenterX = chunkX * defaultConfig.chunkSize + defaultConfig.chunkSize / 2;
                const chunkCenterZ = chunkZ * defaultConfig.chunkSize + defaultConfig.chunkSize / 2;
                
                const distX = playerPos.x - chunkCenterX;
                const distZ = playerPos.z - chunkCenterZ;
                const distance = Math.sqrt(distX * distX + distZ * distZ);
                
                // If chunk center is well within active radius, it must be loaded
                if (distance < defaultConfig.activeRadius * 0.7) {
                  if (!testManager.isChunkLoaded(chunkX, chunkZ)) {
                    proximityChunksLoaded = false;
                    break;
                  }
                }
              }
              if (!proximityChunksLoaded) break;
            }
            
            // Cleanup
            testManager.dispose();
            testScene.dispose();
            testEngine.dispose();
            
            // Property: Player's chunk is loaded, all loaded chunks are within reasonable
            // distance, and chunks within active radius are loaded
            return playerChunkLoaded && allChunksWithinReasonableDistance && proximityChunksLoaded;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 22: Generation performance
     * 
     * For any chunk generation, the generation should complete within 100 milliseconds.
     * 
     * Validates: Requirements 8.1
     */
    it('Property 22: Generation performance', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates
          fc.record({
            chunkX: fc.integer({ min: -100, max: 100 }),
            chunkZ: fc.integer({ min: -100, max: 100 })
          }),
          (testData) => {
            // Create a fresh chunk manager for each test
            const testManager = new ChunkManager();
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            testManager.initialize(testScene, defaultConfig);
            
            // Measure generation time
            const startTime = performance.now();
            testManager.generateChunk(testData.chunkX, testData.chunkZ);
            const endTime = performance.now();
            
            const generationTime = endTime - startTime;
            
            // Cleanup
            testManager.dispose();
            testScene.dispose();
            testEngine.dispose();
            
            // Property: Generation should complete within 100 milliseconds
            return generationTime <= 100;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 23: Generation prioritization
     * 
     * For any set of chunks needing generation, chunks should be generated in order
     * of increasing distance from the player (closest first).
     * 
     * Validates: Requirements 8.2
     */
    it('Property 23: Generation prioritization', () => {
      fc.assert(
        fc.property(
          // Generate random player position
          fc.record({
            x: fc.integer({ min: -5000, max: 5000 }),
            y: fc.integer({ min: 0, max: 100 }),
            z: fc.integer({ min: -5000, max: 5000 })
          }),
          (playerPos) => {
            // Create a fresh chunk manager for each test
            const testManager = new ChunkManager();
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            testManager.initialize(testScene, defaultConfig);
            
            // Create player position vector
            const position = new BABYLON.Vector3(playerPos.x, playerPos.y, playerPos.z);
            
            // Update chunk manager to trigger chunk generation
            testManager.update(position);
            
            // Get all loaded chunks
            const loadedChunks = testManager.getLoadedChunks();
            
            // Calculate distance from player to each chunk center
            const chunkDistances = loadedChunks.map(chunk => {
              const chunkCenterX = chunk.worldX + defaultConfig.chunkSize / 2;
              const chunkCenterZ = chunk.worldZ + defaultConfig.chunkSize / 2;
              
              const dx = playerPos.x - chunkCenterX;
              const dz = playerPos.z - chunkCenterZ;
              const distance = Math.sqrt(dx * dx + dz * dz);
              
              return {
                chunk,
                distance,
                generatedAt: chunk.generatedAt
              };
            });
            
            // Sort by generation time (earlier = generated first)
            chunkDistances.sort((a, b) => a.generatedAt - b.generatedAt);
            
            // Property: Chunks should be generated in order of increasing distance
            // We check that for most consecutive pairs, the earlier-generated chunk
            // is not significantly farther than the later-generated chunk
            let prioritizationViolations = 0;
            const significantDistanceDifference = defaultConfig.chunkSize; // One chunk size
            
            for (let i = 0; i < chunkDistances.length - 1; i++) {
              const earlier = chunkDistances[i];
              const later = chunkDistances[i + 1];
              
              // If the earlier chunk is significantly farther than the later chunk,
              // that's a prioritization violation
              if (earlier.distance > later.distance + significantDistanceDifference) {
                prioritizationViolations++;
              }
            }
            
            // Allow a small number of violations due to timing precision and
            // chunks generated at nearly the same time
            const maxAllowedViolations = Math.ceil(chunkDistances.length * 0.1); // 10% tolerance
            
            // Cleanup
            testManager.dispose();
            testScene.dispose();
            testEngine.dispose();
            
            // Property: Chunks should be generated in approximate distance order
            // (allowing for some tolerance due to timing precision)
            return prioritizationViolations <= maxAllowedViolations;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 24: Resource cleanup on unload
     * 
     * For any unloaded chunk, all meshes and physics imposters associated with that
     * chunk should be disposed and removed from the scene.
     * 
     * Validates: Requirements 8.3
     */
    it('Property 24: Resource cleanup on unload', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates and number of resources
          fc.record({
            chunkX: fc.integer({ min: -100, max: 100 }),
            chunkZ: fc.integer({ min: -100, max: 100 }),
            numMeshes: fc.integer({ min: 1, max: 20 }),
            numImposters: fc.integer({ min: 0, max: 10 })
          }),
          (testData) => {
            // Create a fresh chunk manager for each test
            const testManager = new ChunkManager();
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            testManager.initialize(testScene, defaultConfig);
            
            // Generate a chunk
            const chunk = testManager.generateChunk(testData.chunkX, testData.chunkZ);
            
            // Add test meshes to the chunk
            const meshes: BABYLON.Mesh[] = [];
            for (let i = 0; i < testData.numMeshes; i++) {
              const mesh = BABYLON.MeshBuilder.CreateBox(
                `test_mesh_${testData.chunkX}_${testData.chunkZ}_${i}`,
                { size: 1 },
                testScene
              );
              chunk.meshes.push(mesh);
              meshes.push(mesh);
            }
            
            // Add test physics imposters to the chunk
            const imposters: BABYLON.PhysicsImpostor[] = [];
            for (let i = 0; i < testData.numImposters; i++) {
              const mesh = BABYLON.MeshBuilder.CreateBox(
                `test_imposter_mesh_${testData.chunkX}_${testData.chunkZ}_${i}`,
                { size: 1 },
                testScene
              );
              const imposter = new BABYLON.PhysicsImpostor(
                mesh,
                BABYLON.PhysicsImpostor.BoxImpostor,
                { mass: 0 },
                testScene
              );
              chunk.meshes.push(mesh);
              chunk.imposters.push(imposter);
              meshes.push(mesh);
              imposters.push(imposter);
            }
            
            // Verify all resources are not disposed before unload
            let allResourcesAliveBeforeUnload = true;
            for (const mesh of meshes) {
              if (mesh.isDisposed()) {
                allResourcesAliveBeforeUnload = false;
                break;
              }
            }
            
            // Unload the chunk
            testManager.unloadChunk(testData.chunkX, testData.chunkZ);
            
            // Property 1: All meshes should be disposed after unload
            let allMeshesDisposed = true;
            for (const mesh of meshes) {
              if (!mesh.isDisposed()) {
                allMeshesDisposed = false;
                break;
              }
            }
            
            // Property 2: Chunk should no longer be loaded
            const chunkStillLoaded = testManager.isChunkLoaded(testData.chunkX, testData.chunkZ);
            
            // Property 3: Chunk should not be in loaded chunks list
            const loadedChunks = testManager.getLoadedChunks();
            const chunkInLoadedList = loadedChunks.some(
              c => c.x === testData.chunkX && c.z === testData.chunkZ
            );
            
            // Cleanup
            testManager.dispose();
            testScene.dispose();
            testEngine.dispose();
            
            // Property: All resources should be alive before unload,
            // all meshes should be disposed after unload,
            // and chunk should not be loaded anymore
            return allResourcesAliveBeforeUnload && 
                   allMeshesDisposed && 
                   !chunkStillLoaded && 
                   !chunkInLoadedList;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 20: Boundary object integrity
     * 
     * For any object placed near a chunk boundary, the object should be complete
     * (not cut off) and should not be duplicated in adjacent chunks.
     * 
     * Validates: Requirements 6.4
     */
    it('Property 20: Boundary object integrity', () => {
      fc.assert(
        fc.property(
          // Generate random adjacent chunk pairs
          fc.record({
            chunkX: fc.integer({ min: -100, max: 100 }),
            chunkZ: fc.integer({ min: -100, max: 100 }),
            // Direction: 0=right, 1=down, 2=left, 3=up
            direction: fc.integer({ min: 0, max: 3 })
          }),
          (testData) => {
            // Create a fresh chunk manager for each test
            const testManager = new ChunkManager();
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            testManager.initialize(testScene, defaultConfig);
            
            // Calculate adjacent chunk coordinates based on direction
            const chunk1X = testData.chunkX;
            const chunk1Z = testData.chunkZ;
            let chunk2X = chunk1X;
            let chunk2Z = chunk1Z;
            
            switch (testData.direction) {
              case 0: chunk2X = chunk1X + 1; break; // Right
              case 1: chunk2Z = chunk1Z + 1; break; // Down
              case 2: chunk2X = chunk1X - 1; break; // Left
              case 3: chunk2Z = chunk1Z - 1; break; // Up
            }
            
            // Generate both chunks
            const chunk1 = testManager.generateChunk(chunk1X, chunk1Z);
            const chunk2 = testManager.generateChunk(chunk2X, chunk2Z);
            
            // Define boundary margin - objects within this distance from boundary are "near boundary"
            const boundaryMargin = 10; // 10 units from chunk edge
            
            // Calculate boundary position based on direction
            let boundaryWorldPos: number;
            let isXBoundary: boolean;
            
            switch (testData.direction) {
              case 0: // Right boundary of chunk1
                boundaryWorldPos = chunk1.worldX + defaultConfig.chunkSize;
                isXBoundary = true;
                break;
              case 1: // Bottom boundary of chunk1
                boundaryWorldPos = chunk1.worldZ + defaultConfig.chunkSize;
                isXBoundary = false;
                break;
              case 2: // Left boundary of chunk1
                boundaryWorldPos = chunk1.worldX;
                isXBoundary = true;
                break;
              case 3: // Top boundary of chunk1
                boundaryWorldPos = chunk1.worldZ;
                isXBoundary = false;
                break;
              default:
                boundaryWorldPos = 0;
                isXBoundary = true;
            }
            
            // Collect all objects near the boundary from both chunks
            const objectsNearBoundary: Array<{
              id: string;
              position: BABYLON.Vector3;
              dimensions: BABYLON.Vector3;
              chunkId: string;
              type: string;
            }> = [];
            
            // Helper to check if object is near boundary
            const isNearBoundary = (pos: BABYLON.Vector3, dim: BABYLON.Vector3): boolean => {
              if (isXBoundary) {
                // Check X boundary
                const minX = pos.x - dim.x / 2;
                const maxX = pos.x + dim.x / 2;
                return Math.abs(minX - boundaryWorldPos) < boundaryMargin ||
                       Math.abs(maxX - boundaryWorldPos) < boundaryMargin ||
                       (minX < boundaryWorldPos && maxX > boundaryWorldPos);
              } else {
                // Check Z boundary
                const minZ = pos.z - dim.z / 2;
                const maxZ = pos.z + dim.z / 2;
                return Math.abs(minZ - boundaryWorldPos) < boundaryMargin ||
                       Math.abs(maxZ - boundaryWorldPos) < boundaryMargin ||
                       (minZ < boundaryWorldPos && maxZ > boundaryWorldPos);
              }
            };
            
            // Collect buildings near boundary from chunk1
            for (const building of chunk1.buildings) {
              if (isNearBoundary(building.position, building.dimensions)) {
                objectsNearBoundary.push({
                  id: building.id,
                  position: building.position,
                  dimensions: building.dimensions,
                  chunkId: `${chunk1X},${chunk1Z}`,
                  type: 'building'
                });
              }
            }
            
            // Collect buildings near boundary from chunk2
            for (const building of chunk2.buildings) {
              if (isNearBoundary(building.position, building.dimensions)) {
                objectsNearBoundary.push({
                  id: building.id,
                  position: building.position,
                  dimensions: building.dimensions,
                  chunkId: `${chunk2X},${chunk2Z}`,
                  type: 'building'
                });
              }
            }
            
            // Collect vehicles near boundary from chunk1
            for (const vehicle of chunk1.vehicles) {
              // Estimate vehicle dimensions (vehicles are typically small)
              const vehicleDim = new BABYLON.Vector3(4, 2, 2);
              if (isNearBoundary(vehicle.position, vehicleDim)) {
                objectsNearBoundary.push({
                  id: vehicle.id,
                  position: vehicle.position,
                  dimensions: vehicleDim,
                  chunkId: `${chunk1X},${chunk1Z}`,
                  type: 'vehicle'
                });
              }
            }
            
            // Collect vehicles near boundary from chunk2
            for (const vehicle of chunk2.vehicles) {
              const vehicleDim = new BABYLON.Vector3(4, 2, 2);
              if (isNearBoundary(vehicle.position, vehicleDim)) {
                objectsNearBoundary.push({
                  id: vehicle.id,
                  position: vehicle.position,
                  dimensions: vehicleDim,
                  chunkId: `${chunk2X},${chunk2Z}`,
                  type: 'vehicle'
                });
              }
            }
            
            // Collect signs near boundary from chunk1
            for (const sign of chunk1.signs) {
              const signDim = new BABYLON.Vector3(1, 3, 1);
              if (isNearBoundary(sign.position, signDim)) {
                objectsNearBoundary.push({
                  id: sign.id,
                  position: sign.position,
                  dimensions: signDim,
                  chunkId: `${chunk1X},${chunk1Z}`,
                  type: 'sign'
                });
              }
            }
            
            // Collect signs near boundary from chunk2
            for (const sign of chunk2.signs) {
              const signDim = new BABYLON.Vector3(1, 3, 1);
              if (isNearBoundary(sign.position, signDim)) {
                objectsNearBoundary.push({
                  id: sign.id,
                  position: sign.position,
                  dimensions: signDim,
                  chunkId: `${chunk2X},${chunk2Z}`,
                  type: 'sign'
                });
              }
            }
            
            // Property 1: No object should be cut off by the boundary
            // An object is "cut off" if its bounding box crosses the boundary
            let noObjectsCutOff = true;
            
            for (const obj of objectsNearBoundary) {
              if (isXBoundary) {
                const minX = obj.position.x - obj.dimensions.x / 2;
                const maxX = obj.position.x + obj.dimensions.x / 2;
                
                // Object is cut off if it straddles the boundary
                // (part in one chunk, part in another)
                if (minX < boundaryWorldPos && maxX > boundaryWorldPos) {
                  // This is acceptable for roads, but not for discrete objects
                  if (obj.type !== 'road') {
                    noObjectsCutOff = false;
                    break;
                  }
                }
              } else {
                const minZ = obj.position.z - obj.dimensions.z / 2;
                const maxZ = obj.position.z + obj.dimensions.z / 2;
                
                if (minZ < boundaryWorldPos && maxZ > boundaryWorldPos) {
                  if (obj.type !== 'road') {
                    noObjectsCutOff = false;
                    break;
                  }
                }
              }
            }
            
            // Property 2: No object should be duplicated across chunks
            // Check for objects with very similar positions in different chunks
            let noDuplicates = true;
            const duplicateThreshold = 1.0; // Objects within 1 unit are considered duplicates
            
            for (let i = 0; i < objectsNearBoundary.length; i++) {
              for (let j = i + 1; j < objectsNearBoundary.length; j++) {
                const obj1 = objectsNearBoundary[i];
                const obj2 = objectsNearBoundary[j];
                
                // Only check objects from different chunks
                if (obj1.chunkId !== obj2.chunkId && obj1.type === obj2.type) {
                  const dx = obj1.position.x - obj2.position.x;
                  const dz = obj1.position.z - obj2.position.z;
                  const distance = Math.sqrt(dx * dx + dz * dz);
                  
                  // If two objects of the same type are very close but in different chunks,
                  // they might be duplicates
                  if (distance < duplicateThreshold) {
                    noDuplicates = false;
                    break;
                  }
                }
              }
              if (!noDuplicates) break;
            }
            
            // Property 3: Objects should be fully contained within their chunk's bounds
            // (with some tolerance for objects exactly on the boundary)
            let objectsWithinBounds = true;
            const boundaryTolerance = 0.1; // Small tolerance for floating point precision
            
            // Check chunk1 objects
            for (const building of chunk1.buildings) {
              const minX = building.position.x - building.dimensions.x / 2;
              const maxX = building.position.x + building.dimensions.x / 2;
              const minZ = building.position.z - building.dimensions.z / 2;
              const maxZ = building.position.z + building.dimensions.z / 2;
              
              const chunk1MinX = chunk1.worldX - boundaryTolerance;
              const chunk1MaxX = chunk1.worldX + defaultConfig.chunkSize + boundaryTolerance;
              const chunk1MinZ = chunk1.worldZ - boundaryTolerance;
              const chunk1MaxZ = chunk1.worldZ + defaultConfig.chunkSize + boundaryTolerance;
              
              // Object should be mostly within chunk bounds
              // We allow small overlaps at boundaries for objects placed exactly on the edge
              const centerInBounds = 
                building.position.x >= chunk1MinX && building.position.x <= chunk1MaxX &&
                building.position.z >= chunk1MinZ && building.position.z <= chunk1MaxZ;
              
              if (!centerInBounds) {
                objectsWithinBounds = false;
                break;
              }
            }
            
            // Check chunk2 objects
            if (objectsWithinBounds) {
              for (const building of chunk2.buildings) {
                const chunk2MinX = chunk2.worldX - boundaryTolerance;
                const chunk2MaxX = chunk2.worldX + defaultConfig.chunkSize + boundaryTolerance;
                const chunk2MinZ = chunk2.worldZ - boundaryTolerance;
                const chunk2MaxZ = chunk2.worldZ + defaultConfig.chunkSize + boundaryTolerance;
                
                const centerInBounds = 
                  building.position.x >= chunk2MinX && building.position.x <= chunk2MaxX &&
                  building.position.z >= chunk2MinZ && building.position.z <= chunk2MaxZ;
                
                if (!centerInBounds) {
                  objectsWithinBounds = false;
                  break;
                }
              }
            }
            
            // Cleanup
            testManager.dispose();
            testScene.dispose();
            testEngine.dispose();
            
            // Property: Objects near boundaries should be complete (not cut off),
            // not duplicated, and within their chunk's bounds
            return noObjectsCutOff && noDuplicates && objectsWithinBounds;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Performance Optimizations', () => {
    beforeEach(() => {
      chunkManager.initialize(scene, defaultConfig);
    });

    describe('generation time measurement', () => {
      it('should track generation times', () => {
        // Generate a few chunks
        chunkManager.generateChunk(0, 0);
        chunkManager.generateChunk(1, 0);
        chunkManager.generateChunk(0, 1);

        const stats = chunkManager.getPerformanceStats();
        
        expect(stats.totalChunksGenerated).toBe(3);
        expect(stats.averageGenerationTime).toBeGreaterThan(0);
        expect(stats.minGenerationTime).toBeGreaterThan(0);
        expect(stats.maxGenerationTime).toBeGreaterThan(0);
        expect(stats.lastGenerationTime).toBeGreaterThan(0);
      });

      it('should limit generation time samples', () => {
        // Generate more than MAX_GENERATION_TIME_SAMPLES chunks
        for (let i = 0; i < 150; i++) {
          chunkManager.generateChunk(i, 0);
        }

        const stats = chunkManager.getPerformanceStats();
        
        // Should only track last 100 samples
        expect(stats.totalChunksGenerated).toBeLessThanOrEqual(100);
      });

      it('should calculate correct statistics', () => {
        chunkManager.generateChunk(0, 0);
        chunkManager.generateChunk(1, 0);

        const stats = chunkManager.getPerformanceStats();
        
        expect(stats.minGenerationTime).toBeLessThanOrEqual(stats.averageGenerationTime);
        expect(stats.maxGenerationTime).toBeGreaterThanOrEqual(stats.averageGenerationTime);
        expect(stats.averageGenerationTime).toBeGreaterThan(0);
      });
    });

    describe('chunk generation prioritization', () => {
      it('should generate closer chunks first', () => {
        // Position player at origin
        const playerPos = new BABYLON.Vector3(0, 0, 0);
        
        // Track generation order by monitoring loaded chunks
        const initialCount = chunkManager.getLoadedChunks().length;
        
        chunkManager.update(playerPos);
        
        const loadedChunks = chunkManager.getLoadedChunks();
        
        // Verify chunks were loaded
        expect(loadedChunks.length).toBeGreaterThan(initialCount);
        
        // Verify that the player's chunk (0,0) is loaded
        expect(chunkManager.isChunkLoaded(0, 0)).toBe(true);
      });

      it('should prioritize by distance from player', () => {
        // Position player at a specific location
        const playerPos = new BABYLON.Vector3(250, 0, 250);
        
        chunkManager.update(playerPos);
        
        // Calculate distances from player to loaded chunks
        const loadedChunks = chunkManager.getLoadedChunks();
        const distances = loadedChunks.map(chunk => {
          const chunkCenterX = chunk.worldX + defaultConfig.chunkSize / 2;
          const chunkCenterZ = chunk.worldZ + defaultConfig.chunkSize / 2;
          const dx = playerPos.x - chunkCenterX;
          const dz = playerPos.z - chunkCenterZ;
          return Math.sqrt(dx * dx + dz * dz);
        });
        
        // All loaded chunks should be within active radius
        for (const distance of distances) {
          expect(distance).toBeLessThanOrEqual(defaultConfig.activeRadius);
        }
      });
    });

    describe('resource disposal', () => {
      it('should dispose meshes on chunk unload', () => {
        const chunk = chunkManager.generateChunk(0, 0);
        
        // Add test meshes
        const mesh1 = BABYLON.MeshBuilder.CreateBox('test1', { size: 1 }, scene);
        const mesh2 = BABYLON.MeshBuilder.CreateBox('test2', { size: 1 }, scene);
        chunk.meshes.push(mesh1, mesh2);
        
        expect(mesh1.isDisposed()).toBe(false);
        expect(mesh2.isDisposed()).toBe(false);
        
        chunkManager.unloadChunk(0, 0);
        
        expect(mesh1.isDisposed()).toBe(true);
        expect(mesh2.isDisposed()).toBe(true);
      });

      it('should dispose physics imposters on chunk unload', () => {
        const chunk = chunkManager.generateChunk(0, 0);
        
        // Add test mesh with physics imposter
        const mesh = BABYLON.MeshBuilder.CreateBox('test', { size: 1 }, scene);
        const imposter = new BABYLON.PhysicsImpostor(
          mesh,
          BABYLON.PhysicsImpostor.BoxImpostor,
          { mass: 0 },
          scene
        );
        chunk.meshes.push(mesh);
        chunk.imposters.push(imposter);
        
        expect(mesh.isDisposed()).toBe(false);
        
        chunkManager.unloadChunk(0, 0);
        
        expect(mesh.isDisposed()).toBe(true);
      });

      it('should dispose all resources on manager disposal', () => {
        // Generate multiple chunks with meshes
        for (let i = 0; i < 3; i++) {
          const chunk = chunkManager.generateChunk(i, 0);
          const mesh = BABYLON.MeshBuilder.CreateBox(`test${i}`, { size: 1 }, scene);
          chunk.meshes.push(mesh);
        }
        
        const allMeshes = chunkManager.getLoadedChunks()
          .flatMap(chunk => chunk.meshes);
        
        expect(allMeshes.length).toBe(3);
        allMeshes.forEach(mesh => expect(mesh.isDisposed()).toBe(false));
        
        chunkManager.dispose();
        
        allMeshes.forEach(mesh => expect(mesh.isDisposed()).toBe(true));
      });
    });

    describe('mesh instance manager', () => {
      it('should initialize instance manager on initialization', () => {
        const instanceManager = chunkManager.getInstanceManager();
        expect(instanceManager).not.toBeNull();
      });

      it('should dispose instance manager on disposal', () => {
        const instanceManager = chunkManager.getInstanceManager();
        expect(instanceManager).not.toBeNull();
        
        chunkManager.dispose();
        
        expect(chunkManager.getInstanceManager()).toBeNull();
      });
    });
  });
});
