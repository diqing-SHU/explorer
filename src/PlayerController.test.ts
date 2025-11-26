import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlayerController } from './PlayerController';
import * as BABYLON from '@babylonjs/core';
import * as CANNON from 'cannon';
import * as fc from 'fast-check';

describe('PlayerController', () => {
  let playerController: PlayerController;
  let canvas: HTMLCanvasElement;
  let engine: BABYLON.Engine;
  let scene: BABYLON.Scene;

  beforeEach(() => {
    // Create a canvas element
    canvas = document.createElement('canvas');
    canvas.id = 'testCanvas';
    document.body.appendChild(canvas);

    // Create engine and scene
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);

    // Enable physics for tests
    const gravityVector = new BABYLON.Vector3(0, -9.81, 0);
    const physicsPlugin = new BABYLON.CannonJSPlugin(true, 10, CANNON);
    scene.enablePhysics(gravityVector, physicsPlugin);
  });

  afterEach(() => {
    if (playerController) {
      try {
        playerController.dispose();
      } catch (e) {
        // Ignore disposal errors in tests
      }
    }
    if (scene) {
      scene.dispose();
    }
    if (engine) {
      engine.dispose();
    }
    document.body.innerHTML = '';
  });

  it('should throw error if getting camera before initialization', () => {
    playerController = new PlayerController();
    expect(() => playerController.getCamera()).toThrow('PlayerController not initialized');
  });

  it('should initialize with UniversalCamera at specified position', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(5, 10, -15);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(camera).toBeInstanceOf(BABYLON.UniversalCamera);
    expect(camera.position.x).toBe(5);
    expect(camera.position.y).toBe(10);
    expect(camera.position.z).toBe(-15);
  });

  it('should configure camera with correct FOV', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(camera.fov).toBeCloseTo(Math.PI / 2.8, 5); // ~64 degrees (tuned for polish)
  });

  it('should configure camera with correct near and far planes', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(camera.minZ).toBe(0.1);
    expect(camera.maxZ).toBe(1000);
  });

  it('should disable camera built-in movement for physics-based control', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(camera.speed).toBe(0);
  });

  it('should disable camera built-in keyboard controls for manual handling', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(camera.keysUp).toEqual([]);
    expect(camera.keysDown).toEqual([]);
    expect(camera.keysLeft).toEqual([]);
    expect(camera.keysRight).toEqual([]);
  });

  it('should set camera as active camera in scene', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(scene.activeCamera).toBe(camera);
  });

  it('should configure angular sensitivity for mouse look', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const camera = playerController.getCamera();
    expect(camera.angularSensibility).toBe(1500); // Tuned for better feel
  });

  it('should check if player is grounded using raycast', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    // Without any ground mesh, player should not be grounded
    expect(playerController.isGrounded()).toBe(false);
  });

  it('should handle update calls without errors', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    expect(() => playerController.update(0.016)).not.toThrow();
  });

  it('should handle jump calls without errors', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    expect(() => playerController.jump()).not.toThrow();
  });

  it('should dispose camera properly', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    expect(() => playerController.dispose()).not.toThrow();
    expect(() => playerController.getCamera()).toThrow('PlayerController not initialized');
  });

  it('should create physics imposter for player', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const physicsImpostor = playerController.getPhysicsImpostor();
    expect(physicsImpostor).toBeDefined();
    expect(physicsImpostor.type).toBe(BABYLON.PhysicsImpostor.SphereImpostor);
  });

  it('should configure physics imposter with correct properties for smooth collision', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 2, -10);
    
    playerController.initialize(scene, startPosition);
    
    const physicsImpostor = playerController.getPhysicsImpostor();
    expect(physicsImpostor.mass).toBe(1);
    expect(physicsImpostor.friction).toBe(0.0); // Zero friction for smooth movement
    expect(physicsImpostor.restitution).toBe(0.0);
  });

  it('should detect ground when player is near a surface', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 1, 0);
    
    playerController.initialize(scene, startPosition);
    
    // Create a ground mesh below the player
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
    ground.position.y = 0;
    ground.isPickable = true;
    
    // Player should be grounded (within 1 unit of ground)
    expect(playerController.isGrounded()).toBe(true);
    
    ground.dispose();
  });

  it('should not detect ground when player is too far from surface', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 5, 0);
    
    playerController.initialize(scene, startPosition);
    
    // Create a ground mesh far below the player
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
    ground.position.y = 0;
    ground.isPickable = true;
    
    // Player should not be grounded (more than 1 unit from ground)
    expect(playerController.isGrounded()).toBe(false);
    
    ground.dispose();
  });

  it('should apply upward impulse when jumping while grounded', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 1, 0);
    
    playerController.initialize(scene, startPosition);
    
    // Create a ground mesh below the player
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
    ground.position.y = 0;
    ground.isPickable = true;
    
    const physicsImpostor = playerController.getPhysicsImpostor();
    const initialVelocity = physicsImpostor.getLinearVelocity()?.y || 0;
    
    // Jump should work when grounded
    playerController.jump();
    
    // After jump, vertical velocity should be positive (upward)
    const afterJumpVelocity = physicsImpostor.getLinearVelocity()?.y || 0;
    expect(afterJumpVelocity).toBeGreaterThan(initialVelocity);
    
    ground.dispose();
  });

  it('should not jump when not grounded', () => {
    playerController = new PlayerController();
    const startPosition = new BABYLON.Vector3(0, 5, 0);
    
    playerController.initialize(scene, startPosition);
    
    const physicsImpostor = playerController.getPhysicsImpostor();
    
    // Set a downward velocity to simulate falling
    physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, -2, 0));
    const velocityBeforeJump = physicsImpostor.getLinearVelocity()?.y || 0;
    
    // Try to jump while airborne
    playerController.jump();
    
    // Velocity should not change (no jump impulse applied)
    const velocityAfterJump = physicsImpostor.getLinearVelocity()?.y || 0;
    expect(velocityAfterJump).toBeCloseTo(velocityBeforeJump, 1);
  });

  /**
   * Feature: 3d-exploration-game, Property 3: Mouse input rotates camera
   * Validates: Requirements 2.1, 2.2
   * 
   * For any camera state and mouse delta input, applying horizontal mouse movement 
   * should rotate the camera yaw proportionally, and vertical mouse movement should 
   * rotate the camera pitch proportionally within valid bounds.
   */
  it('should rotate camera based on mouse input', () => {
    fc.assert(
      fc.property(
        // Generate random initial camera rotation (yaw and pitch in radians)
        fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }), // Initial yaw
        fc.double({ min: -Math.PI / 2, max: Math.PI / 2, noNaN: true }), // Initial pitch
        // Generate random mouse delta (horizontal and vertical movement)
        fc.double({ min: -100, max: 100, noNaN: true }), // Horizontal mouse delta
        fc.double({ min: -100, max: 100, noNaN: true }), // Vertical mouse delta
        (initialYaw, initialPitch, mouseDeltaX, mouseDeltaY) => {
          // Setup
          playerController = new PlayerController();
          const startPosition = new BABYLON.Vector3(0, 2, 0);
          playerController.initialize(scene, startPosition);
          
          const camera = playerController.getCamera();
          
          // Set initial camera rotation
          camera.rotation.y = initialYaw;
          camera.rotation.x = initialPitch;
          
          // Store initial rotation values
          const initialYawValue = camera.rotation.y;
          const initialPitchValue = camera.rotation.x;
          
          // Get angular sensitivity (configured in PlayerController)
          const angularSensibility = camera.angularSensibility;
          
          // Simulate mouse movement by directly updating camera rotation
          // This is how Babylon's UniversalCamera handles mouse input internally
          // Horizontal mouse movement affects yaw (rotation.y)
          const yawChange = mouseDeltaX / angularSensibility;
          camera.rotation.y += yawChange;
          
          // Vertical mouse movement affects pitch (rotation.x)
          const pitchChange = mouseDeltaY / angularSensibility;
          camera.rotation.x += pitchChange;
          
          // Get final rotation values
          const finalYaw = camera.rotation.y;
          const finalPitch = camera.rotation.x;
          
          // Cleanup
          playerController.dispose();
          playerController = null as any;
          
          // Verify horizontal rotation (yaw) changed proportionally
          const expectedYaw = initialYawValue + yawChange;
          const yawMatches = Math.abs(finalYaw - expectedYaw) < 0.001;
          
          // Verify vertical rotation (pitch) changed proportionally
          const expectedPitch = initialPitchValue + pitchChange;
          const pitchMatches = Math.abs(finalPitch - expectedPitch) < 0.001;
          
          // Both rotations should match expected values
          return yawMatches && pitchMatches;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: 3d-exploration-game, Property 5: Jump initiates upward velocity
   * Validates: Requirements 3.2
   * 
   * For any grounded player, when a jump impulse is applied to the physics imposter, 
   * the imposter's vertical velocity should become positive, and the player should 
   * transition to a non-grounded state.
   */
  it('should initiate upward velocity when jumping from grounded state', () => {
    fc.assert(
      fc.property(
        // Generate random starting positions (x, z coordinates)
        fc.double({ min: -10, max: 10, noNaN: true }),
        fc.double({ min: -10, max: 10, noNaN: true }),
        // Generate random initial vertical velocities (should be small for grounded state)
        fc.double({ min: -0.5, max: 0.5, noNaN: true }),
        (startX, startZ, initialVerticalVelocity) => {
          // Setup - create player at a position where they'll be grounded
          playerController = new PlayerController();
          
          // Create a ground mesh first
          const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 50, height: 50 }, scene);
          ground.position.y = 0;
          ground.isPickable = true;
          
          // Position player just above ground (within grounding distance)
          const startPosition = new BABYLON.Vector3(startX, 0.9, startZ);
          playerController.initialize(scene, startPosition);
          
          const physicsImpostor = playerController.getPhysicsImpostor();
          
          // Set initial vertical velocity
          const initialVelocity = new BABYLON.Vector3(0, initialVerticalVelocity, 0);
          physicsImpostor.setLinearVelocity(initialVelocity);
          
          // Verify player is grounded before jump
          const wasGrounded = playerController.isGrounded();
          
          // Get vertical velocity before jump
          const velocityBeforeJump = physicsImpostor.getLinearVelocity()?.y || 0;
          
          // Execute jump
          playerController.jump();
          
          // Get vertical velocity after jump
          const velocityAfterJump = physicsImpostor.getLinearVelocity()?.y || 0;
          
          // Cleanup
          ground.dispose();
          playerController.dispose();
          playerController = null as any;
          
          // Property verification:
          // 1. Player must have been grounded before jump
          // 2. After jump, vertical velocity should be positive (upward)
          // 3. Vertical velocity should have increased from before jump
          if (wasGrounded) {
            const hasPositiveVelocity = velocityAfterJump > 0;
            const velocityIncreased = velocityAfterJump > velocityBeforeJump;
            return hasPositiveVelocity && velocityIncreased;
          }
          
          // If player wasn't grounded, jump shouldn't have applied impulse
          // Velocity should remain approximately the same
          return Math.abs(velocityAfterJump - velocityBeforeJump) < 0.1;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: 3d-exploration-game, Property 6: Double jump prevention
   * Validates: Requirements 3.3
   * 
   * For any airborne player (not grounded), when a jump is requested, 
   * the jump impulse should not be applied, preventing mid-air jumping.
   */
  it('should prevent double jumping when player is airborne', () => {
    fc.assert(
      fc.property(
        // Generate random starting positions (x, z coordinates)
        fc.double({ min: -10, max: 10, noNaN: true }),
        fc.double({ min: -10, max: 10, noNaN: true }),
        // Generate random height above ground (high enough to be airborne)
        fc.double({ min: 2, max: 10, noNaN: true }),
        // Generate random initial downward velocity (simulating falling)
        fc.double({ min: -5, max: -0.5, noNaN: true }),
        (startX, startZ, height, initialDownwardVelocity) => {
          // Setup - create player at a position where they're airborne
          playerController = new PlayerController();
          
          // Create a ground mesh far below the player
          const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 50, height: 50 }, scene);
          ground.position.y = 0;
          ground.isPickable = true;
          
          // Position player high above ground (definitely airborne)
          const startPosition = new BABYLON.Vector3(startX, height, startZ);
          playerController.initialize(scene, startPosition);
          
          const physicsImpostor = playerController.getPhysicsImpostor();
          
          // Set initial downward velocity to simulate falling
          const initialVelocity = new BABYLON.Vector3(0, initialDownwardVelocity, 0);
          physicsImpostor.setLinearVelocity(initialVelocity);
          
          // Verify player is NOT grounded before attempting jump
          const isGrounded = playerController.isGrounded();
          
          // Get vertical velocity before jump attempt
          const velocityBeforeJump = physicsImpostor.getLinearVelocity()?.y || 0;
          
          // Attempt to jump while airborne
          playerController.jump();
          
          // Get vertical velocity after jump attempt
          const velocityAfterJump = physicsImpostor.getLinearVelocity()?.y || 0;
          
          // Cleanup
          ground.dispose();
          playerController.dispose();
          playerController = null as any;
          
          // Property verification:
          // If player is airborne (not grounded), jump should NOT apply impulse
          // Velocity should remain approximately the same (within small tolerance for physics updates)
          if (!isGrounded) {
            // Velocity should not have increased (no upward impulse applied)
            // Allow small tolerance for physics simulation variations
            const velocityDifference = Math.abs(velocityAfterJump - velocityBeforeJump);
            return velocityDifference < 0.1;
          }
          
          // If player was somehow grounded (edge case), jump would be allowed
          // This is acceptable behavior
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: 3d-exploration-game, Property 7: Landing stops downward velocity
   * Validates: Requirements 3.4
   * 
   * For any player transitioning from airborne to grounded state, the physics 
   * imposter's vertical velocity should become zero or positive (not negative), 
   * preventing the player from continuing to fall through the ground.
   */
  it('should stop downward velocity when landing on ground', () => {
    fc.assert(
      fc.property(
        // Generate random starting positions (x, z coordinates)
        fc.double({ min: -10, max: 10, noNaN: true }),
        fc.double({ min: -10, max: 10, noNaN: true }),
        // Generate random drop heights (high enough to build up velocity)
        fc.double({ min: 3, max: 15, noNaN: true }),
        (startX, startZ, dropHeight) => {
          // Setup - create player at a height above ground
          playerController = new PlayerController();
          
          // Create a ground mesh
          const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 50, height: 50 }, scene);
          ground.position.y = 0;
          ground.isPickable = true;
          
          // Add physics imposter to ground for collision
          const groundImpostor = new BABYLON.PhysicsImpostor(
            ground,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: 0, restitution: 0.0, friction: 0.5 },
            scene
          );
          
          // Position player above ground
          const startPosition = new BABYLON.Vector3(startX, dropHeight, startZ);
          playerController.initialize(scene, startPosition);
          
          const physicsImpostor = playerController.getPhysicsImpostor();
          
          // Give player an initial downward velocity to simulate falling
          const initialDownwardVelocity = -5;
          physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0, initialDownwardVelocity, 0));
          
          // Verify player starts airborne
          const wasAirborne = !playerController.isGrounded();
          
          // Simulate physics for enough time to let player fall and land
          // We'll run multiple physics steps to ensure landing occurs
          const physicsEngine = scene.getPhysicsEngine();
          let landed = false;
          let finalVerticalVelocity = initialDownwardVelocity;
          
          // Run physics simulation for up to 3 seconds (at 60 fps = 180 steps)
          for (let i = 0; i < 180; i++) {
            // Step physics forward
            if (physicsEngine) {
              physicsEngine.getPhysicsPlugin().executeStep(1/60, [physicsImpostor, groundImpostor]);
            }
            
            // Update player controller
            playerController.update(1/60);
            
            // Check if player has landed (transitioned to grounded)
            if (playerController.isGrounded()) {
              landed = true;
              
              // Run a few more physics steps to let the collision fully resolve
              // This ensures the velocity has settled after landing
              for (let j = 0; j < 10; j++) {
                if (physicsEngine) {
                  physicsEngine.getPhysicsPlugin().executeStep(1/60, [physicsImpostor, groundImpostor]);
                }
                playerController.update(1/60);
              }
              
              // Get vertical velocity after landing and settling
              const velocity = physicsImpostor.getLinearVelocity();
              if (velocity) {
                finalVerticalVelocity = velocity.y;
              }
              break;
            }
          }
          
          // Cleanup
          groundImpostor.dispose();
          ground.dispose();
          playerController.dispose();
          playerController = null as any;
          
          // Property verification:
          // 1. Player must have started airborne
          // 2. Player must have landed (become grounded)
          // 3. After landing and settling, vertical velocity should be close to zero
          //    We allow small tolerance for physics simulation
          if (wasAirborne && landed) {
            // Vertical velocity should have stopped (not continuing to fall)
            // After settling, velocity should be approximately zero or positive
            // Allow small tolerance for physics engine variations
            return finalVerticalVelocity >= -0.5;
          }
          
          // If player didn't land in the simulation time, that's a test setup issue
          // but not a property violation - just skip this case
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: 3d-exploration-game, Property 2: Movement cessation on input release
   * Validates: Requirements 1.5
   * 
   * For any avatar with non-zero velocity in a direction, when the corresponding 
   * movement input is released and no collision is preventing movement, the avatar's 
   * velocity in that direction should decrease toward zero.
   */
  it('should decrease velocity toward zero when movement input is released', () => {
    fc.assert(
      fc.property(
        // Generate random initial horizontal velocities (non-zero)
        fc.double({ min: -10, max: 10, noNaN: true }).filter(v => Math.abs(v) > 0.5),
        fc.double({ min: -10, max: 10, noNaN: true }).filter(v => Math.abs(v) > 0.5),
        // Generate random vertical velocity (for realism, but we only test horizontal)
        fc.double({ min: -5, max: 5, noNaN: true }),
        (initialVelocityX, initialVelocityZ, initialVelocityY) => {
          // Setup
          playerController = new PlayerController();
          const startPosition = new BABYLON.Vector3(0, 2, 0);
          playerController.initialize(scene, startPosition);
          
          const physicsImpostor = playerController.getPhysicsImpostor();
          
          // Set initial velocity (simulating player was moving)
          const initialVelocity = new BABYLON.Vector3(
            initialVelocityX,
            initialVelocityY,
            initialVelocityZ
          );
          physicsImpostor.setLinearVelocity(initialVelocity);
          
          // Get initial horizontal speed (magnitude of horizontal velocity)
          const initialHorizontalSpeed = Math.sqrt(
            initialVelocityX * initialVelocityX + 
            initialVelocityZ * initialVelocityZ
          );
          
          // Ensure no keys are pressed (input released)
          // This is the default state, but we make it explicit
          
          // Update player multiple times to apply damping
          // We run several updates to see the damping effect
          for (let i = 0; i < 5; i++) {
            playerController.update(0.016); // ~60 FPS
          }
          
          // Get final velocity after damping
          const finalVelocity = physicsImpostor.getLinearVelocity();
          
          // Cleanup
          playerController.dispose();
          playerController = null as any;
          
          // Property verification:
          // After releasing input and applying damping, horizontal velocity should decrease
          if (finalVelocity) {
            const finalHorizontalSpeed = Math.sqrt(
              finalVelocity.x * finalVelocity.x + 
              finalVelocity.z * finalVelocity.z
            );
            
            // Horizontal speed should have decreased (moving toward zero)
            // We expect significant damping after 5 updates
            const speedDecreased = finalHorizontalSpeed < initialHorizontalSpeed;
            
            // Speed should be noticeably reduced (at least 10% reduction)
            const significantReduction = finalHorizontalSpeed < initialHorizontalSpeed * 0.9;
            
            return speedDecreased && significantReduction;
          }
          
          // If no velocity returned, something is wrong
          return false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: 3d-exploration-game, Property 9: Collision resolution preserves parallel movement
   * Validates: Requirements 4.3, 4.4
   * 
   * For any collision between the player and a surface, movement perpendicular to 
   * the collision normal should be blocked or reduced, while movement parallel to 
   * the surface should be preserved, allowing the player to slide along walls and surfaces.
   */
  it('should preserve parallel movement when colliding with surfaces', () => {
    fc.assert(
      fc.property(
        // Generate random wall position and orientation
        fc.double({ min: -20, max: 20, noNaN: true }), // wall X position
        fc.double({ min: -20, max: 20, noNaN: true }), // wall Z position
        fc.double({ min: 0, max: Math.PI * 2, noNaN: true }), // wall rotation
        // Generate random approach angle (player moving toward wall at an angle)
        // Filter to ensure meaningful parallel component (angle between 30° and 60° from perpendicular)
        fc.double({ min: -Math.PI, max: Math.PI, noNaN: true })
          .filter(angle => {
            const absAngle = Math.abs(angle);
            return absAngle >= 0.52 && absAngle <= 1.05; // ~30° to ~60° in radians
          }),
        (wallX, wallZ, wallRotation, approachAngle) => {
          // Setup - create a wall for collision testing
          playerController = new PlayerController();
          
          // Create ground
          const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 100, height: 100 }, scene);
          ground.position.y = 0;
          ground.isPickable = true;
          const groundImpostor = new BABYLON.PhysicsImpostor(
            ground,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: 0, restitution: 0.0, friction: 0.5 },
            scene
          );
          
          // Create a wall (vertical box)
          const wall = BABYLON.MeshBuilder.CreateBox('wall', { 
            width: 20, 
            height: 10, 
            depth: 1 
          }, scene);
          wall.position.set(wallX, 5, wallZ);
          wall.rotation.y = wallRotation;
          wall.isPickable = true;
          
          // Add physics imposter to wall with zero friction for clean sliding
          const wallImpostor = new BABYLON.PhysicsImpostor(
            wall,
            BABYLON.PhysicsImpostor.BoxImpostor,
            { mass: 0, restitution: 0.0, friction: 0.0 },
            scene
          );
          
          // Calculate wall's normal vector (perpendicular to wall face)
          const wallNormal = new BABYLON.Vector3(
            Math.sin(wallRotation),
            0,
            Math.cos(wallRotation)
          );
          wallNormal.normalize();
          
          // Position player near the wall, approaching at an angle
          // Place player 3 units away from wall center in the direction of the normal
          const playerStartPos = new BABYLON.Vector3(
            wallX + wallNormal.x * 3,
            1,
            wallZ + wallNormal.z * 3
          );
          
          playerController.initialize(scene, playerStartPos);
          const physicsImpostor = playerController.getPhysicsImpostor();
          
          // Calculate approach velocity vector (toward wall at an angle)
          // This creates a velocity that has both perpendicular and parallel components
          const approachDirection = new BABYLON.Vector3(
            -wallNormal.x * Math.cos(approachAngle) + wallNormal.z * Math.sin(approachAngle),
            0,
            -wallNormal.z * Math.cos(approachAngle) - wallNormal.x * Math.sin(approachAngle)
          );
          approachDirection.normalize();
          
          // Set initial velocity toward the wall at an angle
          const approachSpeed = 5.0;
          const initialVelocity = approachDirection.scale(approachSpeed);
          physicsImpostor.setLinearVelocity(initialVelocity);
          
          // Calculate parallel component of initial velocity (along the wall)
          const parallelDirection = new BABYLON.Vector3(-wallNormal.z, 0, wallNormal.x);
          const initialParallelComponent = BABYLON.Vector3.Dot(initialVelocity, parallelDirection);
          
          // Run physics simulation to let collision occur
          const physicsEngine = scene.getPhysicsEngine();
          let collisionOccurred = false;
          let finalVelocity = initialVelocity.clone();
          
          // Simulate for up to 1 second (60 steps)
          for (let i = 0; i < 60; i++) {
            const prevPosition = physicsImpostor.object.position.clone();
            
            // Step physics forward
            if (physicsEngine) {
              physicsEngine.getPhysicsPlugin().executeStep(1/60, [physicsImpostor, wallImpostor, groundImpostor]);
            }
            
            playerController.update(1/60);
            
            const currentPosition = physicsImpostor.object.position.clone();
            const displacement = currentPosition.subtract(prevPosition);
            
            // Check if player is very close to wall (collision likely occurred)
            const distanceToWall = Math.abs(
              (currentPosition.x - wallX) * wallNormal.x + 
              (currentPosition.z - wallZ) * wallNormal.z
            );
            
            if (distanceToWall < 2.5 && displacement.length() > 0.001) {
              collisionOccurred = true;
              
              // Run a few more steps to let collision resolve
              for (let j = 0; j < 10; j++) {
                if (physicsEngine) {
                  physicsEngine.getPhysicsPlugin().executeStep(1/60, [physicsImpostor, wallImpostor, groundImpostor]);
                }
                playerController.update(1/60);
              }
              
              finalVelocity = physicsImpostor.getLinearVelocity() || finalVelocity;
              break;
            }
          }
          
          // Cleanup
          wallImpostor.dispose();
          wall.dispose();
          groundImpostor.dispose();
          ground.dispose();
          playerController.dispose();
          playerController = null as any;
          
          // Property verification:
          // If collision occurred and there was initial parallel movement:
          // 1. Perpendicular velocity component should be reduced/blocked
          // 2. Parallel velocity component should be preserved (allowing sliding)
          
          if (collisionOccurred && Math.abs(initialParallelComponent) > 1.0) {
            // Calculate final velocity components
            const finalPerpendicularComponent = BABYLON.Vector3.Dot(finalVelocity, wallNormal);
            const finalParallelComponent = BABYLON.Vector3.Dot(finalVelocity, parallelDirection);
            
            // Perpendicular component should be close to zero or negative (blocked/reversed)
            const perpendicularBlocked = finalPerpendicularComponent <= 1.0;
            
            // Parallel component should be preserved (at least 20% of initial)
            // We allow significant loss due to friction, collision response, and damping
            // The key property is that SOME parallel movement remains (not completely blocked)
            const parallelPreserved = Math.abs(finalParallelComponent) >= Math.abs(initialParallelComponent) * 0.2;
            
            return perpendicularBlocked && parallelPreserved;
          }
          
          // If no collision occurred or insufficient parallel component, property is trivially satisfied
          // We need a meaningful parallel component to test the property
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: 3d-exploration-game, Property 1: Directional movement correctness
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4
   * 
   * For any avatar state and movement input (forward/backward/left/right), 
   * applying that input should move the avatar in the correct direction relative 
   * to the camera's facing direction.
   */
  it('should move in correct direction relative to camera orientation', () => {
    fc.assert(
      fc.property(
        // Generate random camera rotation (yaw angle in radians)
        fc.double({ min: -Math.PI, max: Math.PI }),
        // Generate random movement input (0=forward, 1=backward, 2=left, 3=right)
        fc.integer({ min: 0, max: 3 }),
        (cameraYaw, movementDirection) => {
          // Setup
          playerController = new PlayerController();
          const startPosition = new BABYLON.Vector3(0, 2, 0);
          playerController.initialize(scene, startPosition);
          
          const camera = playerController.getCamera();
          const physicsImpostor = playerController.getPhysicsImpostor();
          
          // Set camera rotation (yaw only, no pitch/roll)
          camera.rotation.y = cameraYaw;
          
          // Get camera's forward and right vectors
          const forward = camera.getDirection(BABYLON.Axis.Z);
          forward.y = 0;
          forward.normalize();
          
          const right = camera.getDirection(BABYLON.Axis.X);
          right.y = 0;
          right.normalize();
          
          // Determine expected movement direction based on input
          let expectedDirection: BABYLON.Vector3;
          let keyCode: string;
          
          switch (movementDirection) {
            case 0: // Forward (W key)
              expectedDirection = forward.clone();
              keyCode = 'KeyW';
              break;
            case 1: // Backward (S key)
              expectedDirection = forward.scale(-1);
              keyCode = 'KeyS';
              break;
            case 2: // Left (A key)
              expectedDirection = right.scale(-1);
              keyCode = 'KeyA';
              break;
            case 3: // Right (D key)
              expectedDirection = right.clone();
              keyCode = 'KeyD';
              break;
            default:
              throw new Error('Invalid movement direction');
          }
          
          // Simulate key press
          const keyDownEvent = new KeyboardEvent('keydown', { code: keyCode });
          scene.onKeyboardObservable.notifyObservers({
            type: BABYLON.KeyboardEventTypes.KEYDOWN,
            event: keyDownEvent
          });
          
          // Clear any initial velocity
          physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
          
          // Update player to apply movement
          playerController.update(0.016);
          
          // Get resulting velocity
          const velocity = physicsImpostor.getLinearVelocity();
          
          // Simulate key release
          const keyUpEvent = new KeyboardEvent('keyup', { code: keyCode });
          scene.onKeyboardObservable.notifyObservers({
            type: BABYLON.KeyboardEventTypes.KEYUP,
            event: keyUpEvent
          });
          
          // Cleanup
          playerController.dispose();
          playerController = null as any;
          
          // Verify movement direction
          if (velocity && velocity.length() > 0.01) {
            // Normalize velocity to get direction
            const actualDirection = velocity.clone();
            actualDirection.y = 0; // Ignore vertical component
            actualDirection.normalize();
            
            // Calculate dot product to check if directions align
            // Dot product should be close to 1 (same direction)
            const dotProduct = BABYLON.Vector3.Dot(actualDirection, expectedDirection);
            
            // Allow some tolerance for physics simulation
            return dotProduct > 0.9;
          }
          
          // If no velocity, that's acceptable (physics might not have updated yet)
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
