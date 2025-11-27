/**
 * Tests for SeededRandom
 */

import { describe, it, expect } from 'vitest';
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
});
