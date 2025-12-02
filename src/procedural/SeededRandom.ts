/**
 * Seeded Random Number Generator
 * Provides deterministic random numbers for consistent world generation
 * Uses xorshift algorithm for good distribution and performance
 * Validates: Requirements 1.2, 9.1
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Validate seed
    if (seed === undefined || seed === null) {
      console.warn('SeededRandom: seed is undefined or null, using default seed 1');
      seed = 1;
    }

    if (!Number.isFinite(seed)) {
      console.warn('SeededRandom: seed is not finite, using default seed 1');
      seed = 1;
    }

    // Handle extreme values
    if (Math.abs(seed) > Number.MAX_SAFE_INTEGER) {
      console.warn('SeededRandom: seed exceeds MAX_SAFE_INTEGER, wrapping');
      seed = seed % Number.MAX_SAFE_INTEGER;
    }

    // Ensure seed is a positive integer
    this.state = Math.abs(Math.floor(seed)) || 1;
    
    // Warm up the generator to avoid initial patterns
    try {
      for (let i = 0; i < 10; i++) {
        this.random();
      }
    } catch (error) {
      console.error('SeededRandom: Error during warmup:', error);
      // Reset to a safe state
      this.state = 1;
    }
  }

  /**
   * Get random float in range [0, 1)
   */
  random(): number {
    // Xorshift algorithm
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    
    // Convert to [0, 1) range
    return ((x >>> 0) / 0x100000000);
  }

  /**
   * Get random integer in range [min, max] (inclusive)
   * @throws Error if min > max or values are not finite
   */
  randomInt(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error(`SeededRandom.randomInt: min and max must be finite (got min=${min}, max=${max})`);
    }

    if (min > max) {
      throw new Error(`SeededRandom.randomInt: min must be <= max (got min=${min}, max=${max})`);
    }

    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Get random float in range [min, max]
   * @throws Error if min > max or values are not finite
   */
  randomFloat(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error(`SeededRandom.randomFloat: min and max must be finite (got min=${min}, max=${max})`);
    }

    if (min > max) {
      throw new Error(`SeededRandom.randomFloat: min must be <= max (got min=${min}, max=${max})`);
    }

    return this.random() * (max - min) + min;
  }

  /**
   * Get random element from array
   * @throws Error if array is empty or null
   */
  randomElement<T>(array: T[]): T {
    if (!array || !Array.isArray(array)) {
      throw new Error('SeededRandom.randomElement: array must be a valid array');
    }

    if (array.length === 0) {
      throw new Error('SeededRandom.randomElement: array cannot be empty');
    }

    return array[this.randomInt(0, array.length - 1)];
  }

  /**
   * Get random boolean with given probability
   * @param probability - Probability of returning true (0 to 1)
   * @throws Error if probability is not in valid range
   */
  randomBool(probability: number = 0.5): boolean {
    if (!Number.isFinite(probability)) {
      throw new Error(`SeededRandom.randomBool: probability must be finite (got ${probability})`);
    }

    if (probability < 0 || probability > 1) {
      throw new Error(`SeededRandom.randomBool: probability must be between 0 and 1 (got ${probability})`);
    }

    return this.random() < probability;
  }

  /**
   * Create child RNG with derived seed
   * Useful for creating independent RNG streams
   * @throws Error if offset is not finite
   */
  derive(offset: number): SeededRandom {
    if (!Number.isFinite(offset)) {
      throw new Error(`SeededRandom.derive: offset must be finite (got ${offset})`);
    }

    const derivedSeed = this.state + offset;
    return new SeededRandom(derivedSeed);
  }
}
