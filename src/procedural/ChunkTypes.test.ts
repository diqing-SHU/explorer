/**
 * Tests for Chunk Data Structures and Coordinate System
 * Validates: Requirements 1.1, 1.4
 */

import { describe, it, expect } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import {
  worldToChunk,
  chunkToWorld,
  getChunkKey,
  parseChunkKey,
  distance2D,
  distanceToChunk,
  getChunksInRadius
} from './SpatialUtils';
import type { Chunk, RoadSegment, Building, Vehicle, TrafficSign } from './ChunkTypes';
import { VehicleType, SignType } from './ChunkTypes';

describe('Chunk Coordinate System', () => {
  const CHUNK_SIZE = 100;

  describe('worldToChunk', () => {
    it('should convert world position to chunk coordinates', () => {
      expect(worldToChunk(0, 0, CHUNK_SIZE)).toEqual({ x: 0, z: 0 });
      expect(worldToChunk(50, 50, CHUNK_SIZE)).toEqual({ x: 0, z: 0 });
      expect(worldToChunk(100, 100, CHUNK_SIZE)).toEqual({ x: 1, z: 1 });
      expect(worldToChunk(250, 350, CHUNK_SIZE)).toEqual({ x: 2, z: 3 });
    });

    it('should handle negative coordinates', () => {
      expect(worldToChunk(-50, -50, CHUNK_SIZE)).toEqual({ x: -1, z: -1 });
      expect(worldToChunk(-100, -100, CHUNK_SIZE)).toEqual({ x: -1, z: -1 });
      expect(worldToChunk(-101, -101, CHUNK_SIZE)).toEqual({ x: -2, z: -2 });
    });
  });

  describe('chunkToWorld', () => {
    it('should convert chunk coordinates to world position', () => {
      expect(chunkToWorld(0, 0, CHUNK_SIZE)).toEqual({ x: 0, z: 0 });
      expect(chunkToWorld(1, 1, CHUNK_SIZE)).toEqual({ x: 100, z: 100 });
      expect(chunkToWorld(2, 3, CHUNK_SIZE)).toEqual({ x: 200, z: 300 });
    });

    it('should handle negative chunk coordinates', () => {
      expect(chunkToWorld(-1, -1, CHUNK_SIZE)).toEqual({ x: -100, z: -100 });
      expect(chunkToWorld(-2, -3, CHUNK_SIZE)).toEqual({ x: -200, z: -300 });
    });
  });

  describe('getChunkKey', () => {
    it('should generate unique keys for chunk coordinates', () => {
      expect(getChunkKey(0, 0)).toBe('0,0');
      expect(getChunkKey(1, 2)).toBe('1,2');
      expect(getChunkKey(-1, -2)).toBe('-1,-2');
    });

    it('should generate different keys for different coordinates', () => {
      const key1 = getChunkKey(0, 0);
      const key2 = getChunkKey(0, 1);
      const key3 = getChunkKey(1, 0);
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });
  });

  describe('parseChunkKey', () => {
    it('should parse chunk key back to coordinates', () => {
      expect(parseChunkKey('0,0')).toEqual({ x: 0, z: 0 });
      expect(parseChunkKey('1,2')).toEqual({ x: 1, z: 2 });
      expect(parseChunkKey('-1,-2')).toEqual({ x: -1, z: -2 });
    });

    it('should round-trip with getChunkKey', () => {
      const coords = { x: 5, z: 10 };
      const key = getChunkKey(coords.x, coords.z);
      const parsed = parseChunkKey(key);
      
      expect(parsed).toEqual(coords);
    });
  });

  describe('distance2D', () => {
    it('should calculate distance between two points', () => {
      expect(distance2D(0, 0, 0, 0)).toBe(0);
      expect(distance2D(0, 0, 3, 4)).toBe(5);
      expect(distance2D(0, 0, 10, 0)).toBe(10);
    });

    it('should be symmetric', () => {
      const d1 = distance2D(1, 2, 5, 7);
      const d2 = distance2D(5, 7, 1, 2);
      
      expect(d1).toBe(d2);
    });
  });

  describe('distanceToChunk', () => {
    it('should calculate distance from point to chunk center', () => {
      // Point at origin, chunk at origin
      const dist1 = distanceToChunk(0, 0, 0, 0, CHUNK_SIZE);
      expect(dist1).toBe(50 * Math.sqrt(2)); // Distance to center (50, 50)
      
      // Point at chunk center
      const dist2 = distanceToChunk(50, 50, 0, 0, CHUNK_SIZE);
      expect(dist2).toBe(0);
    });

    it('should calculate distance to adjacent chunks', () => {
      const dist = distanceToChunk(50, 50, 1, 0, CHUNK_SIZE);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(200);
    });
  });

  describe('getChunksInRadius', () => {
    it('should return chunks within radius', () => {
      const chunks = getChunksInRadius(0, 0, 1);
      
      expect(chunks).toHaveLength(9); // 3x3 grid
      expect(chunks).toContainEqual({ x: 0, z: 0 });
      expect(chunks).toContainEqual({ x: -1, z: -1 });
      expect(chunks).toContainEqual({ x: 1, z: 1 });
    });

    it('should return single chunk for radius 0', () => {
      const chunks = getChunksInRadius(5, 5, 0);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual({ x: 5, z: 5 });
    });

    it('should return correct count for larger radius', () => {
      const chunks = getChunksInRadius(0, 0, 2);
      
      expect(chunks).toHaveLength(25); // 5x5 grid
    });
  });
});

describe('Chunk Data Structure', () => {
  it('should create a valid chunk with all required fields', () => {
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

    expect(chunk.x).toBe(0);
    expect(chunk.z).toBe(0);
    expect(chunk.worldX).toBe(0);
    expect(chunk.worldZ).toBe(0);
    expect(chunk.roads).toEqual([]);
    expect(chunk.buildings).toEqual([]);
    expect(chunk.vehicles).toEqual([]);
    expect(chunk.signs).toEqual([]);
    expect(chunk.seed).toBe(12345);
  });

  it('should create a chunk with generated content', () => {
    const roadSegment: RoadSegment = {
      start: new BABYLON.Vector2(0, 0),
      end: new BABYLON.Vector2(100, 0),
      width: 10,
      type: 'main',
      lanes: 2
    };

    const chunk: Chunk = {
      x: 1,
      z: 1,
      worldX: 100,
      worldZ: 100,
      roads: [{
        id: 'road-1',
        segments: [roadSegment],
        intersections: [],
        mesh: {} as BABYLON.Mesh,
        imposter: {} as BABYLON.PhysicsImpostor
      }],
      buildings: [],
      vehicles: [],
      signs: [],
      meshes: [],
      imposters: [],
      generatedAt: Date.now(),
      seed: 12345
    };

    expect(chunk.roads).toHaveLength(1);
    expect(chunk.roads[0].segments).toHaveLength(1);
    expect(chunk.roads[0].segments[0].type).toBe('main');
  });
});

describe('Vehicle and Sign Types', () => {
  it('should have valid vehicle types', () => {
    expect(VehicleType.Sedan).toBe('sedan');
    expect(VehicleType.SUV).toBe('suv');
    expect(VehicleType.Truck).toBe('truck');
    expect(VehicleType.Van).toBe('van');
    expect(VehicleType.Compact).toBe('compact');
  });

  it('should have valid sign types', () => {
    expect(SignType.StopSign).toBe('stop');
    expect(SignType.TrafficLight).toBe('traffic_light');
    expect(SignType.SpeedLimit).toBe('speed_limit');
    expect(SignType.StreetName).toBe('street_name');
    expect(SignType.Directional).toBe('directional');
    expect(SignType.Yield).toBe('yield');
    expect(SignType.NoPark).toBe('no_park');
  });
});
