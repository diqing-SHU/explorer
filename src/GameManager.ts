import * as BABYLON from '@babylonjs/core';
import * as CANNON from 'cannon';
import { PlayerController } from './PlayerController';
import { EnvironmentManager, EnvironmentConfig } from './EnvironmentManager';
import { ChunkManager, WorldConfigManager } from './procedural';

/**
 * GameManager coordinates game initialization, scene management, and game loop
 * Validates: Requirements 5.3, 6.4, 7.1, 7.2
 */
export class GameManager {
  private engine: BABYLON.Engine | null = null;
  private scene: BABYLON.Scene | null = null;
  private playerController: PlayerController | null = null;
  private environmentManager: EnvironmentManager | null = null;
  private chunkManager: ChunkManager | null = null;
  private worldConfigManager: WorldConfigManager | null = null;
  private isRunning: boolean = false;
  private proceduralGenerationEnabled: boolean = false;

  /**
   * Initialize the game with the provided canvas element
   * Creates Babylon.js engine and scene with basic lighting
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4
   */
  public initialize(canvas: HTMLCanvasElement, testEngine?: BABYLON.Engine): void {
    try {
      // Show loading indicator
      this.showLoading();

      // Check for WebGL support (skip if test engine provided)
      if (!testEngine && !this.isWebGLSupported()) {
        throw new Error('WebGL is not supported in this browser. Please update your browser or try a different one.');
      }

      // Create Babylon.js engine with optimized settings
      // Validates: Requirements 6.1, 6.2
      // Use test engine if provided (for testing), otherwise create real engine
      this.engine = testEngine || new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true, // Enable antialiasing for better visual quality
      });

      // Create scene
      this.scene = new BABYLON.Scene(this.engine);
      
      // Enable performance optimizations
      this.setupPerformanceOptimizations();

      // Set up physics engine
      this.setupPhysics();

      // Initialize environment manager
      this.environmentManager = new EnvironmentManager();

      // Initialize player controller
      this.setupPlayer();

      // Set up window resize handling
      this.setupResizeHandler();

      console.log('GameManager initialized successfully');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Start the game render loop
   */
  public start(): void {
    if (!this.engine || !this.scene) {
      throw new Error('GameManager must be initialized before starting');
    }

    this.isRunning = true;

    // Register update callback before render
    this.scene.registerBeforeRender(() => {
      if (this.playerController && this.isRunning) {
        const deltaTime = this.engine!.getDeltaTime() / 1000; // Convert to seconds
        this.playerController.update(deltaTime);
        
        // Update chunk manager if procedural generation is enabled
        // Validates: Requirements 12.3
        if (this.chunkManager && this.proceduralGenerationEnabled) {
          const playerPosition = this.playerController.getCamera().position;
          this.chunkManager.update(playerPosition);
        }
      }
    });

    // Start the render loop
    this.engine.runRenderLoop(() => {
      if (this.scene && this.isRunning) {
        this.scene.render();
      }
    });

    console.log('Game started');
  }

  /**
   * Stop the game render loop
   */
  public stop(): void {
    this.isRunning = false;
    console.log('Game stopped');
  }

  /**
   * Get the current scene
   */
  public getScene(): BABYLON.Scene {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }
    return this.scene;
  }

  /**
   * Get the engine instance
   */
  public getEngine(): BABYLON.Engine {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }
    return this.engine;
  }

  /**
   * Get the player controller
   */
  public getPlayerController(): PlayerController {
    if (!this.playerController) {
      throw new Error('PlayerController not initialized');
    }
    return this.playerController;
  }

  /**
   * Get the environment manager
   */
  public getEnvironmentManager(): EnvironmentManager {
    if (!this.environmentManager) {
      throw new Error('EnvironmentManager not initialized');
    }
    return this.environmentManager;
  }

  /**
   * Get the chunk manager
   * Validates: Requirement 12.1
   */
  public getChunkManager(): ChunkManager {
    if (!this.chunkManager) {
      throw new Error('ChunkManager not initialized');
    }
    return this.chunkManager;
  }

  /**
   * Get the world config manager
   */
  public getWorldConfigManager(): WorldConfigManager {
    if (!this.worldConfigManager) {
      throw new Error('WorldConfigManager not initialized');
    }
    return this.worldConfigManager;
  }

  /**
   * Check if procedural generation is enabled
   */
  public isProceduralGenerationEnabled(): boolean {
    return this.proceduralGenerationEnabled;
  }

  /**
   * Load environment from configuration
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4
   * 
   * @param config - Environment configuration object
   */
  public loadEnvironment(config: EnvironmentConfig): void {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }
    if (!this.environmentManager) {
      throw new Error('EnvironmentManager not initialized');
    }

    this.environmentManager.loadEnvironment(this.scene, config);
    
    // Add skybox for better visual quality
    this.setupSkybox();
  }

  /**
   * Enable procedural world generation
   * Initializes ChunkManager and generators for infinite world generation
   * Validates: Requirements 12.1, 12.2, 12.3, 12.4
   * 
   * @param worldConfig - Optional world configuration (uses default if not provided)
   * @returns Promise that resolves when procedural generation is fully initialized
   */
  public async enableProceduralGeneration(worldConfig?: WorldConfigManager): Promise<void> {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    console.log('Initializing chunk manager...');
    // Create or use provided world config manager
    this.worldConfigManager = worldConfig || new WorldConfigManager();

    // Initialize chunk manager
    // Validates: Requirements 12.1, 12.3
    this.chunkManager = new ChunkManager();
    this.chunkManager.initialize(this.scene, this.worldConfigManager.getChunkConfig());

    console.log('Loading generators...');
    // Import and register generators (wait for completion)
    await this.setupGenerators();

    // Enable procedural generation in update loop
    this.proceduralGenerationEnabled = true;

    console.log('Procedural generation enabled');
    console.log('World config:', this.worldConfigManager.getConfig());
  }

  /**
   * Disable procedural world generation
   * Stops chunk generation and cleans up resources
   */
  public disableProceduralGeneration(): void {
    this.proceduralGenerationEnabled = false;

    if (this.chunkManager) {
      this.chunkManager.dispose();
      this.chunkManager = null;
    }

    this.worldConfigManager = null;

    console.log('Procedural generation disabled');
  }

  /**
   * Setup and register all generators with the chunk manager
   * Validates: Requirements 12.1, 12.2, 12.4
   * @returns Promise that resolves when all generators are registered
   */
  private async setupGenerators(): Promise<void> {
    if (!this.chunkManager || !this.worldConfigManager) {
      return;
    }

    try {
      // Import generators dynamically to avoid circular dependencies
      const { 
        RoadGenerator, 
        BuildingGenerator, 
        TrafficGenerator, 
        VehicleGenerator,
        TerrainGenerator,
        PlacementRuleEngineImpl,
        NoRoadOverlapRule,
        NoObjectCollisionRule,
        MinimumSpacingRule
      } = await import('./procedural');

      if (!this.chunkManager || !this.worldConfigManager) {
        return;
      }

      // Create placement rule engine
      // Validates: Requirement 10.4
      const placementEngine = new PlacementRuleEngineImpl(10);
      placementEngine.registerRule(new NoRoadOverlapRule(['building', 'vehicle', 'sign']));
      placementEngine.registerRule(new NoObjectCollisionRule(placementEngine, ['building', 'vehicle', 'sign']));
      placementEngine.registerRule(new MinimumSpacingRule(placementEngine, 5, ['building']));
      this.chunkManager.setPlacementEngine(placementEngine);

      // Create and register generators
      // Validates: Requirements 12.2, 12.4
      const roadGenerator = new RoadGenerator();
      const buildingGenerator = new BuildingGenerator();
      const trafficGenerator = new TrafficGenerator();
      const vehicleGenerator = new VehicleGenerator();
      const terrainGenerator = new TerrainGenerator({
        heightScale: 2,
        noiseScale: 0.05,
        octaves: 3,
        persistence: 0.5,
        resolution: 20
      });

      // Configure generators with world config
      roadGenerator.configure(this.worldConfigManager.getRoadConfig());
      buildingGenerator.configure(this.worldConfigManager.getBuildingConfig());
      trafficGenerator.configure(this.worldConfigManager.getTrafficConfig());
      vehicleGenerator.configure(this.worldConfigManager.getVehicleConfig());

      // Wire up generator dependencies
      // BuildingGenerator needs RoadGenerator to avoid placing buildings on roads
      buildingGenerator.setRoadGenerator(roadGenerator);
      
      // TrafficGenerator needs RoadGenerator to place signs along roads
      trafficGenerator.setRoadGenerator(roadGenerator);
      trafficGenerator.setBuildingGenerator(buildingGenerator);
      
      // VehicleGenerator needs RoadGenerator to place vehicles along roads
      vehicleGenerator.setRoadGenerator(roadGenerator);

      // Register generators in the correct order
      this.chunkManager.registerGenerator(terrainGenerator);
      this.chunkManager.registerGenerator(roadGenerator);
      this.chunkManager.registerGenerator(buildingGenerator);
      this.chunkManager.registerGenerator(trafficGenerator);
      this.chunkManager.registerGenerator(vehicleGenerator);

      console.log('Generators registered:', [
        terrainGenerator.getName(),
        roadGenerator.getName(),
        buildingGenerator.getName(),
        trafficGenerator.getName(),
        vehicleGenerator.getName()
      ]);
    } catch (error) {
      console.error('Failed to load generators:', error);
      throw error;
    }
  }

  /**
   * Setup basic scene environment (lighting, skybox, and ground)
   * Validates: Requirements 6.1, 6.2
   */
  public setupBasicEnvironment(): void {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    // Setup ground plane
    this.setupGround();

    // Setup lighting
    this.setupLighting();
    
    // Setup skybox
    this.setupSkybox();
    
    console.log('Basic environment configured');
  }

  /**
   * Setup ground plane
   * Validates: Requirement 5.1
   */
  private setupGround(): void {
    if (!this.scene) {
      return;
    }

    // Create a large ground plane
    const ground = BABYLON.MeshBuilder.CreateGround(
      'ground',
      { width: 10000, height: 10000 },
      this.scene
    );

    // Create material for ground
    const groundMaterial = new BABYLON.StandardMaterial('groundMaterial', this.scene);
    
    // Set ground color (grayish for urban environment)
    groundMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    ground.material = groundMaterial;

    // Create physics imposter for ground
    ground.physicsImpostor = new BABYLON.PhysicsImpostor(
      ground,
      BABYLON.PhysicsImpostor.BoxImpostor,
      { mass: 0, friction: 0.5, restitution: 0.0 },
      this.scene
    );

    console.log('Ground configured');
  }

  /**
   * Setup lighting for the scene
   * Validates: Requirement 5.3
   */
  private setupLighting(): void {
    if (!this.scene) {
      return;
    }

    // Create ambient light for overall illumination
    const ambientLight = new BABYLON.HemisphericLight(
      'ambientLight',
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );
    ambientLight.intensity = 0.6;
    ambientLight.diffuse = new BABYLON.Color3(1, 1, 1);

    // Create directional light (sun)
    const directionalLight = new BABYLON.DirectionalLight(
      'directionalLight',
      new BABYLON.Vector3(0.5, -1, 0.5),
      this.scene
    );
    directionalLight.intensity = 0.8;
    directionalLight.diffuse = new BABYLON.Color3(1, 0.95, 0.9);

    console.log('Lighting configured');
  }

  /**
   * Setup a simple skybox for better visual atmosphere
   * Validates: Requirements 6.1, 6.2
   */
  private setupSkybox(): void {
    if (!this.scene) {
      return;
    }

    // Create a simple skybox using a large sphere
    const skybox = BABYLON.MeshBuilder.CreateSphere(
      'skybox',
      { diameter: 800, segments: 32 },
      this.scene
    );

    // Create material for skybox
    const skyboxMaterial = new BABYLON.StandardMaterial('skyboxMaterial', this.scene);
    
    // Set sky color gradient (urban atmosphere)
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.7, 0.8);
    skyboxMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.6, 0.7);
    skyboxMaterial.backFaceCulling = false; // Render inside of sphere
    
    skybox.material = skyboxMaterial;
    
    // Make skybox non-pickable and disable collisions
    skybox.isPickable = false;
    skybox.checkCollisions = false;
    
    // Render skybox first (behind everything)
    skybox.renderingGroupId = 0;
    skybox.infiniteDistance = true;

    console.log('Skybox configured');
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stop();

    if (this.chunkManager) {
      this.chunkManager.dispose();
      this.chunkManager = null;
    }

    if (this.environmentManager && this.scene) {
      this.environmentManager.dispose(this.scene);
      this.environmentManager = null;
    }

    if (this.playerController) {
      this.playerController.dispose();
      this.playerController = null;
    }

    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }

    if (this.engine) {
      this.engine.dispose();
      this.engine = null;
    }

    this.worldConfigManager = null;
    this.proceduralGenerationEnabled = false;

    console.log('GameManager disposed');
  }

  /**
   * Setup performance optimizations for better frame rate
   * Validates: Requirements 6.1, 6.2
   */
  private setupPerformanceOptimizations(): void {
    if (!this.scene) {
      return;
    }

    // Enable frustum culling to avoid rendering off-screen objects
    this.scene.autoClear = false; // Don't clear color buffer (skybox handles background)
    this.scene.autoClearDepthAndStencil = true; // Clear depth buffer each frame
    
    // Optimize physics performance
    this.scene.collisionsEnabled = false; // We use physics imposters instead
    
    // Enable hardware scaling for better performance on lower-end devices
    // This can be adjusted dynamically based on FPS
    if (this.engine) {
      this.engine.setHardwareScalingLevel(1.0); // 1.0 = full resolution
    }

    console.log('Performance optimizations enabled');
  }

  /**
   * Set up physics engine with Cannon.js
   * Configures gravity and enables physics simulation
   * Validates: Requirements 3.1, 4.1, 4.2, 7.3
   */
  private setupPhysics(): void {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    try {
      // Create gravity vector (standard Earth gravity: 9.81 m/s²)
      const gravityVector = new BABYLON.Vector3(0, -9.81, 0);

      // Initialize physics plugin with Cannon.js
      const physicsPlugin = new BABYLON.CannonJSPlugin(true, 10, CANNON);

      // Enable physics on the scene
      this.scene.enablePhysics(gravityVector, physicsPlugin);

      console.log('Physics engine initialized with gravity:', gravityVector);
    } catch (error) {
      throw new Error('Failed to initialize physics engine. Please ensure your browser supports WebGL and physics simulation.');
    }
  }



  /**
   * Set up player controller with first-person camera
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3
   */
  private setupPlayer(): void {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    // Create player controller
    this.playerController = new PlayerController();

    // Initialize at a default starting position (will be configurable later)
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    this.playerController.initialize(this.scene, startPosition);

    console.log('Player controller configured');
  }

  /**
   * Set up window resize handler to maintain proper viewport
   * Validates: Requirement 6.4
   */
  private setupResizeHandler(): void {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    window.addEventListener('resize', () => {
      if (this.engine) {
        this.engine.resize();
      }
    });

    console.log('Resize handler configured');
  }

  /**
   * Check if WebGL is supported
   */
  private isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Show loading indicator
   * Validates: Requirement 7.1
   */
  private showLoading(): void {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'block';
    }
  }

  /**
   * Hide loading indicator
   * Validates: Requirement 7.2
   */
  public hideLoading(): void {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }

  /**
   * Update loading message
   * Validates: Requirement 7.1
   */
  public updateLoadingMessage(message: string): void {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.textContent = message;
    }
  }

  /**
   * Handle errors by displaying error message to user
   * Validates: Requirement 7.3, 7.4
   */
  private handleError(error: Error): void {
    console.error('GameManager error:', error);

    // Display error to user
    const errorElement = document.getElementById('error');
    const errorMessageElement = document.getElementById('errorMessage');

    if (errorElement && errorMessageElement) {
      errorMessageElement.textContent = error.message;
      errorElement.style.display = 'block';
    }

    // Hide loading indicator
    this.hideLoading();
  }
}
