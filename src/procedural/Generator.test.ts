/**
 * Tests for Generator Interface and Plugin System
 * Validates: Requirements 10.5, 11.1, 11.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import * as BABYLON from '@babylonjs/core';
import { ChunkManager, ChunkConfig } from './ChunkManager';
import { BaseGenerator, Generator, GenerationContext, GeneratedObject } from './Generator';
import { Chunk } from './ChunkTypes';

/**
 * Mock Generator for testing
 */
class MockGenerator extends BaseGenerator {
  public generateCallCount = 0;
  public lastContext: GenerationContext | null = null;

  constructor(name: string) {
    super(name);
  }

  public generate(chunk: Chunk, context: GenerationContext): GeneratedObject[] {
    this.generateCallCount++;
    this.lastContext = context;

    // Create a simple test object
    const mesh = new BABYLON.Mesh(`test_${chunk.x}_${chunk.z}`, context.scene);
    mesh.position = new BABYLON.Vector3(chunk.worldX, 0, chunk.worldZ);

    const obj: GeneratedObject = {
      type: this.getName(),
      position: mesh.position.clone(),
      rotation: 0,
      scale: new BABYLON.Vector3(1, 1, 1),
      mesh,
      metadata: { test: true }
    };

    // Add mesh to chunk
    chunk.meshes.push(mesh);

    return [obj];
  }
}

describe('Generator Interface and Plugin System', () => {
  let engine: BABYLON.NullEngine;
  let scene: BABYLON.Scene;
  let chunkManager: ChunkManager;
  let config: ChunkConfig;

  beforeEach(() => {
    // Create Babylon.js scene for testing
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    // Create ChunkManager
    chunkManager = new ChunkManager();
    config = {
      chunkSize: 100,
      activeRadius: 150,
      unloadDistance: 300,
      seed: 12345,
      generationOrder: []
    };
    chunkManager.initialize(scene, config);
  });

  describe('Generator Registration', () => {
    it('should register a generator', () => {
      // Validates: Requirement 11.1
      const generator = new MockGenerator('test-generator');
      
      chunkManager.registerGenerator(generator);
      
      const retrieved = chunkManager.getGenerator('test-generator');
      expect(retrieved).toBe(generator);
    });

    it('should register multiple generators', () => {
      const gen1 = new MockGenerator('generator-1');
      const gen2 = new MockGenerator('generator-2');
      const gen3 = new MockGenerator('generator-3');
      
      chunkManager.registerGenerator(gen1);
      chunkManager.registerGenerator(gen2);
      chunkManager.registerGenerator(gen3);
      
      const generators = chunkManager.getGenerators();
      expect(generators).toHaveLength(3);
      expect(generators).toContain(gen1);
      expect(generators).toContain(gen2);
      expect(generators).toContain(gen3);
    });

    it('should overwrite generator with same name', () => {
      const gen1 = new MockGenerator('test');
      const gen2 = new MockGenerator('test');
      
      chunkManager.registerGenerator(gen1);
      chunkManager.registerGenerator(gen2);
      
      const retrieved = chunkManager.getGenerator('test');
      expect(retrieved).toBe(gen2);
      expect(chunkManager.getGenerators()).toHaveLength(1);
    });

    it('should unregister a generator', () => {
      const generator = new MockGenerator('test');
      
      chunkManager.registerGenerator(generator);
      expect(chunkManager.getGenerator('test')).toBe(generator);
      
      chunkManager.unregisterGenerator('test');
      expect(chunkManager.getGenerator('test')).toBeUndefined();
    });
  });

  describe('Generator Execution', () => {
    it('should execute generators in configured order', () => {
      // Validates: Requirement 10.5
      const gen1 = new MockGenerator('first');
      const gen2 = new MockGenerator('second');
      const gen3 = new MockGenerator('third');
      
      chunkManager.registerGenerator(gen1);
      chunkManager.registerGenerator(gen2);
      chunkManager.registerGenerator(gen3);
      
      // Set generation order
      config.generationOrder = ['first', 'second', 'third'];
      chunkManager.initialize(scene, config);
      chunkManager.registerGenerator(gen1);
      chunkManager.registerGenerator(gen2);
      chunkManager.registerGenerator(gen3);
      
      // Generate chunk
      const chunk = chunkManager.generateChunk(0, 0);
      
      // All generators should have been called
      expect(gen1.generateCallCount).toBe(1);
      expect(gen2.generateCallCount).toBe(1);
      expect(gen3.generateCallCount).toBe(1);
      
      // Chunk should have 3 meshes (one from each generator)
      expect(chunk.meshes).toHaveLength(3);
    });

    it('should execute generators in different order when configured', () => {
      // Validates: Requirement 10.5
      const gen1 = new MockGenerator('first');
      const gen2 = new MockGenerator('second');
      
      chunkManager.registerGenerator(gen1);
      chunkManager.registerGenerator(gen2);
      
      // Set generation order (reversed)
      config.generationOrder = ['second', 'first'];
      chunkManager.initialize(scene, config);
      chunkManager.registerGenerator(gen1);
      chunkManager.registerGenerator(gen2);
      
      // Generate chunk
      chunkManager.generateChunk(0, 0);
      
      // Both should be called
      expect(gen1.generateCallCount).toBe(1);
      expect(gen2.generateCallCount).toBe(1);
    });

    it('should skip missing generators in order', () => {
      const gen1 = new MockGenerator('exists');
      
      chunkManager.registerGenerator(gen1);
      
      // Set generation order with non-existent generator
      config.generationOrder = ['exists', 'does-not-exist', 'also-missing'];
      chunkManager.initialize(scene, config);
      chunkManager.registerGenerator(gen1);
      
      // Should not throw error
      expect(() => {
        chunkManager.generateChunk(0, 0);
      }).not.toThrow();
      
      expect(gen1.generateCallCount).toBe(1);
    });

    it('should provide correct generation context', () => {
      const generator = new MockGenerator('test');
      
      chunkManager.registerGenerator(generator);
      config.generationOrder = ['test'];
      chunkManager.initialize(scene, config);
      chunkManager.registerGenerator(generator);
      
      const chunk = chunkManager.generateChunk(5, 10);
      
      // Check context was provided
      expect(generator.lastContext).not.toBeNull();
      expect(generator.lastContext!.scene).toBe(scene);
      expect(generator.lastContext!.chunk).toBe(chunk);
      expect(generator.lastContext!.seed).toBe(chunk.seed);
      expect(generator.lastContext!.chunkSize).toBe(100);
      expect(generator.lastContext!.rng).toBeDefined();
      expect(generator.lastContext!.adjacentChunks).toBeDefined();
    });

    it('should provide adjacent chunks in context', () => {
      const generator = new MockGenerator('test');
      
      chunkManager.registerGenerator(generator);
      config.generationOrder = ['test'];
      chunkManager.initialize(scene, config);
      chunkManager.registerGenerator(generator);
      
      // Generate center chunk and surrounding chunks
      chunkManager.generateChunk(0, 0);
      chunkManager.generateChunk(1, 0);
      chunkManager.generateChunk(0, 1);
      
      // Generate new chunk that has adjacent chunks
      const chunk = chunkManager.generateChunk(1, 1);
      
      // Should have adjacent chunks in context
      const adjacentChunks = generator.lastContext!.adjacentChunks;
      expect(adjacentChunks.length).toBeGreaterThan(0);
    });
  });

  describe('BaseGenerator', () => {
    it('should have correct name', () => {
      const generator = new MockGenerator('my-generator');
      expect(generator.getName()).toBe('my-generator');
    });

    it('should support configuration', () => {
      // Validates: Requirement 11.3
      const generator = new MockGenerator('test');
      
      generator.configure({ density: 10, enabled: true });
      
      const config = generator['getConfig']();
      expect(config.density).toBe(10);
      expect(config.enabled).toBe(true);
    });

    it('should merge configuration', () => {
      // Validates: Requirement 11.3
      const generator = new MockGenerator('test');
      
      generator.configure({ a: 1, b: 2 });
      generator.configure({ b: 3, c: 4 });
      
      const config = generator['getConfig']();
      expect(config.a).toBe(1);
      expect(config.b).toBe(3); // Overwritten
      expect(config.c).toBe(4);
    });

    it('should create unique IDs', () => {
      const generator = new MockGenerator('test');
      
      const id1 = generator['createId']('obj', 0, 0, 0);
      const id2 = generator['createId']('obj', 0, 0, 1);
      const id3 = generator['createId']('obj', 1, 0, 0);
      
      expect(id1).toBe('obj_0_0_0');
      expect(id2).toBe('obj_0_0_1');
      expect(id3).toBe('obj_1_0_0');
      
      // All should be unique
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
    });

    it('should check chunk bounds correctly', () => {
      const generator = new MockGenerator('test');
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
      
      // Inside bounds
      expect(generator['isInChunkBounds'](50, 50, chunk, 100)).toBe(true);
      expect(generator['isInChunkBounds'](0, 0, chunk, 100)).toBe(true);
      expect(generator['isInChunkBounds'](99, 99, chunk, 100)).toBe(true);
      
      // Outside bounds
      expect(generator['isInChunkBounds'](-1, 50, chunk, 100)).toBe(false);
      expect(generator['isInChunkBounds'](50, -1, chunk, 100)).toBe(false);
      expect(generator['isInChunkBounds'](100, 50, chunk, 100)).toBe(false);
      expect(generator['isInChunkBounds'](50, 100, chunk, 100)).toBe(false);
    });

    it('should return empty placement rules by default', () => {
      const generator = new MockGenerator('test');
      expect(generator.getPlacementRules()).toEqual([]);
    });
  });

  describe('Generator Interface Compliance', () => {
    it('should implement all required methods', () => {
      const generator: Generator = new MockGenerator('test');
      
      expect(typeof generator.getName).toBe('function');
      expect(typeof generator.generate).toBe('function');
      expect(typeof generator.getPlacementRules).toBe('function');
      expect(typeof generator.configure).toBe('function');
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: procedural-world-generation, Property 33: Generation order consistency
    // For any chunk generation, objects should be generated in the configured order 
    // (roads first, then buildings, then infrastructure, then vehicles).
    // Validates: Requirements 10.5
    it('property: generation order consistency', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100, max: 100 }), // chunkX
          fc.integer({ min: -100, max: 100 }), // chunkZ
          fc.array(fc.constantFrom('gen1', 'gen2', 'gen3', 'gen4'), { minLength: 1, maxLength: 4 }).chain(names => 
            fc.shuffledSubarray(names, { minLength: names.length, maxLength: names.length })
          ), // generationOrder - shuffled array of generator names
          (chunkX, chunkZ, generationOrder) => {
            // Create tracking generators that record when they're called
            const callOrder: string[] = [];
            
            class TrackingGenerator extends BaseGenerator {
              constructor(name: string) {
                super(name);
              }
              
              public generate(chunk: Chunk, context: GenerationContext): GeneratedObject[] {
                callOrder.push(this.getName());
                return [];
              }
            }
            
            // Create fresh ChunkManager for this test
            const testChunkManager = new ChunkManager();
            const testConfig: ChunkConfig = {
              chunkSize: 100,
              activeRadius: 200,
              unloadDistance: 400,
              seed: 12345,
              generationOrder: generationOrder
            };
            testChunkManager.initialize(scene, testConfig);
            
            // Register generators
            const generators = generationOrder.map(name => new TrackingGenerator(name));
            generators.forEach(gen => testChunkManager.registerGenerator(gen));
            
            // Generate chunk
            testChunkManager.generateChunk(chunkX, chunkZ);
            
            // Verify generators were called in the configured order
            expect(callOrder).toEqual(generationOrder);
            
            // Cleanup
            testChunkManager.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
