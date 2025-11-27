/**
 * RoadGenerator Implementation
 * Generates road networks with lanes, markings, and intersections
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

import * as BABYLON from '@babylonjs/core';
import { BaseGenerator, GenerationContext, GeneratedObject } from './Generator';
import { Chunk, Road, RoadSegment, Intersection } from './ChunkTypes';
import { SeededRandom } from './SeededRandom';

/**
 * Lane Marking - Visual markings on roads
 */
export interface LaneMarking {
  type: 'center' | 'edge' | 'crosswalk';
  positions: BABYLON.Vector2[];
  color: string;
}

/**
 * Road Generator Configuration
 */
export interface RoadGeneratorConfig {
  // Grid configuration
  gridSpacing: number;        // Distance between grid roads (default: 50)
  mainRoadWidth: number;      // Width of main roads (default: 12)
  sideRoadWidth: number;      // Width of side roads (default: 8)
  
  // Road generation
  mainRoadProbability: number;  // Probability of main road vs side road (default: 0.3)
  sideRoadDensity: number;      // Number of side roads per chunk (default: 2)
  
  // Lane markings
  centerLineWidth: number;      // Width of center line (default: 0.2)
  edgeLineWidth: number;        // Width of edge line (default: 0.15)
  crosswalkWidth: number;       // Width of crosswalk (default: 3)
  dashLength: number;           // Length of dashed line segments (default: 2)
  dashGap: number;              // Gap between dashed segments (default: 2)
}

/**
 * RoadGenerator - Generates road networks for chunks
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
export class RoadGenerator extends BaseGenerator {
  private roadConfig: RoadGeneratorConfig;

  constructor() {
    super('RoadGenerator');
    
    // Default configuration
    this.roadConfig = {
      gridSpacing: 50,
      mainRoadWidth: 12,
      sideRoadWidth: 8,
      mainRoadProbability: 0.3,
      sideRoadDensity: 2,
      centerLineWidth: 0.2,
      edgeLineWidth: 0.15,
      crosswalkWidth: 3,
      dashLength: 2,
      dashGap: 2
    };
  }

  /**
   * Configure generator
   */
  public configure(config: Partial<RoadGeneratorConfig>): void {
    this.roadConfig = { ...this.roadConfig, ...config };
  }

  /**
   * Generate road network for chunk
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   */
  public generate(chunk: Chunk, context: GenerationContext): GeneratedObject[] {
    const segments: RoadSegment[] = [];
    const intersections: Intersection[] = [];

    // Generate grid-based roads
    // Main roads run along chunk boundaries for seamless connection (Requirement 2.4)
    this.generateGridRoads(chunk, context, segments);

    // Detect intersections where roads cross (Requirement 2.2)
    this.detectIntersections(segments, intersections);

    // Create road meshes with lane markings (Requirement 2.3)
    const roadMeshes = this.createRoadMeshes(chunk, segments, context);
    const markingMeshes = this.createLaneMarkings(chunk, segments, intersections, context);

    // Store road data in chunk
    const road: Road = {
      id: this.createId('road', chunk.x, chunk.z, 0),
      segments,
      intersections,
      mesh: roadMeshes,
      imposter: this.createPhysicsImposter(roadMeshes, context)
    };

    chunk.roads.push(road);
    chunk.meshes.push(roadMeshes, ...markingMeshes);
    chunk.imposters.push(road.imposter);

    // Return generated objects
    const objects: GeneratedObject[] = [];
    
    // Main road object
    objects.push({
      type: 'road',
      position: new BABYLON.Vector3(chunk.worldX + context.chunkSize / 2, 0, chunk.worldZ + context.chunkSize / 2),
      rotation: 0,
      scale: new BABYLON.Vector3(context.chunkSize, 1, context.chunkSize),
      mesh: roadMeshes,
      imposter: road.imposter,
      metadata: { road, segments, intersections }
    });

    return objects;
  }

  /**
   * Generate grid-based road network using world-space grid algorithm
   * Validates: Requirements 2.1, 2.4, 2.5
   * 
   * This uses a global grid that spans the entire world, ensuring that roads
   * at chunk boundaries match perfectly between adjacent chunks.
   */
  private generateGridRoads(
    chunk: Chunk,
    context: GenerationContext,
    segments: RoadSegment[]
  ): void {
    const { chunkSize, rng, seed } = context;
    const { gridSpacing, mainRoadWidth, sideRoadWidth, mainRoadProbability, sideRoadDensity } = this.roadConfig;

    // Calculate chunk bounds in world space
    const minWorldX = chunk.worldX;
    const maxWorldX = chunk.worldX + chunkSize;
    const minWorldZ = chunk.worldZ;
    const maxWorldZ = chunk.worldZ + chunkSize;

    // WORLD-SPACE GRID ALGORITHM:
    // Instead of generating roads at chunk-local positions, we find which
    // global grid lines pass through this chunk. This ensures that adjacent
    // chunks generate the same roads at their boundaries.

    // Find horizontal roads (running east-west) that intersect this chunk
    // These are at world Z coordinates: ..., -gridSpacing, 0, gridSpacing, 2*gridSpacing, ...
    const firstHorizontalRoad = Math.floor(minWorldZ / gridSpacing) * gridSpacing;
    const lastHorizontalRoad = Math.ceil(maxWorldZ / gridSpacing) * gridSpacing;
    
    for (let worldZ = firstHorizontalRoad; worldZ <= lastHorizontalRoad; worldZ += gridSpacing) {
      // Only generate if this road actually passes through the chunk
      if (worldZ >= minWorldZ && worldZ <= maxWorldZ) {
        // Use world position to seed RNG for consistent properties across chunks
        const roadSeed = seed + worldZ * 1000000;
        const roadRng = new SeededRandom(roadSeed);
        
        const isMainRoad = roadRng.random() < mainRoadProbability;
        const width = isMainRoad ? mainRoadWidth : sideRoadWidth;
        const type: 'main' | 'side' = isMainRoad ? 'main' : 'side';
        
        segments.push({
          start: new BABYLON.Vector2(minWorldX, worldZ),
          end: new BABYLON.Vector2(maxWorldX, worldZ),
          width,
          type,
          lanes: isMainRoad ? 4 : 2
        });
      }
    }

    // Find vertical roads (running north-south) that intersect this chunk
    // These are at world X coordinates: ..., -gridSpacing, 0, gridSpacing, 2*gridSpacing, ...
    const firstVerticalRoad = Math.floor(minWorldX / gridSpacing) * gridSpacing;
    const lastVerticalRoad = Math.ceil(maxWorldX / gridSpacing) * gridSpacing;
    
    for (let worldX = firstVerticalRoad; worldX <= lastVerticalRoad; worldX += gridSpacing) {
      // Only generate if this road actually passes through the chunk
      if (worldX >= minWorldX && worldX <= maxWorldX) {
        // Use world position to seed RNG for consistent properties across chunks
        // Use different multiplier than horizontal roads to avoid seed collisions
        const roadSeed = seed + worldX * 1000001;
        const roadRng = new SeededRandom(roadSeed);
        
        const isMainRoad = roadRng.random() < mainRoadProbability;
        const width = isMainRoad ? mainRoadWidth : sideRoadWidth;
        const type: 'main' | 'side' = isMainRoad ? 'main' : 'side';
        
        segments.push({
          start: new BABYLON.Vector2(worldX, minWorldZ),
          end: new BABYLON.Vector2(worldX, maxWorldZ),
          width,
          type,
          lanes: isMainRoad ? 4 : 2
        });
      }
    }

    // Add some additional side roads for variety (Requirement 2.5)
    // These are chunk-specific and don't need to match across boundaries
    // Use chunk's RNG for variety within each chunk
    for (let i = 0; i < sideRoadDensity; i++) {
      const isHorizontal = rng.random() < 0.5;
      
      if (isHorizontal) {
        // Place between grid lines to avoid overlapping with grid roads
        const z = rng.randomFloat(gridSpacing / 2, chunkSize - gridSpacing / 2);
        segments.push({
          start: new BABYLON.Vector2(minWorldX, minWorldZ + z),
          end: new BABYLON.Vector2(maxWorldX, minWorldZ + z),
          width: sideRoadWidth,
          type: 'side',
          lanes: 2
        });
      } else {
        const x = rng.randomFloat(gridSpacing / 2, chunkSize - gridSpacing / 2);
        segments.push({
          start: new BABYLON.Vector2(minWorldX + x, minWorldZ),
          end: new BABYLON.Vector2(minWorldX + x, maxWorldZ),
          width: sideRoadWidth,
          type: 'side',
          lanes: 2
        });
      }
    }
  }

  /**
   * Detect intersections where roads cross
   * Validates: Requirement 2.2
   */
  private detectIntersections(
    segments: RoadSegment[],
    intersections: Intersection[]
  ): void {
    // Check all pairs of segments for intersections
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const seg1 = segments[i];
        const seg2 = segments[j];

        // Check if segments are perpendicular (one horizontal, one vertical)
        const seg1Horizontal = Math.abs(seg1.start.y - seg1.end.y) < 0.1;
        const seg2Horizontal = Math.abs(seg2.start.y - seg2.end.y) < 0.1;

        if (seg1Horizontal !== seg2Horizontal) {
          // Find intersection point
          const intersection = this.findIntersectionPoint(seg1, seg2);
          
          if (intersection) {
            // Determine intersection type
            const type = this.determineIntersectionType(seg1, seg2);
            
            intersections.push({
              position: intersection,
              roads: [`seg${i}`, `seg${j}`],
              type
            });
          }
        }
      }
    }
  }

  /**
   * Find intersection point between two road segments
   */
  private findIntersectionPoint(
    seg1: RoadSegment,
    seg2: RoadSegment
  ): BABYLON.Vector2 | null {
    // Determine which segment is horizontal and which is vertical
    const seg1Horizontal = Math.abs(seg1.start.y - seg1.end.y) < 0.1;
    
    let hSeg: RoadSegment, vSeg: RoadSegment;
    if (seg1Horizontal) {
      hSeg = seg1;
      vSeg = seg2;
    } else {
      hSeg = seg2;
      vSeg = seg1;
    }

    // Horizontal segment: constant y (z in our case)
    const hZ = hSeg.start.y;
    const hMinX = Math.min(hSeg.start.x, hSeg.end.x);
    const hMaxX = Math.max(hSeg.start.x, hSeg.end.x);

    // Vertical segment: constant x
    const vX = vSeg.start.x;
    const vMinZ = Math.min(vSeg.start.y, vSeg.end.y);
    const vMaxZ = Math.max(vSeg.start.y, vSeg.end.y);

    // Check if they intersect
    if (vX >= hMinX && vX <= hMaxX && hZ >= vMinZ && hZ <= vMaxZ) {
      return new BABYLON.Vector2(vX, hZ);
    }

    return null;
  }

  /**
   * Determine intersection type based on road configuration
   */
  private determineIntersectionType(
    _seg1: RoadSegment,
    _seg2: RoadSegment
  ): 'cross' | 't' | 'corner' {
    // For now, all intersections are cross intersections
    // Could be enhanced to detect T-intersections and corners
    return 'cross';
  }

  /**
   * Create road meshes
   */
  private createRoadMeshes(
    chunk: Chunk,
    segments: RoadSegment[],
    context: GenerationContext
  ): BABYLON.Mesh {
    const { scene } = context;
    
    // Create a merged mesh for all road segments
    const roadMesh = new BABYLON.Mesh(`road_${chunk.x}_${chunk.z}`, scene);
    const vertexData = new BABYLON.VertexData();

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    let vertexOffset = 0;

    // Create geometry for each road segment
    for (const segment of segments) {
      const start = segment.start;
      const end = segment.end;
      const width = segment.width;

      // Calculate perpendicular offset for road width
      const dx = end.x - start.x;
      const dz = end.y - start.y;
      const length = Math.sqrt(dx * dx + dz * dz);
      const perpX = -dz / length * width / 2;
      const perpZ = dx / length * width / 2;

      // Create quad for road segment
      const v0 = [start.x + perpX, 0.01, start.y + perpZ];
      const v1 = [start.x - perpX, 0.01, start.y - perpZ];
      const v2 = [end.x - perpX, 0.01, end.y - perpZ];
      const v3 = [end.x + perpX, 0.01, end.y + perpZ];

      positions.push(...v0, ...v1, ...v2, ...v3);

      // Normals (pointing up)
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);

      // UVs for texture mapping
      const uvLength = length / width; // Aspect ratio
      uvs.push(0, 0, 1, 0, 1, uvLength, 0, uvLength);

      // Indices for two triangles
      indices.push(
        vertexOffset, vertexOffset + 1, vertexOffset + 2,
        vertexOffset, vertexOffset + 2, vertexOffset + 3
      );

      vertexOffset += 4;
    }

    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;

    vertexData.applyToMesh(roadMesh);

    // Create material
    const material = new BABYLON.StandardMaterial(`roadMaterial_${chunk.x}_${chunk.z}`, scene);
    material.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Dark gray
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    roadMesh.material = material;

    return roadMesh;
  }

  /**
   * Create lane marking meshes
   * Validates: Requirement 2.3
   */
  private createLaneMarkings(
    chunk: Chunk,
    segments: RoadSegment[],
    intersections: Intersection[],
    context: GenerationContext
  ): BABYLON.Mesh[] {
    const meshes: BABYLON.Mesh[] = [];
    const { scene } = context;

    // Create center lines and edge lines for each segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Center line (dashed for most roads)
      const centerLineMesh = this.createCenterLine(segment, i, chunk, scene);
      if (centerLineMesh) {
        meshes.push(centerLineMesh);
      }

      // Edge lines (solid)
      const edgeLineMeshes = this.createEdgeLines(segment, i, chunk, scene);
      meshes.push(...edgeLineMeshes);
    }

    // Create crosswalks at intersections
    for (let i = 0; i < intersections.length; i++) {
      const crosswalkMeshes = this.createCrosswalk(intersections[i], i, chunk, scene);
      meshes.push(...crosswalkMeshes);
    }

    return meshes;
  }

  /**
   * Create center line marking
   */
  private createCenterLine(
    segment: RoadSegment,
    index: number,
    chunk: Chunk,
    scene: BABYLON.Scene
  ): BABYLON.Mesh | null {
    const { centerLineWidth, dashLength, dashGap } = this.roadConfig;
    
    const start = segment.start;
    const end = segment.end;
    const dx = end.x - start.x;
    const dz = end.y - start.y;
    const length = Math.sqrt(dx * dx + dz * dz);

    // Create dashed line
    const mesh = new BABYLON.Mesh(`centerLine_${chunk.x}_${chunk.z}_${index}`, scene);
    const vertexData = new BABYLON.VertexData();

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];

    let currentDist = 0;
    let vertexOffset = 0;
    const dashCycle = dashLength + dashGap;

    while (currentDist < length) {
      const dashStart = currentDist;
      const dashEnd = Math.min(currentDist + dashLength, length);

      const t0 = dashStart / length;
      const t1 = dashEnd / length;

      const x0 = start.x + dx * t0;
      const z0 = start.y + dz * t0;
      const x1 = start.x + dx * t1;
      const z1 = start.y + dz * t1;

      // Perpendicular offset
      const perpX = -dz / length * centerLineWidth / 2;
      const perpZ = dx / length * centerLineWidth / 2;

      // Create quad for dash
      positions.push(
        x0 + perpX, 0.02, z0 + perpZ,
        x0 - perpX, 0.02, z0 - perpZ,
        x1 - perpX, 0.02, z1 - perpZ,
        x1 + perpX, 0.02, z1 + perpZ
      );

      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);

      indices.push(
        vertexOffset, vertexOffset + 1, vertexOffset + 2,
        vertexOffset, vertexOffset + 2, vertexOffset + 3
      );

      vertexOffset += 4;
      currentDist += dashCycle;
    }

    if (positions.length === 0) return null;

    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.applyToMesh(mesh);

    // Yellow material
    const material = new BABYLON.StandardMaterial(`centerLineMaterial_${chunk.x}_${chunk.z}_${index}`, scene);
    material.diffuseColor = new BABYLON.Color3(1, 1, 0);
    material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0);
    mesh.material = material;

    return mesh;
  }

  /**
   * Create edge line markings
   */
  private createEdgeLines(
    segment: RoadSegment,
    index: number,
    chunk: Chunk,
    scene: BABYLON.Scene
  ): BABYLON.Mesh[] {
    const { edgeLineWidth } = this.roadConfig;
    const meshes: BABYLON.Mesh[] = [];

    const start = segment.start;
    const end = segment.end;
    const width = segment.width;
    const dx = end.x - start.x;
    const dz = end.y - start.y;
    const length = Math.sqrt(dx * dx + dz * dz);

    // Perpendicular offset for edge lines
    const perpX = -dz / length * width / 2;
    const perpZ = dx / length * width / 2;

    // Create two edge lines (left and right)
    for (let side = 0; side < 2; side++) {
      const mesh = new BABYLON.Mesh(`edgeLine_${chunk.x}_${chunk.z}_${index}_${side}`, scene);
      const vertexData = new BABYLON.VertexData();

      const sign = side === 0 ? 1 : -1;
      const offsetX = perpX * sign;
      const offsetZ = perpZ * sign;

      // Line perpendicular to edge
      const linePerpX = -dz / length * edgeLineWidth / 2;
      const linePerpZ = dx / length * edgeLineWidth / 2;

      const positions = [
        start.x + offsetX + linePerpX, 0.02, start.y + offsetZ + linePerpZ,
        start.x + offsetX - linePerpX, 0.02, start.y + offsetZ - linePerpZ,
        end.x + offsetX - linePerpX, 0.02, end.y + offsetZ - linePerpZ,
        end.x + offsetX + linePerpX, 0.02, end.y + offsetZ + linePerpZ
      ];

      const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
      const indices = [0, 1, 2, 0, 2, 3];

      vertexData.positions = positions;
      vertexData.indices = indices;
      vertexData.normals = normals;
      vertexData.applyToMesh(mesh);

      // White material
      const material = new BABYLON.StandardMaterial(`edgeLineMaterial_${chunk.x}_${chunk.z}_${index}_${side}`, scene);
      material.diffuseColor = new BABYLON.Color3(1, 1, 1);
      material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
      mesh.material = material;

      meshes.push(mesh);
    }

    return meshes;
  }

  /**
   * Create crosswalk at intersection
   */
  private createCrosswalk(
    intersection: Intersection,
    index: number,
    chunk: Chunk,
    scene: BABYLON.Scene
  ): BABYLON.Mesh[] {
    const { crosswalkWidth } = this.roadConfig;
    const meshes: BABYLON.Mesh[] = [];

    // Create crosswalk stripes (simplified - just white rectangles)
    const pos = intersection.position;
    const stripeWidth = 1;
    const stripeGap = 0.5;
    const numStripes = 8;

    for (let i = 0; i < numStripes; i++) {
      const mesh = new BABYLON.Mesh(`crosswalk_${chunk.x}_${chunk.z}_${index}_${i}`, scene);
      const vertexData = new BABYLON.VertexData();

      const offset = (i - numStripes / 2) * (stripeWidth + stripeGap);

      const positions = [
        pos.x + offset, 0.02, pos.y - crosswalkWidth / 2,
        pos.x + offset + stripeWidth, 0.02, pos.y - crosswalkWidth / 2,
        pos.x + offset + stripeWidth, 0.02, pos.y + crosswalkWidth / 2,
        pos.x + offset, 0.02, pos.y + crosswalkWidth / 2
      ];

      const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
      const indices = [0, 1, 2, 0, 2, 3];

      vertexData.positions = positions;
      vertexData.indices = indices;
      vertexData.normals = normals;
      vertexData.applyToMesh(mesh);

      // White material
      const material = new BABYLON.StandardMaterial(`crosswalkMaterial_${chunk.x}_${chunk.z}_${index}_${i}`, scene);
      material.diffuseColor = new BABYLON.Color3(1, 1, 1);
      material.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
      mesh.material = material;

      meshes.push(mesh);
    }

    return meshes;
  }

  /**
   * Create physics imposter for roads
   */
  private createPhysicsImposter(
    mesh: BABYLON.Mesh,
    context: GenerationContext
  ): BABYLON.PhysicsImpostor {
    return new BABYLON.PhysicsImpostor(
      mesh,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, restitution: 0.2, friction: 0.8 },
      context.scene
    );
  }

  /**
   * Get road segments in chunk (for other generators to query)
   */
  public getRoadSegments(chunk: Chunk): RoadSegment[] {
    const segments: RoadSegment[] = [];
    for (const road of chunk.roads) {
      segments.push(...road.segments);
    }
    return segments;
  }

  /**
   * Check if position is on road (for other generators to query)
   */
  public isOnRoad(position: BABYLON.Vector2, chunk: Chunk): boolean {
    for (const road of chunk.roads) {
      for (const segment of road.segments) {
        if (this.isPointOnSegment(position, segment)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if point is on road segment
   */
  private isPointOnSegment(point: BABYLON.Vector2, segment: RoadSegment): boolean {
    const start = segment.start;
    const end = segment.end;
    const width = segment.width;

    // Calculate distance from point to line segment
    const dx = end.x - start.x;
    const dz = end.y - start.y;
    const length = Math.sqrt(dx * dx + dz * dz);

    if (length === 0) return false;

    // Project point onto line
    const t = Math.max(0, Math.min(1, 
      ((point.x - start.x) * dx + (point.y - start.y) * dz) / (length * length)
    ));

    const projX = start.x + t * dx;
    const projZ = start.y + t * dz;

    // Check distance to projected point
    const distX = point.x - projX;
    const distZ = point.y - projZ;
    const dist = Math.sqrt(distX * distX + distZ * distZ);

    return dist <= width / 2;
  }
}
