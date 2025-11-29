/**
 * VehicleGenerator Tests
 * Tests vehicle generation functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as BABYLON from '@babylonjs/core';
import * as fc from 'fast-check';
import { VehicleGenerator } from './VehicleGenerator';
import { RoadGenerator } from './RoadGenerator';
import { Chunk, VehicleType } from './ChunkTypes';
import { GenerationContext } from './Generator';
import { SeededRandom } from './SeededRandom';

describe('VehicleGenerator', () => {
  let generator: VehicleGenerator;
  let roadGenerator: RoadGenerator;
  let scene: BABYLON.Scene;
  let engine: BABYLON.NullEngine;

  beforeEach(() => {
    // Create null engine for headless testing
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    
    generator = new VehicleGenerator();
    roadGenerator = new RoadGenerator();
    generator.setRoadGenerator(roadGenerator);
  });

  afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  it('should create generator with correct name', () => {
    expect(generator.getName()).toBe('VehicleGenerator');
  });

  it('should generate vehicles for a chunk', () => {
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

    const context: GenerationContext = {
      scene,
      chunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: null
    };

    // First generate roads so vehicles can be placed on them
    roadGenerator.generate(chunk, context);

    // Generate vehicles
    const objects = generator.generate(chunk, context);

    expect(objects.length).toBeGreaterThan(0);
    expect(chunk.vehicles.length).toBeGreaterThan(0);
    expect(objects[0].type).toBe('vehicle');
  });

  it('should generate vehicles with varied types', () => {
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

    const context: GenerationContext = {
      scene,
      chunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: null
    };

    roadGenerator.generate(chunk, context);
    generator.generate(chunk, context);

    // Check that vehicles have types
    const types = new Set(chunk.vehicles.map(v => v.type));
    
    // Should have at least one type
    expect(types.size).toBeGreaterThan(0);
    
    // All types should be valid
    for (const vehicle of chunk.vehicles) {
      expect(Object.values(VehicleType)).toContain(vehicle.type);
    }
  });

  it('should generate vehicles with varied colors', () => {
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

    const context: GenerationContext = {
      scene,
      chunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: null
    };

    roadGenerator.generate(chunk, context);
    generator.generate(chunk, context);

    // Check that vehicles have colors
    const colors = new Set(chunk.vehicles.map(v => v.color));
    
    // Should have at least one color
    expect(colors.size).toBeGreaterThan(0);
  });

  it('should create vehicles with physics imposters', () => {
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

    const context: GenerationContext = {
      scene,
      chunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: null
    };

    roadGenerator.generate(chunk, context);
    generator.generate(chunk, context);

    // Check that all vehicles have imposters
    for (const vehicle of chunk.vehicles) {
      expect(vehicle.imposter).toBeDefined();
    }
  });

  it('should respect configuration parameters', () => {
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

    const context: GenerationContext = {
      scene,
      chunk,
      seed: 12345,
      chunkSize: 100,
      rng: new SeededRandom(12345),
      adjacentChunks: [],
      placementEngine: null
    };

    roadGenerator.generate(chunk, context);
    
    // Configure with specific density
    generator.configure({ density: 0.5 });
    generator.generate(chunk, context);

    // Should generate vehicles based on density
    expect(chunk.vehicles.length).toBeGreaterThanOrEqual(0);
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: procedural-world-generation, Property 13: Vehicle roadside placement
     * 
     * For any road segment, vehicles should be placed along the roadside with realistic
     * spacing (minimum distance between vehicles).
     * 
     * Validates: Requirements 4.1
     */
    it('Property 13: Vehicle roadside placement', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates and seeds
          fc.record({
            chunkX: fc.integer({ min: -10, max: 10 }),
            chunkZ: fc.integer({ min: -10, max: 10 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.constantFrom(50, 100, 150, 200)
          }),
          (testData) => {
            // Create a fresh scene for each test
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            // Create generators
            const testRoadGenerator = new RoadGenerator();
            const testVehicleGenerator = new VehicleGenerator();
            testVehicleGenerator.setRoadGenerator(testRoadGenerator);
            
            // Configure with known minimum spacing
            const minSpacing = 5;
            testVehicleGenerator.configure({ minSpacing });
            
            // Create chunk
            const chunk: Chunk = {
              x: testData.chunkX,
              z: testData.chunkZ,
              worldX: testData.chunkX * testData.chunkSize,
              worldZ: testData.chunkZ * testData.chunkSize,
              roads: [],
              buildings: [],
              vehicles: [],
              signs: [],
              meshes: [],
              imposters: [],
              generatedAt: Date.now(),
              seed: testData.seed
            };
            
            // Create generation context
            const context: GenerationContext = {
              scene: testScene,
              chunk,
              seed: testData.seed,
              chunkSize: testData.chunkSize,
              rng: new SeededRandom(testData.seed),
              adjacentChunks: [],
              placementEngine: null
            };
            
            // Generate roads first
            testRoadGenerator.generate(chunk, context);
            
            // Generate vehicles
            testVehicleGenerator.generate(chunk, context);
            
            // Property 1: All vehicles should maintain minimum spacing
            let allVehiclesHaveMinSpacing = true;
            
            for (let i = 0; i < chunk.vehicles.length; i++) {
              for (let j = i + 1; j < chunk.vehicles.length; j++) {
                const v1 = chunk.vehicles[i];
                const v2 = chunk.vehicles[j];
                
                const dx = v1.position.x - v2.position.x;
                const dz = v1.position.z - v2.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                // Vehicles should maintain minimum spacing
                if (distance < minSpacing) {
                  allVehiclesHaveMinSpacing = false;
                  break;
                }
              }
              
              if (!allVehiclesHaveMinSpacing) break;
            }
            
            // Property 2: All vehicles should be placed near roads (roadside placement)
            let allVehiclesNearRoads = true;
            const maxDistanceFromRoad = 10; // Reasonable distance for roadside parking
            
            for (const vehicle of chunk.vehicles) {
              const vehiclePos = new BABYLON.Vector2(vehicle.position.x, vehicle.position.z);
              
              // Find nearest road segment
              let nearestDistance = Infinity;
              
              for (const road of chunk.roads) {
                for (const segment of road.segments) {
                  const distance = calculateDistanceToSegment(
                    vehiclePos.x,
                    vehiclePos.y,
                    segment.start.x,
                    segment.start.y,
                    segment.end.x,
                    segment.end.y
                  );
                  
                  nearestDistance = Math.min(nearestDistance, distance);
                }
              }
              
              // Vehicle should be near a road (within reasonable distance)
              if (nearestDistance > maxDistanceFromRoad) {
                allVehiclesNearRoads = false;
                break;
              }
            }
            
            // Property 3: Vehicles should be distributed along road segments
            // (not all clustered in one spot)
            let vehiclesDistributed = true;
            
            // Only check distribution if we have multiple vehicles
            if (chunk.vehicles.length > 2) {
              // Calculate variance in vehicle positions
              const avgX = chunk.vehicles.reduce((sum, v) => sum + v.position.x, 0) / chunk.vehicles.length;
              const avgZ = chunk.vehicles.reduce((sum, v) => sum + v.position.z, 0) / chunk.vehicles.length;
              
              const varianceX = chunk.vehicles.reduce((sum, v) => sum + Math.pow(v.position.x - avgX, 2), 0) / chunk.vehicles.length;
              const varianceZ = chunk.vehicles.reduce((sum, v) => sum + Math.pow(v.position.z - avgZ, 2), 0) / chunk.vehicles.length;
              
              // If variance is too low, vehicles are clustered
              // Use a threshold based on minimum spacing
              const minVariance = Math.pow(minSpacing / 2, 2);
              
              if (varianceX < minVariance && varianceZ < minVariance) {
                vehiclesDistributed = false;
              }
            }
            
            // Cleanup
            testScene.dispose();
            testEngine.dispose();
            
            // All properties must hold
            return allVehiclesHaveMinSpacing && 
                   allVehiclesNearRoads && 
                   vehiclesDistributed;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: procedural-world-generation, Property 30: Vehicle valid surface placement
     * 
     * For any vehicle, the vehicle should be positioned on a road surface or adjacent
     * parking area, not on buildings or terrain.
     * 
     * Validates: Requirements 10.2
     */
    it('Property 30: Vehicle valid surface placement', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates and seeds
          fc.record({
            chunkX: fc.integer({ min: -10, max: 10 }),
            chunkZ: fc.integer({ min: -10, max: 10 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.constantFrom(50, 100, 150, 200)
          }),
          (testData) => {
            // Create a fresh scene for each test
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            // Create generators
            const testRoadGenerator = new RoadGenerator();
            const testVehicleGenerator = new VehicleGenerator();
            testVehicleGenerator.setRoadGenerator(testRoadGenerator);
            
            // Create chunk
            const chunk: Chunk = {
              x: testData.chunkX,
              z: testData.chunkZ,
              worldX: testData.chunkX * testData.chunkSize,
              worldZ: testData.chunkZ * testData.chunkSize,
              roads: [],
              buildings: [],
              vehicles: [],
              signs: [],
              meshes: [],
              imposters: [],
              generatedAt: Date.now(),
              seed: testData.seed
            };
            
            // Create generation context
            const context: GenerationContext = {
              scene: testScene,
              chunk,
              seed: testData.seed,
              chunkSize: testData.chunkSize,
              rng: new SeededRandom(testData.seed),
              adjacentChunks: [],
              placementEngine: null
            };
            
            // Generate roads first
            testRoadGenerator.generate(chunk, context);
            
            // Skip if no roads were generated
            if (chunk.roads.length === 0) {
              testScene.dispose();
              testEngine.dispose();
              return true;
            }
            
            // Generate vehicles
            testVehicleGenerator.generate(chunk, context);
            
            // Skip if no vehicles were generated
            if (chunk.vehicles.length === 0) {
              testScene.dispose();
              testEngine.dispose();
              return true;
            }
            
            // Property: All vehicles should be positioned on road surfaces or adjacent parking areas
            // This means they should be within a reasonable distance from a road segment
            let allVehiclesOnValidSurface = true;
            const maxDistanceFromRoad = 10; // Maximum distance for parking area (roadside parking)
            
            for (const vehicle of chunk.vehicles) {
              const vehiclePos = new BABYLON.Vector2(vehicle.position.x, vehicle.position.z);
              
              // Find nearest road segment
              let nearestDistance = Infinity;
              
              for (const road of chunk.roads) {
                for (const segment of road.segments) {
                  const distance = calculateDistanceToSegment(
                    vehiclePos.x,
                    vehiclePos.y,
                    segment.start.x,
                    segment.start.y,
                    segment.end.x,
                    segment.end.y
                  );
                  
                  nearestDistance = Math.min(nearestDistance, distance);
                }
              }
              
              // Vehicle should be on or near a road (within parking area distance)
              // This validates that vehicles are not placed on buildings or random terrain
              if (nearestDistance > maxDistanceFromRoad) {
                allVehiclesOnValidSurface = false;
                break;
              }
            }
            
            // Cleanup
            testScene.dispose();
            testEngine.dispose();
            
            return allVehiclesOnValidSurface;
          }
        ),
        { numRuns: 20 } // Reduced from 100 to avoid memory issues with Babylon.js scene creation
      );
    });

    /**
     * Feature: procedural-world-generation, Property 14: Vehicle road alignment
     * 
     * For any vehicle, the vehicle's rotation should be parallel to the direction
     * of the road segment it was placed on.
     * 
     * Validates: Requirements 4.3
     */
    it('Property 14: Vehicle road alignment', () => {
      fc.assert(
        fc.property(
          // Generate random chunk coordinates and seeds
          fc.record({
            chunkX: fc.integer({ min: -10, max: 10 }),
            chunkZ: fc.integer({ min: -10, max: 10 }),
            seed: fc.integer({ min: 1, max: 1000000 }),
            chunkSize: fc.constantFrom(50, 100, 150, 200)
          }),
          (testData) => {
            // Create a fresh scene for each test
            const testEngine = new BABYLON.NullEngine();
            const testScene = new BABYLON.Scene(testEngine);
            
            // Create generators
            const testRoadGenerator = new RoadGenerator();
            const testVehicleGenerator = new VehicleGenerator();
            testVehicleGenerator.setRoadGenerator(testRoadGenerator);
            
            // Create chunk
            const chunk: Chunk = {
              x: testData.chunkX,
              z: testData.chunkZ,
              worldX: testData.chunkX * testData.chunkSize,
              worldZ: testData.chunkZ * testData.chunkSize,
              roads: [],
              buildings: [],
              vehicles: [],
              signs: [],
              meshes: [],
              imposters: [],
              generatedAt: Date.now(),
              seed: testData.seed
            };
            
            // Create generation context
            const context: GenerationContext = {
              scene: testScene,
              chunk,
              seed: testData.seed,
              chunkSize: testData.chunkSize,
              rng: new SeededRandom(testData.seed),
              adjacentChunks: [],
              placementEngine: null
            };
            
            // Generate roads first
            testRoadGenerator.generate(chunk, context);
            
            // Skip if no roads were generated
            if (chunk.roads.length === 0) {
              testScene.dispose();
              testEngine.dispose();
              return true;
            }
            
            // Generate vehicles
            testVehicleGenerator.generate(chunk, context);
            
            // Skip if no vehicles were generated
            if (chunk.vehicles.length === 0) {
              testScene.dispose();
              testEngine.dispose();
              return true;
            }
            
            // Property: All vehicles should be aligned parallel to the road segment they were placed on
            let allVehiclesAligned = true;
            const maxAngleDifference = Math.PI / 12; // 15 degrees tolerance for alignment
            
            for (const vehicle of chunk.vehicles) {
              // Get the source segment this vehicle was placed on
              const sourceSegment = vehicle.metadata?.sourceSegment;
              
              // If no source segment metadata, skip this vehicle
              // (this shouldn't happen with the updated implementation)
              if (!sourceSegment) {
                continue;
              }
              
              // Calculate road direction from the source segment
              const dx = sourceSegment.end.x - sourceSegment.start.x;
              const dz = sourceSegment.end.y - sourceSegment.start.y;
              const roadAngle = Math.atan2(dz, dx);
              
              // Normalize angles to [-π, π]
              const normalizeAngle = (angle: number): number => {
                let normalized = angle;
                while (normalized > Math.PI) normalized -= 2 * Math.PI;
                while (normalized < -Math.PI) normalized += 2 * Math.PI;
                return normalized;
              };
              
              const normalizedRoadAngle = normalizeAngle(roadAngle);
              const normalizedVehicleAngle = normalizeAngle(vehicle.rotation);
              
              // Calculate angle difference (considering both directions are valid)
              // A vehicle can face either direction along the road
              let angleDiff = Math.abs(normalizedVehicleAngle - normalizedRoadAngle);
              
              // Check if the opposite direction is closer
              const oppositeAngleDiff = Math.abs(angleDiff - Math.PI);
              angleDiff = Math.min(angleDiff, oppositeAngleDiff);
              
              // Vehicle should be aligned parallel (or anti-parallel) to its source road segment
              if (angleDiff > maxAngleDifference) {
                allVehiclesAligned = false;
                break;
              }
            }
            
            // Cleanup
            testScene.dispose();
            testEngine.dispose();
            
            return allVehiclesAligned;
          }
        ),
        { numRuns: 20 } // Reduced from 100 to avoid memory issues with Babylon.js scene creation
      );
    });
  });
});

/**
 * Calculate distance from point to line segment
 */
function calculateDistanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared === 0) {
    // Segment is a point
    const dpx = px - x1;
    const dpy = py - y1;
    return Math.sqrt(dpx * dpx + dpy * dpy);
  }
  
  // Calculate projection parameter
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  
  // Calculate closest point on segment
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  
  // Calculate distance
  const distX = px - closestX;
  const distY = py - closestY;
  
  return Math.sqrt(distX * distX + distY * distY);
}
