/**
 * ChunkManager - Manages chunk lifecycle and coordinates world generation
 * Validates: Requirements 1.1, 1.4, 1.5, 12.3
 */

import * as BABYLON from '@babylonjs/core';
import { Chunk } from './ChunkTypes';
import { worldToChunk, getChunkKey, parseChunkKey } from './SpatialUtils';
import { Generator, GenerationContext, PlacementRuleEngine } from './Generator';
import { SeededRandom } from './SeededRandom';

/**
 * Configuration for ChunkManager
 */
export interface ChunkConfig {
  chunkSize: number;          // Size of each chunk (e.g., 100 units)
  activeRadius: number;       // Distance to keep chunks loaded
  unloadDistance: number;     // Distance to unload chunks
  seed: number;               // World generation seed
  generationOrder: string[];  // Order of generator execution
}

/**
 * ChunkManager tracks player position and manages chunk lifecycle
 * Generates new chunks as player approaches, unloads distant chunks
 */
export class ChunkManager {
  private scene: BABYLON.Scene | null = null;
  private config: ChunkConfig | null = null;
  private loadedChunks: Map<string, Chunk> = new Map();
  private lastPlayerChunk: { x: number; z: number } | null = null;
  private generators: Map<string, Generator> = new Map();
  private placementEngine: PlacementRuleEngine | null = null;

  /**
   * Initialize ChunkManager with scene and configuration
   * Validates: Requirements 1.1, 1.4
   * 
   * @param scene - Babylon.js scene to add generated objects to
   * @param config - Configuration for chunk management
   */
  public initialize(scene: BABYLON.Scene, config: ChunkConfig): void {
    this.scene = scene;
    this.config = config;
    this.loadedChunks.clear();
    this.lastPlayerChunk = null;
    this.generators.clear();

    console.log('ChunkManager initialized with config:', config);
  }

  /**
   * Register a generator with the ChunkManager
   * Validates: Requirement 11.1
   * 
   * @param generator - Generator to register
   */
  public registerGenerator(generator: Generator): void {
    const name = generator.getName();
    
    if (this.generators.has(name)) {
      console.warn(`Generator "${name}" is already registered. Overwriting.`);
    }
    
    this.generators.set(name, generator);
    console.log(`Registered generator: ${name}`);
  }

  /**
   * Unregister a generator
   * 
   * @param name - Name of generator to unregister
   */
  public unregisterGenerator(name: string): void {
    if (this.generators.delete(name)) {
      console.log(`Unregistered generator: ${name}`);
    }
  }

  /**
   * Get a registered generator by name
   * 
   * @param name - Name of generator
   * @returns Generator or undefined if not found
   */
  public getGenerator(name: string): Generator | undefined {
    return this.generators.get(name);
  }

  /**
   * Get all registered generators
   * 
   * @returns Array of all registered generators
   */
  public getGenerators(): Generator[] {
    return Array.from(this.generators.values());
  }

  /**
   * Set the placement rule engine
   * 
   * @param engine - Placement rule engine to use
   */
  public setPlacementEngine(engine: PlacementRuleEngine): void {
    this.placementEngine = engine;
    console.log('Placement engine set');
  }

  /**
   * Update based on player position (called each frame)
   * Checks if new chunks need to be loaded or distant chunks unloaded
   * Validates: Requirements 1.1, 1.4, 1.5, 12.3
   * 
   * @param playerPosition - Current player position from PlayerController
   */
  public update(playerPosition: BABYLON.Vector3): void {
    if (!this.scene || !this.config) {
      return;
    }

    // Convert player position to chunk coordinates
    const playerChunk = worldToChunk(playerPosition.x, playerPosition.z, this.config.chunkSize);

    // Check if player has moved to a different chunk
    // Validates: Requirement 1.5 - stationary player stability
    if (this.lastPlayerChunk && 
        playerChunk.x === this.lastPlayerChunk.x && 
        playerChunk.z === this.lastPlayerChunk.z) {
      // Player is in the same chunk, no need to check for loading/unloading
      return;
    }

    // Update last player chunk
    this.lastPlayerChunk = { x: playerChunk.x, z: playerChunk.z };

    // Load chunks within active radius
    // Validates: Requirement 1.1 - chunk generation on proximity
    this.loadChunksInRadius(playerPosition, playerChunk.x, playerChunk.z);

    // Unload chunks beyond unload distance
    // Validates: Requirement 1.4 - chunk unloading beyond distance
    this.unloadDistantChunks(playerPosition);
  }

  /**
   * Load chunks within active radius of player
   * Validates: Requirement 1.1
   * 
   * @param playerPosition - Actual player world position
   * @param centerX - Center chunk X coordinate
   * @param centerZ - Center chunk Z coordinate
   */
  private loadChunksInRadius(playerPosition: BABYLON.Vector3, centerX: number, centerZ: number): void {
    if (!this.config) {
      return;
    }

    // Calculate how many chunks to load in each direction
    const chunkRadius = Math.ceil(this.config.activeRadius / this.config.chunkSize);

    // Generate chunks in a square around the player
    for (let x = centerX - chunkRadius; x <= centerX + chunkRadius; x++) {
      for (let z = centerZ - chunkRadius; z <= centerZ + chunkRadius; z++) {
        const key = getChunkKey(x, z);
        
        // Skip if chunk is already loaded
        if (this.loadedChunks.has(key)) {
          continue;
        }

        // Check if chunk is within active radius (circular check)
        // Calculate distance from player position to chunk center
        const chunkCenterX = x * this.config.chunkSize + this.config.chunkSize / 2;
        const chunkCenterZ = z * this.config.chunkSize + this.config.chunkSize / 2;
        
        const dx = playerPosition.x - chunkCenterX;
        const dz = playerPosition.z - chunkCenterZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance <= this.config.activeRadius) {
          // Generate and load the chunk
          this.generateChunk(x, z);
        }
      }
    }
  }

  /**
   * Unload chunks beyond unload distance from player
   * Validates: Requirement 1.4
   * 
   * @param playerPosition - Current player position
   */
  private unloadDistantChunks(playerPosition: BABYLON.Vector3): void {
    if (!this.config) {
      return;
    }

    const chunksToUnload: string[] = [];

    // Check each loaded chunk
    for (const [key, chunk] of this.loadedChunks.entries()) {
      // Calculate distance from player to chunk center
      const chunkCenterX = chunk.worldX + this.config.chunkSize / 2;
      const chunkCenterZ = chunk.worldZ + this.config.chunkSize / 2;
      
      const dx = playerPosition.x - chunkCenterX;
      const dz = playerPosition.z - chunkCenterZ;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // Mark for unloading if beyond unload distance
      if (distance > this.config.unloadDistance) {
        chunksToUnload.push(key);
      }
    }

    // Unload marked chunks
    for (const key of chunksToUnload) {
      const coords = parseChunkKey(key);
      this.unloadChunk(coords.x, coords.z);
    }
  }

  /**
   * Generate a specific chunk
   * Creates chunk data structure and initializes empty arrays
   * Validates: Requirements 1.1, 1.2
   * 
   * @param chunkX - Chunk X coordinate
   * @param chunkZ - Chunk Z coordinate
   * @returns The generated chunk
   */
  public generateChunk(chunkX: number, chunkZ: number): Chunk {
    if (!this.scene || !this.config) {
      throw new Error('ChunkManager not initialized');
    }

    const key = getChunkKey(chunkX, chunkZ);

    // Check if chunk is already loaded
    if (this.loadedChunks.has(key)) {
      return this.loadedChunks.get(key)!;
    }

    // Calculate world position (corner of chunk)
    const worldX = chunkX * this.config.chunkSize;
    const worldZ = chunkZ * this.config.chunkSize;

    // Generate chunk-specific seed from world seed and chunk coordinates
    // This ensures deterministic generation for the same chunk
    // Validates: Requirement 1.2
    const chunkSeed = this.generateChunkSeed(chunkX, chunkZ);

    // Create chunk data structure
    const chunk: Chunk = {
      x: chunkX,
      z: chunkZ,
      worldX,
      worldZ,
      roads: [],
      buildings: [],
      vehicles: [],
      signs: [],
      meshes: [],
      imposters: [],
      generatedAt: Date.now(),
      seed: chunkSeed
    };

    // Store chunk in loaded chunks map
    this.loadedChunks.set(key, chunk);

    // Execute generators in configured order
    // Validates: Requirement 10.5
    this.executeGenerators(chunk);

    console.log(`Generated chunk at (${chunkX}, ${chunkZ}) with seed ${chunkSeed}`);

    return chunk;
  }

  /**
   * Execute generators for a chunk in configured order
   * Validates: Requirement 10.5
   * 
   * @param chunk - Chunk to generate content for
   */
  private executeGenerators(chunk: Chunk): void {
    if (!this.scene || !this.config) {
      return;
    }

    // Get adjacent chunks for boundary matching
    const adjacentChunks = this.getAdjacentChunks(chunk.x, chunk.z);

    // Create seeded RNG for this chunk
    const rng = new SeededRandom(chunk.seed);

    // Create generation context
    const context: GenerationContext = {
      scene: this.scene,
      chunk,
      seed: chunk.seed,
      chunkSize: this.config.chunkSize,
      rng,
      adjacentChunks,
      placementEngine: this.placementEngine
    };

    // Execute generators in configured order
    // Validates: Requirement 10.5
    const generationOrder = this.config.generationOrder || [];
    
    for (const generatorName of generationOrder) {
      const generator = this.generators.get(generatorName);
      
      if (!generator) {
        console.warn(`Generator "${generatorName}" not found, skipping`);
        continue;
      }

      try {
        // Execute generator
        const generatedObjects = generator.generate(chunk, context);
        
        console.log(`Generator "${generatorName}" created ${generatedObjects.length} objects for chunk (${chunk.x}, ${chunk.z})`);
        
        // Store generated objects in chunk
        // (Generators are responsible for adding objects to chunk arrays)
      } catch (error) {
        console.error(`Error executing generator "${generatorName}":`, error);
      }
    }
  }

  /**
   * Get adjacent chunks for boundary matching
   * 
   * @param chunkX - Center chunk X coordinate
   * @param chunkZ - Center chunk Z coordinate
   * @returns Array of adjacent loaded chunks
   */
  private getAdjacentChunks(chunkX: number, chunkZ: number): Chunk[] {
    const adjacent: Chunk[] = [];
    
    // Check all 8 adjacent positions
    const offsets = [
      [-1, -1], [0, -1], [1, -1],
      [-1,  0],          [1,  0],
      [-1,  1], [0,  1], [1,  1]
    ];

    for (const [dx, dz] of offsets) {
      const key = getChunkKey(chunkX + dx, chunkZ + dz);
      const chunk = this.loadedChunks.get(key);
      
      if (chunk) {
        adjacent.push(chunk);
      }
    }

    return adjacent;
  }

  /**
   * Generate deterministic seed for a chunk based on world seed and coordinates
   * Validates: Requirement 1.2
   * 
   * @param chunkX - Chunk X coordinate
   * @param chunkZ - Chunk Z coordinate
   * @returns Chunk-specific seed
   */
  private generateChunkSeed(chunkX: number, chunkZ: number): number {
    if (!this.config) {
      throw new Error('ChunkManager not initialized');
    }

    // Use a simple hash function to combine world seed with chunk coordinates
    // This ensures the same chunk always gets the same seed
    const prime1 = 73856093;
    const prime2 = 19349663;
    const prime3 = 83492791;

    const hash = (this.config.seed * prime1) ^ (chunkX * prime2) ^ (chunkZ * prime3);
    
    // Ensure positive seed value
    return Math.abs(hash);
  }

  /**
   * Unload a specific chunk
   * Removes chunk from memory and disposes of all resources
   * Validates: Requirement 1.4
   * 
   * @param chunkX - Chunk X coordinate
   * @param chunkZ - Chunk Z coordinate
   */
  public unloadChunk(chunkX: number, chunkZ: number): void {
    const key = getChunkKey(chunkX, chunkZ);
    const chunk = this.loadedChunks.get(key);

    if (!chunk) {
      return;
    }

    // Dispose of all meshes
    for (const mesh of chunk.meshes) {
      mesh.dispose();
    }

    // Dispose of all physics imposters
    for (const imposter of chunk.imposters) {
      imposter.dispose();
    }

    // Remove chunk from loaded chunks
    this.loadedChunks.delete(key);

    console.log(`Unloaded chunk at (${chunkX}, ${chunkZ})`);
  }

  /**
   * Get chunk at world position
   * 
   * @param worldX - World X coordinate
   * @param worldZ - World Z coordinate
   * @returns Chunk at position or null if not loaded
   */
  public getChunk(worldX: number, worldZ: number): Chunk | null {
    if (!this.config) {
      return null;
    }

    const coords = worldToChunk(worldX, worldZ, this.config.chunkSize);
    const key = getChunkKey(coords.x, coords.z);
    return this.loadedChunks.get(key) || null;
  }

  /**
   * Check if chunk is loaded
   * 
   * @param chunkX - Chunk X coordinate
   * @param chunkZ - Chunk Z coordinate
   * @returns True if chunk is loaded
   */
  public isChunkLoaded(chunkX: number, chunkZ: number): boolean {
    const key = getChunkKey(chunkX, chunkZ);
    return this.loadedChunks.has(key);
  }

  /**
   * Get all loaded chunks
   * 
   * @returns Array of all loaded chunks
   */
  public getLoadedChunks(): Chunk[] {
    return Array.from(this.loadedChunks.values());
  }

  /**
   * Get configuration
   * 
   * @returns Current configuration or null if not initialized
   */
  public getConfig(): ChunkConfig | null {
    return this.config;
  }

  /**
   * Cleanup all resources
   */
  public dispose(): void {
    // Unload all chunks
    const chunkKeys = Array.from(this.loadedChunks.keys());
    for (const key of chunkKeys) {
      const coords = parseChunkKey(key);
      this.unloadChunk(coords.x, coords.z);
    }

    this.loadedChunks.clear();
    this.scene = null;
    this.config = null;
    this.lastPlayerChunk = null;

    console.log('ChunkManager disposed');
  }
}
