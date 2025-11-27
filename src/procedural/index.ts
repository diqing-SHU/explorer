/**
 * Procedural Generation System
 * Core infrastructure and utilities for procedural world generation
 */

export { SeededRandom } from './SeededRandom';
export { NoiseGenerator } from './NoiseGenerator';
export { ChunkManager } from './ChunkManager';
export type { ChunkConfig } from './ChunkManager';
export type { ChunkCoordinates } from './SpatialUtils';
export type {
  Chunk,
  Road,
  RoadSegment,
  Intersection,
  Building,
  BuildingStyle,
  Vehicle,
  TrafficSign
} from './ChunkTypes';
export { VehicleType, SignType } from './ChunkTypes';
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
