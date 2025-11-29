# Procedural World Generation Configuration

This document describes the configuration system for the procedural world generation.

## Overview

The configuration system allows you to customize all aspects of world generation without modifying code. Configuration can be:
- Created programmatically using the `WorldConfigManager` class
- Loaded from JSON files
- Modified at runtime (changes affect newly generated chunks)
- Validated to ensure parameters are within acceptable ranges

## Quick Start

### Using Default Configuration

```typescript
import { WorldConfigManager } from './procedural';

// Create manager with default configuration
const configManager = new WorldConfigManager();

// Get configuration for chunk manager
const chunkConfig = configManager.getChunkConfig();

// Get configuration for generators
const roadConfig = configManager.getRoadConfig();
const buildingConfig = configManager.getBuildingConfig();
```

### Using Preset Configurations

```typescript
// Create preset configurations for common scenarios
const urbanConfig = WorldConfigManager.createPreset('urban');
const suburbanConfig = WorldConfigManager.createPreset('suburban');
const sparseConfig = WorldConfigManager.createPreset('sparse');
const denseConfig = WorldConfigManager.createPreset('dense');
```

### Loading from JSON

```typescript
import fs from 'fs';

// Load configuration from JSON file
const json = fs.readFileSync('config.json', 'utf-8');
const configManager = WorldConfigManager.fromJSON(json);
```

### Updating Configuration

```typescript
const configManager = new WorldConfigManager();

// Update specific parameters
const result = configManager.updateConfig({
  chunk: {
    seed: 99999,
    chunkSize: 150
  },
  generators: {
    building: {
      density: 25,
      maxHeight: 80
    }
  }
});

// Check validation result
if (!result.valid) {
  console.error('Configuration errors:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Configuration warnings:', result.warnings);
}
```

## Configuration Structure

### Chunk Configuration

Controls chunk management and world generation behavior.

```typescript
{
  chunk: {
    chunkSize: number;          // Size of each chunk in world units (default: 100)
    activeRadius: number;       // Distance to keep chunks loaded (default: 200)
    unloadDistance: number;     // Distance to unload chunks (default: 300)
    seed: number;               // World generation seed (default: 12345)
    generationOrder: string[];  // Order of generator execution
  }
}
```

**Constraints:**
- `chunkSize` must be positive (recommended: 50-500)
- `activeRadius` must be positive
- `unloadDistance` must be greater than `activeRadius`
- `seed` must be an integer
- `generationOrder` should list generator names in execution order

### Road Generator Configuration

Controls road network generation.

```typescript
{
  generators: {
    road: {
      gridSpacing: number;        // Distance between grid roads (default: 50)
      mainRoadWidth: number;      // Width of main roads (default: 12)
      sideRoadWidth: number;      // Width of side roads (default: 8)
      mainRoadProbability: number; // Probability of main vs side road (default: 0.3)
      sideRoadDensity: number;    // Additional side roads per chunk (default: 2)
      centerLineWidth: number;    // Width of center line marking (default: 0.2)
      edgeLineWidth: number;      // Width of edge line marking (default: 0.15)
      crosswalkWidth: number;     // Width of crosswalks (default: 3)
      dashLength: number;         // Length of dashed line segments (default: 2)
      dashGap: number;            // Gap between dashed segments (default: 2)
    }
  }
}
```

**Constraints:**
- All width and spacing values must be positive
- `mainRoadProbability` must be between 0 and 1
- `sideRoadDensity` must be non-negative

### Building Generator Configuration

Controls building placement and appearance.

```typescript
{
  generators: {
    building: {
      minHeight: number;          // Minimum building height (default: 10)
      maxHeight: number;          // Maximum building height (default: 50)
      minWidth: number;           // Minimum building width (default: 8)
      maxWidth: number;           // Maximum building width (default: 20)
      minDepth: number;           // Minimum building depth (default: 8)
      maxDepth: number;           // Maximum building depth (default: 20)
      density: number;            // Buildings per chunk (default: 15)
      minSpacing: number;         // Minimum spacing between buildings (default: 5)
      roadOffset: number;         // Minimum distance from roads (default: 3)
      styles: BuildingStyle[];    // Available building styles
    }
  }
}
```

**Building Style:**
```typescript
{
  name: string;                   // Style name
  colorPalette: string[];         // Hex color codes
  windowPattern: string;          // 'grid', 'rows', 'sparse', 'regular'
  roofType: 'flat' | 'pitched';   // Roof type
}
```

**Constraints:**
- All dimension values must be positive
- `minHeight` must be <= `maxHeight`
- `minWidth` must be <= `maxWidth`
- `minDepth` must be <= `maxDepth`
- `density` must be non-negative
- At least one building style must be defined

### Traffic Generator Configuration

Controls traffic sign and signal placement.

```typescript
{
  generators: {
    traffic: {
      intersectionSignProbability: number; // Probability of signs at intersections (default: 0.8)
      roadSignDensity: number;             // Signs per road segment (default: 0.3)
      signHeight: number;                  // Height of sign posts (default: 3)
      signSize: number;                    // Size of sign faces (default: 1)
      types: SignType[];                   // Available sign types
      minDistanceFromRoad: number;         // Minimum distance from road center (default: 6)
      maxDistanceFromRoad: number;         // Maximum distance from road center (default: 8)
      minSpacing: number;                  // Minimum spacing between signs (default: 10)
    }
  }
}
```

**Constraints:**
- `intersectionSignProbability` must be between 0 and 1
- All dimension and spacing values must be non-negative
- `maxDistanceFromRoad` should be >= `minDistanceFromRoad`

### Vehicle Generator Configuration

Controls vehicle placement and appearance.

```typescript
{
  generators: {
    vehicle: {
      density: number;                     // Vehicles per road segment (default: 0.3)
      minSpacing: number;                  // Minimum spacing between vehicles (default: 5)
      roadsideOffset: number;              // Distance from road center (default: 2.5)
      typeDistribution: {                  // Probability for each vehicle type
        [VehicleType]: number;
      };
      colorPalette: string[];              // Hex color codes
      dimensions: {                        // Dimensions for each vehicle type
        [VehicleType]: {
          width: number;
          height: number;
          length: number;
        };
      };
    }
  }
}
```

**Constraints:**
- `density` must be non-negative
- `minSpacing` must be non-negative
- `roadsideOffset` must be non-negative
- `typeDistribution` probabilities should sum to 1.0 (warning if not)
- All dimension values must be positive

## Preset Configurations

The system provides four preset configurations:

### Urban
Dense urban environment with tall buildings and busy roads.
- High building density (25 buildings/chunk)
- Tall buildings (20-80 units)
- Dense road network (40 unit grid spacing)
- Many vehicles and signs

### Suburban
Moderate density with medium buildings.
- Medium building density (15 buildings/chunk)
- Medium buildings (8-30 units)
- Standard road network (60 unit grid spacing)
- Moderate vehicles and signs

### Sparse
Low density with few buildings and roads.
- Low building density (8 buildings/chunk)
- Short buildings (5-20 units)
- Wide road network (80 unit grid spacing)
- Few vehicles and signs

### Dense
Very dense urban environment.
- Very high building density (30 buildings/chunk)
- Very tall buildings (30-100 units)
- Very dense road network (30 unit grid spacing)
- Many vehicles and signs

## Validation

The configuration system validates all parameters to ensure they are within acceptable ranges:

```typescript
const configManager = new WorldConfigManager();

// Validate configuration before applying
const validation = configManager.validateConfig({
  chunk: {
    chunkSize: -100  // Invalid!
  }
});

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  // Output: ["chunkSize must be positive"]
}

if (validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
}
```

### Validation Rules

**Errors** (prevent configuration from being applied):
- Negative or zero values for dimensions and sizes
- Invalid probability ranges (must be 0-1)
- `unloadDistance` <= `activeRadius`
- `minHeight` > `maxHeight`
- Non-integer seed values

**Warnings** (configuration is applied but may cause issues):
- Very small chunk sizes (< 50)
- Very large chunk sizes (> 500)
- Empty generation order
- Type distribution not summing to 1.0

## Integration with Generators

### Setting Up Generators with Configuration

```typescript
import { 
  WorldConfigManager,
  ChunkManager,
  RoadGenerator,
  BuildingGenerator,
  TrafficGenerator,
  VehicleGenerator
} from './procedural';

// Create configuration manager
const configManager = WorldConfigManager.createPreset('urban');

// Create chunk manager with configuration
const chunkManager = new ChunkManager();
chunkManager.initialize(scene, configManager.getChunkConfig());

// Create and configure generators
const roadGen = new RoadGenerator();
roadGen.configure(configManager.getRoadConfig());

const buildingGen = new BuildingGenerator();
buildingGen.configure(configManager.getBuildingConfig());
buildingGen.setRoadGenerator(roadGen);

const trafficGen = new TrafficGenerator();
trafficGen.configure(configManager.getTrafficConfig());
trafficGen.setRoadGenerator(roadGen);
trafficGen.setBuildingGenerator(buildingGen);

const vehicleGen = new VehicleGenerator();
vehicleGen.configure(configManager.getVehicleConfig());
vehicleGen.setRoadGenerator(roadGen);

// Register generators
chunkManager.registerGenerator(roadGen);
chunkManager.registerGenerator(buildingGen);
chunkManager.registerGenerator(trafficGen);
chunkManager.registerGenerator(vehicleGen);
```

### Runtime Configuration Changes

Configuration changes affect newly generated chunks:

```typescript
// Initial configuration
const configManager = new WorldConfigManager();
chunkManager.initialize(scene, configManager.getChunkConfig());

// ... player explores, chunks are generated ...

// Change configuration
configManager.updateConfig({
  generators: {
    building: {
      maxHeight: 100  // Make buildings taller
    }
  }
});

// Apply new configuration to generators
buildingGen.configure(configManager.getBuildingConfig());

// New chunks will use updated configuration
// Existing chunks remain unchanged
```

## JSON Format

Configuration can be saved to and loaded from JSON files:

```json
{
  "chunk": {
    "chunkSize": 100,
    "activeRadius": 200,
    "unloadDistance": 300,
    "seed": 12345,
    "generationOrder": [
      "RoadGenerator",
      "BuildingGenerator",
      "TrafficGenerator",
      "VehicleGenerator"
    ]
  },
  "generators": {
    "road": {
      "gridSpacing": 50,
      "mainRoadWidth": 12,
      "sideRoadWidth": 8,
      "mainRoadProbability": 0.3,
      "sideRoadDensity": 2
    },
    "building": {
      "minHeight": 10,
      "maxHeight": 50,
      "density": 15,
      "styles": [
        {
          "name": "modern",
          "colorPalette": ["#CCCCCC", "#AAAAAA"],
          "windowPattern": "grid",
          "roofType": "flat"
        }
      ]
    },
    "traffic": {
      "intersectionSignProbability": 0.8,
      "roadSignDensity": 0.3
    },
    "vehicle": {
      "density": 0.3,
      "minSpacing": 5
    }
  }
}
```

See `example-config.json` for a complete example.

## Best Practices

1. **Start with presets**: Use preset configurations as a starting point and customize from there.

2. **Validate before applying**: Always check validation results before applying configuration changes.

3. **Test incrementally**: Make small configuration changes and test the results before making larger changes.

4. **Document custom configurations**: Save custom configurations to JSON files with descriptive names.

5. **Consider performance**: Very high density values or very small chunk sizes can impact performance.

6. **Maintain consistency**: Ensure related parameters are consistent (e.g., building density should match available space after roads).

7. **Use appropriate seeds**: Different seeds produce different worlds. Use the same seed for reproducible results.

## Troubleshooting

### Buildings overlapping roads
- Increase `building.roadOffset`
- Decrease `building.density`
- Increase `road.mainRoadWidth` and `road.sideRoadWidth`

### Too few/many objects
- Adjust density parameters for each generator
- Modify `building.density`, `vehicle.density`, `traffic.roadSignDensity`

### Performance issues
- Increase `chunk.chunkSize` (fewer chunks to manage)
- Decrease density parameters
- Increase `chunk.unloadDistance` (keep fewer chunks loaded)

### World looks repetitive
- Change `chunk.seed` for different world
- Increase variety in building styles
- Adjust noise-based variation parameters

### Chunks not loading
- Check `chunk.activeRadius` is appropriate for player movement speed
- Ensure `chunk.chunkSize` is not too large
- Verify `chunk.generationOrder` includes all required generators
