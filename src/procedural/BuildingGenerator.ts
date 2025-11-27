/**
 * BuildingGenerator Implementation
 * Generates buildings with varied dimensions, styles, and placement
 * Validates: Requirements 5.1, 5.2, 5.3, 5.5, 10.1
 */

import * as BABYLON from '@babylonjs/core';
import { BaseGenerator, GenerationContext, GeneratedObject } from './Generator';
import { Chunk, Building, BuildingStyle } from './ChunkTypes';
import { RoadGenerator } from './RoadGenerator';
import { NoiseGenerator } from './NoiseGenerator';

/**
 * Building Generator Configuration
 */
export interface BuildingGeneratorConfig {
  // Size constraints
  minHeight: number;          // Minimum building height (default: 10)
  maxHeight: number;          // Maximum building height (default: 50)
  minWidth: number;           // Minimum building width (default: 8)
  maxWidth: number;           // Maximum building width (default: 20)
  minDepth: number;           // Minimum building depth (default: 8)
  maxDepth: number;           // Maximum building depth (default: 20)
  
  // Placement
  density: number;            // Buildings per chunk (default: 15)
  minSpacing: number;         // Minimum spacing between buildings (default: 5)
  roadOffset: number;         // Minimum distance from roads (default: 3)
  
  // Styles
  styles: BuildingStyle[];
}

/**
 * BuildingGenerator - Generates buildings for chunks
 * Validates: Requirements 5.1, 5.2, 5.3, 5.5, 10.1
 */
export class BuildingGenerator extends BaseGenerator {
  private buildingConfig: BuildingGeneratorConfig;
  private roadGenerator: RoadGenerator | null = null;

  constructor() {
    super('BuildingGenerator');
    
    // Default configuration
    this.buildingConfig = {
      minHeight: 10,
      maxHeight: 50,
      minWidth: 8,
      maxWidth: 20,
      minDepth: 8,
      maxDepth: 20,
      density: 15,
      minSpacing: 5,
      roadOffset: 3,
      styles: this.getDefaultStyles()
    };
  }

  /**
   * Get default building styles
   */
  private getDefaultStyles(): BuildingStyle[] {
    return [
      {
        name: 'modern',
        colorPalette: ['#CCCCCC', '#AAAAAA', '#888888', '#666666'],
        windowPattern: 'grid',
        roofType: 'flat'
      },
      {
        name: 'classic',
        colorPalette: ['#D4A574', '#C19A6B', '#B8860B', '#8B7355'],
        windowPattern: 'rows',
        roofType: 'pitched'
      },
      {
        name: 'industrial',
        colorPalette: ['#4A4A4A', '#5A5A5A', '#6A6A6A', '#7A7A7A'],
        windowPattern: 'sparse',
        roofType: 'flat'
      },
      {
        name: 'residential',
        colorPalette: ['#F5DEB3', '#DEB887', '#D2B48C', '#BC8F8F'],
        windowPattern: 'regular',
        roofType: 'pitched'
      }
    ];
  }

  /**
   * Configure generator
   */
  public configure(config: Partial<BuildingGeneratorConfig>): void {
    this.buildingConfig = { ...this.buildingConfig, ...config };
  }

  /**
   * Set road generator reference for querying road positions
   */
  public setRoadGenerator(roadGenerator: RoadGenerator): void {
    this.roadGenerator = roadGenerator;
  }

  /**
   * Generate buildings for chunk
   * Validates: Requirements 5.1, 5.2, 5.3, 5.5, 10.1
   */
  public generate(chunk: Chunk, context: GenerationContext): GeneratedObject[] {
    const objects: GeneratedObject[] = [];
    const { rng, seed } = context;
    
    // Create noise generator for variation (Requirement 5.2)
    const noiseGen = new NoiseGenerator(seed);
    
    // Generate building positions using Poisson disc sampling for natural spacing
    const positions = this.generateBuildingPositions(chunk, context);
    
    // Create buildings at each position
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      
      // Use noise for size variation (Requirement 5.2)
      const noiseX = pos.x / 50;
      const noiseZ = pos.z / 50;
      const heightNoise = noiseGen.noise2DNormalized(noiseX, noiseZ);
      const widthNoise = noiseGen.noise2DNormalized(noiseX + 100, noiseZ);
      const depthNoise = noiseGen.noise2DNormalized(noiseX, noiseZ + 100);
      
      // Calculate dimensions with variation
      const height = this.buildingConfig.minHeight + 
                    heightNoise * (this.buildingConfig.maxHeight - this.buildingConfig.minHeight);
      const width = this.buildingConfig.minWidth + 
                   widthNoise * (this.buildingConfig.maxWidth - this.buildingConfig.minWidth);
      const depth = this.buildingConfig.minDepth + 
                   depthNoise * (this.buildingConfig.maxDepth - this.buildingConfig.minDepth);
      
      const dimensions = new BABYLON.Vector3(width, height, depth);
      
      // Select random style
      const style = rng.randomElement(this.buildingConfig.styles);
      
      // Calculate rotation to face nearest street (Requirement 5.3)
      const rotation = this.calculateStreetFacingRotation(pos, chunk, context);
      
      // Create building mesh
      const mesh = this.createBuildingMesh(pos, dimensions, rotation, style, i, chunk, context.scene);
      
      // Create physics imposter
      const imposter = this.createPhysicsImposter(mesh, context);
      
      // Create building data
      const building: Building = {
        id: this.createId('building', chunk.x, chunk.z, i),
        position: pos,
        dimensions,
        rotation,
        style,
        mesh,
        imposter
      };
      
      chunk.buildings.push(building);
      chunk.meshes.push(mesh);
      chunk.imposters.push(imposter);
      
      // Create generated object
      objects.push({
        type: 'building',
        position: pos,
        rotation,
        scale: dimensions,
        mesh,
        imposter,
        metadata: { building }
      });
    }
    
    return objects;
  }

  /**
   * Generate building positions using Poisson disc sampling
   * Ensures natural spacing and avoids roads (Requirements 5.1, 5.5)
   */
  private generateBuildingPositions(
    chunk: Chunk,
    context: GenerationContext
  ): BABYLON.Vector3[] {
    const { chunkSize, rng } = context;
    const positions: BABYLON.Vector3[] = [];
    const { density, minSpacing, roadOffset } = this.buildingConfig;
    
    const minWorldX = chunk.worldX;
    const minWorldZ = chunk.worldZ;
    
    // Use grid-based placement with randomization for efficiency
    const gridSize = Math.ceil(Math.sqrt(density));
    const cellSize = chunkSize / gridSize;
    
    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        // Random position within grid cell
        const x = minWorldX + gx * cellSize + rng.randomFloat(cellSize * 0.2, cellSize * 0.8);
        const z = minWorldZ + gz * cellSize + rng.randomFloat(cellSize * 0.2, cellSize * 0.8);
        
        // Check if position is valid
        if (this.isValidBuildingPosition(x, z, chunk, positions, minSpacing, roadOffset)) {
          positions.push(new BABYLON.Vector3(x, 0, z));
        }
      }
    }
    
    return positions;
  }

  /**
   * Check if position is valid for building placement
   * Validates: Requirements 5.1, 5.5, 10.1
   */
  private isValidBuildingPosition(
    x: number,
    z: number,
    chunk: Chunk,
    existingPositions: BABYLON.Vector3[],
    minSpacing: number,
    roadOffset: number
  ): boolean {
    // Use maximum building dimensions for conservative checking
    // This ensures buildings won't overlap roads even at max size
    const maxHalfWidth = this.buildingConfig.maxWidth / 2;
    const maxHalfDepth = this.buildingConfig.maxDepth / 2;
    
    // Check center point
    if (this.roadGenerator && this.roadGenerator.isOnRoad(new BABYLON.Vector2(x, z), chunk)) {
      return false;
    }
    
    // Check corners of maximum possible building footprint
    // We check axis-aligned corners as a conservative estimate
    const checkPoints = [
      new BABYLON.Vector2(x - maxHalfWidth, z - maxHalfDepth),
      new BABYLON.Vector2(x + maxHalfWidth, z - maxHalfDepth),
      new BABYLON.Vector2(x + maxHalfWidth, z + maxHalfDepth),
      new BABYLON.Vector2(x - maxHalfWidth, z + maxHalfDepth)
    ];
    
    for (const point of checkPoints) {
      if (this.roadGenerator && this.roadGenerator.isOnRoad(point, chunk)) {
        return false;
      }
    }
    
    // Check distance to roads (Requirement 5.1)
    // Only apply roadOffset to the center, not the corners
    // The corner checks above already ensure buildings don't overlap roads
    if (this.isTooCloseToRoad(x, z, chunk, roadOffset)) {
      return false;
    }
    
    // Check spacing from other buildings (Requirement 5.5)
    for (const pos of existingPositions) {
      const dx = x - pos.x;
      const dz = z - pos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < minSpacing) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if position is too close to any road
   */
  private isTooCloseToRoad(
    x: number,
    z: number,
    chunk: Chunk,
    minDistance: number
  ): boolean {
    for (const road of chunk.roads) {
      for (const segment of road.segments) {
        const distance = this.distanceToRoadSegment(x, z, segment);
        if (distance < minDistance + segment.width / 2) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Calculate distance from point to road segment
   */
  private distanceToRoadSegment(x: number, z: number, segment: any): number {
    const start = segment.start;
    const end = segment.end;
    
    const dx = end.x - start.x;
    const dz = end.y - start.y;
    const lengthSquared = dx * dx + dz * dz;
    
    if (lengthSquared === 0) {
      // Segment is a point
      const pdx = x - start.x;
      const pdz = z - start.y;
      return Math.sqrt(pdx * pdx + pdz * pdz);
    }
    
    // Project point onto line segment
    const t = Math.max(0, Math.min(1, 
      ((x - start.x) * dx + (z - start.y) * dz) / lengthSquared
    ));
    
    const projX = start.x + t * dx;
    const projZ = start.y + t * dz;
    
    const distX = x - projX;
    const distZ = z - projZ;
    
    return Math.sqrt(distX * distX + distZ * distZ);
  }

  /**
   * Calculate rotation to face nearest street
   * Validates: Requirement 5.3
   */
  private calculateStreetFacingRotation(
    position: BABYLON.Vector3,
    chunk: Chunk,
    _context: GenerationContext
  ): number {
    let nearestDistance = Infinity;
    let nearestAngle = 0;
    
    // Find nearest road segment
    for (const road of chunk.roads) {
      for (const segment of road.segments) {
        const distance = this.distanceToRoadSegment(position.x, position.z, segment);
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          
          // Calculate angle to face the road
          const dx = segment.end.x - segment.start.x;
          const dz = segment.end.y - segment.start.y;
          
          // Perpendicular to road direction
          nearestAngle = Math.atan2(dz, dx) + Math.PI / 2;
          
          // Determine which side of the road we're on
          const midX = (segment.start.x + segment.end.x) / 2;
          const midZ = (segment.start.y + segment.end.y) / 2;
          
          const toBuilding = Math.atan2(position.z - midZ, position.x - midX);
          const roadAngle = Math.atan2(dz, dx);
          
          // Adjust rotation to face toward the road
          const angleDiff = toBuilding - roadAngle;
          if (Math.abs(angleDiff) > Math.PI / 2) {
            nearestAngle += Math.PI;
          }
        }
      }
    }
    
    return nearestAngle;
  }

  /**
   * Create building mesh with variation
   * Validates: Requirements 5.2, 5.4, 9.4
   */
  private createBuildingMesh(
    position: BABYLON.Vector3,
    dimensions: BABYLON.Vector3,
    rotation: number,
    style: BuildingStyle,
    index: number,
    chunk: Chunk,
    scene: BABYLON.Scene
  ): BABYLON.Mesh {
    
    // Create box for building
    const mesh = BABYLON.MeshBuilder.CreateBox(
      `building_${chunk.x}_${chunk.z}_${index}`,
      {
        width: dimensions.x,
        height: dimensions.y,
        depth: dimensions.z
      },
      scene
    );
    
    // Position building (center at ground level)
    mesh.position = new BABYLON.Vector3(
      position.x,
      dimensions.y / 2,
      position.z
    );
    
    // Rotate to face street
    mesh.rotation.y = rotation;
    
    // Create material with color variation (Requirement 5.4)
    const material = new BABYLON.StandardMaterial(
      `buildingMaterial_${chunk.x}_${chunk.z}_${index}`,
      scene
    );
    
    // Select random color from style palette
    const colorHex = style.colorPalette[index % style.colorPalette.length];
    const color = BABYLON.Color3.FromHexString(colorHex);
    
    material.diffuseColor = color;
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    // Add window pattern using emissive color (Requirement 9.4)
    // Different patterns based on style
    this.applyWindowPattern(material, style, dimensions);
    
    mesh.material = material;
    
    // Add roof based on style (Requirement 9.4)
    if (style.roofType === 'pitched') {
      this.addPitchedRoof(mesh, dimensions, rotation, index, chunk, scene);
    } else {
      this.addFlatRoof(mesh, dimensions, index, chunk, scene);
    }
    
    return mesh;
  }

  /**
   * Apply window pattern to building material
   * Validates: Requirement 9.4
   */
  private applyWindowPattern(
    material: BABYLON.StandardMaterial,
    style: BuildingStyle,
    dimensions: BABYLON.Vector3
  ): void {
    // Use emissive color to simulate windows
    // Different patterns create different visual effects
    switch (style.windowPattern) {
      case 'grid':
        // Dense grid pattern - modern office building
        material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.05);
        break;
      case 'rows':
        // Horizontal rows - classic building
        material.emissiveColor = new BABYLON.Color3(0.08, 0.08, 0.03);
        break;
      case 'sparse':
        // Few windows - industrial building
        material.emissiveColor = new BABYLON.Color3(0.03, 0.03, 0.01);
        break;
      case 'regular':
        // Regular pattern - residential building
        material.emissiveColor = new BABYLON.Color3(0.06, 0.06, 0.02);
        break;
      default:
        material.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.02);
    }
  }

  /**
   * Add flat roof to building
   * Validates: Requirement 9.4
   */
  private addFlatRoof(
    buildingMesh: BABYLON.Mesh,
    dimensions: BABYLON.Vector3,
    index: number,
    chunk: Chunk,
    scene: BABYLON.Scene
  ): void {
    // Create a slightly smaller box on top for roof detail
    const roofHeight = 0.5;
    const roofInset = 0.2;
    
    const roof = BABYLON.MeshBuilder.CreateBox(
      `roof_${chunk.x}_${chunk.z}_${index}`,
      {
        width: dimensions.x - roofInset,
        height: roofHeight,
        depth: dimensions.z - roofInset
      },
      scene
    );
    
    // Position on top of building
    roof.position = new BABYLON.Vector3(
      0,
      dimensions.y / 2 + roofHeight / 2,
      0
    );
    
    // Darker material for roof
    const roofMaterial = new BABYLON.StandardMaterial(
      `roofMaterial_${chunk.x}_${chunk.z}_${index}`,
      scene
    );
    roofMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    roofMaterial.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    roof.material = roofMaterial;
    
    // Parent to building
    roof.parent = buildingMesh;
  }

  /**
   * Add pitched roof to building
   * Validates: Requirement 9.4
   */
  private addPitchedRoof(
    buildingMesh: BABYLON.Mesh,
    dimensions: BABYLON.Vector3,
    rotation: number,
    index: number,
    chunk: Chunk,
    scene: BABYLON.Scene
  ): void {
    const roofHeight = dimensions.x * 0.3;
    
    // Create pyramid for roof using cylinder with 4 sides
    const roof = BABYLON.MeshBuilder.CreateCylinder(
      `roof_${chunk.x}_${chunk.z}_${index}`,
      {
        diameterTop: 0,
        diameterBottom: Math.max(dimensions.x, dimensions.z) * 1.2,
        height: roofHeight,
        tessellation: 4
      },
      scene
    );
    
    // Position on top of building (relative to parent)
    roof.position = new BABYLON.Vector3(
      0,
      dimensions.y / 2 + roofHeight / 2,
      0
    );
    
    // Rotate to align with building
    roof.rotation.y = Math.PI / 4;
    
    // Darker material for roof with slight color variation
    const roofMaterial = new BABYLON.StandardMaterial(
      `roofMaterial_${chunk.x}_${chunk.z}_${index}`,
      scene
    );
    
    // Vary roof color slightly
    const roofShade = 0.2 + (index % 3) * 0.05;
    roofMaterial.diffuseColor = new BABYLON.Color3(roofShade, roofShade * 0.7, roofShade * 0.7);
    roofMaterial.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    roof.material = roofMaterial;
    
    // Parent to building
    roof.parent = buildingMesh;
  }

  /**
   * Create physics imposter for building
   */
  private createPhysicsImposter(
    mesh: BABYLON.Mesh,
    context: GenerationContext
  ): BABYLON.PhysicsImpostor {
    return new BABYLON.PhysicsImpostor(
      mesh,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, restitution: 0.1, friction: 0.9 },
      context.scene
    );
  }

  /**
   * Get building footprints for collision checking
   */
  public getBuildingFootprints(chunk: Chunk): Array<{
    minX: number;
    minZ: number;
    maxX: number;
    maxZ: number;
  }> {
    const footprints: Array<{
      minX: number;
      minZ: number;
      maxX: number;
      maxZ: number;
    }> = [];
    
    for (const building of chunk.buildings) {
      const pos = building.position;
      const dim = building.dimensions;
      
      footprints.push({
        minX: pos.x - dim.x / 2,
        maxX: pos.x + dim.x / 2,
        minZ: pos.z - dim.z / 2,
        maxZ: pos.z + dim.z / 2
      });
    }
    
    return footprints;
  }
}
