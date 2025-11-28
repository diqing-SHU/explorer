/**
 * TrafficGenerator Implementation
 * Generates traffic signs, signals, and road infrastructure
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 10.3
 */

import * as BABYLON from '@babylonjs/core';
import { BaseGenerator, GenerationContext, GeneratedObject } from './Generator';
import { Chunk, TrafficSign, SignType, Intersection } from './ChunkTypes';
import { RoadGenerator } from './RoadGenerator';
import { BuildingGenerator } from './BuildingGenerator';

/**
 * Traffic Generator Configuration
 */
export interface TrafficGeneratorConfig {
  // Sign placement
  intersectionSignProbability: number;  // Probability of placing signs at intersections (default: 0.8)
  roadSignDensity: number;              // Signs per road segment (default: 0.3)
  signHeight: number;                   // Height of sign posts (default: 3)
  signSize: number;                     // Size of sign faces (default: 1)
  
  // Sign types
  types: SignType[];                    // Available sign types
  
  // Placement constraints
  minDistanceFromRoad: number;          // Minimum distance from road center (default: 6)
  maxDistanceFromRoad: number;          // Maximum distance from road center (default: 8)
  minSpacing: number;                   // Minimum spacing between signs (default: 10)
}

/**
 * TrafficGenerator - Generates traffic signs and signals for chunks
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 10.3
 */
export class TrafficGenerator extends BaseGenerator {
  private trafficConfig: TrafficGeneratorConfig;
  private roadGenerator: RoadGenerator | null = null;
  private buildingGenerator: BuildingGenerator | null = null;
  
  // Master meshes for instancing (cached per scene)
  private masterMeshes: Map<string, { pole: BABYLON.Mesh; face: BABYLON.Mesh }> = new Map();

  constructor() {
    super('TrafficGenerator');
    
    // Default configuration
    this.trafficConfig = {
      intersectionSignProbability: 0.8,
      roadSignDensity: 0.3,
      signHeight: 3,
      signSize: 1,
      types: [
        SignType.StopSign,
        SignType.TrafficLight,
        SignType.SpeedLimit,
        SignType.StreetName,
        SignType.Directional,
        SignType.Yield,
        SignType.NoPark
      ],
      minDistanceFromRoad: 6,
      maxDistanceFromRoad: 8,
      minSpacing: 10
    };
  }

  /**
   * Configure generator
   */
  public configure(config: Partial<TrafficGeneratorConfig>): void {
    this.trafficConfig = { ...this.trafficConfig, ...config };
  }

  /**
   * Set road generator reference for querying road positions
   */
  public setRoadGenerator(roadGenerator: RoadGenerator): void {
    this.roadGenerator = roadGenerator;
  }

  /**
   * Set building generator reference for collision avoidance
   */
  public setBuildingGenerator(buildingGenerator: BuildingGenerator): void {
    this.buildingGenerator = buildingGenerator;
  }

  /**
   * Generate traffic signs and signals for chunk
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 10.3
   */
  public generate(chunk: Chunk, context: GenerationContext): GeneratedObject[] {
    const objects: GeneratedObject[] = [];
    const { rng } = context;
    
    if (!this.roadGenerator) {
      console.warn('TrafficGenerator: RoadGenerator not set, skipping generation');
      return objects;
    }

    const placedSigns: BABYLON.Vector3[] = [];
    
    // Get road data from chunk
    const roadSegments = this.roadGenerator.getRoadSegments(chunk);
    const intersections = this.getIntersections(chunk);
    
    // Generate signs at intersections (Requirement 3.1)
    for (let i = 0; i < intersections.length; i++) {
      const intersection = intersections[i];
      
      // Decide whether to place signs at this intersection
      if (rng.random() < this.trafficConfig.intersectionSignProbability) {
        const signType = this.selectIntersectionSignType(rng);
        const signPositions = this.calculateIntersectionSignPositions(
          intersection,
          roadSegments,
          context
        );
        
        // Place signs at each approach to the intersection
        for (const signPos of signPositions) {
          // Check if position is valid (not too close to other signs, not intersecting buildings)
          if (this.isValidSignPosition(signPos, placedSigns, chunk, context)) {
            const sign = this.createTrafficSign(
              signPos.position,
              signPos.rotation,
              signType,
              chunk.signs.length + objects.length,
              chunk,
              context
            );
            
            if (sign) {
              objects.push(sign);
              placedSigns.push(signPos.position);
            }
          }
        }
      }
    }
    
    // Generate signs along roads (Requirement 3.2)
    for (let i = 0; i < roadSegments.length; i++) {
      const segment = roadSegments[i];
      
      // Calculate how many signs to place on this segment
      const segmentLength = BABYLON.Vector2.Distance(segment.start, segment.end);
      const numSigns = Math.floor(segmentLength * this.trafficConfig.roadSignDensity / 10);
      
      for (let j = 0; j < numSigns; j++) {
        // Random position along segment
        const t = rng.randomFloat(0.2, 0.8);
        const signType = this.selectRoadSignType(rng);
        const signPos = this.calculateRoadSignPosition(segment, t, context);
        
        // Check if position is valid
        if (this.isValidSignPosition(signPos, placedSigns, chunk, context)) {
          const sign = this.createTrafficSign(
            signPos.position,
            signPos.rotation,
            signType,
            chunk.signs.length + objects.length,
            chunk,
            context
          );
          
          if (sign) {
            objects.push(sign);
            placedSigns.push(signPos.position);
          }
        }
      }
    }
    
    return objects;
  }

  /**
   * Get intersections from chunk
   */
  private getIntersections(chunk: Chunk): Intersection[] {
    const intersections: Intersection[] = [];
    
    for (const road of chunk.roads) {
      intersections.push(...road.intersections);
    }
    
    return intersections;
  }

  /**
   * Select appropriate sign type for intersections
   * Validates: Requirement 3.4
   */
  private selectIntersectionSignType(rng: any): SignType {
    // Intersections typically have stop signs, traffic lights, or yield signs
    const intersectionTypes = [
      SignType.StopSign,
      SignType.TrafficLight,
      SignType.Yield
    ];
    
    return rng.randomElement(intersectionTypes);
  }

  /**
   * Select appropriate sign type for roads
   * Validates: Requirement 3.4
   */
  private selectRoadSignType(rng: any): SignType {
    // Roads typically have speed limits, street names, directional signs, or no parking
    const roadTypes = [
      SignType.SpeedLimit,
      SignType.StreetName,
      SignType.Directional,
      SignType.NoPark
    ];
    
    return rng.randomElement(roadTypes);
  }

  /**
   * Calculate sign positions at intersection
   * Validates: Requirement 3.3 (orientation to face traffic)
   */
  private calculateIntersectionSignPositions(
    intersection: Intersection,
    roadSegments: any[],
    context: GenerationContext
  ): Array<{ position: BABYLON.Vector3; rotation: number }> {
    const positions: Array<{ position: BABYLON.Vector3; rotation: number }> = [];
    const { rng } = context;
    
    // Find road segments that connect to this intersection
    const connectingSegments = roadSegments.filter(seg => 
      this.isSegmentAtIntersection(seg, intersection)
    );
    
    // Place signs on each approach to the intersection
    for (const segment of connectingSegments) {
      const intPos = intersection.position;
      
      // Determine which end of the segment is at the intersection
      const startDist = BABYLON.Vector2.Distance(segment.start, intPos);
      const endDist = BABYLON.Vector2.Distance(segment.end, intPos);
      
      const isStartAtIntersection = startDist < endDist;
      const approachPoint = isStartAtIntersection ? segment.start : segment.end;
      const otherPoint = isStartAtIntersection ? segment.end : segment.start;
      
      // Calculate direction of traffic approaching intersection
      // Traffic flows from otherPoint toward approachPoint
      const dx = approachPoint.x - otherPoint.x;
      const dz = approachPoint.y - otherPoint.y;
      const length = Math.sqrt(dx * dx + dz * dz);
      
      if (length === 0) continue;
      
      // Direction vector pointing toward intersection
      const dirX = dx / length;
      const dirZ = dz / length;
      
      // Calculate perpendicular direction (to place sign to the side of road)
      const perpX = -dirZ;
      const perpZ = dirX;
      
      // Place sign to the right side of the road (from traffic perspective)
      const sideOffset = rng.randomFloat(
        this.trafficConfig.minDistanceFromRoad,
        this.trafficConfig.maxDistanceFromRoad
      );
      
      // Place sign slightly before the intersection
      const backOffset = rng.randomFloat(5, 10);
      
      const signX = approachPoint.x - dirX * backOffset + perpX * sideOffset;
      const signZ = approachPoint.y - dirZ * backOffset + perpZ * sideOffset;
      
      // Calculate rotation to face traffic (Requirement 3.3)
      // Sign should face in the direction of approaching traffic (parallel to road)
      // so drivers can see it head-on as they approach
      // Traffic flows from otherPoint toward approachPoint (dirX, dirZ)
      // The sign is placed to the right side using perpendicular offset
      // Sign should face in the direction of traffic flow (parallel to road)
      const rotation = Math.atan2(dirZ, dirX);
      
      positions.push({
        position: new BABYLON.Vector3(signX, 0, signZ),
        rotation
      });
    }
    
    return positions;
  }

  /**
   * Check if road segment connects to intersection
   */
  private isSegmentAtIntersection(segment: any, intersection: Intersection): boolean {
    const threshold = 1.0;
    const intPos = intersection.position;
    
    const startDist = BABYLON.Vector2.Distance(segment.start, intPos);
    const endDist = BABYLON.Vector2.Distance(segment.end, intPos);
    
    return startDist < threshold || endDist < threshold;
  }

  /**
   * Calculate sign position along road
   * Validates: Requirement 3.3 (orientation to face traffic)
   */
  private calculateRoadSignPosition(
    segment: any,
    t: number,
    context: GenerationContext
  ): { position: BABYLON.Vector3; rotation: number } {
    const { rng } = context;
    
    // Interpolate position along segment
    const x = segment.start.x + t * (segment.end.x - segment.start.x);
    const z = segment.start.y + t * (segment.end.y - segment.start.y);
    
    // Calculate road direction
    const dx = segment.end.x - segment.start.x;
    const dz = segment.end.y - segment.start.y;
    const length = Math.sqrt(dx * dx + dz * dz);
    
    const dirX = dx / length;
    const dirZ = dz / length;
    
    // Calculate perpendicular direction
    const perpX = -dirZ;
    const perpZ = dirX;
    
    // Place sign to the side of the road
    const sideOffset = rng.randomFloat(
      this.trafficConfig.minDistanceFromRoad,
      this.trafficConfig.maxDistanceFromRoad
    );
    
    // Randomly choose left or right side
    const side = rng.random() < 0.5 ? 1 : -1;
    
    const signX = x + perpX * sideOffset * side;
    const signZ = z + perpZ * sideOffset * side;
    
    // Calculate rotation to face traffic (Requirement 3.3)
    // Sign should face parallel to the road (in the direction of traffic flow)
    // so drivers can see it head-on as they approach
    // On a two-way road, signs on opposite sides face opposite directions
    // If sign is on the right side (side = 1), face forward along road
    // If sign is on the left side (side = -1), face backward along road
    const rotation = side > 0 ? Math.atan2(dirZ, dirX) : Math.atan2(-dirZ, -dirX);
    
    return {
      position: new BABYLON.Vector3(signX, 0, signZ),
      rotation
    };
  }

  /**
   * Check if sign position is valid
   * Validates: Requirements 3.5, 10.3
   */
  private isValidSignPosition(
    signPos: { position: BABYLON.Vector3; rotation: number },
    placedSigns: BABYLON.Vector3[],
    chunk: Chunk,
    context: GenerationContext
  ): boolean {
    const pos = signPos.position;
    
    // Check spacing from other signs (Requirement 3.5)
    for (const otherPos of placedSigns) {
      const dx = pos.x - otherPos.x;
      const dz = pos.z - otherPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < this.trafficConfig.minSpacing) {
        return false;
      }
    }
    
    // Check if sign intersects with buildings (Requirement 3.5, 10.3)
    if (this.buildingGenerator) {
      const buildingFootprints = this.buildingGenerator.getBuildingFootprints(chunk);
      const signSize = this.trafficConfig.signSize;
      
      for (const footprint of buildingFootprints) {
        // Check if sign position is inside building footprint
        if (pos.x >= footprint.minX - signSize && 
            pos.x <= footprint.maxX + signSize &&
            pos.z >= footprint.minZ - signSize && 
            pos.z <= footprint.maxZ + signSize) {
          return false;
        }
      }
    }
    
    // Check if sign is within chunk bounds
    if (!this.isInChunkBounds(pos.x, pos.z, chunk, context.chunkSize)) {
      return false;
    }
    
    // Check if sign is on a road (signs should be at road edges, not on roads)
    if (this.roadGenerator && this.roadGenerator.isOnRoad(new BABYLON.Vector2(pos.x, pos.z), chunk)) {
      return false;
    }
    
    return true;
  }

  /**
   * Create traffic sign mesh and data
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4
   */
  private createTrafficSign(
    position: BABYLON.Vector3,
    rotation: number,
    type: SignType,
    index: number,
    chunk: Chunk,
    context: GenerationContext
  ): GeneratedObject | null {
    const { scene } = context;
    const { signHeight, signSize } = this.trafficConfig;
    
    // Create sign mesh (pole + sign face)
    const signMesh = this.createSignMesh(position, rotation, type, signHeight, signSize, index, chunk, scene);
    
    if (!signMesh) {
      return null;
    }
    
    // Create traffic sign data
    const sign: TrafficSign = {
      id: this.createId('sign', chunk.x, chunk.z, index),
      position,
      rotation,
      type,
      mesh: signMesh
    };
    
    chunk.signs.push(sign);
    chunk.meshes.push(signMesh);
    
    // Return generated object
    return {
      type: 'sign',
      position,
      rotation,
      scale: new BABYLON.Vector3(signSize, signHeight, signSize),
      mesh: signMesh,
      metadata: { sign }
    };
  }

  /**
   * Get or create master meshes for a sign type (for instancing)
   * Validates: Requirement 8.5 (instancing for repeated objects)
   */
  private getMasterMeshes(
    type: SignType,
    height: number,
    size: number,
    scene: BABYLON.Scene
  ): { pole: BABYLON.Mesh; face: BABYLON.Mesh } {
    const key = `${scene.uid}_${type}_${height}_${size}`;
    
    // Return cached master meshes if they exist
    if (this.masterMeshes.has(key)) {
      return this.masterMeshes.get(key)!;
    }
    
    // Create master pole mesh
    const masterPole = BABYLON.MeshBuilder.CreateCylinder(
      `masterSignPole_${type}`,
      {
        diameter: 0.1,
        height: height
      },
      scene
    );
    
    masterPole.position.y = height / 2;
    masterPole.isVisible = false; // Master mesh is not visible
    
    // Pole material (gray metal)
    const poleMaterial = new BABYLON.StandardMaterial(
      `masterPoleMaterial_${type}`,
      scene
    );
    poleMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    poleMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    masterPole.material = poleMaterial;
    
    // Create master sign face based on type
    const masterFace = this.createMasterSignFace(type, size, scene);
    masterFace.position.y = height - size / 2;
    masterFace.isVisible = false; // Master mesh is not visible
    
    // Cache the master meshes
    const masterMeshes = { pole: masterPole, face: masterFace };
    this.masterMeshes.set(key, masterMeshes);
    
    return masterMeshes;
  }

  /**
   * Create sign mesh with pole and face using instancing
   * Validates: Requirement 8.5 (instancing for repeated objects)
   */
  private createSignMesh(
    position: BABYLON.Vector3,
    rotation: number,
    type: SignType,
    height: number,
    size: number,
    index: number,
    chunk: Chunk,
    scene: BABYLON.Scene
  ): BABYLON.Mesh {
    // Get or create master meshes for this sign type
    const masterMeshes = this.getMasterMeshes(type, height, size, scene);
    
    // Create parent mesh for sign
    const signMesh = new BABYLON.Mesh(`sign_${chunk.x}_${chunk.z}_${index}`, scene);
    signMesh.position = position;
    signMesh.rotation.y = rotation;
    
    // Create instanced pole
    const poleInstance = masterMeshes.pole.createInstance(`signPole_${chunk.x}_${chunk.z}_${index}`);
    poleInstance.parent = signMesh;
    
    // Create instanced sign face
    const faceInstance = masterMeshes.face.createInstance(`signFace_${chunk.x}_${chunk.z}_${index}`);
    faceInstance.parent = signMesh;
    
    return signMesh;
  }

  /**
   * Create master sign face based on sign type (for instancing)
   * Validates: Requirement 3.4 (variety in sign types)
   */
  private createMasterSignFace(
    type: SignType,
    size: number,
    scene: BABYLON.Scene
  ): BABYLON.Mesh {
    let signFace: BABYLON.Mesh;
    let material: BABYLON.StandardMaterial;
    
    switch (type) {
      case SignType.StopSign:
        // Octagonal stop sign (red)
        signFace = BABYLON.MeshBuilder.CreateCylinder(
          `masterSignFace_${type}`,
          {
            diameter: size,
            height: 0.05,
            tessellation: 8
          },
          scene
        );
        material = new BABYLON.StandardMaterial(
          `masterSignMaterial_${type}`,
          scene
        );
        material.diffuseColor = new BABYLON.Color3(0.8, 0.1, 0.1); // Red
        material.emissiveColor = new BABYLON.Color3(0.2, 0, 0);
        break;
        
      case SignType.TrafficLight:
        // Rectangular traffic light (black with colored lights)
        signFace = BABYLON.MeshBuilder.CreateBox(
          `masterSignFace_${type}`,
          {
            width: size * 0.5,
            height: size * 1.5,
            depth: 0.2
          },
          scene
        );
        material = new BABYLON.StandardMaterial(
          `masterSignMaterial_${type}`,
          scene
        );
        material.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Black
        material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0); // Yellow glow
        break;
        
      case SignType.SpeedLimit:
        // Circular speed limit sign (white with black border)
        signFace = BABYLON.MeshBuilder.CreateCylinder(
          `masterSignFace_${type}`,
          {
            diameter: size,
            height: 0.05,
            tessellation: 32
          },
          scene
        );
        material = new BABYLON.StandardMaterial(
          `masterSignMaterial_${type}`,
          scene
        );
        material.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9); // White
        material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        break;
        
      case SignType.Yield:
        // Triangular yield sign (red and white)
        signFace = BABYLON.MeshBuilder.CreateCylinder(
          `masterSignFace_${type}`,
          {
            diameter: size,
            height: 0.05,
            tessellation: 3
          },
          scene
        );
        signFace.rotation.y = Math.PI / 6; // Rotate triangle
        material = new BABYLON.StandardMaterial(
          `masterSignMaterial_${type}`,
          scene
        );
        material.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9); // White
        material.emissiveColor = new BABYLON.Color3(0.2, 0, 0); // Red glow
        break;
        
      case SignType.StreetName:
      case SignType.Directional:
      case SignType.NoPark:
      default:
        // Rectangular sign (green for street names, blue for directional, red for no parking)
        signFace = BABYLON.MeshBuilder.CreateBox(
          `masterSignFace_${type}`,
          {
            width: size * 1.5,
            height: size * 0.5,
            depth: 0.05
          },
          scene
        );
        material = new BABYLON.StandardMaterial(
          `masterSignMaterial_${type}`,
          scene
        );
        
        if (type === SignType.StreetName) {
          material.diffuseColor = new BABYLON.Color3(0.1, 0.5, 0.1); // Green
          material.emissiveColor = new BABYLON.Color3(0, 0.1, 0);
        } else if (type === SignType.Directional) {
          material.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.6); // Blue
          material.emissiveColor = new BABYLON.Color3(0, 0, 0.1);
        } else {
          material.diffuseColor = new BABYLON.Color3(0.7, 0.1, 0.1); // Red
          material.emissiveColor = new BABYLON.Color3(0.1, 0, 0);
        }
        break;
    }
    
    signFace.material = material;
    return signFace;
  }
}
