import * as BABYLON from '@babylonjs/core';
import * as CANNON from 'cannon';
import { PlayerController } from './PlayerController';

/**
 * GameManager coordinates game initialization, scene management, and game loop
 * Validates: Requirements 5.3, 6.4, 7.1, 7.2
 */
export class GameManager {
  private engine: BABYLON.Engine | null = null;
  private scene: BABYLON.Scene | null = null;
  private playerController: PlayerController | null = null;
  private isRunning: boolean = false;

  /**
   * Initialize the game with the provided canvas element
   * Creates Babylon.js engine and scene with basic lighting
   */
  public initialize(canvas: HTMLCanvasElement): void {
    try {

      // Check for WebGL support
      if (!this.isWebGLSupported()) {
        throw new Error('WebGL is not supported in this browser. Please update your browser or try a different one.');
      }

      // Create Babylon.js engine
      this.engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
      });

      // Create scene
      this.scene = new BABYLON.Scene(this.engine);

      // Set up physics engine
      this.setupPhysics();

      // Set up basic lighting
      this.setupLighting();

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
   * Clean up resources
   */
  public dispose(): void {
    this.stop();

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

    console.log('GameManager disposed');
  }

  /**
   * Set up physics engine with Cannon.js
   * Configures gravity and enables physics simulation
   * Validates: Requirements 3.1, 4.1, 4.2
   */
  private setupPhysics(): void {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    // Create gravity vector (standard Earth gravity: 9.81 m/s²)
    const gravityVector = new BABYLON.Vector3(0, -9.81, 0);

    // Initialize physics plugin with Cannon.js
    const physicsPlugin = new BABYLON.CannonJSPlugin(true, 10, CANNON);

    // Enable physics on the scene
    this.scene.enablePhysics(gravityVector, physicsPlugin);

    console.log('Physics engine initialized with gravity:', gravityVector);
  }

  /**
   * Set up basic lighting for the scene
   * Creates ambient light and directional light as per design
   */
  private setupLighting(): void {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    // Ambient light for overall illumination
    const ambientLight = new BABYLON.HemisphericLight(
      'ambientLight',
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );
    ambientLight.intensity = 0.6;

    // Directional light for shadows and depth
    const directionalLight = new BABYLON.DirectionalLight(
      'directionalLight',
      new BABYLON.Vector3(-1, -2, -1),
      this.scene
    );
    directionalLight.intensity = 0.8;

    console.log('Lighting configured');
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
   * Handle errors by displaying error message to user
   * Validates: Requirement 7.3
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
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }
}
