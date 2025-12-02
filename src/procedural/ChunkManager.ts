/**
 * ChunkManager - Manages chunk lifecycle and coordinates world generation
 * Validates: Requirements 1.1, 1.4, 1.5, 12.3
 */

import * as BABYLON from '@babylonjs/core';
import { Chunk } from './ChunkTypes';
import { worldToChunk, getChunkKey, parseChunkKey } from './SpatialUtils';
import { Generator, GenerationContext, PlacementRuleEngine } from './Generator';
import { SeededRandom } from './SeededRandom';
import { MeshInstanceManager } from './MeshInstanceManager';

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
  
  // Performance tracking
  // Validates: Requirement 8.1
  private generationTimes: number[] = [];
  private readonly MAX_GENERATION_TIME_SAMPLES = 100;
  
  // Generation queue for prioritization
  // Validates: Requirement 8.2
  private generationQueue: Array<{ x: number; z: number; distance: number }> = [];
  
  // Mesh instancing for performance
  // Validates: Requirement 8.5
  private instanceManager: MeshInstanceManager | null = null;

  /**
   * Initialize ChunkManager with scene and configuration
   * Validates: Requirements 1.1, 1.4, 8.5
   * 
   * @param scene - Babylon.js scene to add generated objects to
   * @param config - Configuration for chunk management
   * @throws Error if scene is null or config is invalid
   */
  public initialize(scene: BABYLON.Scene, config: ChunkConfig): void {
    // Validate scene
    if (!scene) {
      throw new Error('ChunkManager.initialize: scene cannot be null');
    }

    // Validate configuration
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`ChunkManager.initialize: Invalid configuration - ${validation.errors.join(', ')}`);
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn('ChunkManager.initialize: Configuration warnings:', validation.warnings);
    }

    this.scene = scene;
    this.config = config;
    this.loadedChunks.clear();
    this.lastPlayerChunk = null;
    this.generators.clear();
    
    // Initialize mesh instance manager
    // Validates: Requirement 8.5
    try {
      this.instanceManager = new MeshInstanceManager(scene);
    } catch (error) {
      console.error('ChunkManager.initialize: Failed to create MeshInstanceManager:', error);
      throw new Error(`ChunkManager.initialize: Failed to initialize mesh instance manager - ${error}`);
    }

    console.log('ChunkManager initialized with config:', config);
  }

  /**
   * Validate chunk configuration
   * @param config - Configuration to validate
   * @returns Validation result with errors and warnings
   */
  private validateConfig(config: ChunkConfig): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate chunkSize
    if (config.chunkSize === undefined || config.chunkSize === null) {
      errors.push('chunkSize is required');
    } else if (config.chunkSize <= 0) {
      errors.push('chunkSize must be positive');
    } else if (config.chunkSize < 10) {
      warnings.push('chunkSize < 10 may cause excessive chunk generation');
    } else if (config.chunkSize > 1000) {
      warnings.push('chunkSize > 1000 may cause generation delays');
    }

    // Validate activeRadius
    if (config.activeRadius === undefined || config.activeRadius === null) {
      errors.push('activeRadius is required');
    } else if (config.activeRadius <= 0) {
      errors.push('activeRadius must be positive');
    }

    // Validate unloadDistance
    if (config.unloadDistance === undefined || config.unloadDistance === null) {
      errors.push('unloadDistance is required');
    } else if (config.unloadDistance <= 0) {
      errors.push('unloadDistance must be positive');
    } else if (config.activeRadius && config.unloadDistance <= config.activeRadius) {
      errors.push('unloadDistance must be greater than activeRadius');
    }

    // Validate seed
    if (config.seed === undefined || config.seed === null) {
      errors.push('seed is required');
    } else if (!Number.isFinite(config.seed)) {
      errors.push('seed must be a finite number');
    } else if (!Number.isInteger(config.seed)) {
      warnings.push('seed should be an integer for best results');
    }

    // Validate generationOrder
    if (!config.generationOrder) {
      warnings.push('generationOrder is empty, no generators will run');
    } else if (!Array.isArray(config.generationOrder)) {
      errors.push('generationOrder must be an array');
    } else if (config.generationOrder.length === 0) {
      warnings.push('generationOrder is empty, no generators will run');
    }

    return { valid: errors.length === 0, errors, warnings };
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
   * Get the mesh instance manager
   * Validates: Requirement 8.5
   * 
   * @returns Mesh instance manager or null if not initialized
   */
  public getInstanceManager(): MeshInstanceManager | null {
    return this.instanceManager;
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
      console.warn('ChunkManager.update: Not initialized, skipping update');
      return;
    }

    // Validate player position
    if (!playerPosition || !Number.isFinite(playerPosition.x) || !Number.isFinite(playerPosition.z)) {
      console.error('ChunkManager.update: Invalid player position:', playerPosition);
      return;
    }

    // Handle extreme coordinates
    const MAX_COORDINATE = 1000000;
    if (Math.abs(playerPosition.x) > MAX_COORDINATE || Math.abs(playerPosition.z) > MAX_COORDINATE) {
      console.warn('ChunkManager.update: Player position exceeds safe bounds, clamping');
      playerPosition.x = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, playerPosition.x));
      playerPosition.z = Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, playerPosition.z));
    }

    try {
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
    } catch (error) {
      console.error('ChunkManager.update: Error during update:', error);
      // Continue execution - don't crash the game loop
    }
  }

  /**
   * Load chunks within active radius of player
   * Validates: Requirements 1.1, 8.2
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

    // Clear generation queue
    this.generationQueue = [];

    // Identify chunks that need generation and calculate their distances
    // Validates: Requirement 8.2 - prioritization by distance
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
          // Add to generation queue with distance
          this.generationQueue.push({ x, z, distance });
        }
      }
    }

    // Sort queue by distance (closest first)
    // Validates: Requirement 8.2 - prioritize chunks closest to player
    this.generationQueue.sort((a, b) => a.distance - b.distance);

    // Generate chunks in priority order
    for (const item of this.generationQueue) {
      this.generateChunk(item.x, item.z);
    }

    // Clear queue after processing
    this.generationQueue = [];
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
   * Validates: Requirements 1.1, 1.2, 8.1
   * 
   * @param chunkX - Chunk X coordinate
   * @param chunkZ - Chunk Z coordinate
   * @returns The generated chunk
   * @throws Error if ChunkManager not initialized or generation fails critically
   */
  public generateChunk(chunkX: number, chunkZ: number): Chunk {
    if (!this.scene || !this.config) {
      throw new Error('ChunkManager.generateChunk: ChunkManager not initialized');
    }

    // Validate chunk coordinates
    if (!Number.isFinite(chunkX) || !Number.isFinite(chunkZ)) {
      throw new Error(`ChunkManager.generateChunk: Invalid chunk coordinates (${chunkX}, ${chunkZ})`);
    }

    if (!Number.isInteger(chunkX) || !Number.isInteger(chunkZ)) {
      console.warn(`ChunkManager.generateChunk: Non-integer chunk coordinates (${chunkX}, ${chunkZ}), rounding`);
      chunkX = Math.round(chunkX);
      chunkZ = Math.round(chunkZ);
    }

    const key = getChunkKey(chunkX, chunkZ);

    // Check if chunk is already loaded
    if (this.loadedChunks.has(key)) {
      console.log(`ChunkManager.generateChunk: Chunk (${chunkX}, ${chunkZ}) already loaded, returning existing`);
      return this.loadedChunks.get(key)!;
    }

    // Start timing generation
    // Validates: Requirement 8.1 - generation time measurement
    const startTime = performance.now();

    try {
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
      try {
        this.executeGenerators(chunk);
      } catch (error) {
        console.error(`ChunkManager.generateChunk: Generator execution failed for chunk (${chunkX}, ${chunkZ}):`, error);
        // Remove partially generated chunk
        this.loadedChunks.delete(key);
        // Dispose any created resources
        this.disposeChunkResources(chunk);
        throw new Error(`ChunkManager.generateChunk: Failed to generate chunk (${chunkX}, ${chunkZ}) - ${error}`);
      }

      // End timing and log
      // Validates: Requirement 8.1 - generation time logging
      const endTime = performance.now();
      const generationTime = endTime - startTime;
      
      // Track generation time
      this.generationTimes.push(generationTime);
      if (this.generationTimes.length > this.MAX_GENERATION_TIME_SAMPLES) {
        this.generationTimes.shift();
      }

      // Calculate average generation time
      const avgTime = this.generationTimes.reduce((a, b) => a + b, 0) / this.generationTimes.length;

      console.log(`Generated chunk at (${chunkX}, ${chunkZ}) in ${generationTime.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms)`);

      // Warn if generation is slow
      if (generationTime > 100) {
        console.warn(`Chunk generation took ${generationTime.toFixed(2)}ms, exceeding 100ms target`);
      }

      return chunk;
    } catch (error) {
      console.error(`ChunkManager.generateChunk: Critical error generating chunk (${chunkX}, ${chunkZ}):`, error);
      throw error;
    }
  }

  /**
   * Dispose chunk resources safely
   * @param chunk - Chunk to dispose
   */
  private disposeChunkResources(chunk: Chunk): void {
    try {
      // Dispose meshes
      for (const mesh of chunk.meshes) {
        try {
          mesh.dispose();
        } catch (error) {
          console.error('ChunkManager.disposeChunkResources: Error disposing mesh:', error);
        }
      }

      // Dispose imposters
      for (const imposter of chunk.imposters) {
        try {
          imposter.dispose();
        } catch (error) {
          console.error('ChunkManager.disposeChunkResources: Error disposing imposter:', error);
        }
      }
    } catch (error) {
      console.error('ChunkManager.disposeChunkResources: Error during resource disposal:', error);
    }
  }

  /**
   * Execute generators for a chunk in configured order
   * Validates: Requirement 10.5
   * 
   * @param chunk - Chunk to generate content for
   * @throws Error if critical generator fails
   */
  private executeGenerators(chunk: Chunk): void {
    if (!this.scene || !this.config) {
      throw new Error('ChunkManager.executeGenerators: Not initialized');
    }

    // Get adjacent chunks for boundary matching
    const adjacentChunks = this.getAdjacentChunks(chunk.x, chunk.z);

    // Create seeded RNG for this chunk
    let rng: SeededRandom;
    try {
      rng = new SeededRandom(chunk.seed);
    } catch (error) {
      console.error('ChunkManager.executeGenerators: Failed to create SeededRandom:', error);
      throw new Error(`ChunkManager.executeGenerators: Failed to create RNG - ${error}`);
    }

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
        console.warn(`ChunkManager.executeGenerators: Generator "${generatorName}" not found, skipping`);
        continue;
      }

      try {
        // Execute generator with timeout protection
        const generatorStartTime = performance.now();
        const generatedObjects = generator.generate(chunk, context);
        const generatorTime = performance.now() - generatorStartTime;
        
        console.log(`Generator "${generatorName}" created ${generatedObjects.length} objects for chunk (${chunk.x}, ${chunk.z}) in ${generatorTime.toFixed(2)}ms`);
        
        // Warn if generator is slow
        if (generatorTime > 50) {
          console.warn(`Generator "${generatorName}" took ${generatorTime.toFixed(2)}ms, which is slow`);
        }
        
        // Store generated objects in chunk
        // (Generators are responsible for adding objects to chunk arrays)
      } catch (error) {
        console.error(`ChunkManager.executeGenerators: Error executing generator "${generatorName}":`, error);
        
        // Decide whether to continue or fail based on generator criticality
        // RoadGenerator is critical - other generators can fail gracefully
        if (generatorName === 'RoadGenerator') {
          throw new Error(`ChunkManager.executeGenerators: Critical generator "${generatorName}" failed - ${error}`);
        } else {
          console.warn(`ChunkManager.executeGenerators: Non-critical generator "${generatorName}" failed, continuing with other generators`);
        }
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
   * @throws Error if ChunkManager not initialized
   */
  private generateChunkSeed(chunkX: number, chunkZ: number): number {
    if (!this.config) {
      throw new Error('ChunkManager.generateChunkSeed: ChunkManager not initialized');
    }

    try {
      // Use a simple hash function to combine world seed with chunk coordinates
      // This ensures the same chunk always gets the same seed
      const prime1 = 73856093;
      const prime2 = 19349663;
      const prime3 = 83492791;

      // Handle potential overflow by using modulo
      const MAX_SAFE_INT = Number.MAX_SAFE_INTEGER;
      const seed = ((this.config.seed % MAX_SAFE_INT) * prime1) % MAX_SAFE_INT;
      const xPart = ((chunkX % MAX_SAFE_INT) * prime2) % MAX_SAFE_INT;
      const zPart = ((chunkZ % MAX_SAFE_INT) * prime3) % MAX_SAFE_INT;

      const hash = (seed ^ xPart ^ zPart);
      
      // Ensure positive seed value and within safe integer range
      const result = Math.abs(hash) % MAX_SAFE_INT;
      
      // Ensure we never return 0 (which could cause issues in some RNGs)
      return result === 0 ? 1 : result;
    } catch (error) {
      console.error('ChunkManager.generateChunkSeed: Error generating seed:', error);
      // Fallback to a simple but deterministic seed
      return Math.abs((chunkX * 1000 + chunkZ) % Number.MAX_SAFE_INTEGER) + 1;
    }
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
    try {
      const key = getChunkKey(chunkX, chunkZ);
      const chunk = this.loadedChunks.get(key);

      if (!chunk) {
        console.log(`ChunkManager.unloadChunk: Chunk (${chunkX}, ${chunkZ}) not loaded, nothing to unload`);
        return;
      }

      // Dispose of all meshes
      for (const mesh of chunk.meshes) {
        try {
          if (mesh && !mesh.isDisposed()) {
            mesh.dispose();
          }
        } catch (error) {
          console.error(`ChunkManager.unloadChunk: Error disposing mesh in chunk (${chunkX}, ${chunkZ}):`, error);
          // Continue with other meshes
        }
      }

      // Dispose of all physics imposters
      for (const imposter of chunk.imposters) {
        try {
          if (imposter) {
            imposter.dispose();
          }
        } catch (error) {
          console.error(`ChunkManager.unloadChunk: Error disposing imposter in chunk (${chunkX}, ${chunkZ}):`, error);
          // Continue with other imposters
        }
      }

      // Remove chunk from loaded chunks
      this.loadedChunks.delete(key);

      console.log(`Unloaded chunk at (${chunkX}, ${chunkZ})`);
    } catch (error) {
      console.error(`ChunkManager.unloadChunk: Error unloading chunk (${chunkX}, ${chunkZ}):`, error);
      // Try to remove from map anyway to prevent memory leak
      try {
        const key = getChunkKey(chunkX, chunkZ);
        this.loadedChunks.delete(key);
      } catch (e) {
        console.error('ChunkManager.unloadChunk: Failed to remove chunk from map:', e);
      }
    }
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
   * Get performance statistics
   * Validates: Requirement 8.1
   * 
   * @returns Performance statistics object
   */
  public getPerformanceStats(): {
    averageGenerationTime: number;
    minGenerationTime: number;
    maxGenerationTime: number;
    lastGenerationTime: number;
    totalChunksGenerated: number;
    loadedChunksCount: number;
  } {
    if (this.generationTimes.length === 0) {
      return {
        averageGenerationTime: 0,
        minGenerationTime: 0,
        maxGenerationTime: 0,
        lastGenerationTime: 0,
        totalChunksGenerated: 0,
        loadedChunksCount: this.loadedChunks.size
      };
    }

    const avgTime = this.generationTimes.reduce((a, b) => a + b, 0) / this.generationTimes.length;
    const minTime = Math.min(...this.generationTimes);
    const maxTime = Math.max(...this.generationTimes);
    const lastTime = this.generationTimes[this.generationTimes.length - 1];

    return {
      averageGenerationTime: avgTime,
      minGenerationTime: minTime,
      maxGenerationTime: maxTime,
      lastGenerationTime: lastTime,
      totalChunksGenerated: this.generationTimes.length,
      loadedChunksCount: this.loadedChunks.size
    };
  }

  /**
   * Cleanup all resources
   * Validates: Requirement 8.3
   */
  public dispose(): void {
    // Unload all chunks
    const chunkKeys = Array.from(this.loadedChunks.keys());
    for (const key of chunkKeys) {
      const coords = parseChunkKey(key);
      this.unloadChunk(coords.x, coords.z);
    }

    // Dispose instance manager
    if (this.instanceManager) {
      this.instanceManager.dispose();
      this.instanceManager = null;
    }

    this.loadedChunks.clear();
    this.scene = null;
    this.config = null;
    this.lastPlayerChunk = null;
    this.generationTimes = [];
    this.generationQueue = [];

    console.log('ChunkManager disposed');
  }
}
