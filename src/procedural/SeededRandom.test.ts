/**
 * Tests for SeededRandom
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { SeededRandom } from './SeededRandom';

describe('SeededRandom', () => {
  it('should produce deterministic output for same seed', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);
    
    const values1 = Array.from({ length: 10 }, () => rng1.random());
    const values2 = Array.from({ length: 10 }, () => rng2.random());
    
    expect(values1).toEqual(values2);
  });

  it('should produce different output for different seeds', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(54321);
    
    const values1 = Array.from({ length: 10 }, () => rng1.random());
    const values2 = Array.from({ length: 10 }, () => rng2.random());
    
    expect(values1).not.toEqual(values2);
  });

  it('should produce values in range [0, 1)', () => {
    const rng = new SeededRandom(12345);
    
    for (let i = 0; i < 100; i++) {
      const value = rng.random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('should produce integers in specified range', () => {
    const rng = new SeededRandom(12345);
    
    for (let i = 0; i < 100; i++) {
      const value = rng.randomInt(5, 10);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(10);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('should produce floats in specified range', () => {
    const rng = new SeededRandom(12345);
    
    for (let i = 0; i < 100; i++) {
      const value = rng.randomFloat(5.0, 10.0);
      expect(value).toBeGreaterThanOrEqual(5.0);
      expect(value).toBeLessThanOrEqual(10.0);
    }
  });

  it('should select random element from array', () => {
    const rng = new SeededRandom(12345);
    const array = ['a', 'b', 'c', 'd', 'e'];
    
    for (let i = 0; i < 20; i++) {
      const element = rng.randomElement(array);
      expect(array).toContain(element);
    }
  });

  it('should produce boolean with correct probability', () => {
    const rng = new SeededRandom(12345);
    let trueCount = 0;
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
      if (rng.randomBool(0.7)) {
        trueCount++;
      }
    }
    
    // Should be roughly 70% true (allow 10% margin)
    const ratio = trueCount / iterations;
    expect(ratio).toBeGreaterThan(0.6);
    expect(ratio).toBeLessThan(0.8);
  });

  it('should create independent derived RNGs', () => {
    const rng = new SeededRandom(12345);
    const derived1 = rng.derive(100);
    const derived2 = rng.derive(200);
    
    const values1 = Array.from({ length: 10 }, () => derived1.random());
    const values2 = Array.from({ length: 10 }, () => derived2.random());
    
    expect(values1).not.toEqual(values2);
  });

  // Feature: procedural-world-generation, Property 2: Deterministic generation consistency
  // For any chunk coordinates and world seed, generating that chunk multiple times should produce 
  // identical terrain, roads, buildings, and objects in the same positions with the same properties.
  // Validates: Requirements 1.2
  it('property: deterministic generation consistency', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }), // seed
        fc.nat({ max: 100 }), // number of values to generate
        (seed, count) => {
          // Create two RNGs with the same seed
          const rng1 = new SeededRandom(seed);
          const rng2 = new SeededRandom(seed);
          
          // Generate sequences of random values
          const sequence1 = Array.from({ length: count }, () => rng1.random());
          const sequence2 = Array.from({ length: count }, () => rng2.random());
          
          // Both sequences should be identical
          expect(sequence1).toEqual(sequence2);
          
          // Also test other methods for consistency
          const rng3 = new SeededRandom(seed);
          const rng4 = new SeededRandom(seed);
          
          const ints1 = Array.from({ length: Math.min(count, 20) }, () => rng3.randomInt(0, 100));
          const ints2 = Array.from({ length: Math.min(count, 20) }, () => rng4.randomInt(0, 100));
          expect(ints1).toEqual(ints2);
          
          const rng5 = new SeededRandom(seed);
          const rng6 = new SeededRandom(seed);
          
          const floats1 = Array.from({ length: Math.min(count, 20) }, () => rng5.randomFloat(0, 100));
          const floats2 = Array.from({ length: Math.min(count, 20) }, () => rng6.randomFloat(0, 100));
          expect(floats1).toEqual(floats2);
          
          const rng7 = new SeededRandom(seed);
          const rng8 = new SeededRandom(seed);
          
          const bools1 = Array.from({ length: Math.min(count, 20) }, () => rng7.randomBool(0.5));
          const bools2 = Array.from({ length: Math.min(count, 20) }, () => rng8.randomBool(0.5));
          expect(bools1).toEqual(bools2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
