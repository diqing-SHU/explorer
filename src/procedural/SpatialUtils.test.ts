/**
 * Tests for SpatialUtils
 */

import { describe, it, expect } from 'vitest';
import {
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

describe('SpatialUtils', () => {
  describe('worldToChunk', () => {
    it('should convert world position to chunk coordinates', () => {
      expect(worldToChunk(0, 0, 100)).toEqual({ x: 0, z: 0 });
      expect(worldToChunk(150, 250, 100)).toEqual({ x: 1, z: 2 });
      expect(worldToChunk(-50, -150, 100)).toEqual({ x: -1, z: -2 });
    });
  });

  describe('chunkToWorld', () => {
    it('should convert chunk coordinates to world position', () => {
      expect(chunkToWorld(0, 0, 100)).toEqual({ x: 0, z: 0 });
      expect(chunkToWorld(1, 2, 100)).toEqual({ x: 100, z: 200 });
      expect(chunkToWorld(-1, -2, 100)).toEqual({ x: -100, z: -200 });
    });
  });

  describe('getChunkKey and parseChunkKey', () => {
    it('should create and parse chunk keys', () => {
      const key = getChunkKey(5, 10);
      expect(key).toBe('5,10');
      expect(parseChunkKey(key)).toEqual({ x: 5, z: 10 });
    });
  });

  describe('distance2D', () => {
    it('should calculate 2D distance correctly', () => {
      expect(distance2D(0, 0, 3, 4)).toBe(5);
      expect(distance2D(0, 0, 0, 0)).toBe(0);
      expect(distance2D(-3, -4, 0, 0)).toBe(5);
    });
  });

  describe('distanceToChunk', () => {
    it('should calculate distance to chunk center', () => {
      const distance = distanceToChunk(0, 0, 0, 0, 100);
      expect(distance).toBe(Math.sqrt(50 * 50 + 50 * 50));
    });
  });

  describe('getChunksInRadius', () => {
    it('should return all chunks in radius', () => {
      const chunks = getChunksInRadius(0, 0, 1);
      expect(chunks.length).toBe(9); // 3x3 grid
      expect(chunks).toContainEqual({ x: 0, z: 0 });
      expect(chunks).toContainEqual({ x: 1, z: 1 });
      expect(chunks).toContainEqual({ x: -1, z: -1 });
    });
  });

  describe('isPointInBounds', () => {
    it('should check if point is within bounds', () => {
      expect(isPointInBounds(5, 5, 0, 0, 10, 10)).toBe(true);
      expect(isPointInBounds(15, 5, 0, 0, 10, 10)).toBe(false);
      expect(isPointInBounds(0, 0, 0, 0, 10, 10)).toBe(true);
    });
  });

  describe('boundingBoxesIntersect', () => {
    it('should detect intersecting boxes', () => {
      const box1 = { minX: 0, minZ: 0, maxX: 10, maxZ: 10 };
      const box2 = { minX: 5, minZ: 5, maxX: 15, maxZ: 15 };
      const box3 = { minX: 20, minZ: 20, maxX: 30, maxZ: 30 };
      
      expect(boundingBoxesIntersect(box1, box2)).toBe(true);
      expect(boundingBoxesIntersect(box1, box3)).toBe(false);
    });
  });

  describe('clamp', () => {
    it('should clamp values to range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('should interpolate linearly', () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
      expect(lerp(0, 10, 0.5)).toBe(5);
    });
  });

  describe('bilinearInterpolation', () => {
    it('should interpolate bilinearly', () => {
      const result = bilinearInterpolation(
        0.5, 0.5,  // point
        0, 0,      // x0, z0
        1, 1,      // x1, z1
        0, 1, 1, 2 // corner values
      );
      expect(result).toBe(1);
    });
  });

  describe('angle conversions', () => {
    it('should convert degrees to radians', () => {
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
    });

    it('should convert radians to degrees', () => {
      expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
      expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
    });
  });

  describe('angleBetweenPoints', () => {
    it('should calculate angle between points', () => {
      const angle = angleBetweenPoints(0, 0, 1, 0);
      expect(angle).toBe(0);
    });
  });

  describe('normalizeAngle', () => {
    it('should normalize angles to [0, 2π)', () => {
      expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
      expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI);
    });
  });

  describe('SpatialHash', () => {
    it('should insert and query objects', () => {
      const hash = new SpatialHash(10);
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      
      hash.insert(5, 5, obj1);
      hash.insert(15, 15, obj2);
      
      const results = hash.query(5, 5, 5);
      expect(results).toContain(obj1);
    });

    it('should clear all objects', () => {
      const hash = new SpatialHash(10);
      hash.insert(5, 5, { id: 1 });
      hash.clear();
      
      const results = hash.query(5, 5, 5);
      expect(results.length).toBe(0);
    });
  });
});
