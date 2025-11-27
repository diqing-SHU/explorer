/**
 * Generator Interface and Plugin System
 * Defines common interface for all object generators
 * Validates: Requirements 10.5, 11.1, 11.3
 */

import * as BABYLON from '@babylonjs/core';
import { Chunk } from './ChunkTypes';
import { SeededRandom } from './SeededRandom';

/**
 * GenerationContext - Context data passed to generators
 * Contains all information needed for chunk generation
 */
export interface GenerationContext {
  scene: BABYLON.Scene;
  chunk: Chunk;
  seed: number;
  chunkSize: number;
  rng: SeededRandom;          // Seeded random number generator
  adjacentChunks: Chunk[];    // For boundary matching
  placementEngine: PlacementRuleEngine | null;
}

/**
 * GeneratedObject - Result of generation
 * Represents a single object created by a generator
 */
export interface GeneratedObject {
  type: string;               // "road", "building", "vehicle", etc.
  position: BABYLON.Vector3;
  rotation: number;
  scale: BABYLON.Vector3;
  mesh: BABYLON.Mesh;
  imposter?: BABYLON.PhysicsImpostor;
  metadata: any;              // Generator-specific data
}

/**
 * Generator Interface
 * All object generators must implement this interface
 * Validates: Requirement 11.1
 */
export interface Generator {
  /**
   * Get generator name
   * @returns Unique name for this generator
   */
  getName(): string;
  
  /**
   * Generate objects for a chunk
   * Validates: Requirement 10.5
   * 
   * @param chunk - Chunk to generate objects for
   * @param context - Generation context with scene, RNG, etc.
   * @returns Array of generated objects
   */
  generate(chunk: Chunk, context: GenerationContext): GeneratedObject[];
  
  /**
   * Get placement rules for this generator
   * @returns Array of placement rules to enforce
   */
  getPlacementRules(): PlacementRule[];
  
  /**
   * Configure generator with parameters
   * Validates: Requirement 11.3
   * 
   * @param config - Generator-specific configuration
   */
  configure(config: any): void;
}

/**
 * PlacementRuleEngine Interface
 * Validates object placements and enforces spatial constraints
 */
export interface PlacementRuleEngine {
  /**
   * Register a placement rule
   * @param rule - Rule to register
   */
  registerRule(rule: PlacementRule): void;
  
  /**
   * Check if placement is valid
   * @param object - Object to check
   * @param context - Generation context
   * @returns True if placement is valid
   */
  isValidPlacement(object: GeneratedObject, context: GenerationContext): boolean;
  
  /**
   * Get all violations for a placement
   * @param object - Object to check
   * @param context - Generation context
   * @returns Array of rule violations
   */
  getViolations(object: GeneratedObject, context: GenerationContext): RuleViolation[];
}

/**
 * PlacementRule Interface
 * Defines a rule for validating object placement
 */
export interface PlacementRule {
  name: string;
  objectTypes: string[];      // Which object types this rule applies to
  
  /**
   * Check if placement violates rule
   * @param object - Object to check
   * @param context - Generation context
   * @returns Violation if rule is violated, null otherwise
   */
  check(object: GeneratedObject, context: GenerationContext): RuleViolation | null;
}

/**
 * RuleViolation - Represents a placement rule violation
 */
export interface RuleViolation {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * BaseGenerator - Base class with common functionality
 * Provides default implementations for common generator operations
 * Validates: Requirement 11.3
 */
export abstract class BaseGenerator implements Generator {
  protected config: any = {};
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Get generator name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Generate objects for a chunk
   * Must be implemented by subclasses
   */
  public abstract generate(chunk: Chunk, context: GenerationContext): GeneratedObject[];

  /**
   * Get placement rules for this generator
   * Default implementation returns empty array
   * Subclasses can override to provide specific rules
   */
  public getPlacementRules(): PlacementRule[] {
    return [];
  }

  /**
   * Configure generator with parameters
   * Validates: Requirement 11.3
   */
  public configure(config: any): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  protected getConfig(): any {
    return this.config;
  }

  /**
   * Helper: Create a unique ID for generated objects
   */
  protected createId(prefix: string, chunkX: number, chunkZ: number, index: number): string {
    return `${prefix}_${chunkX}_${chunkZ}_${index}`;
  }

  /**
   * Helper: Check if position is within chunk bounds
   */
  protected isInChunkBounds(x: number, z: number, chunk: Chunk, chunkSize: number): boolean {
    return x >= chunk.worldX && 
           x < chunk.worldX + chunkSize && 
           z >= chunk.worldZ && 
           z < chunk.worldZ + chunkSize;
  }
}
