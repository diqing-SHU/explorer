# Design Document

## Overview

The 3D Exploration Game is a web-based first-person sandbox experience built with Babylon.js. Players navigate an outdoor environment with abandoned buildings using standard FPS controls (WASD + mouse look). The architecture emphasizes modularity to support future expansion with new environments and themes.

Babylon.js provides an integrated game engine with built-in physics, input handling, and rendering, simplifying the architecture compared to using separate libraries.

The system consists of three main layers:
1. **Scene Layer**: Babylon.js scene management, camera, and visual rendering
2. **Physics Layer**: Built-in physics engine for gravity, collision detection, and movement
3. **Game Logic Layer**: Game state management and coordination

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (HTML5)                      │
├─────────────────────────────────────────────────────────┤
│                   Babylon.js Engine                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Scene & Render Loop                  │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Input     │  │   Physics    │  │    Camera    │  │
│  │   System     │→ │   Engine     │→ │  (Universal) │  │
│  │  (built-in)  │  │  (built-in)  │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         ↓                 ↓                   ↓          │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Game Manager                           │  │
│  │  (Environment loading, game state)                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Babylon.js Scene** manages the render loop and coordinates all systems
2. **Input System** (built-in) captures keyboard/mouse via Babylon's input manager
3. **Universal Camera** (built-in) provides first-person controls with pointer lock
4. **Physics Engine** (built-in) handles gravity, collision detection, and physics imposters
5. **Game Manager** loads environments and manages game state
6. **Render Loop** automatically orchestrates updates and rendering at target FPS

## Components and Interfaces

### Input System

**Responsibility**: Capture and process player input using Babylon.js built-in input manager.

**Interface**:
```typescript
interface InputController {
  // Initialize with scene
  initialize(scene: BABYLON.Scene): void;
  
  // Check if key is currently pressed
  isKeyPressed(key: string): boolean;
  
  // Get pointer lock state
  isPointerLocked(): boolean;
  
  // Request pointer lock
  requestPointerLock(): void;
  
  // Cleanup
  dispose(): void;
}
```

**Implementation Notes**:
- Uses Babylon's `scene.onKeyboardObservable` for keyboard input
- Uses Babylon's `scene.onPointerObservable` for mouse input
- Pointer lock handled by UniversalCamera automatically
- Input state queried directly from Babylon's input manager

### Physics System

**Responsibility**: Configure and manage Babylon.js physics engine for gravity, jumping, and collision.

**Interface**:
```typescript
interface PhysicsController {
  // Initialize physics engine
  initialize(scene: BABYLON.Scene): void;
  
  // Create physics imposter for mesh
  createImposter(mesh: BABYLON.Mesh, type: PhysicsImposterType, options: PhysicsImposterOptions): void;
  
  // Apply impulse (for jumping)
  applyImpulse(imposter: BABYLON.PhysicsImpostor, impulse: BABYLON.Vector3): void;
  
  // Check if object is grounded
  isGrounded(imposter: BABYLON.PhysicsImpostor): boolean;
}

enum PhysicsImposterType {
  Box,
  Sphere,
  Capsule,
  Mesh
}
```

**Implementation Notes**:
- Uses Babylon's built-in physics engine (Cannon.js plugin)
- Camera uses physics imposter for collision
- Buildings and terrain have static physics imposters
- Gravity configured at scene level
- Jump implemented via impulse application

### Environment Manager

**Responsibility**: Manage environment data, buildings, and terrain using Babylon.js scene graph.

**Interface**:
```typescript
interface EnvironmentManager {
  // Load environment configuration
  loadEnvironment(scene: BABYLON.Scene, config: EnvironmentConfig): void;
  
  // Create terrain
  createTerrain(scene: BABYLON.Scene, config: TerrainConfig): BABYLON.Mesh;
  
  // Create building
  createBuilding(scene: BABYLON.Scene, config: BuildingConfig): BABYLON.Mesh;
  
  // Setup lighting
  setupLighting(scene: BABYLON.Scene, config: LightingConfig): void;
  
  // Clear current environment
  clear(scene: BABYLON.Scene): void;
}

interface EnvironmentConfig {
  terrain: TerrainConfig;
  buildings: BuildingConfig[];
  lighting: LightingConfig;
}
```

**Implementation Notes**:
- Terrain created as Babylon.js ground mesh with physics imposter
- Buildings created as Babylon.js box meshes with physics imposters
- Environment config stored as JSON for easy authoring
- All meshes added to scene graph automatically
- Physics imposters created for all collidable objects

### Player Controller

**Responsibility**: Manage player camera and movement using Babylon.js UniversalCamera.

**Interface**:
```typescript
interface PlayerController {
  // Initialize player with camera
  initialize(scene: BABYLON.Scene, startPosition: BABYLON.Vector3): void;
  
  // Get player camera
  getCamera(): BABYLON.UniversalCamera;
  
  // Handle jump input
  jump(): void;
  
  // Check if player is grounded
  isGrounded(): boolean;
  
  // Update player state
  update(deltaTime: number): void;
}
```

**Implementation Notes**:
- Uses Babylon's UniversalCamera with built-in FPS controls
- Camera has physics imposter for collision
- Movement handled by camera's built-in input system
- Jump implemented via physics impulse
- Pointer lock managed by camera automatically

### Game Manager

**Responsibility**: Coordinate game initialization, scene management, and game loop.

**Interface**:
```typescript
interface GameManager {
  // Initialize game
  initialize(canvas: HTMLCanvasElement): void;
  
  // Start game loop
  start(): void;
  
  // Stop game loop
  stop(): void;
  
  // Load environment
  loadEnvironment(config: EnvironmentConfig): void;
  
  // Get scene
  getScene(): BABYLON.Scene;
  
  // Cleanup
  dispose(): void;
}
```

**Implementation Notes**:
- Creates Babylon.js engine and scene
- Initializes physics engine
- Sets up player controller
- Manages render loop via scene.registerBeforeRender
- Handles window resize events
- Coordinates all subsystems

### Scene and Render Loop

**Responsibility**: Managed automatically by Babylon.js engine.

**Implementation Notes**:
- Babylon.js engine handles render loop automatically
- Uses `scene.registerBeforeRender()` for per-frame updates
- Delta time provided by Babylon's engine
- Physics updates synchronized with render loop
- Automatic FPS optimization and frame skipping

## Data Models

### Player State

```typescript
interface PlayerState {
  camera: BABYLON.UniversalCamera;
  physicsImpostor: BABYLON.PhysicsImpostor;
  isGrounded: boolean;
  canJump: boolean;
  jumpCooldown: number;
}
```

Note: Position, velocity, and rotation are managed by Babylon's camera and physics imposter.

### Building

```typescript
interface Building {
  id: string;
  mesh: BABYLON.Mesh;
  physicsImpostor: BABYLON.PhysicsImpostor;
}

interface BuildingConfig {
  position: [number, number, number];
  dimensions: [number, number, number];  // width, height, depth
  rotation: number;  // Y-axis rotation in radians
  color?: string;
  texture?: string;
}
```

### Terrain

```typescript
interface Terrain {
  mesh: BABYLON.Mesh;
  physicsImpostor: BABYLON.PhysicsImpostor;
}

interface TerrainConfig {
  width: number;
  depth: number;
  subdivisions?: number;
  texture?: string;
}
```

### Environment Configuration

```typescript
interface EnvironmentConfig {
  terrain: TerrainConfig;
  buildings: BuildingConfig[];
  lighting: LightingConfig;
  player: PlayerConfig;
}

interface LightingConfig {
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

interface PlayerConfig {
  startPosition: [number, number, number];
  speed: number;
  jumpStrength: number;
  height: number;
  fov?: number;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Directional movement correctness

*For any* avatar state and movement input (forward/backward/left/right), applying that input should move the avatar in the correct direction relative to the camera's facing direction, with forward moving along the camera's forward vector, backward opposite to it, left perpendicular to the left, and right perpendicular to the right.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Movement cessation on input release

*For any* avatar with non-zero velocity in a direction, when the corresponding movement input is released and no collision is preventing movement, the avatar's velocity in that direction should decrease toward zero.

**Validates: Requirements 1.5**

### Property 3: Mouse input rotates camera

*For any* camera state and mouse delta input, applying horizontal mouse movement should rotate the camera yaw proportionally, and vertical mouse movement should rotate the camera pitch proportionally within valid bounds.

**Validates: Requirements 2.1, 2.2**

Note: This property is largely handled by Babylon's UniversalCamera, but we verify the configuration is correct.

### Property 4: Gravity applies to airborne players

*For any* player camera with physics imposter that is not grounded, after a physics update with positive delta time, the imposter's vertical velocity should be more negative (or less positive) than before, reflecting downward gravitational acceleration.

**Validates: Requirements 3.1**

Note: Gravity is handled by Babylon's physics engine, but we verify it's configured correctly.

### Property 5: Jump initiates upward velocity

*For any* grounded player, when a jump impulse is applied to the physics imposter, the imposter's vertical velocity should become positive, and the player should transition to a non-grounded state.

**Validates: Requirements 3.2**

### Property 6: Double jump prevention

*For any* airborne player (not grounded), when a jump is requested, the jump impulse should not be applied, preventing mid-air jumping.

**Validates: Requirements 3.3**

### Property 7: Landing stops downward velocity

*For any* player transitioning from airborne to grounded state, the physics imposter's vertical velocity should become zero or positive (not negative), preventing the player from continuing to fall through the ground.

**Validates: Requirements 3.4**

Note: This is handled by Babylon's physics engine collision response.

### Property 8: Solid objects block movement

*For any* player position and solid object (building or terrain) with physics imposters, when the player attempts to move into the space occupied by the solid object, the physics engine should prevent the player's position from intersecting the object's collision volume.

**Validates: Requirements 4.1, 4.2**

Note: This is handled by Babylon's physics engine, but we verify imposters are configured correctly.

### Property 9: Collision resolution preserves parallel movement

*For any* collision between the player and a surface, movement perpendicular to the collision normal should be blocked or reduced, while movement parallel to the surface should be preserved, allowing the player to slide along walls and surfaces.

**Validates: Requirements 4.3, 4.4**

Note: This is handled by Babylon's physics engine collision resolution.

### Property 10: Viewport adapts to window resize

*For any* window resize event, the renderer's viewport dimensions and camera aspect ratio should update to match the new window dimensions, preventing distorted rendering.

**Validates: Requirements 6.4**

### Property 11: Errors display messages

*For any* initialization error or runtime error, the game engine should display an error message to the player, ensuring failures are communicated rather than silent.

**Validates: Requirements 7.3**

### Property 12: Environment configuration determines scene content

*For any* two different environment configurations, loading them should produce scenes with different terrain dimensions, building counts, or building positions, demonstrating that the configuration correctly controls scene content.

**Validates: Requirements 8.3**

## Error Handling

### Input Errors

- **Pointer Lock Failure**: If pointer lock API is not supported or denied, display a message instructing the user to click the canvas to enable mouse look (handled by Babylon's UniversalCamera)
- **Key Binding Conflicts**: If browser shortcuts interfere with game controls, document known conflicts and suggest workarounds
- **Touch Input**: Display message on touch devices that keyboard/mouse is required

### Physics Errors

- **Collision Detection Failure**: If collision detection fails (e.g., avatar stuck in geometry), implement an "unstuck" mechanism that moves the avatar to the last valid position
- **Infinite Velocity**: Clamp velocity values to reasonable maximums to prevent physics explosions
- **NaN/Infinity Values**: Validate all vector math results and reset to safe defaults if invalid values detected

### Rendering Errors

- **WebGL Not Supported**: Display a clear error message if WebGL is not available, with links to browser update information
- **Shader Compilation Failure**: Fall back to simpler rendering if advanced shaders fail to compile
- **Out of Memory**: Catch WebGL context loss events and attempt to recover or display an error message

### Asset Loading Errors

- **Missing Assets**: Use placeholder geometry/textures if assets fail to load, allowing the game to run in a degraded state
- **Network Errors**: Implement retry logic with exponential backoff for failed asset loads
- **Timeout**: If loading takes longer than 30 seconds, display an error and allow the user to retry

### Runtime Errors

- **Frame Rate Degradation**: If frame rate drops below 15 FPS for extended periods, display a performance warning
- **Browser Tab Inactive**: Pause physics updates when the tab loses focus to prevent time accumulation issues
- **Unexpected Exceptions**: Wrap game loop in try-catch and display error message rather than crashing silently

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples, edge cases, and integration points:

- **Input Manager**: Test key press/release state tracking, mouse delta accumulation, pointer lock handling
- **Physics Engine**: Test gravity application with specific values, jump velocity calculation, collision detection with known geometries
- **World Manager**: Test terrain height queries, collider retrieval, environment config loading
- **Avatar**: Test camera positioning, rotation clamping at boundaries, state transitions
- **Renderer**: Test initialization, resize handling, cleanup

Unit tests will use **Vitest** as the testing framework for fast execution and good TypeScript support. Tests will use Babylon.js's NullEngine for headless testing where possible.

### Property-Based Testing

Property-based tests will verify universal properties across many randomly generated inputs using **fast-check** library:

- Each property-based test will run a minimum of 100 iterations with randomly generated inputs
- Each test will be tagged with a comment explicitly referencing the correctness property from this design document
- Tag format: `// Feature: 3d-exploration-game, Property {number}: {property_text}`
- Each correctness property listed above will be implemented by a single property-based test

**Property Test Coverage**:

1. **Movement Properties** (Properties 1-2): Generate random player states (positions, rotations) and input combinations, verify movement direction and stopping behavior
2. **Camera Properties** (Property 3): Verify UniversalCamera configuration (sensitivity, angle limits) is correct
3. **Physics Properties** (Properties 4-7): Generate random player states (grounded/airborne, various velocities), verify gravity configuration, jumping, and landing behavior
4. **Collision Properties** (Properties 8-9): Generate random player positions, building configurations, verify physics imposters are created correctly
5. **Rendering Properties** (Property 10): Generate random window dimensions, verify engine resize handling
6. **Error Handling Properties** (Property 11): Generate various error conditions, verify error messages are displayed
7. **Configuration Properties** (Property 12): Generate random environment configurations, verify scene differences

Note: Many properties are verified by testing configuration and setup rather than runtime behavior, since Babylon.js handles the actual physics and rendering.

### Integration Testing

Integration tests will verify end-to-end workflows:

- Complete game initialization and first frame render
- Full movement cycle: input → physics → collision → render
- Environment loading and switching
- Error recovery scenarios

### Testing Approach

- **Implementation-first development**: Implement features before writing corresponding tests
- **Complementary coverage**: Unit tests catch specific bugs, property tests verify general correctness
- **Early validation**: Run tests after each component implementation to catch issues early

### Manual Testing Checklist

Since some requirements involve subjective qualities (smoothness, visual quality), manual testing will verify:

- Camera rotation feels smooth and responsive
- Movement feels natural and grounded
- Collision response doesn't feel "sticky" or jarring
- Frame rate is acceptable on target hardware
- Visual rendering looks correct (lighting, shadows, textures)

## Performance Considerations

### Target Performance

- **Frame Rate**: 60 FPS on modern desktop browsers, 30 FPS minimum
- **Load Time**: Under 5 seconds for initial environment on broadband connection
- **Memory**: Under 200MB for basic environment

### Optimization Strategies

1. **Geometry Optimization**:
   - Use simple collision boxes rather than mesh colliders where possible
   - Implement frustum culling to avoid rendering off-screen objects
   - Use instanced rendering for repeated building types

2. **Physics Optimization**:
   - Use spatial partitioning (e.g., grid) to reduce collision checks
   - Implement sleeping for static objects
   - Use swept collision only when necessary (high velocities)

3. **Rendering Optimization**:
   - Use texture atlases to reduce draw calls
   - Implement LOD (Level of Detail) for distant objects
   - Limit shadow map resolution appropriately

4. **Asset Loading**:
   - Lazy load assets not immediately visible
   - Use compressed texture formats (e.g., KTX2)
   - Implement asset streaming for large environments

## Future Extensibility

### Planned Extension Points

1. **Environment System**:
   - Support for multiple biomes (urban, forest, desert)
   - Dynamic weather and time of day
   - Procedural generation of buildings and terrain

2. **Interaction System**:
   - Object examination and interaction
   - Inventory system
   - Puzzle mechanics

3. **Multiplayer**:
   - Network synchronization
   - Multiple avatar rendering
   - Chat system

4. **Advanced Features**:
   - Climbing and parkour mechanics
   - Vehicle system
   - Quest and objective system

### Architecture Support for Extensions

- **Component-based entities**: Buildings and objects use composition for easy extension
- **Event system**: Decouple systems to allow adding new behaviors without modifying core code
- **Configuration-driven content**: Environments defined in JSON for easy authoring
- **Plugin architecture**: Support for loading additional modules at runtime
