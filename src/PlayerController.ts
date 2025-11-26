import * as BABYLON from '@babylonjs/core';

/**
 * PlayerController manages the player camera and movement
 * Implements first-person controls with WASD movement and mouse look
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3
 */
export class PlayerController {
  private camera: BABYLON.UniversalCamera | null = null;
  private playerMesh: BABYLON.Mesh | null = null;
  private physicsImpostor: BABYLON.PhysicsImpostor | null = null;

  /**
   * Initialize player with camera at the specified starting position
   * Sets up UniversalCamera with FPS controls, pointer lock, and WASD movement
   * 
   * @param scene - The Babylon.js scene to add the camera to
   * @param startPosition - The initial position of the player camera
   */
  public initialize(scene: BABYLON.Scene, startPosition: BABYLON.Vector3): void {

    // Create UniversalCamera for first-person controls
    // Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2
    this.camera = new BABYLON.UniversalCamera('playerCamera', startPosition, scene);

    // Configure camera properties
    // FOV (Field of View) - standard FPS value
    this.camera.fov = Math.PI / 3; // 60 degrees

    // Near and far clipping planes
    this.camera.minZ = 0.1; // Near plane
    this.camera.maxZ = 1000; // Far plane

    // Movement speed (units per second)
    this.camera.speed = 0.5;

    // Angular sensitivity for mouse look
    this.camera.angularSensibility = 1000; // Lower = more sensitive

    // Configure keyboard controls (WASD)
    // These are the default keys for UniversalCamera:
    // W (87) - forward
    // S (83) - backward
    // A (65) - left
    // D (68) - right
    this.camera.keysUp = [87]; // W
    this.camera.keysDown = [83]; // S
    this.camera.keysLeft = [65]; // A
    this.camera.keysRight = [68]; // D

    // Attach camera controls to the canvas
    this.camera.attachControl(scene.getEngine().getRenderingCanvas(), true);

    // Set this camera as the active camera for the scene
    scene.activeCamera = this.camera;

    // Create an invisible mesh for physics collision
    // The camera will be parented to this mesh
    // Using a sphere for the player collision (simpler than capsule, works well for FPS)
    // Validates: Requirements 3.1, 4.1, 4.2
    this.playerMesh = BABYLON.MeshBuilder.CreateSphere(
      'playerCollider',
      { diameter: 1.8 }, // Approximate human height/width
      scene
    );
    this.playerMesh.position = startPosition.clone();
    this.playerMesh.isVisible = false; // Make it invisible

    // Create physics imposter for the player mesh
    this.physicsImpostor = new BABYLON.PhysicsImpostor(
      this.playerMesh,
      BABYLON.PhysicsImpostor.SphereImpostor,
      {
        mass: 1, // Player has mass for gravity to affect it
        friction: 0.5, // Moderate friction for natural movement
        restitution: 0.0, // No bounciness - player shouldn't bounce
      },
      scene
    );

    // Disable camera's built-in collision system since we're using physics
    this.camera.checkCollisions = false;

    console.log('PlayerController initialized at position:', startPosition);
  }

  /**
   * Get the player camera
   * 
   * @returns The UniversalCamera instance
   */
  public getCamera(): BABYLON.UniversalCamera {
    if (!this.camera) {
      throw new Error('PlayerController not initialized');
    }
    return this.camera;
  }

  /**
   * Get the physics imposter
   * 
   * @returns The PhysicsImpostor instance
   */
  public getPhysicsImpostor(): BABYLON.PhysicsImpostor {
    if (!this.physicsImpostor) {
      throw new Error('Physics imposter not initialized');
    }
    return this.physicsImpostor;
  }

  /**
   * Update player state (called each frame)
   * Syncs camera position with physics mesh
   * 
   * @param _deltaTime - Time elapsed since last frame in seconds
   */
  public update(_deltaTime: number): void {
    if (!this.camera || !this.playerMesh) {
      return;
    }

    // Sync camera position with physics mesh position
    // The physics engine controls the mesh position, and we follow it with the camera
    this.camera.position = this.playerMesh.position.clone();
  }

  /**
   * Handle jump input
   * Placeholder for future physics integration
   */
  public jump(): void {
    // Will be implemented when physics engine is added
    console.log('Jump requested (physics not yet implemented)');
  }

  /**
   * Check if player is grounded
   * Placeholder for future physics integration
   * 
   * @returns Always false until physics is implemented
   */
  public isGrounded(): boolean {
    // Will be implemented when physics engine is added
    return false;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.physicsImpostor) {
      this.physicsImpostor.dispose();
      this.physicsImpostor = null;
    }
    if (this.playerMesh) {
      this.playerMesh.dispose();
      this.playerMesh = null;
    }
    if (this.camera) {
      this.camera.dispose();
      this.camera = null;
    }
    console.log('PlayerController disposed');
  }
}
