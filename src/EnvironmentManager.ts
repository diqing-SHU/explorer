import * as BABYLON from '@babylonjs/core';

/**
 * Configuration for terrain
 */
export interface TerrainConfig {
  width: number;
  depth: number;
  subdivisions?: number;
  texture?: string;
}

/**
 * Configuration for a building
 */
export interface BuildingConfig {
  position: [number, number, number];
  dimensions: [number, number, number]; // width, height, depth
  rotation: number; // Y-axis rotation in radians
  color?: string;
  texture?: string;
}

/**
 * Configuration for lighting
 */
export interface LightingConfig {
  ambient: {
    color: string;
    intensity: number;
  };
  directional: {
    color: string;
    intensity: number;
    direction: [number, number, number];
  };
  shadows?: boolean;
}

/**
 * Complete environment configuration
 */
export interface EnvironmentConfig {
  terrain: TerrainConfig;
  buildings: BuildingConfig[];
  lighting: LightingConfig;
}

/**
 * EnvironmentManager manages environment data, buildings, and terrain
 * Validates: Requirements 5.1, 5.2, 8.1, 8.2, 8.3
 */
export class EnvironmentManager {
  private terrainMesh: BABYLON.Mesh | null = null;
  private buildingMeshes: BABYLON.Mesh[] = [];
  private lights: BABYLON.Light[] = [];
  private shadowGenerator: BABYLON.ShadowGenerator | null = null;

  /**
   * Load environment from configuration
   * Creates terrain, buildings, and lighting based on the provided config
   * Validates: Requirements 5.1, 5.2, 8.1, 8.2, 8.3
   * 
   * @param scene - The Babylon.js scene to add environment to
   * @param config - Environment configuration object
   */
  public loadEnvironment(scene: BABYLON.Scene, config: EnvironmentConfig): void {
    // Clear any existing environment
    this.clear(scene);

    // Create terrain
    this.terrainMesh = this.createTerrain(scene, config.terrain);

    // Create buildings
    for (const buildingConfig of config.buildings) {
      const building = this.createBuilding(scene, buildingConfig);
      this.buildingMeshes.push(building);
    }

    // Setup lighting
    this.setupLighting(scene, config.lighting);

    console.log('Environment loaded:', {
      terrain: config.terrain,
      buildingCount: config.buildings.length,
    });
  }

  /**
   * Create terrain mesh with physics imposter
   * Validates: Requirement 5.1
   * 
   * @param scene - The Babylon.js scene
   * @param config - Terrain configuration
   * @returns The created terrain mesh
   */
  public createTerrain(scene: BABYLON.Scene, config: TerrainConfig): BABYLON.Mesh {
    // Create ground mesh
    const terrain = BABYLON.MeshBuilder.CreateGround(
      'terrain',
      {
        width: config.width,
        height: config.depth, // In Babylon.js, ground uses 'height' for depth
        subdivisions: config.subdivisions || 1,
      },
      scene
    );

    // Create material for terrain with improved visual quality
    // Validates: Requirements 6.1, 6.2
    const material = new BABYLON.StandardMaterial('terrainMaterial', scene);
    
    if (config.texture) {
      material.diffuseTexture = new BABYLON.Texture(config.texture, scene);
    } else {
      // Default gray-brown color for terrain (more natural)
      material.diffuseColor = new BABYLON.Color3(0.55, 0.5, 0.45);
      // Add subtle specular for depth
      material.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
      material.specularPower = 32;
    }

    terrain.material = material;

    // Create physics imposter for terrain (static, no mass)
    // Validates: Requirements 4.1, 4.2
    terrain.physicsImpostor = new BABYLON.PhysicsImpostor(
      terrain,
      BABYLON.PhysicsImpostor.BoxImpostor,
      {
        mass: 0, // Static object
        friction: 0.5,
        restitution: 0.0,
      },
      scene
    );

    // Make terrain pickable for ground detection
    terrain.isPickable = true;

    console.log('Terrain created:', config);

    return terrain;
  }

  /**
   * Create building mesh with physics imposter
   * Validates: Requirement 5.2
   * 
   * @param scene - The Babylon.js scene
   * @param config - Building configuration
   * @returns The created building mesh
   */
  public createBuilding(scene: BABYLON.Scene, config: BuildingConfig): BABYLON.Mesh {
    // Create box mesh for building
    const building = BABYLON.MeshBuilder.CreateBox(
      'building',
      {
        width: config.dimensions[0],
        height: config.dimensions[1],
        depth: config.dimensions[2],
      },
      scene
    );

    // Set position
    building.position = new BABYLON.Vector3(
      config.position[0],
      config.position[1],
      config.position[2]
    );

    // Set rotation (Y-axis)
    building.rotation.y = config.rotation;

    // Create material for building with improved visual quality
    // Validates: Requirements 6.1, 6.2
    const material = new BABYLON.StandardMaterial('buildingMaterial', scene);
    
    if (config.texture) {
      material.diffuseTexture = new BABYLON.Texture(config.texture, scene);
    } else if (config.color) {
      // Parse color string (assuming hex format like "#RRGGBB")
      const color = BABYLON.Color3.FromHexString(config.color);
      material.diffuseColor = color;
      // Add subtle specular for more realistic appearance
      material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
      material.specularPower = 16;
    } else {
      // Default brownish color for abandoned buildings
      material.diffuseColor = new BABYLON.Color3(0.6, 0.5, 0.4);
      material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
      material.specularPower = 16;
    }

    building.material = material;

    // Create physics imposter for building (static, no mass)
    // Validates: Requirements 4.1, 4.2
    building.physicsImpostor = new BABYLON.PhysicsImpostor(
      building,
      BABYLON.PhysicsImpostor.BoxImpostor,
      {
        mass: 0, // Static object
        friction: 0.5,
        restitution: 0.0,
      },
      scene
    );

    // Make building pickable for collision detection
    building.isPickable = true;

    console.log('Building created:', config);

    return building;
  }

  /**
   * Setup lighting for the environment
   * Validates: Requirement 5.3
   * 
   * @param scene - The Babylon.js scene
   * @param config - Lighting configuration
   */
  public setupLighting(scene: BABYLON.Scene, config: LightingConfig): void {
    // Create ambient light
    const ambientLight = new BABYLON.HemisphericLight(
      'envAmbientLight',
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    ambientLight.intensity = config.ambient.intensity;
    ambientLight.diffuse = BABYLON.Color3.FromHexString(config.ambient.color);
    this.lights.push(ambientLight);

    // Create directional light
    const directionalLight = new BABYLON.DirectionalLight(
      'envDirectionalLight',
      new BABYLON.Vector3(
        config.directional.direction[0],
        config.directional.direction[1],
        config.directional.direction[2]
      ),
      scene
    );
    directionalLight.intensity = config.directional.intensity;
    directionalLight.diffuse = BABYLON.Color3.FromHexString(config.directional.color);
    this.lights.push(directionalLight);

    // Setup shadows if enabled
    // Validates: Requirements 6.1, 6.2 - performance optimization
    if (config.shadows) {
      this.setupShadows(scene, directionalLight);
    }

    console.log('Lighting configured:', config);
  }

  /**
   * Setup shadow generation for better visual quality
   * Validates: Requirements 6.1, 6.2
   * 
   * @param _scene - The Babylon.js scene (unused but kept for API consistency)
   * @param light - The directional light to cast shadows
   */
  private setupShadows(_scene: BABYLON.Scene, light: BABYLON.DirectionalLight): void {
    // Create shadow generator with optimized settings
    this.shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
    
    // Configure shadow quality vs performance
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;
    this.shadowGenerator.darkness = 0.4; // Subtle shadows for abandoned aesthetic
    
    // Add buildings as shadow casters
    for (const building of this.buildingMeshes) {
      this.shadowGenerator.addShadowCaster(building);
    }
    
    // Make terrain receive shadows
    if (this.terrainMesh) {
      this.terrainMesh.receiveShadows = true;
    }

    console.log('Shadows configured with 1024x1024 shadow map');
  }

  /**
   * Clear current environment
   * Removes all terrain, buildings, and lights created by this manager
   * Validates: Requirement 8.3
   * 
   * @param _scene - The Babylon.js scene (unused but kept for API consistency)
   */
  public clear(_scene: BABYLON.Scene): void {
    // Dispose shadow generator
    if (this.shadowGenerator) {
      this.shadowGenerator.dispose();
      this.shadowGenerator = null;
    }

    // Dispose terrain
    if (this.terrainMesh) {
      if (this.terrainMesh.physicsImpostor) {
        this.terrainMesh.physicsImpostor.dispose();
      }
      this.terrainMesh.dispose();
      this.terrainMesh = null;
    }

    // Dispose buildings
    for (const building of this.buildingMeshes) {
      if (building.physicsImpostor) {
        building.physicsImpostor.dispose();
      }
      building.dispose();
    }
    this.buildingMeshes = [];

    // Dispose lights
    for (const light of this.lights) {
      light.dispose();
    }
    this.lights = [];

    console.log('Environment cleared');
  }

  /**
   * Get the terrain mesh
   * 
   * @returns The terrain mesh or null if not created
   */
  public getTerrain(): BABYLON.Mesh | null {
    return this.terrainMesh;
  }

  /**
   * Get all building meshes
   * 
   * @returns Array of building meshes
   */
  public getBuildings(): BABYLON.Mesh[] {
    return this.buildingMeshes;
  }

  /**
   * Clean up all resources
   */
  public dispose(scene: BABYLON.Scene): void {
    this.clear(scene);
    console.log('EnvironmentManager disposed');
  }
}
