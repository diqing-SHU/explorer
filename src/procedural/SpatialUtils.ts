/**
 * Spatial Utilities
 * Provides utility functions for spatial calculations and coordinate conversion
 * Validates: Requirements 1.1, 1.4
 */

/**
 * Chunk coordinates (grid-based)
 */
export interface ChunkCoordinates {
  x: number;
  z: number;
}

/**
 * Convert world position to chunk coordinates
 */
export function worldToChunk(worldX: number, worldZ: number, chunkSize: number): ChunkCoordinates {
  return {
    x: Math.floor(worldX / chunkSize),
    z: Math.floor(worldZ / chunkSize)
  };
}

/**
 * Convert chunk coordinates to world position (corner of chunk)
 */
export function chunkToWorld(chunkX: number, chunkZ: number, chunkSize: number): { x: number; z: number } {
  return {
    x: chunkX * chunkSize,
    z: chunkZ * chunkSize
  };
}

/**
 * Generate chunk key for Map storage
 */
export function getChunkKey(chunkX: number, chunkZ: number): string {
  return `${chunkX},${chunkZ}`;
}

/**
 * Parse chunk key back to coordinates
 */
export function parseChunkKey(key: string): ChunkCoordinates {
  const [x, z] = key.split(',').map(Number);
  return { x, z };
}

/**
 * Calculate 2D distance between two points
 */
export function distance2D(x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Calculate distance from point to chunk center
 */
export function distanceToChunk(
  worldX: number,
  worldZ: number,
  chunkX: number,
  chunkZ: number,
  chunkSize: number
): number {
  const chunkCenterX = chunkX * chunkSize + chunkSize / 2;
  const chunkCenterZ = chunkZ * chunkSize + chunkSize / 2;
  return distance2D(worldX, worldZ, chunkCenterX, chunkCenterZ);
}

/**
 * Get all chunk coordinates within a radius
 */
export function getChunksInRadius(
  centerChunkX: number,
  centerChunkZ: number,
  radiusInChunks: number
): ChunkCoordinates[] {
  const chunks: ChunkCoordinates[] = [];
  
  for (let x = centerChunkX - radiusInChunks; x <= centerChunkX + radiusInChunks; x++) {
    for (let z = centerChunkZ - radiusInChunks; z <= centerChunkZ + radiusInChunks; z++) {
      chunks.push({ x, z });
    }
  }
  
  return chunks;
}

/**
 * Check if a point is within a bounding box
 */
export function isPointInBounds(
  x: number,
  z: number,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number
): boolean {
  return x >= minX && x <= maxX && z >= minZ && z <= maxZ;
}

/**
 * Check if two bounding boxes intersect
 */
export function boundingBoxesIntersect(
  box1: { minX: number; minZ: number; maxX: number; maxZ: number },
  box2: { minX: number; minZ: number; maxX: number; maxZ: number }
): boolean {
  return !(
    box1.maxX < box2.minX ||
    box1.minX > box2.maxX ||
    box1.maxZ < box2.minZ ||
    box1.minZ > box2.maxZ
  );
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Bilinear interpolation for smooth height transitions
 * Used for terrain generation at chunk boundaries
 */
export function bilinearInterpolation(
  x: number,
  z: number,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  q00: number,
  q10: number,
  q01: number,
  q11: number
): number {
  const tx = (x - x0) / (x1 - x0);
  const tz = (z - z0) / (z1 - z0);
  
  const r0 = lerp(q00, q10, tx);
  const r1 = lerp(q01, q11, tx);
  
  return lerp(r0, r1, tz);
}

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate angle between two points (in radians)
 */
export function angleBetweenPoints(x1: number, z1: number, x2: number, z2: number): number {
  return Math.atan2(z2 - z1, x2 - x1);
}

/**
 * Normalize angle to range [0, 2π)
 */
export function normalizeAngle(angle: number): number {
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return angle;
}

/**
 * Simple spatial hash for efficient collision detection
 */
export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, any[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  /**
   * Get cell key for position
   */
  private getCellKey(x: number, z: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellZ}`;
  }

  /**
   * Insert object at position
   */
  insert(x: number, z: number, object: any): void {
    const key = this.getCellKey(x, z);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(object);
  }

  /**
   * Query objects near position
   */
  query(x: number, z: number, radius: number): any[] {
    const results: any[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerCellX = Math.floor(x / this.cellSize);
    const centerCellZ = Math.floor(z / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const key = `${centerCellX + dx},${centerCellZ + dz}`;
        const cell = this.grid.get(key);
        if (cell) {
          results.push(...cell);
        }
      }
    }

    return results;
  }

  /**
   * Clear all objects
   */
  clear(): void {
    this.grid.clear();
  }
}
