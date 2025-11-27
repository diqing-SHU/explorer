/**
 * Noise Generator
 * Provides Perlin noise for organic variation in procedural generation
 * Validates: Requirements 9.1
 */

export class NoiseGenerator {
  private permutation: number[];
  private p: number[];

  constructor(seed: number) {
    // Initialize permutation table based on seed
    this.permutation = this.generatePermutation(seed);
    
    // Duplicate permutation table to avoid overflow
    this.p = new Array(512);
    for (let i = 0; i < 512; i++) {
      this.p[i] = this.permutation[i % 256];
    }
  }

  /**
   * Generate permutation table from seed
   */
  private generatePermutation(seed: number): number[] {
    const perm = Array.from({ length: 256 }, (_, i) => i);
    
    // Fisher-Yates shuffle with seeded random
    let state = Math.abs(Math.floor(seed)) || 1;
    const seededRandom = () => {
      let x = state;
      x ^= x << 13;
      x ^= x >> 17;
      x ^= x << 5;
      state = x;
      return ((x >>> 0) / 0x100000000);
    };
    
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    
    return perm;
  }

  /**
   * Fade function for smooth interpolation
   */
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * Linear interpolation
   */
  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  /**
   * Gradient function
   */
  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /**
   * Get 2D Perlin noise value in range [-1, 1]
   */
  noise2D(x: number, y: number): number {
    // Find unit square that contains point
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    // Find relative x, y in square
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    // Compute fade curves
    const u = this.fade(x);
    const v = this.fade(y);
    
    // Hash coordinates of square corners
    const a = this.p[X] + Y;
    const aa = this.p[a];
    const ab = this.p[a + 1];
    const b = this.p[X + 1] + Y;
    const ba = this.p[b];
    const bb = this.p[b + 1];
    
    // Blend results from corners
    return this.lerp(
      v,
      this.lerp(u, this.grad(this.p[aa], x, y), this.grad(this.p[ba], x - 1, y)),
      this.lerp(u, this.grad(this.p[ab], x, y - 1), this.grad(this.p[bb], x - 1, y - 1))
    );
  }

  /**
   * Get 2D noise value normalized to range [0, 1]
   */
  noise2DNormalized(x: number, y: number): number {
    return (this.noise2D(x, y) + 1) / 2;
  }

  /**
   * Get octave noise (fractal) for more natural variation
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param octaves - Number of octaves to combine
   * @param persistence - How much each octave contributes (typically 0.5)
   */
  octaveNoise2D(x: number, y: number, octaves: number, persistence: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    
    return total / maxValue;
  }
}
