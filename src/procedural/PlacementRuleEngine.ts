/**
 * PlacementRuleEngine Implementation
 * Validates object placements and enforces spatial constraints
 * Validates: Requirements 10.4, 11.2
 */

import { 
  PlacementRuleEngine as IPlacementRuleEngine, 
  PlacementRule, 
  RuleViolation, 
  GeneratedObject, 
  GenerationContext 
} from './Generator';

/**
 * BoundingBox - Simple axis-aligned bounding box for collision detection
 */
export interface BoundingBox {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
}

/**
 * SpatialHashGrid - Efficient spatial data structure for collision queries
 * Divides space into grid cells for fast broad-phase collision detection
 */
class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, GeneratedObject[]>;

  constructor(cellSize: number = 10) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }



  /**
   * Insert object into spatial hash
   */
  public insert(object: GeneratedObject): void {
    const bbox = this.getBoundingBox(object);
    
    // Insert into all cells the bounding box overlaps
    const minCellX = Math.floor(bbox.minX / this.cellSize);
    const maxCellX = Math.floor(bbox.maxX / this.cellSize);
    const minCellZ = Math.floor(bbox.minZ / this.cellSize);
    const maxCellZ = Math.floor(bbox.maxZ / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const key = `${cx},${cz}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(object);
      }
    }
  }

  /**
   * Query objects near a position
   */
  public queryNear(x: number, z: number, radius: number): GeneratedObject[] {
    const results = new Set<GeneratedObject>();
    
    // Check all cells within radius
    const minCellX = Math.floor((x - radius) / this.cellSize);
    const maxCellX = Math.floor((x + radius) / this.cellSize);
    const minCellZ = Math.floor((z - radius) / this.cellSize);
    const maxCellZ = Math.floor((z + radius) / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const key = `${cx},${cz}`;
        const objects = this.grid.get(key);
        if (objects) {
          objects.forEach(obj => results.add(obj));
        }
      }
    }

    return Array.from(results);
  }

  /**
   * Query objects in a bounding box
   */
  public queryBox(bbox: BoundingBox): GeneratedObject[] {
    const results = new Set<GeneratedObject>();
    
    const minCellX = Math.floor(bbox.minX / this.cellSize);
    const maxCellX = Math.floor(bbox.maxX / this.cellSize);
    const minCellZ = Math.floor(bbox.minZ / this.cellSize);
    const maxCellZ = Math.floor(bbox.maxZ / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const key = `${cx},${cz}`;
        const objects = this.grid.get(key);
        if (objects) {
          objects.forEach(obj => results.add(obj));
        }
      }
    }

    return Array.from(results);
  }

  /**
   * Clear all objects from grid
   */
  public clear(): void {
    this.grid.clear();
  }

  /**
   * Get bounding box for an object
   */
  private getBoundingBox(object: GeneratedObject): BoundingBox {
    const pos = object.position;
    const scale = object.scale;
    
    // Simple box based on position and scale
    const halfWidth = scale.x / 2;
    const halfDepth = scale.z / 2;

    return {
      minX: pos.x - halfWidth,
      maxX: pos.x + halfWidth,
      minZ: pos.z - halfDepth,
      maxZ: pos.z + halfDepth,
      centerX: pos.x,
      centerZ: pos.z,
      width: scale.x,
      depth: scale.z
    };
  }
}

/**
 * PlacementRuleEngine Implementation
 * Validates: Requirements 10.4, 11.2
 */
export class PlacementRuleEngine implements IPlacementRuleEngine {
  private rules: PlacementRule[] = [];
  private spatialHash: SpatialHashGrid;
  private objects: GeneratedObject[] = [];

  constructor(cellSize: number = 10) {
    this.spatialHash = new SpatialHashGrid(cellSize);
  }

  /**
   * Register a placement rule
   * Validates: Requirement 11.2
   */
  public registerRule(rule: PlacementRule): void {
    this.rules.push(rule);
  }

  /**
   * Check if placement is valid
   * Validates: Requirement 10.4
   */
  public isValidPlacement(object: GeneratedObject, context: GenerationContext): boolean {
    const violations = this.getViolations(object, context);
    // Only error violations block placement
    return !violations.some(v => v.severity === 'error');
  }

  /**
   * Get all violations for a placement
   * Validates: Requirement 10.4
   */
  public getViolations(object: GeneratedObject, context: GenerationContext): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const rule of this.rules) {
      // Check if rule applies to this object type
      if (rule.objectTypes.length === 0 || rule.objectTypes.includes(object.type)) {
        const violation = rule.check(object, context);
        if (violation) {
          violations.push(violation);
        }
      }
    }

    return violations;
  }

  /**
   * Add object to spatial hash for collision detection
   */
  public addObject(object: GeneratedObject): void {
    this.objects.push(object);
    this.spatialHash.insert(object);
  }

  /**
   * Get objects near a position
   */
  public getObjectsNear(x: number, z: number, radius: number): GeneratedObject[] {
    return this.spatialHash.queryNear(x, z, radius);
  }

  /**
   * Get objects in a bounding box
   */
  public getObjectsInBox(bbox: BoundingBox): GeneratedObject[] {
    return this.spatialHash.queryBox(bbox);
  }

  /**
   * Check if two bounding boxes intersect
   */
  public static boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return !(a.maxX < b.minX || a.minX > b.maxX || a.maxZ < b.minZ || a.minZ > b.maxZ);
  }

  /**
   * Get bounding box for an object
   */
  public static getBoundingBox(object: GeneratedObject): BoundingBox {
    const pos = object.position;
    const scale = object.scale;
    
    const halfWidth = scale.x / 2;
    const halfDepth = scale.z / 2;

    return {
      minX: pos.x - halfWidth,
      maxX: pos.x + halfWidth,
      minZ: pos.z - halfDepth,
      maxZ: pos.z + halfDepth,
      centerX: pos.x,
      centerZ: pos.z,
      width: scale.x,
      depth: scale.z
    };
  }

  /**
   * Clear all tracked objects
   */
  public clear(): void {
    this.objects = [];
    this.spatialHash.clear();
  }

  /**
   * Get all tracked objects
   */
  public getAllObjects(): GeneratedObject[] {
    return [...this.objects];
  }
}

/**
 * NoRoadOverlap Rule
 * Ensures objects don't overlap with roads
 * Validates: Requirement 10.1
 */
export class NoRoadOverlapRule implements PlacementRule {
  public name = 'NoRoadOverlap';
  public objectTypes: string[];

  constructor(objectTypes: string[] = ['building', 'vehicle', 'sign']) {
    this.objectTypes = objectTypes;
  }

  public check(object: GeneratedObject, context: GenerationContext): RuleViolation | null {
    const bbox = PlacementRuleEngine.getBoundingBox(object);
    const chunk = context.chunk;

    // Check against all roads in chunk
    for (const road of chunk.roads) {
      for (const segment of road.segments) {
        if (this.boxIntersectsRoadSegment(bbox, segment)) {
          return {
            rule: this.name,
            message: `Object at (${object.position.x}, ${object.position.z}) overlaps with road`,
            severity: 'error'
          };
        }
      }
    }

    return null;
  }

  private boxIntersectsRoadSegment(bbox: BoundingBox, segment: any): boolean {
    // Simple line-box intersection test
    const start = segment.start;
    const end = segment.end;
    const width = segment.width;

    // Create bounding box for road segment
    const roadMinX = Math.min(start.x, end.x) - width / 2;
    const roadMaxX = Math.max(start.x, end.x) + width / 2;
    const roadMinZ = Math.min(start.y, end.y) - width / 2;
    const roadMaxZ = Math.max(start.y, end.y) + width / 2;

    // Check box-box intersection
    return !(bbox.maxX < roadMinX || bbox.minX > roadMaxX || 
             bbox.maxZ < roadMinZ || bbox.minZ > roadMaxZ);
  }
}

/**
 * NoObjectCollision Rule
 * Ensures objects don't collide with other objects
 * Validates: Requirement 10.4
 */
export class NoObjectCollisionRule implements PlacementRule {
  public name = 'NoObjectCollision';
  public objectTypes: string[];
  private engine: PlacementRuleEngine;

  constructor(engine: PlacementRuleEngine, objectTypes: string[] = []) {
    this.engine = engine;
    this.objectTypes = objectTypes;
  }

  public check(object: GeneratedObject, _context: GenerationContext): RuleViolation | null {
    const bbox = PlacementRuleEngine.getBoundingBox(object);
    
    // Query nearby objects using spatial hash
    const nearbyObjects = this.engine.getObjectsInBox(bbox);

    for (const other of nearbyObjects) {
      // Don't check against self
      if (other === object) continue;

      // Check if different types (buildings shouldn't collide with vehicles, etc.)
      if (other.type !== object.type) {
        const otherBbox = PlacementRuleEngine.getBoundingBox(other);
        if (PlacementRuleEngine.boxesIntersect(bbox, otherBbox)) {
          return {
            rule: this.name,
            message: `Object at (${object.position.x}, ${object.position.z}) collides with ${other.type}`,
            severity: 'error'
          };
        }
      }
    }

    return null;
  }
}

/**
 * MinimumSpacing Rule
 * Ensures minimum distance between objects of the same type
 * Validates: Requirement 5.5
 */
export class MinimumSpacingRule implements PlacementRule {
  public name = 'MinimumSpacing';
  public objectTypes: string[];
  private engine: PlacementRuleEngine;
  private minDistance: number;

  constructor(engine: PlacementRuleEngine, minDistance: number, objectTypes: string[] = []) {
    this.engine = engine;
    this.minDistance = minDistance;
    this.objectTypes = objectTypes;
  }

  public check(object: GeneratedObject, _context: GenerationContext): RuleViolation | null {
    const pos = object.position;
    
    // Query nearby objects
    const nearbyObjects = this.engine.getObjectsNear(pos.x, pos.z, this.minDistance);

    for (const other of nearbyObjects) {
      // Don't check against self
      if (other === object) continue;

      // Only check same type
      if (other.type === object.type) {
        const dx = pos.x - other.position.x;
        const dz = pos.z - other.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < this.minDistance) {
          return {
            rule: this.name,
            message: `Object at (${pos.x}, ${pos.z}) too close to another ${object.type} (distance: ${distance.toFixed(2)}, minimum: ${this.minDistance})`,
            severity: 'error'
          };
        }
      }
    }

    return null;
  }
}

/**
 * BoundaryIntegrity Rule
 * Ensures objects near chunk boundaries are complete and not duplicated
 * Validates: Requirement 6.4
 * 
 * This rule prevents two common boundary issues:
 * 1. Objects being cut off at chunk boundaries (extending beyond chunk bounds)
 * 2. Objects being duplicated in adjacent chunks (same object generated in multiple chunks)
 * 
 * Usage:
 * ```typescript
 * const engine = new PlacementRuleEngine();
 * const boundaryRule = new BoundaryIntegrityRule(5, ['building', 'vehicle', 'sign']);
 * engine.registerRule(boundaryRule);
 * 
 * // When generating chunks, pass adjacent chunks in the context
 * const context: GenerationContext = {
 *   scene,
 *   chunk,
 *   seed,
 *   chunkSize: 100,
 *   rng,
 *   adjacentChunks: chunkManager.getAdjacentChunks(chunk.x, chunk.z),
 *   placementEngine: engine
 * };
 * ```
 * 
 * The rule uses a deterministic ownership algorithm: objects are owned by the chunk
 * containing their center point. For objects exactly on boundaries, the chunk with
 * lower coordinates owns the object.
 */
export class BoundaryIntegrityRule implements PlacementRule {
  public name = 'BoundaryIntegrity';
  public objectTypes: string[];
  private boundaryMargin: number;

  constructor(boundaryMargin: number = 5, objectTypes: string[] = []) {
    this.boundaryMargin = boundaryMargin;
    this.objectTypes = objectTypes;
  }

  public check(object: GeneratedObject, context: GenerationContext): RuleViolation | null {
    const { chunk, chunkSize, adjacentChunks } = context;
    const pos = object.position;
    const bbox = PlacementRuleEngine.getBoundingBox(object);
    
    // Calculate chunk boundaries
    const chunkMinX = chunk.worldX;
    const chunkMaxX = chunk.worldX + chunkSize;
    const chunkMinZ = chunk.worldZ;
    const chunkMaxZ = chunk.worldZ + chunkSize;
    
    // Check if object extends beyond chunk boundaries (would be cut off)
    // Validates: Requirement 6.4 - objects should not be cut off
    if (bbox.minX < chunkMinX || bbox.maxX > chunkMaxX ||
        bbox.minZ < chunkMinZ || bbox.maxZ > chunkMaxZ) {
      return {
        rule: this.name,
        message: `Object at (${pos.x}, ${pos.z}) extends beyond chunk boundary and would be cut off`,
        severity: 'error'
      };
    }
    
    // Check if object is near a boundary and might be duplicated in adjacent chunks
    // Validates: Requirement 6.4 - prevent duplication across boundaries
    const nearLeftBoundary = pos.x - bbox.width / 2 < chunkMinX + this.boundaryMargin;
    const nearRightBoundary = pos.x + bbox.width / 2 > chunkMaxX - this.boundaryMargin;
    const nearTopBoundary = pos.z - bbox.depth / 2 < chunkMinZ + this.boundaryMargin;
    const nearBottomBoundary = pos.z + bbox.depth / 2 > chunkMaxZ - this.boundaryMargin;
    
    if (nearLeftBoundary || nearRightBoundary || nearTopBoundary || nearBottomBoundary) {
      // Check adjacent chunks for duplicate objects
      for (const adjacentChunk of adjacentChunks) {
        // Get all objects of the same type from adjacent chunk
        const adjacentObjects = this.getObjectsFromChunk(adjacentChunk, object.type);
        
        for (const adjacentObj of adjacentObjects) {
          // Check if this is essentially the same object (very close position)
          const dx = Math.abs(pos.x - adjacentObj.position.x);
          const dz = Math.abs(pos.z - adjacentObj.position.z);
          
          // If objects are extremely close (within 1 unit), consider it a duplicate
          if (dx < 1 && dz < 1) {
            // Determine which chunk should "own" this object based on coordinates
            // Use a deterministic rule: the chunk with lower coordinates owns boundary objects
            const shouldOwnObject = this.shouldChunkOwnBoundaryObject(
              chunk.x, chunk.z,
              adjacentChunk.x, adjacentChunk.z,
              pos.x, pos.z,
              chunkSize
            );
            
            if (!shouldOwnObject) {
              return {
                rule: this.name,
                message: `Object at (${pos.x}, ${pos.z}) would be duplicated in adjacent chunk (${adjacentChunk.x}, ${adjacentChunk.z})`,
                severity: 'error'
              };
            }
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Determine which chunk should own an object near a boundary
   * Uses deterministic rules to prevent duplication
   */
  private shouldChunkOwnBoundaryObject(
    chunkX: number,
    chunkZ: number,
    adjacentChunkX: number,
    adjacentChunkZ: number,
    objectX: number,
    objectZ: number,
    chunkSize: number
  ): boolean {
    // Calculate which chunk the object's center is in
    const objectChunkX = Math.floor(objectX / chunkSize);
    const objectChunkZ = Math.floor(objectZ / chunkSize);
    
    // If object center is in this chunk, this chunk owns it
    if (objectChunkX === chunkX && objectChunkZ === chunkZ) {
      return true;
    }
    
    // If object center is in the adjacent chunk, adjacent chunk owns it
    if (objectChunkX === adjacentChunkX && objectChunkZ === adjacentChunkZ) {
      return false;
    }
    
    // For objects exactly on boundaries, use a deterministic rule:
    // The chunk with lower coordinates owns the object
    if (chunkX < adjacentChunkX) return true;
    if (chunkX > adjacentChunkX) return false;
    if (chunkZ < adjacentChunkZ) return true;
    return false;
  }
  
  /**
   * Get all objects of a specific type from a chunk
   */
  private getObjectsFromChunk(chunk: any, objectType: string): Array<{ position: any }> {
    const objects: Array<{ position: any }> = [];
    
    switch (objectType) {
      case 'building':
        objects.push(...chunk.buildings);
        break;
      case 'vehicle':
        objects.push(...chunk.vehicles);
        break;
      case 'sign':
        objects.push(...chunk.signs);
        break;
      case 'road':
        objects.push(...chunk.roads);
        break;
    }
    
    return objects;
  }
}
