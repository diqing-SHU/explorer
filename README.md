# 3D Exploration Game

A web-based 3D first-person exploration game built with Babylon.js and TypeScript. Explore an outdoor environment with abandoned buildings using standard FPS controls.

## 🎮 Features

### Currently Implemented
- ✅ First-person camera with FPS controls
- ✅ WASD movement (directional relative to camera)
- ✅ Mouse look with pointer lock
- ✅ Smooth camera rotation with configurable sensitivity
- ✅ Physics engine with gravity and collision detection
- ✅ Jump mechanics with double-jump prevention
- ✅ Environment with abandoned buildings
- ✅ Collision resolution and sliding along walls
- ✅ Basic scene rendering with lighting
- ✅ Window resize handling
- ✅ Error handling and loading states
- ✅ **Procedural World Generation** - Infinite world with dynamic chunk loading
  - Chunk-based terrain generation with seamless boundaries
  - Procedural road networks with intersections and lane markings
  - Varied building placement with realistic urban layouts
  - Traffic infrastructure (signs, signals, street furniture)
  - Parked vehicles with variety in types and colors
  - Deterministic seed-based generation for consistency
  - Extensible plugin architecture for new object types
  - Configuration system with presets (urban, suburban, rural)
  - Performance optimizations (instancing, spatial hashing, prioritization)
  - Comprehensive error handling and graceful degradation

## 🎯 Controls

- **W** - Move forward
- **S** - Move backward
- **A** - Strafe left
- **D** - Strafe right
- **Space** - Jump
- **Mouse** - Look around (click canvas to enable)
- **ESC** - Release mouse control

## 🌍 Procedural World Generation

The game features an infinite procedurally generated world that creates content dynamically as you explore:

### Enabling Procedural Generation

**Basic Usage (Default Configuration):**
```typescript
const gameManager = new GameManager();
gameManager.initialize(canvas);
gameManager.enableProceduralGeneration();
gameManager.start();
```

**Using Configuration Presets:**
```typescript
import { WorldConfigManager } from './procedural/WorldConfig';

// Choose from: 'urban', 'suburban', 'rural'
const urbanConfig = WorldConfigManager.createPreset('urban');
gameManager.enableProceduralGeneration(urbanConfig);
```

**Custom Configuration:**
```typescript
const customConfig = new WorldConfigManager({
  chunk: {
    chunkSize: 150,
    activeRadius: 300,
    unloadDistance: 450,
    seed: 42
  },
  road: {
    density: 0.3,
    mainRoadWidth: 12,
    sideRoadWidth: 8
  },
  building: {
    density: 0.4,
    minHeight: 10,
    maxHeight: 50
  }
});

gameManager.enableProceduralGeneration(customConfig);
```

### Features

- **Deterministic Generation**: Same seed always produces the same world
- **Infinite Exploration**: World generates dynamically as you move
- **Seamless Chunks**: No visible boundaries between generated areas
- **Performance Optimized**: Automatic chunk loading/unloading based on distance
- **Varied Content**: Buildings, roads, vehicles, and signs with natural variation
- **Configurable**: Extensive configuration options for world appearance

See `src/procedural-example.ts` for complete usage examples.

## 📁 Project Structure

```
.
├── .kiro/
│   └── specs/                    # Feature specifications
│       ├── 3d-exploration-game/  # Base game spec
│       │   ├── requirements.md   # EARS requirements
│       │   ├── design.md         # Architecture & design
│       │   └── tasks.md          # Implementation tasks
│       └── procedural-world-generation/  # Procedural generation spec
│           ├── requirements.md   # Generation requirements
│           ├── design.md         # Generation architecture
│           └── tasks.md          # Generation tasks
├── src/
│   ├── main.ts                   # Entry point
│   ├── GameManager.ts            # Game coordination & scene management
│   ├── GameManager.test.ts       # GameManager unit tests
│   ├── PlayerController.ts       # First-person camera & controls
│   ├── PlayerController.test.ts  # PlayerController unit tests
│   ├── EnvironmentManager.ts     # Environment & building management
│   ├── EnvironmentManager.test.ts # Environment unit tests
│   ├── procedural-example.ts     # Procedural generation usage examples
│   ├── environments/             # Environment configurations
│   └── procedural/               # Procedural generation system
│       ├── ChunkManager.ts       # Chunk lifecycle management
│       ├── Generator.ts          # Base generator interface
│       ├── RoadGenerator.ts      # Road network generation
│       ├── BuildingGenerator.ts  # Building placement & variation
│       ├── TrafficGenerator.ts   # Traffic signs & signals
│       ├── VehicleGenerator.ts   # Vehicle placement
│       ├── TerrainGenerator.ts   # Terrain height generation
│       ├── PlacementRuleEngine.ts # Spatial constraint validation
│       ├── WorldConfig.ts        # Configuration management
│       ├── SeededRandom.ts       # Deterministic RNG
│       ├── NoiseGenerator.ts     # Perlin/Simplex noise
│       ├── SpatialUtils.ts       # Coordinate & spatial utilities
│       ├── MeshInstanceManager.ts # Mesh instancing optimization
│       ├── ErrorHandling.ts      # Error handling utilities
│       ├── default-config.json   # Default world configuration
│       └── *.test.ts             # Unit & property-based tests
├── dist/                         # Build output (generated)
├── index.html                    # Main HTML with canvas
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration
└── vitest.config.ts              # Vitest test configuration
```

## Dependencies

- **Babylon.js** (v7.0.0): 3D engine for rendering, physics, and scene management
- **TypeScript** (v5.3.0): Type-safe JavaScript
- **Vite** (v5.0.0): Fast build tool and dev server
- **Vitest** (v1.0.0): Unit testing framework
- **fast-check** (v3.15.0): Property-based testing library
- **Cannon.js** (v0.6.2): Physics engine

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm (comes with Node.js)
- Modern browser with WebGL support (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository** (or navigate to the project directory)

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Running the Development Server

Start the development server with hot-reload:

```bash
npm run dev
```

The game will be available at **http://localhost:3000/**

- The server will automatically reload when you make changes to the code
- Press `h + enter` in the terminal for Vite help options
- Press `Ctrl+C` to stop the server

### Building for Production

Create an optimized production build:

```bash
npm run build
```

The built files will be in the `dist/` directory.

Preview the production build locally:

```bash
npm run preview
```

## 🧪 Testing

Run all tests once:

```bash
npm test
```

Run tests in watch mode (auto-rerun on file changes):

```bash
npm run test:watch
```

### Test Coverage
- Unit tests for GameManager (scene initialization, error handling, procedural integration)
- Unit tests for PlayerController (camera configuration, controls)
- Unit tests for EnvironmentManager (environment setup, collision)
- **Procedural Generation Tests**:
  - Unit tests for all generators (Road, Building, Traffic, Vehicle, Terrain)
  - Unit tests for ChunkManager (chunk loading/unloading, coordinate conversion)
  - Unit tests for utilities (SeededRandom, NoiseGenerator, SpatialUtils)
  - Property-based tests for 36 correctness properties using fast-check
  - Performance tests for generation time and resource cleanup
  - Configuration validation tests

## 🏗️ Architecture

The game follows a modular architecture with clear separation of concerns:

### Core Systems
- **GameManager**: Coordinates game initialization, scene management, render loop, and procedural generation
- **PlayerController**: Manages first-person camera, movement controls, and physics
- **EnvironmentManager**: Handles static terrain and building generation

### Procedural Generation System
The procedural generation system uses a plugin-based architecture for extensibility:

#### Core Components
- **ChunkManager**: Manages chunk lifecycle (loading/unloading based on player position)
  - Tracks loaded chunks in a spatial grid
  - Prioritizes generation by distance (closest first)
  - Automatically unloads distant chunks to manage memory
  - Coordinates generator execution in configured order

- **WorldConfigManager**: Centralized configuration management
  - Provides presets (urban, suburban, rural)
  - Validates configuration parameters
  - Supports custom configurations with sensible defaults

#### Generator System
Plugin-based architecture allows adding new object types without modifying core systems:

- **Generator Interface**: Common interface for all generators
  - `generate()`: Creates objects for a chunk
  - `getPlacementRules()`: Defines spatial constraints
  - `configure()`: Accepts configuration parameters

- **RoadGenerator**: Creates road networks with intersections and lane markings
  - Grid-based road layout aligned to chunk boundaries
  - Seamless connections between adjacent chunks
  - Varied road widths (main streets vs side streets)
  - Lane markings (center lines, edge lines, crosswalks)

- **BuildingGenerator**: Places varied buildings with realistic layouts
  - Poisson disc sampling for natural spacing
  - Varied dimensions (height, width, depth)
  - Alignment with road grid
  - Multiple architectural styles and colors

- **TrafficGenerator**: Adds signs, signals, and traffic infrastructure
  - Traffic lights and stop signs at intersections
  - Street signs along roads (speed limits, street names)
  - Proper orientation facing traffic direction
  - Mesh instancing for performance

- **VehicleGenerator**: Places vehicles along roads with proper alignment
  - Roadside parking with realistic spacing
  - Varied vehicle types (sedan, SUV, truck, van)
  - Parallel alignment to road direction
  - Color variation

- **TerrainGenerator**: Creates terrain with smooth height transitions
  - Noise-based height generation
  - Bilinear interpolation at chunk boundaries
  - Seamless terrain continuity

#### Supporting Systems
- **PlacementRuleEngine**: Enforces spatial constraints and collision avoidance
  - NoRoadOverlapRule: Prevents buildings/vehicles from overlapping roads
  - NoObjectCollisionRule: Prevents object intersections
  - MinimumSpacingRule: Ensures spacing between buildings
  - Extensible rule system for custom constraints

- **Utilities**:
  - **SeededRandom**: Deterministic random number generation for consistency
  - **NoiseGenerator**: Perlin/Simplex noise for organic variation
  - **SpatialUtils**: Coordinate conversion and spatial calculations
  - **MeshInstanceManager**: Mesh instancing for performance optimization
  - **ErrorHandling**: Graceful error handling and recovery

#### Integration Points
- Works seamlessly with existing GameManager, PlayerController, and EnvironmentManager
- Compatible with Babylon.js physics engine (Cannon.js)
- Proper scene graph integration for rendering
- Resource cleanup on chunk unload

Built with:
- **Babylon.js** for 3D rendering and scene management
- **TypeScript** for type safety
- **Vite** for fast development and building
- **Vitest** for unit testing
- **fast-check** for property-based testing

## 📋 Development Workflow

This project uses **Spec-Driven Development**:

1. **Requirements** - EARS-compliant acceptance criteria (`.kiro/specs/3d-exploration-game/requirements.md`)
2. **Design** - Architecture and correctness properties (`.kiro/specs/3d-exploration-game/design.md`)
3. **Tasks** - Implementation plan with checkboxes (`.kiro/specs/3d-exploration-game/tasks.md`)

Check the tasks file to see current progress and upcoming features.

## 🐛 Troubleshooting

### WebGL Not Supported
If you see a "WebGL is not supported" error:
- Update your browser to the latest version
- Check if hardware acceleration is enabled in browser settings
- Try a different browser

### Port Already in Use
If port 3000 is already in use, Vite will automatically try the next available port (3001, 3002, etc.)

### Build Errors
If you encounter build errors after pulling changes:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Procedural Generation Issues

#### Low Frame Rate During Exploration
If you experience frame drops while moving through the procedurally generated world:
- Reduce the `activeRadius` in your world configuration (default: 200)
- Increase the `unloadDistance` to unload chunks more aggressively
- Lower object densities (buildings, vehicles, signs) in configuration
- Check performance stats: `chunkManager.getPerformanceStats()`

#### Chunks Not Loading
If chunks aren't generating as you move:
- Ensure `enableProceduralGeneration()` was called after `initialize()`
- Verify the game loop is running (`start()` was called)
- Check browser console for error messages
- Confirm player position is being updated correctly

#### Visible Seams Between Chunks
If you see gaps or discontinuities between chunks:
- This may indicate a bug in boundary handling
- Check that adjacent chunks are loaded before moving between them
- Verify terrain height matching at boundaries
- Report the issue with your world seed for reproducibility

#### Memory Issues
If the browser runs out of memory:
- Reduce `activeRadius` to load fewer chunks simultaneously
- Decrease `unloadDistance` to unload chunks sooner
- Lower object densities in configuration
- Check for memory leaks with browser dev tools

#### Inconsistent World Generation
If the same seed produces different worlds:
- Ensure you're using the same configuration parameters
- Verify no external randomness is being introduced
- Check that generator execution order is consistent
- This may indicate a bug in the seeded random number generator

#### Configuration Not Applied
If configuration changes don't take effect:
- Configuration only affects newly generated chunks
- Previously generated chunks retain their original configuration
- Disable and re-enable procedural generation to reset
- Or move to unexplored areas to see new configuration

For more detailed troubleshooting, see:
- `src/procedural/ERROR_HANDLING.md` - Error handling documentation
- `src/procedural/PERFORMANCE_OPTIMIZATION.md` - Performance tuning guide
- `src/procedural/CONFIG.md` - Configuration reference

## 📝 License

This project is for educational purposes.
