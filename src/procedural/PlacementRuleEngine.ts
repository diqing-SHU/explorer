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
