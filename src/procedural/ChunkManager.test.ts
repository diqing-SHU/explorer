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
  });
});
