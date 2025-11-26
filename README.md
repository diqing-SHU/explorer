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

### In Development
- 🚧 **Procedural World Generation** - Infinite world with dynamic chunk loading
  - Chunk-based terrain generation with seamless boundaries
  - Procedural road networks with intersections and lane markings
  - Varied building placement with realistic urban layouts
  - Traffic infrastructure (signs, signals, street furniture)
  - Parked vehicles with variety in types and colors
  - Deterministic seed-based generation for consistency
  - Extensible plugin architecture for new object types

## 🎯 Controls

- **W** - Move forward
- **S** - Move backward
- **A** - Strafe left
- **D** - Strafe right
- **Space** - Jump
- **Mouse** - Look around (click canvas to enable)
- **ESC** - Release mouse control

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
│   └── environments/             # Environment configurations
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
- Unit tests for GameManager (scene initialization, error handling)
- Unit tests for PlayerController (camera configuration, controls)
- Property-based tests (coming soon with physics implementation)

## 🏗️ Architecture

The game follows a modular architecture with clear separation of concerns:

### Core Systems
- **GameManager**: Coordinates game initialization, scene management, and render loop
- **PlayerController**: Manages first-person camera, movement controls, and physics
- **EnvironmentManager**: Handles static terrain and building generation

### Procedural Generation (In Development)
- **ChunkManager**: Manages chunk lifecycle (loading/unloading based on player position)
- **Generator System**: Plugin-based architecture for extensible object generation
  - **RoadGenerator**: Creates road networks with intersections and markings
  - **BuildingGenerator**: Places varied buildings with realistic layouts
  - **TrafficGenerator**: Adds signs, signals, and traffic infrastructure
  - **VehicleGenerator**: Places vehicles along roads with proper alignment
- **PlacementRuleEngine**: Enforces spatial constraints and collision avoidance
- **Noise & Utilities**: Seeded random generation and noise functions for variation

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

## 📝 License

This project is for educational purposes.
