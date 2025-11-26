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
  private scene: BABYLON.Scene | null = null;
  private jumpStrength: number = 6.0; // Upward impulse strength for jumping (tuned for better feel)
  private groundCheckDistance: number = 1.0; // Distance to check for ground
  private moveSpeed: number = 6.0; // Movement speed in units per second (tuned for better responsiveness)
  private movementDamping: number = 0.85; // Damping factor for movement (tuned for smoother stopping)
  private inputVector: BABYLON.Vector3 = BABYLON.Vector3.Zero(); // Current input direction
  private keyStates: Map<string, boolean> = new Map(); // Track key press states

  /**
   * Initialize player with camera at the specified starting position
   * Sets up UniversalCamera with FPS controls, pointer lock, and WASD movement
   * 
   * @param scene - The Babylon.js scene to add the camera to
   * @param startPosition - The initial position of the player camera
   */
  public initialize(scene: BABYLON.Scene, startPosition: BABYLON.Vector3): void {
    this.scene = scene;

    // Create UniversalCamera for first-person controls
    // Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2
    this.camera = new BABYLON.UniversalCamera('playerCamera', startPosition, scene);

    // Configure camera properties
    // FOV (Field of View) - standard FPS value
    this.camera.fov = Math.PI / 2.8; // ~64 degrees for slightly wider view

    // Near and far clipping planes
    this.camera.minZ = 0.1; // Near plane
    this.camera.maxZ = 1000; // Far plane

    // Disable camera's built-in movement - we'll handle it manually with physics
    this.camera.speed = 0;

    // Angular sensitivity for mouse look (tuned for better feel)
    // Validates: Requirements 6.1, 6.2
    this.camera.angularSensibility = 1500; // Tuned for comfortable mouse sensitivity

    // Disable built-in keyboard controls - we'll handle input manually
    this.camera.keysUp = [];
    this.camera.keysDown = [];
    this.camera.keysLeft = [];
    this.camera.keysRight = [];

    // Attach camera controls to the canvas (for mouse look only)
    const canvas = scene.getEngine().getRenderingCanvas();
    this.camera.attachControl(canvas, true);

    // Set this camera as the active camera for the scene
    scene.activeCamera = this.camera;

    // Set up pointer lock for proper FPS mouse control
    // Validates: Requirements 2.1, 2.2
    this.setupPointerLock(canvas);

    // Set up keyboard input tracking for movement and jumping
    // Validates: Requirements 1.1, 1.2, 1.3, 1.4, 3.2, 3.3
    scene.onKeyboardObservable.add((kbInfo) => {
      const key = kbInfo.event.code;
      
      if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
        this.keyStates.set(key, true);
        
        // Handle jump on spacebar press
        if (key === 'Space') {
          this.jump();
        }
      } else if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYUP) {
        this.keyStates.set(key, false);
      }
    });

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
    // Tuned parameters for smooth collision response and sliding along walls
    // Validates: Requirements 4.3, 4.4
    this.physicsImpostor = new BABYLON.PhysicsImpostor(
      this.playerMesh,
      BABYLON.PhysicsImpostor.SphereImpostor,
      {
        mass: 1, // Player has mass for gravity to affect it
        friction: 0.0, // Zero friction for smooth movement and wall sliding
        restitution: 0.0, // No bounciness - player shouldn't bounce
      },
      scene
    );

    // Lock rotation so player doesn't tip over
    // This ensures the player stays upright during collisions
    this.physicsImpostor.physicsBody.fixedRotation = true;
    this.physicsImpostor.physicsBody.updateMassProperties();

    // Disable camera's built-in collision system since we're using physics
    this.camera.checkCollisions = false;

    console.log('PlayerController initialized at position:', startPosition);
  }

  /**
   * Setup pointer lock for FPS-style mouse control
   * Validates: Requirements 2.1, 2.2
   * 
   * @param canvas - The canvas element to attach pointer lock to
   */
  private setupPointerLock(canvas: HTMLCanvasElement | null): void {
    if (!canvas) {
      return;
    }

    // Request pointer lock on canvas click
    canvas.addEventListener('click', () => {
      canvas.requestPointerLock = canvas.requestPointerLock || 
                                   (canvas as any).mozRequestPointerLock || 
                                   (canvas as any).webkitRequestPointerLock;
      
      if (canvas.requestPointerLock) {
        canvas.requestPointerLock();
      }
    });

    // Handle pointer lock change events
    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvas ||
                       (document as any).mozPointerLockElement === canvas ||
                       (document as any).webkitPointerLockElement === canvas;
      
      if (isLocked) {
        console.log('Pointer locked - mouse look enabled');
      } else {
        console.log('Pointer unlocked - press ESC or click canvas to re-enable');
      }
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mozpointerlockchange', onPointerLockChange);
    document.addEventListener('webkitpointerlockchange', onPointerLockChange);
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
   * Handles physics-based movement with input and damping
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 4.3, 4.4
   * 
   * @param _deltaTime - Time elapsed since last frame in seconds (unused in physics-based movement)
   */
  public update(_deltaTime: number): void {
    if (!this.camera || !this.playerMesh || !this.physicsImpostor || !this.scene) {
      return;
    }

    // Get current input state
    this.updateInputVector();

    // Apply movement based on input
    this.applyMovement();

    // Apply damping to horizontal velocity when no input
    // Validates: Requirement 1.5 - movement cessation on input release
    this.applyDamping();

    // Sync camera position with physics mesh position
    // The physics engine controls the mesh position, and we follow it with the camera
    this.camera.position = this.playerMesh.position.clone();
  }

  /**
   * Update input vector based on keyboard state
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4
   */
  private updateInputVector(): void {
    // Reset input vector
    this.inputVector.set(0, 0, 0);

    // Check WASD keys
    // W key - forward
    if (this.keyStates.get('KeyW')) {
      this.inputVector.z += 1;
    }
    // S key - backward
    if (this.keyStates.get('KeyS')) {
      this.inputVector.z -= 1;
    }
    // A key - left
    if (this.keyStates.get('KeyA')) {
      this.inputVector.x -= 1;
    }
    // D key - right
    if (this.keyStates.get('KeyD')) {
      this.inputVector.x += 1;
    }

    // Normalize input vector if it has magnitude
    if (this.inputVector.length() > 0) {
      this.inputVector.normalize();
    }
  }

  /**
   * Apply movement force based on input and camera direction
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 4.3, 4.4
   */
  private applyMovement(): void {
    if (!this.camera || !this.physicsImpostor) {
      return;
    }

    // If no input, don't apply movement force
    if (this.inputVector.length() === 0) {
      return;
    }

    // Get camera's forward and right vectors (ignoring vertical component)
    const forward = this.camera.getDirection(BABYLON.Axis.Z);
    forward.y = 0; // Ignore vertical component for horizontal movement
    forward.normalize();

    const right = this.camera.getDirection(BABYLON.Axis.X);
    right.y = 0; // Ignore vertical component
    right.normalize();

    // Calculate movement direction in world space
    const moveDirection = forward.scale(this.inputVector.z).add(right.scale(this.inputVector.x));
    
    // Normalize to ensure consistent speed in all directions
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
    }

    // Calculate desired velocity
    const desiredVelocity = moveDirection.scale(this.moveSpeed);

    // Get current velocity
    const currentVelocity = this.physicsImpostor.getLinearVelocity()!;

    // Calculate velocity change needed (only for horizontal components)
    const velocityChange = new BABYLON.Vector3(
      desiredVelocity.x - currentVelocity.x,
      0, // Don't affect vertical velocity (preserve jumping/falling)
      desiredVelocity.z - currentVelocity.z
    );

    // Apply force to achieve desired velocity
    // Using a higher factor to overcome ground friction and make movement responsive
    const force = velocityChange.scale(this.physicsImpostor.mass * 50);
    this.physicsImpostor.applyForce(force, this.physicsImpostor.getObjectCenter());
  }

  /**
   * Apply damping to horizontal velocity when no input
   * This makes the player slow down naturally when keys are released
   * Validates: Requirement 1.5
   */
  private applyDamping(): void {
    if (!this.physicsImpostor) {
      return;
    }

    // Only apply damping when there's no input
    if (this.inputVector.length() > 0) {
      return;
    }

    // Get current velocity
    const velocity = this.physicsImpostor.getLinearVelocity();
    if (!velocity) {
      return;
    }

    // Apply damping to horizontal components only (preserve vertical for jumping/falling)
    const dampedVelocity = new BABYLON.Vector3(
      velocity.x * this.movementDamping,
      velocity.y, // Don't damp vertical velocity
      velocity.z * this.movementDamping
    );

    // Set the damped velocity
    this.physicsImpostor.setLinearVelocity(dampedVelocity);
  }

  /**
   * Handle jump input
   * Applies upward impulse when player is grounded
   * Validates: Requirements 3.2, 3.3
   */
  public jump(): void {
    if (!this.physicsImpostor) {
      console.warn('Cannot jump: physics imposter not initialized');
      return;
    }

    // Only allow jumping if player is grounded
    // Validates: Requirement 3.3 - prevent double jumping
    if (!this.isGrounded()) {
      return;
    }

    // Apply upward impulse for jump
    // Validates: Requirement 3.2 - apply upward velocity
    const jumpImpulse = new BABYLON.Vector3(0, this.jumpStrength, 0);
    this.physicsImpostor.applyImpulse(
      jumpImpulse,
      this.physicsImpostor.getObjectCenter()
    );

    console.log('Jump executed');
  }

  /**
   * Check if player is grounded using raycast
   * Validates: Requirements 3.3, 3.4
   * 
   * @returns True if player is on the ground, false otherwise
   */
  public isGrounded(): boolean {
    if (!this.scene || !this.playerMesh) {
      return false;
    }

    // Cast a ray downward from the player position
    const origin = this.playerMesh.position.clone();
    const direction = new BABYLON.Vector3(0, -1, 0);
    const length = this.groundCheckDistance;

    const ray = new BABYLON.Ray(origin, direction, length);

    // Check if ray hits anything
    const hit = this.scene.pickWithRay(ray, (mesh) => {
      // Ignore the player mesh itself
      return mesh !== this.playerMesh && mesh.isPickable;
    });

    // Player is grounded if ray hits something within the check distance
    return hit !== null && hit.hit;
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
    this.keyStates.clear();
    this.scene = null;
    console.log('PlayerController disposed');
  }
}
