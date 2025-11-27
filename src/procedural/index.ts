/**
 * Procedural Generation System
 * Core infrastructure and utilities for procedural world generation
 */

export { SeededRandom } from './SeededRandom';
export { NoiseGenerator } from './NoiseGenerator';
export type { ChunkCoordinates } from './SpatialUtils';
export {
  worldToChunk,
  chunkToWorld,
  getChunkKey,
  parseChunkKey,
  distance2D,
  distanceToChunk,
  getChunksInRadius,
  isPointInBounds,
  boundingBoxesIntersect,
  clamp,
  lerp,
  bilinearInterpolation,
  degreesToRadians,
  radiansToDegrees,
  angleBetweenPoints,
  normalizeAngle,
  SpatialHash
} from './SpatialUtils';
