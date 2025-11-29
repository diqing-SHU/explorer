/**
 * TerrainGenerator - Generates terrain with smooth boundaries
 * Validates: Requirements 6.1, 6.2, 9.3
 */

import * as BABYLON from '@babylonjs/core';
import { Generator, GenerationContext, GeneratedObject } from './Generator';
import { Chunk } from './ChunkTypes';
import { NoiseGenerator } from './NoiseGenerator';

/**
 * Configuration for terrain generation
 */
export interface TerrainConfig {
  heightScale: number;        // Maximum height variation (e.g., 10 units)
  noiseScale: number;         // Scale of noise sampling (smaller = more variation)
  octaves: number;            // Number of noise octaves for detail
  persistence: number;        // How much each octave contributes
  resolution: number;         // Vertices per chunk side (e.g., 20 = 20x20 grid)
}

/**
 * TerrainGenerator creates terrain meshes with smooth height transitions
 * Uses noise functions for organic variation and bilinear interpolation for boundaries
 */
export class TerrainGenerator implements Generator {
  private config: TerrainConfig;
  private noiseGenerator: NoiseGenerator | null = null;

  constructor(config: TerrainConfig) {
    this.config = config;
  }

  /**
   * Get generator name
   */
  public getName(): string {
    return 'terrain';
  }

  /**
   * Configure generator
   */
  public configure(config: TerrainConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): TerrainConfig {
    return { ...this.config };
  }

  /**
   * Generate terrain for a chunk
   * Validates: Requirements 6.1, 6.2, 9.3
   */
  public generate(chunk: Chunk, context: GenerationContext): GeneratedObject[] {
    // Initialize noise generator with chunk seed
    this.noiseGenerator = new NoiseGenerator(context.seed);

    // Generate height map for this chunk
    const heightMap = this.generateHeightMap(chunk, context);

    // Create terrain mesh
    const mesh = this.createTerrainMesh(chunk, context, heightMap);

    // Create physics imposter for terrain
    const imposter = new BABYLON.PhysicsImpostor(
      mesh,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, restitution: 0.2, friction: 0.8 },
      context.scene
    );

    // Store mesh and imposter in chunk
    chunk.meshes.push(mesh);
    chunk.imposters.push(imposter);

    // Return generated object
    const generatedObject: GeneratedObject = {
      type: 'terrain',
      position: new BABYLON.Vector3(chunk.worldX, 0, chunk.worldZ),
      rotation: 0,
      scale: new BABYLON.Vector3(1, 1, 1),
      mesh,
      imposter,
      metadata: { heightMap }
    };

    return [generatedObject];
  }

  /**
   * Generate height map for chunk with boundary matching
   * Validates: Requirements 6.1, 6.2
   */
  private generateHeightMap(chunk: Chunk, context: GenerationContext): number[][] {
    const resolution = this.config.resolution;
    const heightMap: number[][] = [];

    // Generate heights for each vertex
    for (let z = 0; z <= resolution; z++) {
      const row: number[] = [];
      
      for (let x = 0; x <= resolution; x++) {
        // Calculate world position for this vertex
        const worldX = chunk.worldX + (x / resolution) * context.chunkSize;
        const worldZ = chunk.worldZ + (z / resolution) * context.chunkSize;

        // Sample noise at this position
        // Use noise scale to control frequency
        const noiseX = worldX / this.config.noiseScale;
        const noiseZ = worldZ / this.config.noiseScale;

        // Get octave noise for natural variation
        // Validates: Requirement 9.3 - terrain height variation
        const noiseValue = this.noiseGenerator!.octaveNoise2D(
          noiseX,
          noiseZ,
          this.config.octaves,
          this.config.persistence
        );

        // Scale noise to height range
        const height = noiseValue * this.config.heightScale;

        row.push(height);
      }
      
      heightMap.push(row);
    }

    // Apply bilinear interpolation at boundaries for smooth transitions
    // Validates: Requirement 6.2 - smooth height transitions
    this.applyBoundarySmoothing(heightMap, chunk, context);

    return heightMap;
  }

  /**
   * Apply bilinear interpolation at chunk boundaries
   * Ensures terrain heights match exactly at boundaries
   * Validates: Requirement 6.1
   */
  private applyBoundarySmoothing(
    heightMap: number[][],
    chunk: Chunk,
    context: GenerationContext
  ): void {
    const resolution = this.config.resolution;

    // Check each adjacent chunk and match boundary heights
    for (const adjacentChunk of context.adjacentChunks) {
      // Find the terrain generator's output in adjacent chunk
      const adjacentTerrain = this.findAdjacentTerrainData(adjacentChunk);
      
      if (!adjacentTerrain) {
        continue;
      }

      const adjacentHeightMap = adjacentTerrain.heightMap;

      // Determine which boundary to match
      const dx = adjacentChunk.x - chunk.x;
      const dz = adjacentChunk.z - chunk.z;

      // Match left boundary (x = 0) with right boundary of left chunk
      if (dx === -1 && dz === 0) {
        for (let z = 0; z <= resolution; z++) {
          heightMap[z][0] = adjacentHeightMap[z][resolution];
        }
      }

      // Match right boundary (x = resolution) with left boundary of right chunk
      if (dx === 1 && dz === 0) {
        for (let z = 0; z <= resolution; z++) {
          heightMap[z][resolution] = adjacentHeightMap[z][0];
        }
      }

      // Match top boundary (z = 0) with bottom boundary of top chunk
      if (dx === 0 && dz === -1) {
        for (let x = 0; x <= resolution; x++) {
          heightMap[0][x] = adjacentHeightMap[resolution][x];
        }
      }

      // Match bottom boundary (z = resolution) with top boundary of bottom chunk
      if (dx === 0 && dz === 1) {
        for (let x = 0; x <= resolution; x++) {
          heightMap[resolution][x] = adjacentHeightMap[0][x];
        }
      }

      // Match corners for diagonal chunks
      if (dx === -1 && dz === -1) {
        heightMap[0][0] = adjacentHeightMap[resolution][resolution];
      }
      if (dx === 1 && dz === -1) {
        heightMap[0][resolution] = adjacentHeightMap[resolution][0];
      }
      if (dx === -1 && dz === 1) {
        heightMap[resolution][0] = adjacentHeightMap[0][resolution];
      }
      if (dx === 1 && dz === 1) {
        heightMap[resolution][resolution] = adjacentHeightMap[0][0];
      }
    }
  }

  /**
   * Find terrain data in adjacent chunk
   */
  private findAdjacentTerrainData(chunk: Chunk): { heightMap: number[][] } | null {
    // Look for terrain mesh in chunk
    for (const mesh of chunk.meshes) {
      if (mesh.metadata && mesh.metadata.type === 'terrain' && mesh.metadata.heightMap) {
        return { heightMap: mesh.metadata.heightMap };
      }
    }
    return null;
  }

  /**
   * Create terrain mesh from height map
   * Validates: Requirement 6.2 - smooth transitions
   */
  private createTerrainMesh(
    chunk: Chunk,
    context: GenerationContext,
    heightMap: number[][]
  ): BABYLON.Mesh {
    const resolution = this.config.resolution;
    const chunkSize = context.chunkSize;

    // Create custom mesh
    const mesh = new BABYLON.Mesh(`terrain_${chunk.x}_${chunk.z}`, context.scene);

    // Build vertex data
    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Generate vertices
    for (let z = 0; z <= resolution; z++) {
      for (let x = 0; x <= resolution; x++) {
        const worldX = (x / resolution) * chunkSize;
        const worldZ = (z / resolution) * chunkSize;
        const height = heightMap[z][x];

        positions.push(worldX, height, worldZ);
        
        // UV coordinates for texturing
        uvs.push(x / resolution, z / resolution);
      }
    }

    // Generate indices for triangles
    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const topLeft = z * (resolution + 1) + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * (resolution + 1) + x;
        const bottomRight = bottomLeft + 1;

        // First triangle
        indices.push(topLeft, bottomLeft, topRight);
        
        // Second triangle
        indices.push(topRight, bottomLeft, bottomRight);
      }
    }

    // Compute normals
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    // Apply vertex data to mesh
    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.applyToMesh(mesh);

    // Position mesh at chunk origin
    mesh.position = new BABYLON.Vector3(chunk.worldX, 0, chunk.worldZ);

    // Create material
    const material = new BABYLON.StandardMaterial(`terrain_mat_${chunk.x}_${chunk.z}`, context.scene);
    material.diffuseColor = new BABYLON.Color3(0.4, 0.6, 0.3); // Green-ish terrain
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Low specularity
    mesh.material = material;

    // Store metadata for boundary matching
    mesh.metadata = {
      type: 'terrain',
      heightMap,
      chunkX: chunk.x,
      chunkZ: chunk.z
    };

    return mesh;
  }

  /**
   * Get placement rules for terrain (none - terrain is base layer)
   */
  public getPlacementRules(): any[] {
    return [];
  }
}
