/**
 * Tests for NoiseGenerator
 */

import { describe, it, expect } from 'vitest';
import { NoiseGenerator } from './NoiseGenerator';

describe('NoiseGenerator', () => {
  it('should produce deterministic output for same seed', () => {
    const noise1 = new NoiseGenerator(12345);
    const noise2 = new NoiseGenerator(12345);
    
    const value1 = noise1.noise2D(5.5, 10.3);
    const value2 = noise2.noise2D(5.5, 10.3);
    
    expect(value1).toBe(value2);
  });

  it('should produce different output for different seeds', () => {
    const noise1 = new NoiseGenerator(12345);
    const noise2 = new NoiseGenerator(54321);
    
    const value1 = noise1.noise2D(5.5, 10.3);
    const value2 = noise2.noise2D(5.5, 10.3);
    
    expect(value1).not.toBe(value2);
  });

  it('should produce values in range [-1, 1]', () => {
    const noise = new NoiseGenerator(12345);
    
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const value = noise.noise2D(x, y);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('should produce normalized values in range [0, 1]', () => {
    const noise = new NoiseGenerator(12345);
    
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const value = noise.noise2DNormalized(x, y);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('should produce smooth continuous values', () => {
    const noise = new NoiseGenerator(12345);
    
    // Sample nearby points - they should have similar values
    const value1 = noise.noise2D(5.0, 5.0);
    const value2 = noise.noise2D(5.01, 5.0);
    
    const difference = Math.abs(value1 - value2);
    expect(difference).toBeLessThan(0.1); // Should be smooth
  });

  it('should produce octave noise with correct range', () => {
    const noise = new NoiseGenerator(12345);
    
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const value = noise.octaveNoise2D(x, y, 4, 0.5);
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('should produce different values for different coordinates', () => {
    const noise = new NoiseGenerator(12345);
    
    const value1 = noise.noise2D(0.5, 0.5);
    const value2 = noise.noise2D(10.5, 10.5);
    
    expect(value1).not.toBe(value2);
  });
});
