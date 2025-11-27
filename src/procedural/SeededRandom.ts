/**
 * Seeded Random Number Generator
 * Provides deterministic random numbers for consistent world generation
 * Uses xorshift algorithm for good distribution and performance
 * Validates: Requirements 1.2, 9.1
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Ensure seed is a positive integer
    this.state = Math.abs(Math.floor(seed)) || 1;
    
    // Warm up the generator to avoid initial patterns
    for (let i = 0; i < 10; i++) {
      this.random();
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
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Get random float in range [min, max]
   */
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  /**
   * Get random element from array
   */
  randomElement<T>(array: T[]): T {
    return array[this.randomInt(0, array.length - 1)];
  }

  /**
   * Get random boolean with given probability
   * @param probability - Probability of returning true (0 to 1)
   */
  randomBool(probability: number = 0.5): boolean {
    return this.random() < probability;
  }

  /**
   * Create child RNG with derived seed
   * Useful for creating independent RNG streams
   */
  derive(offset: number): SeededRandom {
    const derivedSeed = this.state + offset;
    return new SeededRandom(derivedSeed);
  }
}
